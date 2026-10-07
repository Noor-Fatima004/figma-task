import { NextResponse } from "next/server";
import mongoose from "mongoose";
// NOTE: in 2 imports ko apne existing API routes (jaise product-units/route.ts) ke
// hisaab se match karo: DB connect function ka naam/path.
import  connectDB  from "@/lib/mongodb";
import { slugify } from "@/lib/slugify";
import Product from "@/app/models/Product";
import { isCloudinaryImageUrl, resolveMediaPublicIds } from "@/lib/galleryMedia";
// NOTE: path apne schemas.ts ke asli location ke hisaab se rakho
import { productSchema } from "@/app/admin/catalog/products/add/schemas";

// Frontend `body.message` padhta hai, baaki admin APIs `error` bhejti hain: dono bhej rahe hain
const fail = (message: string, status: number, extra?: object) =>
  NextResponse.json({ message, error: message, ...extra }, { status });

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function uniqueSlug(base: string) {
  let slug = base;
  let n = 1;
  while (await Product.exists({ slug })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

/* ───────────────────────── POST: product save ───────────────────────── */

export async function POST(req: Request) {
  // TODO: yahan wahi admin auth check lagao jo tumhare /api/admin/* routes me hai.
  // Warna koi bhi bina login ke product bana sakta hai.

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.map(String).join(".");
      if (!errors[key]) errors[key] = issue.message;
    }
    return fail(Object.values(errors)[0] ?? "Invalid product data", 400, {
      errors,
    });
  }
  const d = parsed.data;
  if (d.media.some((value) => !mongoose.isValidObjectId(value) && !isCloudinaryImageUrl(value))) {
    return fail("Product media must use a gallery image or Cloudinary URL", 400);
  }

  try {
    await connectDB();

    const name = d.translations.en.name;
    const slug = await uniqueSlug(slugify(name, "product"));

    const product = await Product.create({
      slug,
      media: d.media,
      mediaPublicIds: await resolveMediaPublicIds(d.media),
      category: d.category,
      translations: { en: { name, description: d.translations.en.description } },
      videoEmbedCode: d.videoEmbedCode,

      productType: d.productType,
      isActive: d.isActive,
      isPoint: d.isPoint,
      isFeature: d.isFeature,
      unit: d.unit,
      brand: d.brand,
      weight: d.weight,
      price: d.price,
      discountPrice: d.discountPrice,
      minOrder: d.minOrder,
      maxOrder: d.maxOrder,
      sku: d.sku || undefined, // khali SKU save nahi karte (sparse unique index)
      attributes: d.attributes,

      seoMetaTags: d.seoMetaTags,
      seoDescription: d.seoDescription,
    });

    return NextResponse.json(
      { message: "Product created", product: { _id: String(product._id), slug } },
      { status: 201 }
    );
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      e.code === 11000
    ) {
      const keyPattern =
        "keyPattern" in e && typeof e.keyPattern === "object" && e.keyPattern !== null
          ? e.keyPattern
          : {};
      if ("sku" in keyPattern) return fail("This SKU already exists", 409);
      return fail("Product already exists, please try again", 409);
    }
    console.error("Create product failed:", e);
    return fail("Failed to save product", 500);
  }
}

/* ───────────────────────── GET: product list (baad ke page ke liye) ───────────────────────── */

const SORT_FIELDS: Record<string, string> = {
  createdAt: "createdAt",
  name: "translations.en.name",
  price: "price",
  slug: "slug",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10) || 10)
  );
  let page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const sortField = SORT_FIELDS[searchParams.get("sort") ?? ""] ?? "createdAt";
  const order = searchParams.get("order") === "asc" ? 1 : -1;

  try {
    await connectDB();

    const filter = q
      ? {
          $or: [
            { "translations.en.name": new RegExp(escapeRegExp(q), "i") },
            { sku: new RegExp(escapeRegExp(q), "i") },
            { slug: new RegExp(escapeRegExp(q), "i") },
          ],
        }
      : {};

    const total = await Product.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    if (page > totalPages) page = totalPages;

    const items = await Product.find(filter)
      .sort({ [sortField]: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ items, total, page, totalPages });
  } catch (e) {
    console.error("List products failed:", e);
    return fail("Failed to load products", 500);
  }
}