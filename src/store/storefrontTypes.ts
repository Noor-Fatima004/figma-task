// src/store/storefrontTypes.ts

export type StorefrontCategory = {
  _id: string;
  key: string; // category slug (tab ka key)
  label: string; // category name
  imageUrl: string;
};

export type StorefrontProduct = {
  id: string; // slug, /product/<id>
  _id: string;
  name: string;
  material: string;
  price: number;
  originalPrice?: number; // discount ho to asli price
  category: string; // main category slug
  categoryLabel: string;
  image: string;
  images: string[];
  badge?: string;
  description?: string;
  dimensions?: string;
};

export type ProductsParams = {
  category?: string; // ek ya zyada slugs, comma se alag: "chairs,tables"
  brand?: string; // brand ids, comma se alag
  minPrice?: number;
  maxPrice?: number;
  sale?: boolean; // sirf discount wale
  q?: string;
  page?: number;
  limit?: number;
  sort?: "featured" | "newest" | "price-asc" | "price-desc" | "name";
};

/* ───── Shop page (filters) ───── */

export type StoreCategoryChild = {
  _id: string;
  key: string; // slug
  label: string;
  count: number;
};

export type StoreCategoryNode = {
  _id: string;
  key: string; // slug
  label: string;
  imageUrl: string;
  count: number; // is category + sub-categories ke active products
  children: StoreCategoryChild[];
};

export type StoreBrand = {
  _id: string;
  name: string;
  count: number;
};

export type ProductsResponse = {
  items: StorefrontProduct[];
  total: number;
  page: number;
  totalPages: number;
};

export type ProductDetailResponse = {
  product: StorefrontProduct;
  related: StorefrontProduct[];
};

/* ───── Admin ───── */

export type AdminProduct = {
  _id: string;
  slug: string;
  name: string;
  imageUrl: string;
  imageUrls: string[];
  categoryName: string;
  unitName: string;
  brandName: string;
  productType: "simple" | "variable";
  price: number;
  discountPrice: number | null;
  sku?: string;
  isActive: boolean;
  isFeature: boolean;
  createdAt: string;
};

export type AdminProductsParams = {
  q?: string;
  page?: number;
  limit?: number;
  sort?: "createdAt" | "name" | "price" | "slug";
  order?: "asc" | "desc";
};

export type AdminProductsResponse = {
  items: AdminProduct[];
  total: number;
  page: number;
  totalPages: number;
};