"use client";

// Rakho: src/app/components/storefront/SignatureEdit.tsx
// Use: <SignatureEdit /> (CraftsmanshipBanner ke neeche, ya jahan best seller section chahiye)

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import QuickViewModal, {
  type SelectedVariation,
} from "@/app/components/storefront/QuickViewModal";
import { FiArrowRight, FiEye, FiHeart, FiImage, FiShuffle } from "react-icons/fi";
import { useGetStoreProductsQuery } from "@/store/storefrontApi";
import type { StorefrontProduct } from "@/store/storefrontTypes";
import { useWishlist } from "@/app/components/storefront/wishlistStore";
import { useCompare } from "@/app/components/storefront/compareStore";
import { useCart } from "@/app/components/storefront/cartStore";

// Price format: server aur browser dono par same rahe
const formatPrice = (n: number) => `Rs. ${n.toLocaleString("en-US")}`;

// Round icon base: hover colors yahan NAHI hain.
// Har button apna hover conditionally lagayega (active hone par hover kaam na kare).
const hoverIconBase =
  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/95 text-[#2a231f] shadow-sm transition sm:h-10 sm:w-10";

// Active nahi hai to hi hover lagta hai
const hoverIconIdle = "hover:bg-[#8b5e3c] hover:text-white";

// Product ki category ka naam nikalo (API jis shape mein bheje: string ya object).
// Agar tumhare StorefrontProduct mein iska apna field hai to yahan sirf wahi rakh sakte ho.
function getCategoryLabel(p: StorefrontProduct): string {
  const x = p as unknown as {
    categoryLabel?: string;
    categoryName?: string;
    category?: string | { name?: string; label?: string };
  };
  if (x.categoryLabel) return x.categoryLabel;
  if (x.categoryName) return x.categoryName;
  if (typeof x.category === "string") return x.category;
  return x.category?.label || x.category?.name || "";
}

// Agar product mein variations hain to card se seedha cart mein na daalo,
// pehle quick view khule taake user option chun sake.
function needsOptions(p: StorefrontProduct): boolean {
  const x = p as unknown as { variations?: unknown[]; variants?: unknown[] };
  return (x.variations?.length ?? 0) > 0 || (x.variants?.length ?? 0) > 0;
}

export default function SignatureEdit() {
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
  // Featured / best seller products: pehla "signature piece" (poori width),
  // baqi 3 neeche grid mein.
  const {
    currentData,
    isFetching: loading,
    isError,
    refetch,
  } = useGetStoreProductsQuery({ sort: "featured", limit: 4 });

  const items = currentData?.items ?? [];
  const product = items[0];
  const rest = items.slice(1, 4);
  const categoryLabel = product ? getCategoryLabel(product) : "";

  // Compare: list full ho aur product pehle se list mein na ho to kuch nahi hoga
  const handleCompare = (p: StorefrontProduct) => {
    if (!hasCompare(p.id) && compareFull) return;
    toggleCompare(p);
  };

  // Quick view popup se cart mein add (variation ke saath)
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

  // Card ke "Add to cart" button se
  const handleQuickAdd = (p: StorefrontProduct) => {
    if (needsOptions(p)) {
      setQuickView(p);
      return;
    }
    addItem(p, 1, { variations: [] });
  };

  return (
    <section className="border-t border-[#e6e0d8] bg-[#fdfcfa] py-10 sm:py-14 lg:py-16 2xl:py-20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 2xl:max-w-[1680px] 2xl:px-12">
        {/* HEADER */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
          <div>
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.25em] text-[#6b625a] sm:text-[11px]">
              The signature edit
            </p>
            <h2 className="max-w-md text-[28px] font-medium leading-tight text-[#2a231f] sm:text-4xl lg:text-5xl 2xl:max-w-xl 2xl:text-6xl">
              Pieces worth coming back to.
            </h2>
            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-[#4d453f] sm:text-sm 2xl:max-w-lg 2xl:text-base">
              Our most-loved designs, selected for their enduring form, comfort and character.
            </p>
          </div>

          <Link
            href="/shop/best-sellers"
            className="inline-flex shrink-0 items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-[#2a231f] transition hover:text-[#8b5e3c] sm:text-[11px]"
          >
            Shop best sellers
            <FiArrowRight />
          </Link>
        </div>

        {/* SIGNATURE PIECE: poori width. Mobile mein image upar, text neeche. lg+ par image left (~60%), text right */}
        <div className="mt-8 sm:mt-10">
          {/* Loading skeleton */}
          {loading && (
            <div
              aria-hidden="true"
              className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
            >
              <div className="aspect-[4/3] animate-pulse bg-[#f1ebe3] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[480px] 2xl:min-h-[580px]" />
              <div className="bg-[#f6f2ec] px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12 2xl:px-16">
                <div className="h-3 w-24 animate-pulse bg-[#e9e2d8]" />
                <div className="mt-4 h-3 w-16 animate-pulse bg-[#e9e2d8]" />
                <div className="mt-4 h-8 w-3/4 animate-pulse bg-[#e9e2d8]" />
                <div className="mt-4 h-3 w-20 animate-pulse bg-[#e9e2d8]" />
                <div className="mt-5 h-4 w-24 animate-pulse bg-[#e9e2d8]" />
              </div>
            </div>
          )}

          {!loading && product && (
            <article className="group grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              {/* IMAGE */}
              <Link
                href={`/product/${product.id}`}
                aria-label={`View ${product.name}`}
                className="relative block aspect-[4/3] overflow-hidden bg-[#f1ebe3] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[480px] 2xl:min-h-[580px]"
              >
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <FiImage className="h-12 w-12 text-[#c9c0b6]" />
                  </div>
                )}
                <span className="absolute left-3 top-3 bg-white/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#2a231f] sm:left-5 sm:top-5 sm:text-[10px]">
                  {product.badge || "Best seller"}
                </span>
              </Link>

              {/* TEXT PANEL */}
              <div className="flex flex-col justify-center bg-[#f6f2ec] px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12 2xl:px-16">
                <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#8b5e3c] sm:text-[11px]">
                  Signature piece
                </p>

                {categoryLabel && (
                  <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#6b625a] sm:text-[11px]">
                    {categoryLabel}
                  </p>
                )}

                <h3 className="mt-2 text-2xl font-medium leading-tight text-[#2a231f] sm:text-3xl 2xl:text-4xl">
                  {product.name}
                </h3>

                {product.material && (
                  <p className="mt-2 text-[13px] text-[#4d453f] sm:text-sm 2xl:text-base">
                    {product.material}
                  </p>
                )}

                <p className="mt-5 text-sm font-medium text-[#2a231f] sm:text-base">
                  {formatPrice(product.price)}
                  {product.originalPrice && (
                    <span className="ml-2 text-xs font-normal text-[#9a9087] line-through sm:text-sm">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </p>

                <Link
                  href={`/product/${product.id}`}
                  className="mt-6 inline-flex w-fit items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-[#2a231f] transition hover:text-[#8b5e3c] sm:mt-8 sm:text-[11px]"
                >
                  View piece
                  <FiArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </article>
          )}

          {isError && !loading && (
            <div className="flex items-center gap-4 text-sm text-[#6b625a]">
              <span>Signature pieces could not be loaded.</span>
              <button
                type="button"
                onClick={() => refetch()}
                className="font-medium text-[#2a231f] underline underline-offset-4 hover:text-[#8b5e3c]"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !isError && !product && (
            <p className="text-sm text-[#6b625a]">No featured pieces yet.</p>
          )}
        </div>

        {/* BAQI PRODUCTS: grid. Mobile par 2 cards, sm+ par 3 cards */}
        {(loading || rest.length > 0) && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:mt-10 sm:grid-cols-3 lg:mt-12 lg:gap-6 2xl:gap-8">
            {/* Loading skeleton */}
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} aria-hidden="true" className="max-sm:last:hidden">
                  <div className="aspect-[4/5] animate-pulse bg-[#f1ebe3]" />
                  <div className="mt-4 h-3 w-1/4 animate-pulse bg-[#efe9e1]" />
                  <div className="mt-2 h-4 w-3/4 animate-pulse bg-[#efe9e1]" />
                  <div className="mt-2 h-3 w-1/2 animate-pulse bg-[#efe9e1]" />
                </div>
              ))}

            {!loading &&
              rest.map((p) => {
                const isWished = has(p.id);
                const isCompared = hasCompare(p.id);
                const compareDisabled = !isCompared && compareFull;
                const label = getCategoryLabel(p);
                return (
                  <article key={p._id} className="group relative max-sm:last:hidden">
                    {/* IMAGE + hover actions + add to cart */}
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#f1ebe3]">
                      <Link
                        href={`/product/${p.id}`}
                        aria-label={`View ${p.name}`}
                        className="absolute inset-0 block"
                      >
                        {p.image && (
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            unoptimized
                            sizes="(min-width: 640px) 33vw, 50vw"
                            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          />
                        )}
                        {p.badge && (
                          <span className="absolute left-2 top-2 bg-white/90 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#2a231f] sm:left-3 sm:top-3 sm:px-2.5 sm:text-[10px]">
                            {p.badge}
                          </span>
                        )}
                      </Link>

                      {/* Hover icons: wishlist, quick view, compare */}
                      <div className="absolute right-2 top-2 flex flex-col gap-1.5 transition duration-200 sm:right-3 sm:top-3 sm:gap-2 lg:[@media(hover:hover)]:translate-x-2 lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-focus-within:translate-x-0 lg:[@media(hover:hover)]:group-focus-within:opacity-100 lg:[@media(hover:hover)]:group-hover:translate-x-0 lg:[@media(hover:hover)]:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => toggle(p)}
                          aria-label={
                            isWished
                              ? `Remove ${p.name} from wishlist`
                              : `Add ${p.name} to wishlist`
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

                      {/* Add to cart: image ke neeche. Desktop par hover par aata hai, touch par hamesha dikhta hai */}
                      <div className="absolute inset-x-2 bottom-2 transition duration-200 sm:inset-x-3 sm:bottom-3 lg:[@media(hover:hover)]:translate-y-2 lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-focus-within:translate-y-0 lg:[@media(hover:hover)]:group-focus-within:opacity-100 lg:[@media(hover:hover)]:group-hover:translate-y-0 lg:[@media(hover:hover)]:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(p)}
                          className="w-full bg-[#fdfcfa]/95 py-2.5 text-[9px] font-medium uppercase tracking-[0.2em] text-[#2a231f] transition hover:bg-[#2a231f] hover:text-white sm:py-3 sm:text-[10px]"
                        >
                          Add to cart
                        </button>
                      </div>
                    </div>

                    {/* Details */}
                    <Link href={`/product/${p.id}`} className="mt-3 block sm:mt-4">
                      {label && (
                        <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#6b625a] sm:text-[10px]">
                          {label}
                        </p>
                      )}
                      <h3 className="mt-1 text-sm font-medium text-[#2a231f] transition-colors group-hover:text-[#8b5e3c] sm:text-[15px] 2xl:text-base">
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
                    </Link>
                  </article>
                );
              })}
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