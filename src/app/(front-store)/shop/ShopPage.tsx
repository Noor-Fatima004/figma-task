"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FiArrowRight,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiGrid,
  FiList,
  FiShoppingBag,
} from "react-icons/fi";
import {
  useGetStoreBrandsQuery,
  useGetStoreCategoryTreeQuery,
  useGetStoreProductsQuery,
} from "@/store/storefrontApi";
import type { ProductsParams, StorefrontProduct } from "@/store/storefrontTypes";

// Price format: server aur browser dono par same rahe
const formatPrice = (n: number) => `Rs. ${n.toLocaleString("en-US")}`;

const LIMITS = [12, 24, 36];

type ViewMode = "grid" | "list";

type SortValue = NonNullable<ProductsParams["sort"]>;
const SORTS: { value: SortValue; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price ↑" },
  { value: "price-desc", label: "Price ↓" },
  { value: "name", label: "A – Z" },
];

// Show / Sort inputs: white background. Mobile par chhote (text-xs) aur min-w-0 taake screen se bahar na jayen
const selectCls =
  "min-w-0 max-w-full w-full cursor-pointer truncate rounded-lg border border-[#e6e0d8] bg-white px-2 py-1.5 text-[11px] text-[#2a231f] shadow-sm outline-none focus:border-[#8b5e3c] sm:w-auto sm:px-3 sm:py-2 sm:text-xs";

// Sidebar scroll: moti brown scrollbar
const brownScroll =
  "[scrollbar-width:auto] [scrollbar-color:#8b5e3c_#efe9e1] " +
  "[&::-webkit-scrollbar]:w-3 " +
  "[&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[#efe9e1] " +
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#8b5e3c] " +
  "[&::-webkit-scrollbar-thumb:hover]:bg-[#6f4a2e]";

/* ───────────── chhote components ───────────── */

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="group border-b border-[#e6e0d8] py-3 last:border-b-0 sm:py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-medium uppercase tracking-[0.2em] text-[#2a231f] sm:text-xs [&::-webkit-details-marker]:hidden">
        {title}
        <FiChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 sm:mt-4">{children}</div>
    </details>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  count,
  indent,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
  indent?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 py-1 text-[13px] text-[#4d453f] hover:text-[#2a231f] sm:text-sm ${
        indent ? "pl-6" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 cursor-pointer accent-[#8b5e3c]"
      />
      <span className="min-w-0 flex-1 break-words">{label}</span>
      {typeof count === "number" && <span className="text-xs text-[#9a9087]">{count}</span>}
    </label>
  );
}

// Min/Max inputs. Parent key badalta hai (filters clear hon to) tab ye dobara shuru se banta hai.
function PriceFilter({
  min,
  max,
  onApply,
}: {
  min: string;
  max: string;
  onApply: (min: string, max: string) => void;
}) {
  const [lo, setLo] = useState(min);
  const [hi, setHi] = useState(max);
  const inputCls =
    "w-full min-w-0 rounded-lg border border-[#e6e0d8] bg-white px-3 py-2.5 text-sm text-[#2a231f] outline-none focus:border-[#8b5e3c]";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply(lo, hi);
      }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="Min"
          value={lo}
          onChange={(e) => setLo(e.target.value)}
          aria-label="Minimum price"
          className={inputCls}
        />
        <span className="text-[#9a9087]">–</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="Max"
          value={hi}
          onChange={(e) => setHi(e.target.value)}
          aria-label="Maximum price"
          className={inputCls}
        />
      </div>
      <button
        type="submit"
        className="w-full cursor-pointer rounded-lg border border-[#8b5e3c] py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#8b5e3c] transition hover:bg-[#8b5e3c] hover:text-white"
      >
        Apply
      </button>
    </form>
  );
}

function Price({ p, className = "" }: { p: StorefrontProduct; className?: string }) {
  return (
    <p className={`font-medium text-[#2a231f] ${className}`}>
      {formatPrice(p.price)}
      {p.originalPrice && (
        <span className="ml-2 text-[11px] font-normal text-[#9a9087] line-through sm:text-sm">
          {formatPrice(p.originalPrice)}
        </span>
      )}
    </p>
  );
}

