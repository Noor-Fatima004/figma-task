import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import Product from "@/app/models/Product";
import ProductVariation from "@/app/models/ProductVariation";
import StockLevel from "@/app/models/StockLevel";
import StockMovement from "@/app/models/StockMovement";
import Warehouse from "@/app/models/Warehouse";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import {
  applyStockChange,
  buildVariantKey,
  productDisplayName,
  readUserId,
  StockError,
  variantLabel,
} from "@/lib/stock";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

const bodySchema = z.object({
  movementId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid movement id"),
  note: z.string().trim().max(500).optional().default(""),
});

const round3 = (value: number) => Math.round(value * 1000) / 1000;

function isDuplicateReversal(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    error.code !== 11000
  ) {
    return false;
  }
  const keyPattern =
    "keyPattern" in error &&
    typeof error.keyPattern === "object" &&
    error.keyPattern !== null
      ? error.keyPattern
      : {};
  return (
    "reversalOf" in keyPattern ||
    ("message" in error &&
      typeof error.message === "string" &&
      error.message.includes("reversalOf"))
  );
}

export async function POST(request: Request) {
  const admin: unknown = await requireAdmin();
  if (!admin) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues[0]?.message ?? "Invalid reversal data",
      400
    );
  }

  try {
    await connectDB();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const original = await StockMovement.findById(parsed.data.movementId)
          .session(session)
          .lean();
        if (!original) throw new StockError("Stock movement not found", 404);
        if (original.reason === "reversal" || original.reversalOf) {
          throw new StockError("A reversal cannot be reversed", 400);
        }
        const existingReversal = await StockMovement.findOne({
          reversalOf: original._id,
        })
          .select("_id")
          .session(session)
          .lean();
        if (existingReversal) {
          throw new StockError("This stock movement has already been reversed", 409);
        }

        const warehouse = await Warehouse.findById(original.warehouse)
          .select("isActive allowNegativeStock")
          .session(session)
          .lean();
        if (!warehouse) throw new StockError("Warehouse not found", 404);
        if (!warehouse.isActive) {
          throw new StockError("This warehouse is inactive", 409);
        }

        if (original.quantity === 0) {
          throw new StockError("A zero-quantity movement cannot be reversed", 400);
        }

        const product = await Product.findById(original.product)
          .select("productType attributes translations slug")
          .session(session)
          .lean();
        const variations = (original.variations ?? []).map(String);
        const variantKey = buildVariantKey(variations);
        const variationDocs = variations.length
          ? await ProductVariation.find({ _id: { $in: variations } })
              .select("name")
              .session(session)
              .lean()
          : [];
        const variant = variantLabel(original.variations, variationDocs);
        const label = product
          ? `${productDisplayName(product)}${variant ? ` (${variant})` : ""}`
          : "Stock item";
        const reverseMode = original.quantity > 0 ? "out" : "in";
        const quantity = Math.abs(original.quantity);

        if (reverseMode === "out" && !warehouse.allowNegativeStock) {
          const level = await StockLevel.findOne({
            product: original.product,
            variantKey,
            warehouse: original.warehouse,
          })
            .select("onHand reserved")
            .session(session)
            .lean();
          const available = (level?.onHand ?? 0) - (level?.reserved ?? 0);
          const missing = round3(Math.max(0, quantity - available));
          if (missing > 0) {
            throw new StockError(
              `Reversal blocked: exactly ${missing} ${
                missing === 1 ? "unit is" : "units are"
              } missing from available stock.`,
              409
            );
          }
        }

        await applyStockChange(
          {
            product: original.product.toString(),
            variations,
            warehouse: original.warehouse.toString(),
            mode: reverseMode,
            quantity,
            reason: "reversal",
            reference: original.reference,
            note: parsed.data.note,
            allowNegative: Boolean(warehouse.allowNegativeStock),
            userId: readUserId(admin),
            label,
            reversalOf: original._id.toString(),
          },
          session
        );
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (isDuplicateReversal(error)) {
      return errorResponse("This stock movement has already been reversed", 409);
    }
    if (error instanceof StockError) {
      return errorResponse(error.message, error.status);
    }
    console.error("Reverse stock movement failed:", error);
    return errorResponse("Failed to reverse stock movement", 500);
  }
}
