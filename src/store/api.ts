import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/* ══════════════ TYPES ══════════════ */

export type ApiCategoryLite = {
  _id: string;
  name: string;
  parent: string;
};

export type ApiCategoryFull = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  descriptionText?: string;
  parent: string;
  parentName?: string;
  image: string;
  imageUrl: string;
  icon: string;
  iconUrl: string;
};

export type CategoriesPaginated = {
  items: ApiCategoryFull[];
  total: number;
  page: number;
  totalPages: number;
};

export type ApiProduct = {
  _id: string;
  slug: string;
  media: string[];
  category: string | { _id: string; name?: string; slug?: string };
  translations: Record<string, { name: string; description?: string }>;
  price: number;
  discountPrice?: number | null;
  isActive: boolean;
  isFeature: boolean;
  isPoint: boolean;
  sku?: string;
  createdAt: string;
};

export type ProductsListResponse = {
  items: ApiProduct[];
  total: number;
  page: number;
  totalPages: number;
};

/* ── Args types ── */
type ProductsArgs = {
  category?: string;
  q?: string;
  page?: number;
  limit?: number;
  sort?: "createdAt" | "name" | "price" | "slug";
  order?: "asc" | "desc";
  featured?: boolean;
};

type CategoriesArgs = { q?: string };

/* ══════════════ API SLICE ══════════════ */

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Products", "Product", "Categories"],
  endpoints: (builder) => ({
    /* ───── Products list ───── */
    getProducts: builder.query<ProductsListResponse, ProductsArgs | void>({
      query: (rawArgs) => {
        const args: ProductsArgs = rawArgs ?? {};   // ⭐ FIX
        const p = new URLSearchParams();
        if (args.category) p.set("category", args.category);
        if (args.q) p.set("q", args.q);
        if (args.page) p.set("page", String(args.page));
        if (args.limit) p.set("limit", String(args.limit));
        if (args.sort) p.set("sort", args.sort);
        if (args.order) p.set("order", args.order);
        if (args.featured) p.set("featured", "true");
        return `/admin/catalog/products?${p.toString()}`;
      },
      providesTags: (res) =>
        res
          ? [
              ...res.items.map((p) => ({ type: "Product" as const, id: p._id })),
              { type: "Products" as const, id: "LIST" },
            ]
          : [{ type: "Products" as const, id: "LIST" }],
    }),

    /* ───── Categories (full, paginated) ───── */
    getCategories: builder.query<CategoriesPaginated, CategoriesArgs | void>({
      query: (rawArgs) => {
        const args: CategoriesArgs = rawArgs ?? {};   // ⭐ FIX
        const p = new URLSearchParams();
        if (args.q) p.set("q", args.q);
        p.set("limit", "100");
        return `/admin/product-categories?${p.toString()}`;
      },
      providesTags: [{ type: "Categories", id: "LIST" }],
    }),

    /* ───── Categories (lite, dropdown ke liye) ───── */
    getCategoriesLite: builder.query<ApiCategoryLite[], void>({
      query: () => `/admin/product-categories?all=1`,
      providesTags: [{ type: "Categories", id: "LITE" }],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useGetCategoriesLiteQuery,
} = api;