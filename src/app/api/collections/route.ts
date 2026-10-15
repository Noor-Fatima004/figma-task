import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Collection from "@/app/models/Collection";
import "@/app/models/GalleryImage";
import "@/app/models/Product";
import "@/app/models/ProductCategory";
import {
  buildMediaUrlMap,
  buildVariationNameMap,
  toStorefrontProduct,
  type ProductLean,
} from "@/lib/storefrontProduct";
import { getAvailableByProduct } from "@/lib/stockSummary";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const slug = req.nextUrl.searchParams.get("slug");

    // ─────────────────────────────────────────────────────────
    // Ek collection + uske in-stock products (existing — same)
    // ─────────────────────────────────────────────────────────
    if (slug) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d: any = await Collection.findOne({ slug, isActive: true })
        .populate("image", "url")
        .populate({
          path: "products",
          match: { isActive: true },
          populate: {
            path: "category",
            select: "name slug parent",
            populate: { path: "parent", select: "name slug" },
          },
        })
        .lean();
      if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const all = (d.products ?? []) as ProductLean[];
      const stock = await getAvailableByProduct(all.map((p) => p._id));
      const docs = all.filter((p) => (stock.get(String(p._id)) ?? 0) > 0);

      const [map, names] = await Promise.all([
        buildMediaUrlMap(docs.flatMap((p) => p.media ?? [])),
        buildVariationNameMap(docs),
      ]);

      return NextResponse.json({
        label: d.name,
        description: d.description ?? "",
        imageUrl: d.image?.url ?? "",
        products: docs.map((p) => ({
          ...toStorefrontProduct(p, map, names),
          stock: stock.get(String(p._id)) ?? 0,
        })),
      });
    }

    // ─────────────────────────────────────────────────────────
    // Saari collections + har collection ke top 12 in-stock products
    // ─────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docs: any[] = await Collection.find({ isActive: true })
      .populate("image", "url")
      .populate({
        path: "products",
        match: { isActive: true },
        populate: {
          path: "category",
          select: "name slug parent",
          populate: { path: "parent", select: "name slug" },
        },
      })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    // Saare products (across all collections) ka stock ek saath nikaal lo
    const allProducts = docs.flatMap(
      (d) => (d.products ?? []) as ProductLean[]
    );
    const stock = await getAvailableByProduct(allProducts.map((p) => p._id));

    // Saare media urls + variation names ek saath build karo (performance)
    const [map, names] = await Promise.all([
      buildMediaUrlMap(allProducts.flatMap((p) => p.media ?? [])),
      buildVariationNameMap(allProducts),
    ]);

    const collections = docs.map((d) => {
      const all = (d.products ?? []) as ProductLean[];
      // Sirf in-stock products, top 12
      const inStock = all
        .filter((p) => (stock.get(String(p._id)) ?? 0) > 0)
        .slice(0, 12);

      return {
        _id: String(d._id),
        key: d.slug,
        label: d.name,
        description: d.description ?? "",
        imageUrl: d.image?.url ?? "",
        count: all.filter(
          (p) => (stock.get(String(p._id)) ?? 0) > 0
        ).length,
        // ✅ Yeh naya add hua — tab click karne par products turant mil jayenge
        products: inStock.map((p) => ({
          ...toStorefrontProduct(p, map, names),
          stock: stock.get(String(p._id)) ?? 0,
        })),
      };
    });

    return NextResponse.json(collections);
  } catch (e) {
    console.error("Public collections failed:", e);
    return NextResponse.json(
      { error: "Failed to load collections" },
      { status: 500 }
    );
  }
}