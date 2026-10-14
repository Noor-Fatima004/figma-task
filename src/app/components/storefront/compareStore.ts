"use client";

import { useSyncExternalStore } from "react";
import type { StorefrontProduct } from "@/store/storefrontTypes";

const MAX_COMPARE = 4; // ek time par max 4 products
const STORAGE_KEY = "storefront-compare-v1";

type State = { items: StorefrontProduct[] };

let state: State = { items: [] };
const listeners = new Set<() => void>();

// Hydrate from localStorage (client only)
if (typeof window !== "undefined") {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = { items: JSON.parse(raw) };
  } catch {
    /* ignore */
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  } catch {
    /* ignore */
  }
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

// Same tab + cross-tab sync
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        state = { items: JSON.parse(e.newValue) };
        emit();
      } catch {
        /* ignore */
      }
    }
  });
}

export function useCompare() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const items = snap.items;

  const has = (id: string) => items.some((p) => p.id === id);

  const add = (p: StorefrontProduct) => {
    if (items.some((x) => x.id === p.id)) return;
    if (items.length >= MAX_COMPARE) return; // ya toast dikhao
    state = { items: [...items, p] };
    persist();
    emit();
  };

  const remove = (id: string) => {
    state = { items: items.filter((p) => p.id !== id) };
    persist();
    emit();
  };

  const toggle = (p: StorefrontProduct) => {
    if (has(p.id)) remove(p.id);
    else add(p);
  };

  const clear = () => {
    state = { items: [] };
    persist();
    emit();
  };

  return {
    items,
    count: items.length,
    max: MAX_COMPARE,
    isFull: items.length >= MAX_COMPARE,
    has,
    add,
    remove,
    toggle,
    clear,
  };
}