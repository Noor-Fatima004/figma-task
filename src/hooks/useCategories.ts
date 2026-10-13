"use client";

import { useMemo } from "react";
import {
  useGetCategoriesQuery,
  type ApiCategoryFull,
} from "@/store/api";
import {
  CATEGORIES as FALLBACK_CATEGORIES,
  type CategoryKey,
} from "@/app/(front-store)/lib/products";

export type UiCategory = {
  key: string;     // slug — "living-room"
  slug: string;
  label: string;   // name
  _id: string;
  description?: string;
  parentId?: string;   // "" = main
  imageUrl?: string;
  iconUrl?: string;
};

function mapCategory(c: ApiCategoryFull): UiCategory {
  return {
    key: c.slug,
    slug: c.slug,
    label: c.name,
    _id: c._id,
    description: c.description ?? "",
    parentId: c.parent ?? "",
    imageUrl: c.imageUrl || undefined,
    iconUrl: c.iconUrl || undefined,
  };
}

export function useCategories() {
  const { data, isLoading, isError, error, refetch } = useGetCategoriesQuery();

  const categories = useMemo<UiCategory[]>(() => {
    // Sirf main categories (parent = "") tabs ke liye
    const fromApi = (data?.items ?? [])
      .filter((c) => !c.parent)
      .map(mapCategory);

    if (fromApi.length > 0) return fromApi;

    // Fallback
    return FALLBACK_CATEGORIES.map((c) => ({
      key: c.key,
      slug: c.key,
      label: c.label,
      _id: "",
      parentId: "",
    }));
  }, [data]);

  return {
    categories,
    isLoading,
    isError,
    error,
    refetch,
    defaultKey: categories[0]?.key as CategoryKey | undefined,
  };
}