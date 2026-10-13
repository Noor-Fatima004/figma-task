// src/app/api/brands/route.ts  (PUBLIC, naya)
// GET /api/brands -> sirf wo brands jinke active products hain: [{ _id, name, count }]

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Product from "@/app/models/Product";
import "@/app/models/ProductBrand"; // model register karne ke liye

export async function GET() {
  try {
    await connectDB();

    const groups = await Product.aggregate<{ _id: unknown; count: number }>([
      { $match: { isActive: true, brand: { $ne: null } } },
      { $group: { _id: "$brand", count: { $sum: 1 } } },
    ]);
    if (!groups.length) return NextResponse.json([]);

    const Brand = mongoose.model("ProductBrand");
    const brands = (await Brand.find({ _id: { $in: groups.map((g) => g._id) } })
      .select("name")
      .lean()) as unknown as { _id: unknown; name?: string }[];

    const counts = new Map(groups.map((g) => [String(g._id), g.count]));
    const result = brands
      .map((b) => ({
        _id: String(b._id),
        name: b.name ?? "",
        count: counts.get(String(b._id)) ?? 0,
      }))
      .filter((b) => b.name)
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(result);
  } catch (e) {
    console.error("Public brands failed:", e);
    return NextResponse.json({ error: "Failed to load brands" }, { status: 500 });
  }
}