import mongoose from "mongoose";
import { NextResponse } from "next/server";
import Product from "@/app/models/Product";
import ProductVariation from "@/app/models/ProductVariation";
import StockLevel from "@/app/models/StockLevel";
import Warehouse from "@/app/models/Warehouse";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { LOW_STOCK_THRESHOLD } from "@/lib/storefront";
import { productDisplayName, variantLabel } from "@/lib/stock";

export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const warehouses = await Warehouse.find({ isActive: true }).distinct("_id");
  const rows = await StockLevel.aggregate<{
    _id: { product: mongoose.Types.ObjectId; variantKey: string };
    available: number;
    variations: mongoose.Types.ObjectId[];
  }>([
    { $match: { warehouse: { $in: warehouses } } },
    { $addFields: { avail: { $max: [0, { $subtract: ["$onHand", "$reserved"] }] } } },
    {
      $group: {
        _id: { product: "$product", variantKey: "$variantKey" },
        available: { $sum: "$avail" },
        variations: { $first: "$variations" },
      },
    },
    { $match: { available: { $lte: LOW_STOCK_THRESHOLD } } },
    { $sort: { available: 1 } },
    { $limit: 50 },
  ]);

  const products = await Product.find({
    _id: { $in: rows.map((r) => r._id.product) },
    isActive: true,
  }).lean();
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  const varIds = rows.flatMap((r) => r.variations ?? []);
  const varDocs = varIds.length
    ? await ProductVariation.find({ _id: { $in: varIds } }).select("name").lean()
    : [];

  const items = rows.flatMap((r) => {
    const p = byId.get(r._id.product.toString());
    if (!p) return [];
    return [
      {
        productId: p._id.toString(),
        name: productDisplayName(p),
        variant: variantLabel(r.variations, varDocs),
        available: r.available,
        out: r.available === 0,
      },
    ];
  });
  return NextResponse.json({ items, count: items.length });
}