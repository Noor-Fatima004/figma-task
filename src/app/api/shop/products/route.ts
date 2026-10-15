import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Product from "@/app/models/Product";
import ProductCategory from "@/app/models/ProductCategory";
import {
  buildMediaUrlMap,
  buildVariationNameMap,
  toStorefrontProduct,
  type ProductLean,
} from "@/lib/storefrontProduct";
import { getAvailableByProduct } from "@/lib/stockSummary";

// GET /api/shop/products?filter=new|best|sale&categories=slug1,slug2&limit=48
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const filter = sp.get("filter");
    const slugs = (sp.get("categories") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "48", 10) || 48));

    // Sirf wo products jinka stock > 0 hai
    const stock = await getAvailableByProduct();
    const inStockIds = [...stock.entries()]
      .filter(([, qty]) => qty > 0)
      .map(([id]) => new mongoose.Types.ObjectId(id));

    const query: Record<string, unknown> = { isActive: true, _id: { $in: inStockIds } };

    // Room: category slug + uske children
    if (slugs.length) {
      const roots = await ProductCategory.find({ slug: { $in: slugs } }).select("_id").lean();
      const rootIds = roots.map((r) => r._id);
      const kids = await ProductCategory.find({ parent: { $in: rootIds } }).select("_id").lean();
      query.category = { $in: [...rootIds, ...kids.map((k) => k._id)] };
    }

    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    if (filter === "new") {
      query.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    } else if (filter === "best") {
      query.$or = [{ isBestSeller: true }, { soldCount: { $gt: 0 } }];
      sort = { isBestSeller: -1, soldCount: -1, createdAt: -1 };
    } else if (filter === "sale") {
      query.discountPrice = { $gt: 0 };
      query.$expr = { $lt: ["$discountPrice", "$price"] };
    }

    const docs = (await Product.find(query)
      .populate({
        path: "category",
        select: "name slug parent",
        populate: { path: "parent", select: "name slug" },
      })
      .sort(sort)
      .limit(limit)
      .lean()) as unknown as ProductLean[];

    const [map, names] = await Promise.all([
      buildMediaUrlMap(docs.flatMap((d) => d.media ?? [])),
      buildVariationNameMap(docs),
    ]);

    return NextResponse.json(
      docs.map((d) => ({
        ...toStorefrontProduct(d, map, names),
        stock: stock.get(String(d._id)) ?? 0,
      }))
    );
  } catch (e) {
    console.error("Shop products failed:", e);
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}