"use client";

// Is file ko yahan rakho: store/wishlistStore.ts
// Wishlist localStorage mein save hoti hai (koi extra package nahi chahiye)

import { useSyncExternalStore } from "react";
import type { StorefrontProduct } from "@/store/storefrontTypes";

const KEY = "storefront:wishlist:v1";
const EMPTY: StorefrontProduct[] = [];

let cache: StorefrontProduct[] | null = null;
const listeners = new Set<() => void>();

function read(): StorefrontProduct[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as StorefrontProduct[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: StorefrontProduct[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full / blocked: memory mein chalta rahega
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Doosre tab mein change ho to yahan bhi update ho
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useWishlist() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);

  const has = (id: StorefrontProduct["id"]) => items.some((i) => i.id === id);

  const toggle = (product: StorefrontProduct) => {
    const current = read();
    write(
      current.some((i) => i.id === product.id)
        ? current.filter((i) => i.id !== product.id)
        : [product, ...current]
    );
  };

  const remove = (id: StorefrontProduct["id"]) =>
    write(read().filter((i) => i.id !== id));

  const clear = () => write([]);

  return { items, count: items.length, has, toggle, remove, clear };
}