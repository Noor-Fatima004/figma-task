import { NextResponse } from "next/server";
import Order from "@/app/models/Order";
import Product from "@/app/models/Product";
import connectDB from "@/lib/mongodb";
import { buildMediaUrlMap, toStorefrontProduct, type ProductLean } from "@/lib/storefrontProduct";

const MIN_SOLD = 3; // is se zyada bikne par best seller

export async function GET() {
  await connectDB();
  const top = await Order.aggregate<{ _id: unknown; sold: number }>([
    { $match: { status: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.product", sold: { $sum: "$items.quantity" } } },
    { $match: { sold: { $gt: MIN_SOLD } } },
    { $sort: { sold: -1 } },
    { $limit: 12 },
  ]);
  if (!top.length) return NextResponse.json({ items: [] });

  const docs = (await Product.find({ _id: { $in: top.map((t) => t._id) }, isActive: true })
    .populate({ path: "category", select: "name slug parent", populate: { path: "parent", select: "name slug" } })
    .populate("brand", "name")
    .lean()) as unknown as ProductLean[];

  const rank = new Map(top.map((t, i) => [String(t._id), i]));
  docs.sort((a, b) => (rank.get(String(a._id)) ?? 0) - (rank.get(String(b._id)) ?? 0));

  const map = await buildMediaUrlMap(docs.flatMap((d) => d.media ?? []));
  return NextResponse.json({ items: docs.map((d) => toStorefrontProduct(d, map)) });
}