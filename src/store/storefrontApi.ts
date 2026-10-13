// src/store/storefrontApi.ts
// Storefront (public) ke endpoints. Aapki existing `api` me inject hote hain,
// is liye store/index.ts me kuch badalna nahi hai.

import { api } from "./api";
import type {
  StorefrontCategory,
  StoreCategoryNode,
  StoreBrand,
  ProductsParams,
  ProductsResponse,
  ProductDetailResponse,
} from "./storefrontTypes";

export const storefrontApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/categories -> home ke tabs (sirf main categories)
    getStoreCategories: builder.query<StorefrontCategory[], void>({
      query: () => "/categories",
    }),

    // GET /api/categories?tree=1 -> shop page: main + children + counts
    getStoreCategoryTree: builder.query<StoreCategoryNode[], void>({
      query: () => "/categories?tree=1",
    }),

    // GET /api/brands -> shop page ka brand filter
    getStoreBrands: builder.query<StoreBrand[], void>({
      query: () => "/brands",
    }),

    // GET /api/products?category=&brand=&minPrice=&maxPrice=&sale=&sort=&page=&limit=
    getStoreProducts: builder.query<ProductsResponse, ProductsParams | void>({
      query: (params) => ({ url: "/products", params: params ?? {} }),
    }),

    // GET /api/products/<slug> -> { product, related }
    getStoreProduct: builder.query<ProductDetailResponse, string>({
      query: (slug) => `/products/${slug}`,
    }),
  }),
});

export const {
  useGetStoreCategoriesQuery,
  useGetStoreCategoryTreeQuery,
  useGetStoreBrandsQuery,
  useGetStoreProductsQuery,
  useGetStoreProductQuery,
} = storefrontApi;