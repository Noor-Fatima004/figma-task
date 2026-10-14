// src/lib/storefrontProduct.ts
// Admin + public routes dono yahi helper use karte hain:
// 1) media (gallery ids / Cloudinary URLs) -> asli image URLs
// 2) DB product -> storefront ka Product shape
// 3) variable product ke attribute/variation names

import mongoose from "mongoose";
import GalleryImage from "@/app/models/GalleryImage";
import ProductAttribute from "@/app/models/ProductAttribute";
import ProductVariation from "@/app/models/ProductVariation";

type Ref = {
  _id?: unknown;
  name?: string;
  slug?: string;
  parent?: Ref | null;
} | null;

export type ProductLean = {
  _id: unknown;
  slug: string;
  media?: string[];
  translations?: unknown;
  productType?: string;
  isFeature?: boolean;
  createdAt?: Date | string;
  price: number;
  discountPrice?: number | null;
  category?: Ref;
  brand?: Ref;
  unit?: Ref;
  weight?: number | null;
  sku?: string;
  attributes?: { attribute?: unknown; variations?: unknown[] }[];
  soldCount?: number;
  isBestSeller?: boolean;
};

// Itne din tak naye product par "New" tag aayega (yahan se badal sakte ho)
const NEW_DAYS = 30;

/**
 * Badge ka rule:
 *  - naya product (NEW_DAYS ke andar bana)  -> "New"
 *  - warna agar admin mein isFeature true    -> "Featured"
 *  - baqi sab                                -> koi tag nahi
 */
function getBadge(p: Pick<ProductLean, "createdAt" | "isFeature">): string | undefined {
  const created = p.createdAt ? new Date(p.createdAt).getTime() : 0;
  const isNew =
    created > 0 && Date.now() - created < NEW_DAYS * 24 * 60 * 60 * 1000;

  if (isNew) return "New";
  if (p.isFeature) return "Featured";
  return undefined;
}

/** gallery ids ko GalleryImage.url se map karta hai (ek hi query) */
export async function buildMediaUrlMap(allMedia: string[]) {
  const ids = [...new Set(allMedia.filter((v) => mongoose.isValidObjectId(v)))];
  const map = new Map<string, string>();
  if (!ids.length) return map;
  const imgs = await GalleryImage.find({ _id: { $in: ids } })
    .select("url")
    .lean();
  for (const img of imgs as { _id: unknown; url?: string }[]) {
    map.set(String(img._id), img.url ?? "");
  }
  return map;
}

/** media array -> URLs (order same rehta hai, khali URLs hata di jati hain) */
export function mediaToUrls(media: string[] | undefined, map: Map<string, string>) {
  return (media ?? [])
    .map((m) => (mongoose.isValidObjectId(m) ? map.get(m) ?? "" : m))
    .filter(Boolean);
}

/** translations Map ho ya plain object (lean), dono handle */
export function getEnTranslation(t: unknown): { name: string; description: string } {
  const en =
    t instanceof Map
      ? t.get("en")
      : (t as Record<string, { name?: string; description?: string }> | undefined)?.en;
  return { name: en?.name ?? "", description: en?.description ?? "" };
}

/** Variable products ke attribute aur variation ids ko naam se map karta hai (2 queries total) */
export async function buildVariationNameMap(
  docs: Pick<ProductLean, "productType" | "attributes">[]
) {
  const attrIds = new Set<string>();
  const varIds = new Set<string>();
  for (const d of docs) {
    if (d.productType !== "variable") continue;
    for (const a of d.attributes ?? []) {
      if (a.attribute) attrIds.add(String(a.attribute));
      for (const v of a.variations ?? []) varIds.add(String(v));
    }
  }
  const names = new Map<string, string>(); // ObjectIds unique hain, ek map kaafi hai
  if (!attrIds.size && !varIds.size) return names;
  const [attrs, vars] = await Promise.all([
    ProductAttribute.find({ _id: { $in: [...attrIds] } }).select("name").lean(),
    ProductVariation.find({ _id: { $in: [...varIds] } }).select("name").lean(),
  ]);
  for (const x of [...attrs, ...vars] as { _id: unknown; name?: string }[]) {
    names.set(String(x._id), x.name ?? "");
  }
  return names;
}

function toVariationGroups(p: ProductLean, names: Map<string, string>) {
  if (p.productType !== "variable") return [];
  return (p.attributes ?? [])
    .map((a) => ({
      id: String(a.attribute),
      name: names.get(String(a.attribute)) || "Option",
      options: (a.variations ?? [])
        .map((v) => ({ id: String(v), name: names.get(String(v)) ?? "" }))
        .filter((o) => o.name),
    }))
    .filter((g) => g.options.length > 0);
}

/** Storefront ke Product type jaisa object */
export function toStorefrontProduct(
  p: ProductLean,
  map: Map<string, string>,
  names: Map<string, string> = new Map()
) {
  const { name, description } = getEnTranslation(p.translations);
  const images = mediaToUrls(p.media, map);

  // Agar product kisi sub-category me hai, tab ke liye parent category ka slug use hota hai
  const cat = p.category ?? null;
  const main = cat?.parent?.slug ? cat.parent : cat;

  const hasDiscount =
    typeof p.discountPrice === "number" && p.discountPrice > 0 && p.discountPrice < p.price;

  return {
    id: p.slug, // storefront me /product/<id> = slug
    _id: String(p._id),
    name,
    // Model me "material" field nahi hai, abhi brand ka naam dikha rahe hain
    material: p.brand?.name ?? "",
    soldCount: p.soldCount ?? 0,
    isBestSeller: Boolean(p.isBestSeller),
    price: hasDiscount ? (p.discountPrice as number) : p.price,
    originalPrice: hasDiscount ? p.price : undefined,
    category: main?.slug ?? "",
    categoryLabel: main?.name ?? "",
    image: images[0] ?? "",
    images,
    badge: getBadge(p),
    description,
    dimensions: undefined as string | undefined,
    productType: (p.productType === "variable" ? "variable" : "simple") as
      | "simple"
      | "variable",
    variationGroups: toVariationGroups(p, names),
  };
}