// src/app/api/products/route.ts  (PUBLIC, auth nahi)
// GET /api/products
//   ?category=slug1,slug2   (main category dene par uski sub-categories bhi aati hain)
//   &brand=id1,id2
//   &minPrice=100&maxPrice=5000   (discount ho to discount price par filter)
//   &sale=true                    (sirf discount wale)
//   &q=text
//   &sort=featured|newest|price-asc|price-desc|name
//   &page=1&limit=12

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Product from "@/app/models/Product";
import ProductCategory from "@/app/models/ProductCategory";
import "@/app/models/GalleryImage";
import "@/app/models/ProductBrand";
import {
  buildMediaUrlMap,
  buildVariationNameMap,
  toStorefrontProduct,
  type ProductLean,
} from "@/lib/storefrontProduct";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const csv = (v: string | null) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const SORTS: Record<string, Record<string, 1 | -1>> = {
  featured: { isFeature: -1, createdAt: -1 },
  newest: { createdAt: -1 },
  "price-asc": { price: 1, _id: 1 },
  "price-desc": { price: -1, _id: 1 },
  name: { "translations.en.name": 1, _id: 1 },
  "best-selling": { soldCount: -1, _id: 1 },
};

// Discount valid ho (0 se bada aur price se kam) to wahi asli price hai
const hasDiscountExpr = {
  $and: [{ $gt: ["$discountPrice", 0] }, { $lt: ["$discountPrice", "$price"] }],
};
const effectivePriceExpr = { $cond: [hasDiscountExpr, "$discountPrice", "$price"] };

const emptyResult = () =>
  NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;

    const q = (sp.get("q") ?? "").trim();
    const limit = Math.min(60, Math.max(1, parseInt(sp.get("limit") ?? "12", 10) || 12));
    let page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
    const sort = SORTS[sp.get("sort") ?? ""] ?? SORTS.newest;

    const filter: Record<string, unknown> = { isActive: true };
    const and: Record<string, unknown>[] = [];

    // Category: selected categories + unki sub-categories
    const slugs = csv(sp.get("category")).map((s) => s.toLowerCase());
    if (slugs.length) {
      const cats = await ProductCategory.find({ slug: { $in: slugs } }).select("_id").lean();
      if (!cats.length) return emptyResult();
      const ids = cats.map((c) => c._id);
      const children = await ProductCategory.find({ parent: { $in: ids } })
        .select("_id")
        .lean();
      filter.category = { $in: [...ids, ...children.map((c) => c._id)] };
    }

    // Brand
    const brandIds = csv(sp.get("brand")).filter((v) => mongoose.isValidObjectId(v));
    if (brandIds.length) filter.brand = { $in: brandIds };
    if (sp.get("bestSeller") === "1") filter.isBestSeller = true;

    // Price range
    const minRaw = sp.get("minPrice");
    const maxRaw = sp.get("maxPrice");
    const min = Number(minRaw);
    const max = Number(maxRaw);
    if (minRaw && Number.isFinite(min)) and.push({ $expr: { $gte: [effectivePriceExpr, min] } });
    if (maxRaw && Number.isFinite(max)) and.push({ $expr: { $lte: [effectivePriceExpr, max] } });

    // Sirf sale wale
    const sale = sp.get("sale");
    if (sale === "true" || sale === "1") and.push({ $expr: hasDiscountExpr });

    // Search
    if (q) {
      and.push({
        $or: [
          { "translations.en.name": new RegExp(escapeRegExp(q), "i") },
          { sku: new RegExp(escapeRegExp(q), "i") },
        ],
      });
    }

    if (and.length) filter.$and = and;

    const total = await Product.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    page = Math.min(page, totalPages);

    const docs = (await Product.find(filter)
      .populate({
        path: "category",
        select: "name slug parent",
        populate: { path: "parent", select: "name slug" },
      })
      .populate("brand", "name")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()) as unknown as ProductLean[];

    const map = await buildMediaUrlMap(docs.flatMap((d) => d.media ?? []));
    const names = await buildVariationNameMap(docs);

    // ✅ createdAt bhi include karo taaki frontend "new arrivals" filter kar sake
    const items = docs.map((d) => ({
      ...toStorefrontProduct(d, map, names),
      createdAt:
        (d as any).createdAt instanceof Date
          ? (d as any).createdAt.toISOString()
          : (d as any).createdAt ?? null,
    }));

    return NextResponse.json({ items, total, page, totalPages });
  } catch (e) {
    console.error("Public products list failed:", e);
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}