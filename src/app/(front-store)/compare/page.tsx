"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiX, FiPlus, FiTrash2, FiArrowRight, FiAward } from "react-icons/fi";
import { useCompare } from "@/app/components/storefront/compareStore";

const formatPrice = (n: number) => `Rs. ${n.toLocaleString("en-US")}`;

type Row = {
  key: "price" | "material" | "categoryLabel" | "badge";
  label: string;
};

const ROWS: Row[] = [
  { key: "price", label: "Price" },
  { key: "material", label: "Material" },
  { key: "categoryLabel", label: "Category" },
  { key: "badge", label: "Badge" },
];

const MIN_SLOTS = 3;

export default function ComparePage() {
  const { items, remove, clear } = useCompare();
  const [onlyDiff, setOnlyDiff] = useState(false);

  const lowestPrice = useMemo(
    () => (items.length > 1 ? Math.min(...items.map((p) => p.price)) : null),
    [items]
  );

  const getValue = (p: (typeof items)[number], key: Row["key"]) => {
    if (key === "price") return formatPrice(p.price);
    return (p[key] as string | undefined) ?? "—";
  };

  const visibleRows = useMemo(() => {
    if (!onlyDiff || items.length < 2) return ROWS;
    return ROWS.filter((row) => {
      const values = items.map((p) => getValue(p, row.key));
      return new Set(values).size > 1;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyDiff, items]);

  /* ---------- EMPTY STATE ---------- */
  if (items.length === 0) {
    return (
      <main className="relative mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,#f1ebe3_0%,transparent_65%)]" />
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-[0_10px_40px_-12px_rgba(139,94,60,0.45)] ring-1 ring-[#e6e0d8] sm:h-24 sm:w-24">
          <svg
            viewBox="0 0 24 24"
            className="h-9 w-9 text-[#8b5e3c] sm:h-10 sm:w-10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="7" height="16" rx="1.5" />
            <rect x="14" y="4" width="7" height="16" rx="1.5" />
          </svg>
        </div>
        <h1 className="mt-7 text-2xl font-medium tracking-tight text-[#2a231f] sm:mt-8 sm:text-4xl">
          Your compare list is empty
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[#6b625a] sm:text-base">
          Add 2 to 4 products from the shop and compare them side by side based on price,
          material, and category.
        </p>
        <Link
          href="/shop"
          className="group mt-7 inline-flex items-center gap-2 rounded-full bg-[#8b5e3c] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[#8b5e3c]/25 transition hover:bg-[#6f4a2e] hover:shadow-xl sm:mt-8 sm:px-7 sm:py-3.5"
        >
          Continue shopping
          <FiArrowRight className="transition group-hover:translate-x-1" />
        </Link>
      </main>
    );
  }

  const emptySlots = Math.max(0, MIN_SLOTS - items.length);

  // Mobile par sirf real products (columns chhote), sm+ par empty slots bhi
  const gridVars = {
    "--m": items.length,
    "--d": items.length + emptySlots,
  } as React.CSSProperties;

  const gridCls =
    "grid w-full " +
    "grid-cols-[84px_repeat(var(--m),minmax(132px,1fr))] " +
    "min-w-[calc(84px+var(--m)*132px)] " +
    "sm:grid-cols-[140px_repeat(var(--d),minmax(200px,1fr))] " +
    "sm:min-w-[calc(140px+var(--d)*200px)]";

  /* ---------- MAIN ---------- */
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#8b5e3c] sm:text-xs">
            Side by side
          </p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-[#2a231f] sm:text-4xl">
            Compare products
          </h1>
          <p className="mt-1.5 text-sm text-[#6b625a]">
            {items.length} product{items.length > 1 ? "s" : ""} selected
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {items.length > 1 && (
            <label className="flex cursor-pointer select-none items-center gap-2 rounded-full border border-[#e6e0d8] bg-white px-4 py-2 text-[13px] text-[#4d453f] transition hover:border-[#8b5e3c] sm:text-sm">
              <input
                type="checkbox"
                checked={onlyDiff}
                onChange={(e) => setOnlyDiff(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[#8b5e3c]"
              />
              Only differences
            </label>
          )}
          <button
            type="button"
            onClick={clear}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#e6e0d8] bg-white px-4 py-2 text-[13px] font-medium text-[#8b5e3c] transition hover:border-[#8b5e3c] hover:bg-[#8b5e3c] hover:text-white sm:text-sm"
          >
            <FiTrash2 className="h-4 w-4" />
            Clear all
          </button>
        </div>
      </div>

      {/* Comparison table: ek hi outer border, andar sirf dividers (double border nahi) */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-[#e6e0d8] bg-white shadow-[0_20px_60px_-30px_rgba(42,35,31,0.25)] sm:mt-8">
        <div className="overflow-x-auto">
          <div className={gridCls} style={gridVars}>
            {/* Product header row */}
            <div className="sticky left-0 z-10 border-b border-[#e6e0d8] bg-[#faf7f2]" />
            {items.map((p) => {
              const isBest = lowestPrice !== null && p.price === lowestPrice;
              return (
                <div
                  key={p.id}
                  className="group relative min-w-0 border-b border-l border-[#e6e0d8] p-2 sm:p-4"
                >
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    aria-label={`Remove ${p.name}`}
                    className="absolute right-3 top-3 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/95 text-[#2a231f] shadow transition hover:bg-[#8b5e3c] hover:text-white sm:right-6 sm:top-6 sm:h-8 sm:w-8"
                  >
                    <FiX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>

                  <Link href={`/product/${p.id}`} className="block">
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#f1ebe3] sm:rounded-xl">
                      {p.image && (
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          unoptimized
                          sizes="(min-width: 640px) 220px, 140px"
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                      )}
                      {isBest && (
                        <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-[#8b5e3c] px-2 py-0.5 text-[9px] font-medium text-white shadow sm:bottom-auto sm:left-2 sm:top-2 sm:px-2.5 sm:py-1 sm:text-[11px]">
                          <FiAward className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          Best price
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 line-clamp-2 min-h-[2.4rem] text-[13px] font-medium leading-snug text-[#2a231f] transition group-hover:text-[#8b5e3c] sm:mt-4 sm:min-h-[2.75rem] sm:text-base">
                      {p.name}
                    </h2>
                  </Link>

                  <Link
                    href={`/product/${p.id}`}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#2a231f] px-2 py-2 text-[11px] font-medium text-white transition hover:bg-[#8b5e3c] sm:mt-4 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
                  >
                    View
                    <span className="hidden sm:inline">product</span>
                    <FiArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Link>
                </div>
              );
            })}

            {/* Empty "add more" slots (sirf sm+ par) */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="hidden items-center justify-center border-b border-l border-[#e6e0d8] p-4 sm:flex"
              >
                <Link
                  href="/shop"
                  className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#d9cfc2] bg-[#faf7f2] text-[#8b5e3c] transition hover:border-[#8b5e3c] hover:bg-[#f1ebe3]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow ring-1 ring-[#e6e0d8]">
                    <FiPlus className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium">Add a product</span>
                </Link>
              </div>
            ))}

            {/* Attribute rows */}
            {visibleRows.length === 0 && (
              <div
                className="p-6 text-center text-sm text-[#6b625a] sm:p-8"
                style={{ gridColumn: "1 / -1" }}
              >
                All the product details are exactly the same.
              </div>
            )}

            {visibleRows.map((row, ri) => {
              const zebra = ri % 2 === 0 ? "bg-white" : "bg-[#fdfcfa]";
              // Aakhri row par bottom border nahi (outer border pehle se hai)
              const bb = ri === visibleRows.length - 1 ? "" : "border-b";
              return (
                <div key={row.key} className="contents">
                  <div
                    className={`sticky left-0 z-10 flex items-center ${bb} border-[#e6e0d8] bg-[#faf7f2] p-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[#6b625a] sm:p-4 sm:text-sm sm:tracking-[0.15em]`}
                  >
                    {row.label}
                  </div>
                  {items.map((p) => {
                    const isBest =
                      row.key === "price" &&
                      lowestPrice !== null &&
                      p.price === lowestPrice;
                    const value = getValue(p, row.key);
                    return (
                      <div
                        key={p.id}
                        className={`flex min-w-0 items-center ${bb} border-l border-[#e6e0d8] p-2 sm:p-4 ${zebra}`}
                      >
                        {row.key === "badge" && value !== "—" ? (
                          <span className="rounded-full bg-[#f1ebe3] px-2.5 py-1 text-[11px] font-medium text-[#8b5e3c] sm:px-3 sm:text-xs">
                            {value}
                          </span>
                        ) : (
                          <span
                            className={`break-words text-[13px] sm:text-base ${
                              isBest
                                ? "font-semibold text-[#8b5e3c]"
                                : value === "—"
                                ? "text-[#b3a99f]"
                                : "text-[#2a231f]"
                            }`}
                          >
                            {value}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {Array.from({ length: emptySlots }).map((_, i) => (
                    <div
                      key={`empty-cell-${row.key}-${i}`}
                      className={`hidden ${bb} border-l border-[#e6e0d8] sm:block ${zebra}`}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-[#8a8077] md:hidden">
        ← Swipe to see all products →
      </p>
    </main>
  );
}