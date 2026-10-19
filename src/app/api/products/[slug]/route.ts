// src/app/api/products/[slug]/route.ts  (PUBLIC)
// GET /api/products/<slug>  -> detail + related (same category)

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/app/models/Product";
import "@/app/models/ProductCategory";
import "@/app/models/GalleryImage";
import "@/app/models/ProductBrand"; // path apne project ke hisaab se
import {
  buildMediaUrlMap,
  buildVariationNameMap,
  toStorefrontProduct,
  type ProductLean,
} from "@/lib/storefrontProduct";

const categoryPopulate = {
  path: "category",
  select: "name slug parent",
  populate: { path: "parent", select: "name slug" },
};

// Next 15+: params Promise hota hai. Next 14 ho to { params }: { params: { slug: string } } karo aur await hata do.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectDB();

    const doc = (await Product.findOne({ slug: slug.toLowerCase(), isActive: true })
      .populate(categoryPopulate)
      .populate("brand", "name")
      .lean()) as unknown as ProductLean | null;

    if (!doc) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // Filters ko Record<string, unknown> rakha hai taake ObjectId typing ka masla na aaye
    const sameFilter: Record<string, unknown> = {
      isActive: true,
      _id: { $ne: doc._id },
    };
    if (doc.category?._id) sameFilter.category = doc.category._id;

    // Related: usi category ke baaki products, kam hon to doosre active products
    const same = doc.category?._id
      ? ((await Product.find(sameFilter)
          .populate(categoryPopulate)
          .populate("brand", "name")
          .limit(4)
          .lean()) as unknown as ProductLean[])
      : [];

    let related = same;
    if (related.length < 4) {
      const othersFilter: Record<string, unknown> = {
        isActive: true,
        _id: { $nin: [doc._id, ...same.map((s) => s._id)] },
      };
      const others = (await Product.find(othersFilter)
        .populate(categoryPopulate)
        .populate("brand", "name")
        .sort({ createdAt: -1 })
        .limit(4 - related.length)
        .lean()) as unknown as ProductLean[];
      related = [...same, ...others];
    }

    const map = await buildMediaUrlMap([doc, ...related].flatMap((d) => d.media ?? []));
    const names = await buildVariationNameMap([doc, ...related]);

    return NextResponse.json({
      product: toStorefrontProduct(doc, map, names),
      related: related.map((r) => toStorefrontProduct(r, map, names)),
    });
  } catch (e) {
    console.error("Public product detail failed:", e);
    return NextResponse.json({ error: "Failed to load product" }, { status: 500 });
  }
}