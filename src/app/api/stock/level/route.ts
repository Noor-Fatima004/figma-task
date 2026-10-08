import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import Product from "@/app/models/Product";
import StockLevel from "@/app/models/StockLevel";
import Warehouse from "@/app/models/Warehouse";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { buildVariantKey, validateVariantSelection } from "@/lib/stock";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const querySchema = z.object({
  warehouse: objectId,
  product: objectId,
  variations: z.string().default(""),
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
