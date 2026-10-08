import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import Product from "@/app/models/Product";
import StockLevel from "@/app/models/StockLevel";
import Warehouse from "@/app/models/Warehouse";
import connectDB from "@/lib/mongodb";
import { LOW_STOCK_THRESHOLD } from "@/lib/storefront";
import { buildVariantKey, validateVariantSelection } from "@/lib/stock";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = z
    .object({
      product: objectId,
      variations: z.string().default(""),
    })
    .safeParse({
      product: params.get("product"),
      variations: params.get("variations") ?? "",
    });
  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues[0]?.message ?? "Invalid availability query",
      400
    );
  }

  const suppliedVariations = parsed.data.variations
    ? parsed.data.variations.split(",")
    : [];
  if (
    suppliedVariations.length > 20 ||
    suppliedVariations.some((id) => !/^[a-f\d]{24}$/i.test(id))
  ) {
    return errorResponse("Invalid variation ids", 400);
  }

  try {
    await connectDB();
    const product = await Product.findOne({
      _id: parsed.data.product,
      isActive: true,
    })
      .select("productType attributes")
      .lean();
    if (!product) return errorResponse("Product not found", 404);
    const variationIds = suppliedVariations.map((id) => id.toLowerCase());
    if (new Set(variationIds).size !== variationIds.length) {
      return errorResponse("Invalid variation ids", 400);
    }
    const validVariations = validateVariantSelection(product, variationIds);
    if (!validVariations) return errorResponse("Select a valid variant", 400);

    const activeWarehouses = await Warehouse.find({ isActive: true }).distinct("_id");
    const [stock] = await StockLevel.aggregate<{ available: number }>([
      {
        $match: {
          product: new mongoose.Types.ObjectId(parsed.data.product),
          variantKey: buildVariantKey(validVariations),
          warehouse: { $in: activeWarehouses },
        },
      },
      {
        $addFields: {
          available: {
            $max: [0, { $subtract: ["$onHand", "$reserved"] }],
          },
        },
      },
      { $group: { _id: null, available: { $sum: "$available" } } },
    ]);
    const available = stock?.available ?? 0;
    return NextResponse.json({
      status:
        available <= 0
          ? "out"
          : available <= LOW_STOCK_THRESHOLD
            ? "low"
            : "in",
      available: available <= LOW_STOCK_THRESHOLD ? available : null,
    });
  } catch (error) {
    console.error("Load product availability failed:", error);
    return errorResponse("Failed to load availability", 500);
  }
}
