import ProductCategory from "@/app/models/ProductCategory";
import { slugify } from "@/lib/slugify";

export async function uniqueCategorySlug(name: string, excludeId?: string) {
  const base = slugify(name, "category");
  let slug = base;
  let n = 2;

  while (
    await ProductCategory.exists({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
  ) {
    slug = `${base}-${n++}`;
  }
  return slug;
}