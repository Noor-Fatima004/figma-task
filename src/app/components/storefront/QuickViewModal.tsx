"use client";

// Is file ko yahan rakho: components/storefront/QuickViewModal.tsx
// (path alag ho to CuratedCollection ka import badal lena)

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiHeart, FiMinus, FiPlus, FiShoppingBag, FiShuffle, FiX } from "react-icons/fi";
import type { StorefrontProduct } from "@/store/storefrontTypes";

const formatPrice = (n: number) => `Rs. ${n.toLocaleString("en-US")}`;

type Props = {
  product: StorefrontProduct;
  onClose: () => void;
  wished: boolean;
  onToggleWish: () => void;
  onCompare: () => void;
  onAddToCart: (qty: number) => void;
};

export default function QuickViewModal({
  product: p,
  onClose,
  wished,
  onToggleWish,
  onCompare,
  onAddToCart,
}: Props) {
  const [qty, setQty] = useState(1);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Modal khula ho to: page scroll band, Escape se close, close button par focus
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const outlineBtn =
    "inline-flex items-center justify-center gap-2 rounded-md border border-[#e6e0d8] bg-white px-4 py-3 text-[13px] font-medium text-[#2a231f] transition hover:border-[#8b5e3c] hover:text-[#8b5e3c]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view: ${p.name}`}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      {/* Overlay: click par band */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close quick view"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-[#1f1a17]/50 backdrop-blur-[2px]"
      />

      <div className="relative grid max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-[#fdfcfa] shadow-2xl md:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-square bg-[#f1ebe3] md:aspect-auto md:min-h-[340px] lg:min-h-[460px]">
          {p.image && (
            <Image
              src={p.image}
              alt={p.name}
              fill
              unoptimized
              sizes="(min-width: 768px) 440px, 100vw"
              className="object-cover"
            />
          )}
          {p.badge && (
            <span className="absolute left-4 top-4 bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2a231f]">
              {p.badge}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-medium leading-tight text-[#2a231f]">
                {p.name}
              </h2>
              {p.categoryLabel && (
                <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[#6b625a]">
                  {p.categoryLabel}
                </p>
              )}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#e6e0d8] text-[#2a231f] transition hover:border-[#8b5e3c] hover:text-[#8b5e3c]"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-4 text-lg font-medium text-[#2a231f]">
            {formatPrice(p.price)}
            {p.originalPrice && p.originalPrice > p.price && (
              <span className="ml-3 text-xs font-normal text-[#9a9087] line-through">
                {formatPrice(p.originalPrice)}
              </span>
            )}
          </p>

          {p.material && <p className="mt-4 text-[13px] text-[#6b625a]">{p.material}</p>}

          {/* Quantity */}
          <div className="mt-5 flex items-center gap-4">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#6b625a]">Qty</span>
            <div className="flex items-center rounded-full border border-[#e6e0d8] bg-white">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
                className="flex h-9 w-9 cursor-pointer items-center justify-center text-[#2a231f] disabled:cursor-not-allowed disabled:text-[#c9c0b6]"
              >
                <FiMinus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-[13px] font-medium text-[#2a231f]" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                aria-label="Increase quantity"
                className="flex h-9 w-9 cursor-pointer items-center justify-center text-[#2a231f]"
              >
                <FiPlus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Actions: 3 columns grid
              Row 1: Add to cart (2 cols) + Wishlist (1 col)
              Row 2: Compare (1 col, normal width) */}
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => onAddToCart(qty)}
              className="col-span-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#8b5e3c] px-5 py-3 text-center text-[13px] font-medium text-white transition hover:bg-[#6f4a2e]"
            >
              <FiShoppingBag className="h-4 w-4" /> Add to cart
            </button>
            <button
              type="button"
              onClick={onToggleWish}
              aria-pressed={wished}
              className={`${outlineBtn} w-full cursor-pointer`}
            >
              <FiHeart className={`h-4 w-4 ${wished ? "fill-current text-[#8b5e3c]" : ""}`} />
              Wishlist
            </button>
            <button
              type="button"
              onClick={onCompare}
              className={`${outlineBtn} w-full cursor-pointer`}
            >
              <FiShuffle className="h-4 w-4" /> Compare
            </button>
          </div>

          {/* Full details page par redirect: /product/<id> */}
          <Link
            href={`/product/${p.id}`}
            onClick={onClose}
            className="mt-6 inline-block text-[13px] font-medium text-[#8b5e3c] underline-offset-4 hover:underline"
          >
            View full product details
          </Link>
        </div>
      </div>
    </div>
  );
}