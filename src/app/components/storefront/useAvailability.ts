// src/app/components/storefront/useAvailability.ts
"use client";
import { useEffect, useState } from "react";

export type Availability = { status: "in" | "low" | "out"; available: number | null };

export function useAvailability(productId: string | undefined, variationIds: string[]) {
  const [data, setData] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(false);
  const key = [...variationIds].sort().join(",");

  useEffect(() => {
     if (!productId) {
    setData(null);
    return;
  }
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/products/availability?product=${productId}&variations=${key}`, {
      signal: ctrl.signal,
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [productId, key]);

  return { availability: data, loading };
}