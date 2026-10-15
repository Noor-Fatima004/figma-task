"use client";

// Rakho: src/app/components/storefront/Journal.tsx
// Use: <Journal /> (home page par NewArrivals ke neeche)
// Data: GET /api/brands (sirf wo brands jinke active products hain).
// Har 30 second baad aur tab wapas kholne par khud refresh hota hai.

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiChevronLeft, FiChevronRight } from "react-icons/fi";

// ⚠️ Section ka text yahan se badlo
const SECTION_LABEL = "Our brands";
const SECTION_TITLE = "Makers we believe in.";
const SECTION_TEXT =
  "Explore the brands behind our collection, chosen for craft, materials and lasting design.";
const VIEW_ALL_HREF = "/shop";
const VIEW_ALL_TEXT = "View all products";
const brandHref = (slug: string) => `/shop?brand=${slug}`;
const REFRESH_MS = 30_000;

type Brand = {
  _id: string;
  name: string;
  count: number;
  image: string;
};

// Slider ke prev/next buttons ki style
const arrowBtn =
  "flex h-10 w-10 items-center justify-center border border-[#d9d0c6] bg-transparent text-[#2a231f] transition hover:bg-[#2a231f] hover:text-white disabled:cursor-not-allowed disabled:border-[#e3dcd2] disabled:text-[#c9c0b6] disabled:hover:bg-transparent disabled:hover:text-[#c9c0b6] sm:h-11 sm:w-11";

// Card ki width (gap ke saath match hona zaroori hai):
//   mobile (<640)     : 2 cards, gap 1rem
//   tablet (640+)     : 3 cards, gap 1rem
//   laptop (1024+)    : 4 cards, gap 1.5rem
//   extra large (1536): 4 cards, gap 2rem
const cardWidth =
  "w-[calc((100%-1rem)/2)] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-4.5rem)/4)] 2xl:w-[calc((100%-6rem)/4)]";

export default function Journal() {
  // ---- Brands (real data) ----
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/brands", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setBrands(data);
    } catch {
      // network error: pehle wala data dikhta rehta hai
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // ---- Slider ----
  // Brands screen se zyada ho jayen to prev/next buttons khud nazar aate hain, warna chhup jate hain.
  const trackRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setHasOverflow(max > 1);
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft < max - 1);
  }, []);

  const brandCount = brands.length;
  useEffect(() => {
    updateArrows();
  }, [brandCount, loading, updateArrows]);

  // Scroll aur screen resize par buttons ki state update ho
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, loading]);

  // Ek click par ek poora "page" aage/peeche
  const slide = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: dir * (el.clientWidth + gap), behavior: "smooth" });
  };

  // Load ho chuka aur koi brand nahi to section chhupa do
  if (!loading && brands.length === 0) return null;

  return (
    <section className="border-t border-[#e0d9cf] bg-[#f0ebe4] py-10 sm:py-14 lg:py-16 2xl:py-20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 2xl:max-w-[1680px] 2xl:px-12">
        {/* HEADER */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
          <div>
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.25em] text-[#6b625a] sm:text-[11px]">
              {SECTION_LABEL}
            </p>
            <h2 className="max-w-[14ch] text-[28px] font-medium leading-tight text-[#2a231f] sm:max-w-md sm:text-4xl lg:text-5xl 2xl:max-w-xl 2xl:text-6xl">
              {SECTION_TITLE}
            </h2>
            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-[#4d453f] sm:text-sm 2xl:max-w-lg 2xl:text-base">
              {SECTION_TEXT}
            </p>
          </div>

          <Link
            href={VIEW_ALL_HREF}
            className="inline-flex shrink-0 items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-[#2a231f] transition hover:text-[#8b5e3c] sm:text-[11px]"
          >
            {VIEW_ALL_TEXT}
            <FiArrowRight />
          </Link>
        </div>

        {/* SLIDER BUTTONS: header ke neeche, right side (sirf jab brands zyada hon) */}
        {hasOverflow && (
          <div className="mt-6 flex justify-end gap-3 sm:mt-8">
            <button
              type="button"
              onClick={() => slide(-1)}
              disabled={!canPrev}
              aria-label="Previous brands"
              className={arrowBtn}
            >
              <FiChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => slide(1)}
              disabled={!canNext}
              aria-label="Next brands"
              className={arrowBtn}
            >
              <FiChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* BRAND SLIDER */}
        <div
          ref={trackRef}
          aria-busy={loading}
          className={`flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth lg:gap-6 2xl:gap-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            hasOverflow ? "mt-4 sm:mt-5" : "mt-8 sm:mt-10"
          }`}
        >
          {/* Loading skeleton */}
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cardWidth} aria-hidden="true">
                <div className="aspect-[4/5] animate-pulse bg-[#e4ddd2]" />
                <div className="mt-4 h-3 w-1/3 animate-pulse bg-[#e4ddd2]" />
                <div className="mt-2 h-4 w-2/3 animate-pulse bg-[#e4ddd2]" />
              </div>
            ))}

          {!loading &&
            brands.map((b, i) => (
              <article key={b._id} className={`group ${cardWidth}`}>
                <Link href={brandHref(b._id)} className="block">
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#e4ddd2]">
                    {b.image ? (
                      <Image
                        src={b.image}
                        alt={b.name}
                        fill
                        priority={i < 2}
                        unoptimized
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center text-5xl font-medium text-[#c9bfb2]"
                      >
                        {b.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 sm:mt-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#6b625a] sm:text-[11px]">
                      {b.count} {b.count === 1 ? "piece" : "pieces"}
                    </p>
                    <h3 className="mt-1.5 text-sm font-medium leading-snug text-[#2a231f] transition-colors group-hover:text-[#8b5e3c] sm:text-[15px] 2xl:text-base">
                      {b.name}
                    </h3>
                  </div>
                </Link>
              </article>
            ))}
        </div>
      </div>
    </section>
  );
}