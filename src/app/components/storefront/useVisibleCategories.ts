"use client";

// Rakho: src/app/components/storefront/useVisibleCategories.ts

import { useEffect, useState } from "react";
import { useGetStoreCategoriesQuery } from "@/store/storefrontApi";

// Sirf wo categories jin mein kam az kam 1 product ho.
// onlyKeys dene par sirf wahi keys check hoti hain (aur usi order mein aati hain).
export function useVisibleCategories(onlyKeys?: readonly string[]) {
  const { data: all = [], isLoading, isError } = useGetStoreCategoriesQuery();

  const categories = onlyKeys
    ? all
        .filter((c) => onlyKeys.includes(c.key))
        .sort((a, b) => onlyKeys.indexOf(a.key) - onlyKeys.indexOf(b.key))
    : all;

  // null = abhi check ho raha hai
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const catKeys = categories.map((c) => c.key).join(",");

  useEffect(() => {
    if (!catKeys) return;
    let cancelled = false;

    Promise.all(
      catKeys.split(",").map(async (key) => {
        try {
          // Room page wala hi endpoint, taake subcategories ke products bhi gin liye jayen
          const res = await fetch(
            `/api/shop/products?categories=${encodeURIComponent(key)}&limit=1`,
            { cache: "no-store" }
          );
          // Check fail ho jaye to category chhupao mat
          if (!res.ok) return [key, 1] as const;
          const data = await res.json();
          const n = Number(
            data.total ??
              data.items?.length ??
              data.products?.length ??
              (Array.isArray(data) ? data.length : 0)
          );
          return [key, n] as const;
        } catch {
          return [key, 1] as const;
        }
      })
    ).then((entries) => {
      if (!cancelled) setCounts(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [catKeys]);

  const visible = counts ? categories.filter((c) => (counts[c.key] ?? 1) > 0) : [];
  const loading = isLoading || (categories.length > 0 && !counts);

  return { categories: visible, loading, isError, empty: !loading && visible.length === 0 };
}