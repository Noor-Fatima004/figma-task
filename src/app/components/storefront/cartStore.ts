"use client";

// Rakho: src/app/components/storefront/cartStore.ts
// Koi extra library nahi chahiye. Cart localStorage mein save hota hai.

import { useEffect, useSyncExternalStore } from "react";
import type { StorefrontProduct } from "@/store/storefrontTypes";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT,
  TAX_RATE,
} from "@/lib/cart-config";

// Re-export taaki purane imports `@/app/components/storefront/cartStore` se bhi kaam karein
export { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT, TAX_RATE };

type ProductId = StorefrontProduct["id"];

export type CartItem = {
  /** Cart line ki unique key: product id + variation combination */
  key: string;
  id: ProductId;
  name: string;
  price: number;
  image?: string;
  note?: string; // material / variant line (display ke liye)
  /** Selected ProductVariation _id's. Simple product ke liye [] */
  variations: string[];
  qty: number;
};

/** addItem ke saath variant ki details */
export type AddItemOptions = {
  /** Selected ProductVariation _id's (har attribute se ek) */
  variations?: string[];
  /** Display label, jaise "Blue" ya "Red / M" */
  variantLabel?: string;
  /** Variation ki apni price ho to */
  price?: number;
  image?: string;
};

type CartState = { items: CartItem[]; open: boolean };

const STORAGE_KEY = "naltar-cart";
const EMPTY: CartState = { items: [], open: false };

let state: CartState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

/** Order-independent key, server ke buildVariantKey jaisa */
const variantKeyOf = (variations: string[]) => [...variations].sort().join("-");

export const cartLineKey = (id: ProductId, variations: string[] = []) =>
  `${String(id)}|${variantKeyOf(variations)}`;

const persist = (items: CartItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage band ho to ignore */
  }
};

const set = (next: CartState, save = true) => {
  state = next;
  if (save) persist(next.items);
  emit();
};

// Purane saved items (jin mein key/variations nahi) ko naye shape mein badlo
function normalize(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const items: CartItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const r = entry as Record<string, unknown>;
    if (r.id === undefined || typeof r.qty !== "number") continue;
    const variations = Array.isArray(r.variations)
      ? r.variations
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
          .map((v) => v.trim())
      : [];
    items.push({
      key:
        typeof r.key === "string" && r.key.includes("|")
          ? r.key
          : cartLineKey(r.id as ProductId, variations),
      id: r.id as ProductId,
      name: String(r.name ?? ""),
      price: Number(r.price ?? 0),
      image: typeof r.image === "string" ? r.image : undefined,
      note: typeof r.note === "string" ? r.note : undefined,
      variations,
      qty: r.qty,
    });
  }
  return items;
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const items = normalize(JSON.parse(raw));
      if (items.length) set({ ...state, items }, false);
    }
  } catch {
    /* kharab data ignore */
  }
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

const getSnapshot = () => state;
const getServerSnapshot = () => EMPTY;

/* ───────── actions ───────── */

const addItem = (p: StorefrontProduct, qty = 1, options: AddItemOptions = {}) => {
  const variations = options.variations ?? [];
  const key = cartLineKey(p.id, variations);
  const exists = state.items.find((i) => i.key === key);
  const items = exists
    ? state.items.map((i) =>
        i.key === key ? { ...i, qty: Math.min(99, i.qty + qty) } : i
      )
    : [
        ...state.items,
        {
          key,
          id: p.id,
          name: p.name,
          price:
            typeof options.price === "number" && options.price > 0
              ? options.price
              : p.price,
          image: options.image ?? p.image,
          note: options.variantLabel ?? p.material,
          variations,
          qty: Math.min(99, qty),
        },
      ];
  set({ items, open: true });
};

// `key` = CartItem.key. Purane callers jo sirf product id dete hain, un ke liye
// simple products (jin ki key `${id}|`) ke saath fallback bhi chalta hai.
const matches = (i: CartItem, key: string) =>
  i.key === key || (i.variations.length === 0 && String(i.id) === key);

const removeItem = (key: string | number) =>
  set({
    ...state,
    items: state.items.filter((i) => !matches(i, String(key))),
  });

const setQty = (key: string | number, qty: number) => {
  if (qty < 1) return removeItem(key);
  set({
    ...state,
    items: state.items.map((i) =>
      matches(i, String(key)) ? { ...i, qty: Math.min(99, qty) } : i
    ),
  });
};

const clearCart = () => set({ ...state, items: [] });

const openCart = () => set({ ...state, open: true }, false);
const closeCart = () => set({ ...state, open: false }, false);

export function useCart() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Client par mount hone ke baad saved cart load karo (hydration mismatch se bachne ke liye)
  useEffect(() => {
    hydrate();
  }, []);

  const count = s.items.reduce((n, i) => n + i.qty, 0);
  const subtotal = s.items.reduce((n, i) => n + i.price * i.qty, 0);

  return {
    items: s.items,
    open: s.open,
    count,
    subtotal,
    addItem,
    setQty,
    removeItem,
    clearCart,
    openCart,
    closeCart,
  };
}