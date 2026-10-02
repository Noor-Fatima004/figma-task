import ProductBrand from "@/app/models/ProductBrand";
import { slugify } from "@/lib/slugify";

export async function uniqueBrandSlug(name: string, excludeId?: string) {
  const base = slugify(name);
  let slug = base;
  let n = 2;

  while (
    await ProductBrand.exists({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
  ) {
    slug = `${base}-${n++}`;
  }
  return slug;
}