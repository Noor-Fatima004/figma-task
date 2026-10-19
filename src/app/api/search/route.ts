// Rakho: src/app/api/storefront/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/app/models/Product";
import Category from "@/app/models/ProductCategory";
import { resolveMediaUrlLists } from "@/lib/storefront";
import { escapeRegex, productDisplayName } from "@/lib/stock";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ categories: [], products: [] });

  try {
    await connectDB();
    const rx = new RegExp(escapeRegex(q), "i");

    const [productDocs, categoryDocs] = await Promise.all([
      Product.find({
        isActive: true,
        $or: [{ "translations.en.name": rx }, { slug: rx }, { sku: rx }],
      })
        .select("slug translations price discountPrice media")
        .limit(6)
        .lean(),
      // Category fields apne schema ke hisaab se badlo (name / slug / isActive)
      Category.find({
        isActive: { $ne: false },
        $or: [{ name: rx }, { slug: rx }, { "translations.en.name": rx }],
      })
        .select("name slug translations")
        .limit(4)
        .lean()
        .catch(() => []),
    ]);

    const images = await resolveMediaUrlLists(productDocs.map((p) => p.media ?? []));

    const products = productDocs.map((p, i) => {
      const hasDiscount =
        p.discountPrice !== null &&
        p.discountPrice !== undefined &&
        p.discountPrice >= 0 &&
        p.discountPrice < p.price;
      return {
        id: String(p.slug || p._id),
        name: productDisplayName(p),
        price: hasDiscount ? p.discountPrice : p.price,
        image: images[i]?.[0] ?? "",
      };
    });

    const categories = (categoryDocs as Record<string, unknown>[])
      .map((c) => {
        const tr = c.translations as Record<string, { name?: string }> | undefined;
        return {
          name: String(c.name || tr?.en?.name || c.slug || ""),
          slug: String(c.slug || ""),
        };
      })
      .filter((c) => c.name && c.slug);

    return NextResponse.json({ categories, products });
  } catch (err) {
    console.error("Storefront search failed:", err);
    return NextResponse.json({ categories: [], products: [] });
  }
}