// GRID card (image upar, text neeche). Tablet (md) par image ki height kam (square).
function ShopCard({ p, priority }: { p: StorefrontProduct; priority: boolean }) {
  return (
    <article className="group min-w-0">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#f1ebe3] md:aspect-square lg:aspect-[4/5]">
        <Link href={`/product/${p.id}`} className="absolute inset-0 block">
          {p.image && (
            <Image
              src={p.image}
              alt={p.name}
              fill
              priority={priority}
              unoptimized
              sizes="(min-width: 1536px) 20vw, (min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          )}
        </Link>
        {p.badge && (
          <span className="pointer-events-none absolute left-2 top-2 bg-white/90 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#2a231f] sm:left-3 sm:top-3 sm:px-2.5 sm:text-[10px]">
            {p.badge}
          </span>
        )}
        {/* Hover par Add to cart (apna cart action yahan lagao) */}
        <button
          type="button"
          className="absolute inset-x-3 bottom-3 translate-y-2 cursor-pointer bg-white/95 py-2.5 text-xs font-medium uppercase tracking-[0.18em] text-[#2a231f] opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100 hover:bg-[#8b5e3c] hover:text-white"
        >
          Add to cart
        </button>
      </div>
      <Link href={`/product/${p.id}`} className="mt-3 block sm:mt-4">
        {p.categoryLabel && (
          <p className="mb-1 text-[9px] uppercase tracking-[0.2em] text-[#9a9087] sm:text-[10px]">
            {p.categoryLabel}
          </p>
        )}
        <h3 className="text-[13px] font-medium text-[#2a231f] transition-colors group-hover:text-[#8b5e3c] sm:text-[15px]">
          {p.name}
        </h3>
        {p.material && (
          <p className="mt-0.5 text-[11px] text-[#6b625a] sm:text-sm">{p.material}</p>
        )}
        <Price p={p} className="mt-1.5 text-[13px] sm:mt-2 sm:text-[15px]" />
      </Link>
    </article>
  );
}

// LIST card (mobile par image upar, tablet/laptop par image left, details right)
function ShopRow({ p, priority }: { p: StorefrontProduct; priority: boolean }) {
  return (
    <article className="group grid overflow-hidden rounded-2xl border border-[#e6e0d8] bg-white sm:grid-cols-[160px_1fr] lg:grid-cols-[200px_1fr]">
      <Link
        href={`/product/${p.id}`}
        className="relative block aspect-[4/3] bg-[#f1ebe3] sm:aspect-auto sm:min-h-[180px] lg:min-h-[230px]"
      >
        {p.image && (
          <Image
            src={p.image}
            alt={p.name}
            fill
            priority={priority}
            unoptimized
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 40vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        )}
        {p.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2a231f]">
            {p.badge}
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-col justify-between gap-4 p-4 sm:gap-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            {p.categoryLabel && (
              <p className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-[#9a9087] sm:text-[11px]">
                {p.categoryLabel}
              </p>
            )}
            <Link href={`/product/${p.id}`}>
              <h3 className="text-base font-medium text-[#2a231f] transition-colors hover:text-[#8b5e3c] sm:text-lg">
                {p.name}
              </h3>
            </Link>
            {p.material && <p className="mt-1 text-xs text-[#6b625a] sm:text-sm">{p.material}</p>}
          </div>
          <Price p={p} className="shrink-0 text-base sm:text-lg" />
        </div>

        {/* Mobile par dono ek hi row mein, tablet/laptop par stack */}
        <div className="flex flex-1 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-between sm:gap-6">
          {/* apna cart action yahan lagao */}
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 rounded-full bg-[#8b5e3c] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-[#6f4a2e] sm:px-6 sm:py-3 sm:text-sm"
          >
            <FiShoppingBag className="h-4 w-4" /> Add to cart
          </button>
          <Link
            href={`/product/${p.id}`}
            className="flex items-center gap-1.5 text-xs text-[#6b625a] transition hover:text-[#2a231f] sm:text-sm"
          >
            View details <FiArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

// Grid / List toggle
function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const base =
    "flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition sm:h-8 sm:w-8";
  const on = "bg-[#8b5e3c] text-white";
  const off = "text-[#6b625a] hover:text-[#2a231f]";
  return (
    <div
      className="flex shrink-0 items-center gap-0.5 rounded-full bg-[#efe9e1] p-0.5 sm:gap-1 sm:p-1"
      role="group"
      aria-label="View mode"
    >
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-pressed={view === "grid"}
        aria-label="Grid view"
        className={`${base} ${view === "grid" ? on : off}`}
      >
        <FiGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={view === "list"}
        aria-label="List view"
        className={`${base} ${view === "list" ? on : off}`}
      >
        <FiList className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
    </div>
  );
}

// 1 2 3 … 9 10 jaisi list
function pageList(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const nums = [...new Set([1, total, page - 1, page, page + 1])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (n: number) => void;
}) {
  if (totalPages <= 1) return null;
  const btn =
    "flex h-8 min-w-8 cursor-pointer items-center justify-center border border-[#d9d0c6] px-2 text-xs text-[#2a231f] transition hover:bg-[#2a231f] hover:text-white disabled:cursor-not-allowed disabled:border-[#ece6de] disabled:text-[#c9c0b6] disabled:hover:bg-transparent disabled:hover:text-[#c9c0b6] sm:h-10 sm:min-w-10 sm:px-3 sm:text-sm";

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex flex-wrap items-center justify-center gap-1 sm:mt-10 sm:gap-2"
    >
      <button
        type="button"
        className={btn}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Previous page"
      >
        <FiChevronLeft className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">Previous</span>
      </button>
      {pageList(page, totalPages).map((n, i) =>
        n === "…" ? (
          <span key={`gap-${i}`} className="px-0.5 text-[#9a9087] sm:px-1">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onPage(n)}
            aria-current={n === page ? "page" : undefined}
            className={`${btn} ${n === page ? "!border-[#2a231f] !bg-[#2a231f] !text-white" : ""}`}
          >
            {n}
          </button>
        )
      )}
      <button
        type="button"
        className={btn}
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <FiChevronRight className="h-4 w-4 sm:ml-1" />
      </button>
    </nav>
  );
}

/* ───────────── main page ───────────── */

export default function ShopPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");

  // Saari filters URL me rehti hain (back button aur link share dono kaam karte hain)
  const get = (k: string) => sp.get(k) ?? "";
  const csv = (k: string) => get(k).split(",").filter(Boolean);

  const update = (patch: Record<string, string | null>, resetPage = true) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    if (resetPage) p.delete("page");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const toggleIn = (key: string, value: string) => {
    const cur = csv(key);
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    update({ [key]: next.join(",") || null });
  };

  const selectedCats = csv("category");
  const selectedBrands = csv("brand");
  const minPrice = get("minPrice");
  const maxPrice = get("maxPrice");
  const onSale = get("sale") === "1";
  const hasFilters =
    selectedCats.length > 0 || selectedBrands.length > 0 || !!minPrice || !!maxPrice || onSale;

  const sortParam = (SORTS.some((s) => s.value === get("sort")) ? get("sort") : "featured") as SortValue;
  const limit = LIMITS.includes(Number(get("limit"))) ? Number(get("limit")) : 12;
  const pageParam = Math.max(1, Number(get("page")) || 1);

  // ---- Real data (API) ----
  const { data: tree = [], isLoading: treeLoading } = useGetStoreCategoryTreeQuery();
  const { data: brands = [] } = useGetStoreBrandsQuery();

  const args: ProductsParams = {
    category: get("category") || undefined,
    brand: get("brand") || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    sale: onSale ? true : undefined,
    sort: sortParam,
    page: pageParam,
    limit,
  };
  const { currentData, isFetching, isError, refetch } = useGetStoreProductsQuery(args);

  const items = currentData?.items ?? [];
  const total = currentData?.total ?? 0;
  const totalPages = currentData?.totalPages ?? 1;
  const page = currentData?.page ?? pageParam;

  // Heading: ek hi category chuni ho to uska naam
  const flat = tree.flatMap((n) => [n, ...n.children]);
  const heading =
    selectedCats.length === 1
      ? flat.find((c) => c.key === selectedCats[0])?.label ?? "All products"
      : "All products";

  const goPage = (n: number) => {
    update({ page: n > 1 ? String(n) : null }, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Mobile 2 | tablet 3 | laptop (sidebar ke saath) 3 | xl 4 | 2xl 5
  const gridCls =
    view === "grid"
      ? "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:gap-6 xl:grid-cols-4 2xl:grid-cols-5"
      : "grid grid-cols-1 gap-4 sm:gap-5";

  return (
    <section className="bg-[#f5f1ea] py-6 sm:py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 2xl:max-w-[1680px] 2xl:px-12">
        {/* BREADCRUMB */}
        <nav
          aria-label="Breadcrumb"
          className="mb-5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#6b625a] sm:mb-6 sm:text-sm"
        >
          <Link href="/home" className="hover:text-[#2a231f] hover:underline underline-offset-4">
            Home
          </Link>
          <FiChevronRight className="h-3.5 w-3.5" />
          <Link href="/shop" className="hover:text-[#2a231f] hover:underline underline-offset-4">
            Shop
          </Link>
          <FiChevronRight className="h-3.5 w-3.5" />
          <span className="text-[#2a231f]">{heading}</span>
        </nav>

        {/* HEADING + DESCRIPTION (below heading) */}
        <div className="flex flex-col gap-2 sm:gap-3">
          <h1 className="text-2xl font-semibold leading-tight text-[#2a231f] sm:text-4xl lg:text-5xl 2xl:text-6xl">
            {heading}
          </h1>
          <p className="max-w-xl text-xs leading-relaxed text-[#6b625a] sm:text-base">
            Explore our considered collection, designed to bring character and comfort to every
            space.
          </p>
        </div>

        {/* CATEGORY CIRCLES (border-top added) */}
        <div className="mt-6 border-t border-[#e6e0d8] pb-5 pt-5 sm:mt-8 sm:pb-6 sm:pt-6">
          <div className="flex gap-3 overflow-x-auto sm:gap-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => update({ category: null })}
              className="flex w-[68px] shrink-0 cursor-pointer flex-col items-center gap-2 sm:w-20"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full text-[11px] font-semibold uppercase sm:h-14 sm:w-14 sm:text-xs ${
                  selectedCats.length === 0
                    ? "bg-[#2a231f] text-white"
                    : "bg-[#efe9e1] text-[#2a231f] hover:bg-[#e6ddd2]"
                }`}
              >
                All
              </span>
              <span className="text-[10px] uppercase tracking-wide text-[#2a231f] sm:text-[11px]">
                All
              </span>
            </button>

            {treeLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex w-[68px] shrink-0 flex-col items-center gap-2 sm:w-20"
                  aria-hidden="true"
                >
                  <span className="h-12 w-12 animate-pulse rounded-full bg-[#efe9e1] sm:h-14 sm:w-14" />
                  <span className="h-3 w-12 animate-pulse bg-[#efe9e1]" />
                </div>
              ))}

            {tree.map((c) => {
              const active = selectedCats.length === 1 && selectedCats[0] === c.key;
              return (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => update({ category: c.key })}
                  className="flex w-[68px] shrink-0 cursor-pointer flex-col items-center gap-2 sm:w-20"
                >
                  <span
                    className={`relative h-12 w-12 overflow-hidden rounded-full bg-[#efe9e1] ring-2 ring-offset-2 ring-offset-[#f5f1ea] sm:h-14 sm:w-14 ${
                      active ? "ring-[#2a231f]" : "ring-transparent hover:ring-[#d9d0c6]"
                    }`}
                  >
                    {c.imageUrl && (
                      <Image
                        src={c.imageUrl}
                        alt=""
                        fill
                        unoptimized
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                  </span>
                  <span
                    className={`line-clamp-1 text-[10px] uppercase tracking-wide sm:text-[11px] ${
                      active ? "font-semibold text-[#2a231f]" : "text-[#6b625a]"
                    }`}
                  >
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TOOLBAR: mobile par bhi sab ek hi row mein */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-t border-[#e6e0d8] py-3 sm:gap-4 sm:py-5">
          <p className="text-xs text-[#6b625a] sm:text-sm" aria-live="polite">
            {isFetching ? (
              "Loading…"
            ) : (
              <>
                <strong className="text-[#2a231f]">{items.length}</strong> of {total} products
              </>
            )}
          </p>

          <div className="flex w-full min-w-0 items-center gap-1.5 sm:w-auto sm:gap-3">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-[#e6e0d8] bg-white px-2 py-1.5 text-[11px] text-[#2a231f] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm lg:hidden"
            >
              <FiFilter className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Filters
            </button>

            <label className="flex min-w-0 flex-1 items-center gap-1 text-[11px] text-[#6b625a] sm:flex-none sm:gap-2 sm:text-sm">
              <span className="hidden sm:inline">Show</span>
              <select
                value={limit}
                onChange={(e) => update({ limit: e.target.value === "12" ? null : e.target.value })}
                className={selectCls}
              >
                {LIMITS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-0 flex-[2] items-center gap-1 text-[11px] text-[#6b625a] sm:flex-none sm:gap-2 sm:text-sm">
              <span className="hidden sm:inline">Sort</span>
              <select
                value={sortParam}
                aria-label="Sort by"
                onChange={(e) =>
                  update({ sort: e.target.value === "featured" ? null : e.target.value })
                }
                className={selectCls}
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>

        <div className="mt-5 grid gap-6 sm:mt-6 sm:gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          {/* FILTERS SIDEBAR */}
          <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
            <div className="rounded-2xl border border-[#e6e0d8] bg-white/60 px-4 py-1 sm:px-6 sm:py-2">
              <div className="flex items-center justify-between border-b border-[#e6e0d8] py-3 sm:py-4">
                <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#2a231f] sm:text-xs">
                  Filters
                </h2>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={() => router.push(pathname, { scroll: false })}
                    className="cursor-pointer text-xs text-[#8b5e3c] underline underline-offset-4"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {tree.length > 0 && (
                <FilterSection title="Category">
                  <div className={`max-h-64 overflow-y-auto pr-3 sm:max-h-80 ${brownScroll}`}>
                    {tree.map((c) => (
                      <div key={c._id}>
                        <CheckRow
                          checked={selectedCats.includes(c.key)}
                          onChange={() => toggleIn("category", c.key)}
                          label={c.label}
                          count={c.count}
                        />
                        {c.children.map((k) => (
                          <CheckRow
                            key={k._id}
                            indent
                            checked={selectedCats.includes(k.key)}
                            onChange={() => toggleIn("category", k.key)}
                            label={k.label}
                            count={k.count}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </FilterSection>
              )}

              <FilterSection title="Price (Rs.)">
                <PriceFilter
                  key={`${minPrice}-${maxPrice}`}
                  min={minPrice}
                  max={maxPrice}
                  onApply={(lo, hi) => update({ minPrice: lo || null, maxPrice: hi || null })}
                />
              </FilterSection>

              {brands.length > 0 && (
                <FilterSection title="Brand">
                  <div className={`max-h-52 overflow-y-auto pr-3 sm:max-h-64 ${brownScroll}`}>
                    {brands.map((b) => (
                      <CheckRow
                        key={b._id}
                        checked={selectedBrands.includes(b._id)}
                        onChange={() => toggleIn("brand", b._id)}
                        label={b.name}
                        count={b.count}
                      />
                    ))}
                  </div>
                </FilterSection>
              )}

              <FilterSection title="Offers">
                <CheckRow
                  checked={onSale}
                  onChange={() => update({ sale: onSale ? null : "1" })}
                  label="On sale"
                />
              </FilterSection>
            </div>
          </aside>

          {/* PRODUCTS */}
          <div className="min-w-0">
            {isError && !isFetching && (
              <div className="flex items-center gap-4 py-10 text-sm text-[#6b625a]">
                <span>Products could not be loaded.</span>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="cursor-pointer font-medium text-[#2a231f] underline underline-offset-4 hover:text-[#8b5e3c]"
                >
                  Try again
                </button>
              </div>
            )}

            {isFetching && (
              <div className={gridCls} aria-busy="true">
                {Array.from({ length: view === "grid" ? 8 : 4 }).map((_, i) =>
                  view === "grid" ? (
                    <div key={i} aria-hidden="true">
                      <div className="aspect-[4/5] animate-pulse bg-[#f1ebe3] md:aspect-square lg:aspect-[4/5]" />
                      <div className="mt-4 h-3 w-1/3 animate-pulse bg-[#efe9e1]" />
                      <div className="mt-2 h-4 w-3/4 animate-pulse bg-[#efe9e1]" />
                      <div className="mt-3 h-4 w-1/3 animate-pulse bg-[#efe9e1]" />
                    </div>
                  ) : (
                    <div
                      key={i}
                      aria-hidden="true"
                      className="h-48 animate-pulse rounded-2xl bg-[#f1ebe3] sm:h-56"
                    />
                  )
                )}
              </div>
            )}

            {!isFetching && !isError && items.length > 0 && (
              <div className={gridCls}>
                {items.map((p, i) =>
                  view === "grid" ? (
                    <ShopCard key={p._id} p={p} priority={i < 4} />
                  ) : (
                    <ShopRow key={p._id} p={p} priority={i < 2} />
                  )
                )}
              </div>
            )}

            {!isFetching && !isError && items.length === 0 && (
              <div className="py-12 text-center sm:py-16">
                <p className="text-base text-[#2a231f] sm:text-lg">No products found.</p>
                <p className="mt-2 text-xs text-[#6b625a] sm:text-sm">
                  Try changing or clearing your filters.
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={() => router.push(pathname, { scroll: false })}
                    className="mt-5 cursor-pointer text-sm font-medium text-[#2a231f] underline underline-offset-4 hover:text-[#8b5e3c]"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {!isFetching && !isError && (
              <Pagination page={page} totalPages={totalPages} onPage={goPage} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}