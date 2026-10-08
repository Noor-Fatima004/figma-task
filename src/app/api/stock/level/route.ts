import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import Product from "@/app/models/Product";
import StockLevel from "@/app/models/StockLevel";
import Warehouse from "@/app/models/Warehouse";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import {
  applyStockChange,
  buildVariantKey,
  productDisplayName,
  readUserId,
  StockError,
  validateVariantSelection,
} from "@/lib/stock";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const querySchema = z.object({
  warehouse: objectId,
  product: objectId,
  variations: z.string().default(""),
});
const updateSchema = z.object({
  id: objectId,
  quantity: z.number().min(0).max(1_000_000_000),
  binLocation: z.string().trim().max(50),
  reason: z.enum([
    "purchase",
    "opening_stock",
    "customer_return",
    "production",
    "sale",
    "damaged",
    "expired",
    "lost",
    "internal_use",
    "stock_count",
    "other",
  ]),
  reference: z.string().trim().max(100),
  note: z.string().trim().max(500),
});

export async function GET(request: Request) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);

  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    warehouse: params.get("warehouse"),
    product: params.get("product"),
    variations: params.get("variations") ?? "",
  });
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid stock lookup", 400);
  }

  const suppliedVariationIds = parsed.data.variations
    ? parsed.data.variations.split(",")
    : [];
  if (
    suppliedVariationIds.length > 20 ||
    suppliedVariationIds.some((id) => !/^[a-f\d]{24}$/i.test(id))
  ) {
    return errorResponse("Invalid variation ids", 400);
  }
  const variationIds = suppliedVariationIds.map((id) => id.toLowerCase());
  if (new Set(variationIds).size !== variationIds.length) {
    return errorResponse("Invalid variation ids", 400);
  }

  try {
    await connectDB();
    const [warehouse, product] = await Promise.all([
      Warehouse.findById(parsed.data.warehouse)
        .select("allowNegativeStock")
        .lean(),
      Product.findById(parsed.data.product)
        .select("productType attributes")
        .lean(),
    ]);
    if (!warehouse) return errorResponse("Warehouse not found", 404);
    if (!product) return errorResponse("Product not found", 404);

    const variations = validateVariantSelection(product, variationIds);
    if (!variations) return errorResponse("Select a valid variant", 400);

    const level = await StockLevel.findOne({
      product: new mongoose.Types.ObjectId(parsed.data.product),
      variantKey: buildVariantKey(variations),
      warehouse: new mongoose.Types.ObjectId(parsed.data.warehouse),
    })
      .select("onHand reserved")
      .lean();
    const onHand = level?.onHand ?? 0;
    const reserved = level?.reserved ?? 0;
    return NextResponse.json({
      onHand,
      reserved,
      available: onHand - reserved,
      allowNegativeStock: Boolean(warehouse.allowNegativeStock),
    });
  } catch (error) {
    console.error("Load stock level failed:", error);
    return errorResponse("Failed to load stock level", 500);
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid stock data", 400);
  }

  try {
    await connectDB();
    const session = await mongoose.startSession();
    try {
      let response: {
        onHand: number;
        reserved: number;
        available: number;
        binLocation: string;
      } | null = null;

      await session.withTransaction(async () => {
        const level = await StockLevel.findById(parsed.data.id)
          .session(session)
          .lean();
        if (!level) throw new StockError("Stock record not found", 404);

        const product = await Product.findById(level.product)
          .select("productType attributes translations slug")
          .session(session)
          .lean();
        const warehouse = await Warehouse.findById(level.warehouse)
          .select("allowNegativeStock")
          .session(session)
          .lean();
        if (!product) throw new StockError("Product not found", 404);
        if (!warehouse) throw new StockError("Warehouse not found", 404);
        if (!warehouse.allowNegativeStock && parsed.data.quantity < level.reserved) {
          throw new StockError(
            "Counted quantity cannot be lower than stock reserved for orders.",
            409
          );
        }

        await applyStockChange(
          {
            product: level.product.toString(),
            variations: (level.variations ?? []).map(String),
            warehouse: level.warehouse.toString(),
            mode: "set",
            quantity: parsed.data.quantity,
            reason: parsed.data.reason,
            reference: parsed.data.reference,
            note: parsed.data.note,
            allowNegative: Boolean(warehouse.allowNegativeStock),
            userId: readUserId(admin),
            label: productDisplayName(product),
          },
          session
        );

        const updated = await StockLevel.findByIdAndUpdate(
          level._id,
          { $set: { binLocation: parsed.data.binLocation } },
          { new: true, session }
        ).select("onHand reserved binLocation");

        if (!updated) throw new StockError("Stock record not found", 404);
        response = {
          onHand: updated.onHand,
          reserved: updated.reserved,
          available: updated.onHand - updated.reserved,
          binLocation: updated.binLocation ?? "",
        };
      });

      if (!response) throw new Error("Stock update transaction returned no result.");
      return NextResponse.json(response);
    } finally {
      await session.endSession();
    }
  } catch (error) {
    if (error instanceof StockError) return errorResponse(error.message, error.status);
    console.error("Update stock record failed:", error);
    return errorResponse("Failed to update stock record", 500);
  }
}
