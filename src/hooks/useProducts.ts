"use client";

import { useMemo } from "react";
import { useGetProductsQuery, type ApiProduct } from "@/store/api";
import type { Product, CategoryKey } from "@/app/(front-store)/lib/products";

const mediaUrl = (v: string) =>
  v.startsWith("http") ? v : `/api/media/${v}`;

function toCategoryKey(apiCategory: ApiProduct["category"]): CategoryKey {
  if (typeof apiCategory === "string") return apiCategory as CategoryKey;
  return (apiCategory.slug ?? "") as CategoryKey;
}

export function mapProduct(p: ApiProduct): Product {
  const name = p.translations?.en?.name ?? "Untitled";
  const image = p.media[0]
    ? mediaUrl(p.media[0])
    : "/frontStoreImages/placeholder.avif";
  const gallery = p.media.length ? p.media.map(mediaUrl) : [image];

  return {
    id: p.slug,
    name,
    material: "",
    price: p.discountPrice ?? p.price,
    category: toCategoryKey(p.category),
    image,
    images: gallery,
    badge: p.isFeature ? "Featured" : undefined,
    description: p.translations?.en?.description,
  };
}

export function useProducts(category?: CategoryKey, limit = 12) {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useGetProductsQuery({ category, limit });

  const products = useMemo<Product[]>(
    () => (data?.items ?? []).map(mapProduct),
    [data]
  );

  return { products, isLoading, isFetching, isError, error, refetch };
}