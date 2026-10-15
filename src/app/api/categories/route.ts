// src/app/api/categories/route.ts  (PUBLIC)  <- purani file ko isse replace karein
// GET /api/categories            -> sirf main categories (home ke tabs, pehle jaisa)
// GET /api/categories?tree=1     -> main categories + children + product count (shop page ke liye)

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ProductCategory from "@/app/models/ProductCategory";
import Product from "@/app/models/Product";
import "@/app/models/GalleryImage";

type Row = {
  _id: unknown;
  name: string;
  slug: string;
  parent?: unknown;
  image?: { url?: string } | null;
};

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const tree = req.nextUrl.searchParams.get("tree") === "1";
    type RecentRow = Row & { createdAt: Date; parent?: { name?: string } | null };

const recent = req.nextUrl.searchParams.get("recent");
if (recent) {
  const days = Math.min(90, Math.max(1, parseInt(recent, 10) || 15));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const docs = (await ProductCategory.find({ createdAt: { $gte: since } })
    .populate("image", "url")
    .populate("parent", "name")
    .sort({ createdAt: -1 })
    .lean()) as unknown as RecentRow[];

  const groups = await Product.aggregate<{ _id: unknown; count: number }>([
    { $match: { isActive: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const own = new Map(groups.map((g) => [String(g._id), g.count]));

  return NextResponse.json(
    docs.map((c) => ({
      _id: String(c._id),
      key: c.slug,
      label: c.name,
      parentName: c.parent?.name ?? "",
      imageUrl: c.image?.url ?? "",
      count: own.get(String(c._id)) ?? 0,
      createdAt: c.createdAt,
    }))
  );
}

    /* ───── Shop page: tree + counts ───── */
    if (tree) {
      const docs = (await ProductCategory.find({})
        .populate("image", "url")
        .sort({ name: 1 })
        .collation({ locale: "en" })
        .lean()) as unknown as Row[];

      const groups = await Product.aggregate<{ _id: unknown; count: number }>([
        { $match: { isActive: true } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]);
      const own = new Map(groups.map((g) => [String(g._id), g.count]));

      const nodes = docs
        .filter((d) => !d.parent)
        .map((m) => {
          const children = docs
            .filter((d) => d.parent && String(d.parent) === String(m._id))
            .map((k) => ({
              _id: String(k._id),
              key: k.slug,
              label: k.name,
              count: own.get(String(k._id)) ?? 0,
            }));
          const count =
            (own.get(String(m._id)) ?? 0) + children.reduce((sum, k) => sum + k.count, 0);
          return {
            _id: String(m._id),
            key: m.slug,
            label: m.name,
            imageUrl: m.image?.url ?? "",
            count,
            children,
          };
        });

      return NextResponse.json(nodes);
    }

    /* ───── Home tabs: sirf main categories ───── */
    const docs = (await ProductCategory.find({ parent: null })
      .populate("image", "url")
      .sort({ name: 1 })
      .collation({ locale: "en" })
      .lean()) as unknown as Row[];

    return NextResponse.json(
      docs.map((c) => ({
        _id: String(c._id),
        key: c.slug,
        label: c.name,
        imageUrl: c.image?.url ?? "",
      }))
    );
  } catch (e) {
    console.error("Public categories failed:", e);
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }
}