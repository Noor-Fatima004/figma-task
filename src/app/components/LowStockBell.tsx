"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaBell } from "react-icons/fa";

type Low = {
  productId: string;
  name: string;
  variant: string;
  available: number;
  out: boolean;
};

export default function LowStockBell() {
  const [items, setItems] = useState<Low[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Har 60 sec baad refresh, aur tab wapas focus hone par bhi
  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/admin/stock/low", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (active && d && Array.isArray(d.items)) setItems(d.items);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 60000);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      clearInterval(t);
      window.removeEventListener("focus", load);
    };
  }, []);

  // Bahar click ya Escape par band
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const outCount = items.filter((i) => i.out).length;

  // Product click → stock page pe highlight ke saath
  const handleProductClick = (productId: string) => {
    setOpen(false);
    router.push(
      `/admin/inventory/stock?status=low&highlight=${productId}`
    );
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Low stock alerts${items.length ? `: ${items.length}` : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-theme text-text hover:bg-surface-hover hover:text-text-hover transition-colors"
      >
        <FaBell className="w-4 h-4" />
        {items.length > 0 && (
          <span
            className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white ${
              outCount > 0 ? "bg-red-500" : "bg-amber-500"
            }`}
          >
            {items.length > 99 ? "99+" : items.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-surface rounded-theme border border-border shadow-xl z-[60] overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-text">Low stock alerts</p>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                Sab products ka stock theek hai.
              </p>
            ) : (
              items.map((i) => (
                <button
                  key={`${i.productId}-${i.variant}`}
                  type="button"
                  onClick={() => handleProductClick(i.productId)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors text-left"
                >
                  <span className="min-w-0 truncate text-text">
                    {i.name}
                    {i.variant && <span className="text-muted"> ({i.variant})</span>}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-medium ${
                      i.out ? "text-red-500" : "text-amber-600"
                    }`}
                  >
                    {i.out ? "Out of stock" : `${i.available} left`}
                  </span>
                </button>
              ))
            )}
          </div>

          <Link
            href="/admin/inventory/stock?status=low"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-center text-sm font-medium text-text border-t border-border hover:bg-surface-hover hover:text-text-hover transition-colors"
          >
            View all low stock products
          </Link>
        </div>
      )}
    </div>
  );
}