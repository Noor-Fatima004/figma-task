// src/app/api/brands/route.ts  (PUBLIC)
// GET /api/brands -> sirf active brands jinke active products hain:
// [{ _id, name, slug, count, image }]
// image = brand ki apni image (admin mein upload ki hui). Na ho to us brand ke
// sabse naye product ki pehli photo.

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Product from "@/app/models/Product";
import ProductBrand from "@/app/models/ProductBrand";
import "@/app/models/GalleryImage"; // populate ke liye model register

type PopulatedGalleryImage = { _id: mongoose.Types.ObjectId; url: string };

export async function GET() {
  try {
    await connectDB();

    const groups = await Product.aggregate<{ _id: unknown; count: number; image?: string }>([
      { $match: { isActive: true, brand: { $ne: null } } },
      { $sort: { createdAt: -1 } }, // $first = sabse naya product
      {
        $group: {
          _id: "$brand",
          count: { $sum: 1 },
          image: { $first: { $arrayElemAt: ["$media", 0] } },
        },
      },
    ]);
    if (!groups.length) return NextResponse.json([]);

    const brands = await ProductBrand.find({
      _id: { $in: groups.map((g) => g._id) },
      status: "active",
    })
      .populate<{ image: PopulatedGalleryImage | null }>("image", "url")
      .select("name slug image")
      .lean();

    const info = new Map(groups.map((g) => [String(g._id), g]));
    const result = brands
      .map((b) => {
        const g = info.get(String(b._id));
        const productImage = typeof g?.image === "string" ? g.image : "";
        return {
          _id: String(b._id),
          name: b.name ?? "",
          slug: b.slug ?? "",
          count: g?.count ?? 0,
          image: b.image?.url || productImage,
        };
      })
      .filter((b) => b.name)
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(result);
  } catch (e) {
    console.error("Public brands failed:", e);
    return NextResponse.json({ error: "Failed to load brands" }, { status: 500 });
  }
}