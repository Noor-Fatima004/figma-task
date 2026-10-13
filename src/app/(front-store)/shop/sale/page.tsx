"use client";

// Is file ko yahan rakho: app/shop/sale/page.tsx
// Navbar ka "Sale" link pehle se /shop/sale hai.

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useGetStoreProductsQuery } from "@/store/storefrontApi";
import type { ProductsParams, StorefrontProduct } from "@/store/storefrontTypes";

const formatPrice = (n: number) => `Rs. ${n.toLocaleString("en-US")}`;

const LIMIT = 12;
// "Real time": har 30 second baad list khud refresh hoti hai (0 likho to band)
const POLL_MS = 30_000;

type SortValue = NonNullable<ProductsParams["sort"]>;
const SORTS: { value: SortValue; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name: A to Z" },
];

const selectCls =
  "cursor-pointer rounded-lg border border-[#e6e0d8] bg-white px-4 py-2.5 text-sm text-[#2a231f] shadow-sm outline-none focus:border-[#8b5e3c]";

// Kitne percent discount hai (originalPrice > price ho tab hi sale)
const discountOf = (p: StorefrontProduct) =>
  p.originalPrice && p.originalPrice > p.price
    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
    : 0;

function SaleCard({ p, priority }: { p: StorefrontProduct; priority: boolean }) {
  const off = discountOf(p);
  return (
    <article className="group">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#f1ebe3]">
        <Link href={`/product/${p.id}`} className="absolute inset-0 block">
          {p.image && (
            <Image
              src={p.image}
              alt={p.name}
              fill
              priority={priority}
              unoptimized
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          )}
        </Link>
        {off > 0 && (
          <span className="pointer-events-none absolute left-3 top-3 bg-[#8b5e3c] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
            -{off}%
          </span>
        )}
      </div>
      <Link href={`/product/${p.id}`} className="mt-4 block">
        {p.categoryLabel && (
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#9a9087]">
            {p.categoryLabel}
          </p>
        )}
        <h3 className="text-sm font-medium text-[#2a231f] transition-colors group-hover:text-[#8b5e3c] sm:text-[15px]">
          {p.name}
        </h3>
        {p.material && <p className="mt-0.5 text-xs text-[#6b625a] sm:text-sm">{p.material}</p>}
        <p className="mt-2 text-sm font-medium sm:text-[15px]">
          <span className="text-[#8b5e3c]">{formatPrice(p.price)}</span>
          {p.originalPrice && (
            <span className="ml-2 text-xs font-normal text-[#9a9087] line-through sm:text-sm">
              {formatPrice(p.originalPrice)}
            </span>
          )}
        </p>
      </Link>
    </article>
  );
}

function SaleContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const sortParam = (SORTS.some((s) => s.value === sp.get("sort")) ? sp.get("sort") : "featured") as SortValue;
  const pageParam = Math.max(1, Number(sp.get("page")) || 1);

  const update = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const args: ProductsParams = { sale: true, sort: sortParam, page: pageParam, limit: LIMIT };
  const { currentData, isFetching, isError, refetch } = useGetStoreProductsQuery(args, {
    pollingInterval: POLL_MS, // naye sale products khud aa jayen
    refetchOnMountOrArgChange: true, // page kholte hi taza data
  });

  // Safety: sirf wo jin par asal mein discount ho
  const items = (currentData?.items ?? []).filter((p) => discountOf(p) > 0);
  const total = currentData?.total ?? 0;
  const totalPages = currentData?.totalPages ?? 1;
  const page = currentData?.page ?? pageParam;

  const goPage = (n: number) => {
    update({ page: n > 1 ? String(n) : null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navBtn =
    "flex h-10 cursor-pointer items-center justify-center border border-[#d9d0c6] px-4 text-sm text-[#2a231f] transition hover:bg-[#2a231f] hover:text-white disabled:cursor-not-allowed disabled:border-[#ece6de] disabled:text-[#c9c0b6] disabled:hover:bg-transparent disabled:hover:text-[#c9c0b6]";

  return (
    <section className="bg-[#f5f1ea] py-8 sm:py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-[#6b625a] sm:text-sm">
          <Link href="/home" className="hover:text-[#2a231f] hover:underline underline-offset-4">Home</Link>
          <FiChevronRight className="h-3.5 w-3.5" />
          <Link href="/shop" className="hover:text-[#2a231f] hover:underline underline-offset-4">Shop</Link>
          <FiChevronRight className="h-3.5 w-3.5" />
          <span className="text-[#2a231f]">Sale</span>
        </nav>

        <h1 className="text-3xl font-semibold leading-tight text-[#2a231f] sm:text-4xl lg:text-5xl">Sale</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#6b625a] sm:text-base">
          Handpicked pieces at special prices. Once they&apos;re gone, they&apos;re gone.
        </p>

        {/* Toolbar */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-[#e6e0d8] py-5">
          <p className="text-sm text-[#6b625a]" aria-live="polite">
            {isFetching && !currentData ? (
              "Loading products…"
            ) : (
              <>
                <strong className="text-[#2a231f]">{total}</strong> {total === 1 ? "product" : "products"} on sale
              </>
            )}
          </p>
          <label className="flex items-center gap-2 text-sm text-[#6b625a]">
            Sort by
            <select
              value={sortParam}
              onChange={(e) => update({ sort: e.target.value === "featured" ? null : e.target.value, page: null })}
              className={selectCls}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-8">
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

          {/* Pehli baar load: skeleton. Polling refresh ke dauran purane products dikhte rehte hain. */}
          {isFetching && !currentData && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6 xl:grid-cols-4" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} aria-hidden="true">
                  <div className="aspect-[4/5] animate-pulse bg-[#f1ebe3]" />
                  <div className="mt-4 h-3 w-1/3 animate-pulse bg-[#efe9e1]" />
                  <div className="mt-2 h-4 w-3/4 animate-pulse bg-[#efe9e1]" />
                  <div className="mt-3 h-4 w-1/3 animate-pulse bg-[#efe9e1]" />
                </div>
              ))}
            </div>
          )}

          {!isError && currentData && items.length > 0 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6 xl:grid-cols-4">
              {items.map((p, i) => (
                <SaleCard key={p._id} p={p} priority={i < 4} />
              ))}
            </div>
          )}

          {!isError && currentData && items.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-lg text-[#2a231f]">No sale products right now.</p>
              <p className="mt-2 text-sm text-[#6b625a]">Check back soon, new offers are added often.</p>
              <Link
                href="/shop"
                className="mt-5 inline-block text-sm font-medium text-[#2a231f] underline underline-offset-4 hover:text-[#8b5e3c]"
              >
                Browse all products
              </Link>
            </div>
          )}

          {totalPages > 1 && currentData && (
            <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3">
              <button type="button" className={navBtn} disabled={page <= 1} onClick={() => goPage(page - 1)}>
                <FiChevronLeft className="mr-1 h-4 w-4" /> Previous
              </button>
              <span className="text-sm text-[#6b625a]">
                Page {page} of {totalPages}
              </span>
              <button type="button" className={navBtn} disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
                Next <FiChevronRight className="ml-1 h-4 w-4" />
              </button>
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}

// useSearchParams ko Suspense mein hona chahiye warna production build error deta hai
export default function SalePage() {
  return (
    <Suspense fallback={null}>
      <SaleContent />
    </Suspense>
  );
}