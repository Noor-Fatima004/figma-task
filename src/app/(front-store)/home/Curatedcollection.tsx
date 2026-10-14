"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import QuickViewModal, {
  type SelectedVariation,
} from "@/app/components/storefront/QuickViewModal";
import {
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiHeart,
  FiShuffle,
} from "react-icons/fi";
import {
  useGetStoreCategoriesQuery,
  useGetStoreProductsQuery,
} from "@/store/storefrontApi";
import type { StorefrontProduct } from "@/store/storefrontTypes";
import { useWishlist } from "@/app/components/storefront/wishlistStore";
import { useCompare } from "@/app/components/storefront/compareStore";
import { useCart } from "@/app/components/storefront/cartStore";

// Price format: server aur browser dono par same rahe
const formatPrice = (n: number) => `Rs. ${n.toLocaleString("en-US")}`;

// Slider ke prev/next buttons ki style
const arrowBtn =
  "flex h-10 w-10 items-center justify-center border border-[#d9d0c6] bg-transparent text-[#2a231f] transition hover:bg-[#2a231f] hover:text-white disabled:cursor-not-allowed disabled:border-[#ece6de] disabled:text-[#c9c0b6] disabled:hover:bg-transparent disabled:hover:text-[#c9c0b6] sm:h-11 sm:w-11";

// Card ki width (slider ke hisaab se). Gap ke saath calc match hona zaroori hai:
//   mobile (<640)      : 2 cards, gap 1rem
//   small / tablet     : 3 cards, gap 1rem  (640px se 1023px tak)
//   laptop / large     : 4 cards, gap 1.5rem (1024px se 1535px tak)
//   extra large (2xl)  : 5 cards, gap 2rem   (1536px+)
const cardWidth =
  "w-[calc((100%-1rem)/2)] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-4.5rem)/4)] 2xl:w-[calc((100%-8rem)/5)]";

// Round icon base — hover colors yahan NAHI hain.
// Har button apna hover conditionally lagayega (active hone par hover kaam na kare).
const hoverIconBase =
  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/95 text-[#2a231f] shadow-sm transition sm:h-10 sm:w-10";

// Active nahi hai to hi hover lagta hai
const hoverIconIdle = "hover:bg-[#8b5e3c] hover:text-white";

export default function CuratedCollection() {
  // null = abhi user ne koi tab nahi chuna, pehli category use hogi
  const [active, setActive] = useState<string | null>(null);
  // Wishlist: store se (/wishlist page isi ko dikhata hai)
  const { has, toggle } = useWishlist();
  // Compare: store se (/compare page isi ko dikhata hai)
  const { toggle: toggleCompare, has: hasCompare, isFull: compareFull } = useCompare();
  // Cart: store se (CartDrawer isi ko dikhata hai)
  const { addItem } = useCart();
  // Jis product ka quick view popup khula hai
  const [quickView, setQuickView] = useState<StorefrontProduct | null>(null);
  const closeQuickView = useCallback(() => setQuickView(null), []);

  // ---- Real data (API) ----
  const {
    data: categories = [],
    isLoading: catsLoading,
    isError: catsError,
  } = useGetStoreCategoriesQuery();

  const activeKey = active ?? categories[0]?.key ?? "";

  const {
    currentData,
    isFetching: productsLoading,
    isError: productsError,
    refetch,
  } = useGetStoreProductsQuery({ category: activeKey, limit: 12 }, { skip: !activeKey });

  const products = currentData?.items ?? [];

  // ---- Slider ----
  // Cards ek hi row mein hoti hain. Products screen se zyada ho jayen to
  // prev/next buttons khud nazar aa jate hain, warna chhup jate hain.
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

  // Tab badalne ya products aane par slider shuru se dikhe
  const productCount = products.length;
  useEffect(() => {
    trackRef.current?.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior });
    updateArrows();
  }, [activeKey, productCount, updateArrows]);

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
  }, [updateArrows]);

  // Ek click par ek poora "page" (jitni cards nazar aa rahi hon) aage/peeche
  const slide = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: dir * (el.clientWidth + gap), behavior: "smooth" });
  };

  // Compare: list full ho aur product pehle se list mein na ho to kuch nahi hoga
  const handleCompare = (p: StorefrontProduct) => {
    if (!hasCompare(p.id) && compareFull) return;
    toggleCompare(p);
  };

  // Cart mein add karo (drawer khud khul jata hai). Quick view popup khula rehta hai,
  // drawer band karne par wapas active ho jata hai.
 const handleAddToCart = (
  p: StorefrontProduct,
  qty: number,
  variation?: SelectedVariation
) => {
  addItem(p, qty, {
    variations: variation?.ids ?? [],
    variantLabel: variation?.label,
  });
};

  return (
    <section className="bg-[#fdfcfa] py-10 sm:py-14 lg:py-16 2xl:py-20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 2xl:max-w-[1680px] 2xl:px-12">
        {/* HEADER */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.25em] text-[#6b625a] sm:text-xs">
              Curated for your space
            </p>
            <h2 className="text-[28px] font-medium leading-tight text-[#2a231f] sm:text-4xl lg:text-5xl 2xl:text-6xl">
              Find pieces that feel at home.
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#4d453f] sm:text-lg 2xl:max-w-2xl 2xl:text-xl">
              Explore our considered collection of furniture, designed to bring character and
              comfort to every room.
            </p>
          </div>

          <Link
            href="/shop"
            className="inline-flex shrink-0 items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#2a231f] transition hover:text-[#8b5e3c] sm:text-sm"
          >
            View all furniture
            <FiArrowRight />
          </Link>
        </div>

        {/* TABS: choti screen par side scroll */}
        <div className="mt-8 border-b border-[#e6e0d8] sm:mt-10">
          <div
            role="tablist"
            aria-label="Furniture categories"
            className="-mb-px flex gap-5 overflow-x-auto sm:gap-8 2xl:gap-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {catsLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="mb-3 h-4 w-20 shrink-0 animate-pulse bg-[#efe9e1]"
                  aria-hidden="true"
                />
              ))}

            {categories.map((c) => {
              const isActive = c.key === activeKey;
              return (
                <button
                  key={c._id}
                  type="button"
                  role="tab"
                  id={`tab-${c.key}`}
                  aria-selected={isActive}
                  aria-controls="curated-panel"
                  onClick={() => setActive(c.key)}
                  className={`relative shrink-0 whitespace-nowrap pb-3 text-sm transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:transition-colors sm:text-[15px] 2xl:text-base ${
                    isActive
                      ? "font-semibold text-[#2a231f] after:bg-[#2a231f]"
                      : "text-[#6b625a] after:bg-transparent hover:text-[#2a231f]"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories load nahi hui */}
        {catsError && (
          <p className="mt-8 text-sm text-[#6b625a]">
            Categories could not be loaded. Please refresh the page.
          </p>
        )}

        {/* PRODUCT GRID */}
        <div
          ref={trackRef}
          id="curated-panel"
          role="tabpanel"
          aria-labelledby={`tab-${activeKey}`}
          aria-busy={productsLoading}
          className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth sm:mt-10 lg:gap-6 2xl:gap-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Loading skeleton */}
          {(catsLoading || productsLoading) &&
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={cardWidth} aria-hidden="true">
                <div className="aspect-[4/5] sm:aspect-square lg:aspect-[4/5] animate-pulse bg-[#f1ebe3]" />
                <div className="mt-4 h-4 w-3/4 animate-pulse bg-[#efe9e1]" />
                <div className="mt-2 h-3 w-1/2 animate-pulse bg-[#efe9e1]" />
                <div className="mt-3 h-4 w-1/3 animate-pulse bg-[#efe9e1]" />
              </div>
            ))}

          {!productsLoading &&
            products.map((p, i) => {
              const isWished = has(p.id);
              const isCompared = hasCompare(p.id);
              const compareDisabled = !isCompared && compareFull;
              return (
                <article key={p._id} className={`group relative ${cardWidth}`}>
                  <Link href={`/product/${p.id}`} className="block">
                    <div className="relative aspect-[4/5] sm:aspect-square lg:aspect-[4/5] overflow-hidden bg-[#f1ebe3]">
                      {p.image && (
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          priority={i < 2}
                          unoptimized
                          sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                      )}
                      {p.badge && (
                        <span className="absolute left-2 top-2 bg-white/90 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#2a231f] sm:left-3 sm:top-3 sm:px-2.5 sm:text-[10px]">
                          {p.badge}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 sm:mt-4">
                      <h3 className="text-sm font-medium text-[#2a231f] transition-colors group-hover:text-[#8b5e3c] sm:text-[15px] 2xl:text-base">
                        {p.name}
                      </h3>
                      {p.material && (
                        <p className="mt-0.5 text-xs text-[#6b625a] sm:text-sm">{p.material}</p>
                      )}
                      <p className="mt-2 text-sm font-medium text-[#2a231f] sm:text-[15px] 2xl:text-base">
                        {formatPrice(p.price)}
                        {p.originalPrice && (
                          <span className="ml-2 text-xs font-normal text-[#9a9087] line-through sm:text-sm">
                            {formatPrice(p.originalPrice)}
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                  <div className="absolute right-2 top-2 flex flex-col gap-1.5 transition duration-200 sm:right-3 sm:top-3 sm:gap-2 lg:[@media(hover:hover)]:translate-x-2 lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-focus-within:translate-x-0 lg:[@media(hover:hover)]:group-focus-within:opacity-100 lg:[@media(hover:hover)]:group-hover:translate-x-0 lg:[@media(hover:hover)]:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => toggle(p)}
                      aria-label={
                        isWished ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`
                      }
                      aria-pressed={isWished}
                      className={`${hoverIconBase} ${
                        isWished ? "!text-[#8b5e3c]" : hoverIconIdle
                      }`}
                    >
                      <FiHeart
                        className={`h-4 w-4 sm:h-[18px] sm:w-[18px] ${isWished ? "fill-current" : ""}`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuickView(p)}
                      aria-label={`Quick view ${p.name}`}
                      aria-haspopup="dialog"
                      className={`${hoverIconBase} ${hoverIconIdle}`}
                    >
                      <FiEye className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCompare(p)}
                      aria-label={
                        isCompared
                          ? `Remove ${p.name} from compare`
                          : compareDisabled
                            ? "Compare list full"
                            : `Compare ${p.name}`
                      }
                      aria-pressed={isCompared}
                      disabled={compareDisabled}
                      className={`${hoverIconBase} ${
                        isCompared
                          ? "!bg-[#8b5e3c] !text-white"
                          : compareDisabled
                            ? "cursor-not-allowed opacity-50"
                            : hoverIconIdle
                      }`}
                    >
                      <FiShuffle className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                    </button>
                  </div>
                </article>
              );
            })}
        </div>

        {productsError && !productsLoading && (
          <div className="mt-6 flex items-center gap-4 text-sm text-[#6b625a]">
            <span>Products could not be loaded.</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="font-medium text-[#2a231f] underline underline-offset-4 hover:text-[#8b5e3c]"
            >
              Try again
            </button>
          </div>
        )}

        {!catsLoading &&
          !productsLoading &&
          !productsError &&
          !catsError &&
          activeKey &&
          products.length === 0 && (
            <p className="mt-6 text-sm text-[#6b625a]">No products in this category yet.</p>
          )}

        {hasOverflow && (
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => slide(-1)}
              disabled={!canPrev}
              aria-label="Previous products"
              className={arrowBtn}
            >
              <FiChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => slide(1)}
              disabled={!canNext}
              aria-label="Next products"
              className={arrowBtn}
            >
              <FiChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {quickView && (
        <QuickViewModal
          key={quickView.id}
          product={quickView}
          onClose={closeQuickView}
          wished={has(quickView.id)}
          onToggleWish={() => toggle(quickView)}
          onCompare={() => handleCompare(quickView)}
          onAddToCart={(qty, variation) => handleAddToCart(quickView, qty, variation)}
        />
      )}
    </section>
  );
}