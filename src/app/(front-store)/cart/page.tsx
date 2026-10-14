"use client";

// Rakho: app/(front-store)/cart/page.tsx
// Login ki zaroorat nahi. Data cartStore se aata hai (CartDrawer wala hi cart).

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiChevronRight,
  FiMinus,
  FiPackage,
  FiPlus,
  FiRotateCcw,
  FiShield,
  FiShoppingBag,
} from "react-icons/fi";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT,
  useCart,
} from "@/app/components/storefront/cartStore";

const formatPrice = (n: number) => `Rs. ${n.toLocaleString("en-US")}`;

// Summary mein 2 decimals (jaise Rs. 5,020.00)
const formatMoney = (n: number) =>
  `Rs. ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Shipping rules cartStore.ts mein hain. Tax rate yahan se badlo:
const TAX_RATE = 0.0825; // 8.25%

// Khali cart ki image. Abhi placeholder path hai, baad mein apni image ka path badal do
const EMPTY_CART_IMAGE = "/images/empty-cart.jpg";

const TRUST = [
  {
    icon: FiPackage,
    title: "White-glove delivery",
    text: "Room-of-choice placement on qualifying orders.",
  },
  {
    icon: FiRotateCcw,
    title: "30-day returns",
    text: "Unopened pieces eligible for a full refund.",
  },
  {
    icon: FiShield,
    title: "Secure checkout",
    text: "Encrypted payment and order confirmation by email.",
  },
];

export default function CartPage() {
  const { items, count, subtotal, setQty, removeItem } = useCart();

  // Saved cart mount ke baad load hota hai; tab tak empty state na chamke
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [emptyImgFailed, setEmptyImgFailed] = useState(false);

  const isEmpty = mounted && items.length === 0;

  // Summary ka hisaab
  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shipping = freeShipping ? 0 : SHIPPING_FLAT;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + shipping + tax;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <section className="bg-[#f5f1ea] py-6 sm:py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 2xl:max-w-[1680px] 2xl:px-12">
        {/* BREADCRUMB */}
        <nav
          aria-label="Breadcrumb"
          className="mb-5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#6b625a] sm:mb-6 sm:text-sm"
        >
          <Link href="/home" className="underline-offset-4 hover:text-[#2a231f] hover:underline">
            Home
          </Link>
          <FiChevronRight className="h-3.5 w-3.5" />
          <Link href="/shop" className="underline-offset-4 hover:text-[#2a231f] hover:underline">
            Shop
          </Link>
          <FiChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-[#2a231f]">Your bag</span>
        </nav>

        {/* HEADING */}
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#8b5e3c] sm:text-[11px]">
          Showroom selection
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-[#2a231f] sm:text-5xl 2xl:text-6xl">
          Your selection
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#6b625a] sm:mt-4 sm:text-base">
          Review each piece, delivery timing, and order total. Proceed to checkout when your room
          edit is complete.
        </p>
        {mounted && count > 0 && (
          <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#6b625a]">
            {count} {count === 1 ? "piece" : "pieces"} in your selection
          </p>
        )}

        {/* TRUST BADGES */}
        <ul className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-3 md:gap-6">
          {TRUST.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e6e0d8] bg-white text-[#2a231f] sm:h-11 sm:w-11">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b5e3c] sm:text-[11px]">
                  {title}
                </p>
                <p className="mt-1 text-[13px] leading-snug text-[#4d453f] sm:text-sm">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 border-t border-[#e6e0d8] pt-8 sm:mt-10 sm:pt-10">
          {/* LOADING (saved cart load hone tak) */}
          {!mounted && (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy="true">
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-32 animate-pulse rounded-2xl bg-[#efe9e1]" />
                ))}
              </div>
              <div className="h-64 animate-pulse rounded-2xl bg-[#efe9e1]" />
            </div>
          )}

          {/* EMPTY STATE */}
          {isEmpty && (
            <div className="mx-auto flex max-w-md flex-col items-center py-6 text-center sm:py-10">
              <div className="relative aspect-[4/5] w-full max-w-[220px] overflow-hidden bg-[#f1ebe3] sm:max-w-[260px]">
                {emptyImgFailed ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <FiShoppingBag className="h-12 w-12 text-[#c9c0b6]" />
                  </div>
                ) : (
                  <Image
                    src={EMPTY_CART_IMAGE}
                    alt=""
                    fill
                    unoptimized
                    sizes="260px"
                    className="object-cover"
                    onError={() => setEmptyImgFailed(true)}
                  />
                )}
              </div>
              <h2 className="mt-6 text-xl font-semibold text-[#2a231f] sm:text-2xl">
                Your showroom selection is empty
              </h2>
              <p className="mt-2 text-sm text-[#6b625a]">
                When you are ready, explore the furniture collection.
              </p>
              <Link
                href="/shop"
                className="mt-6 block w-full bg-[#8b5e3c] py-3.5 text-center text-xs font-medium uppercase tracking-[0.2em] text-white transition hover:bg-[#6f4a2e]"
              >
                Explore collection
              </Link>
            </div>
          )}

          {/* ITEMS + SUMMARY */}
          {mounted && items.length > 0 && (
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
              {/* Items */}
              <ul className="divide-y divide-[#e6e0d8] rounded-2xl border border-[#e6e0d8] bg-white/60 px-4 sm:px-6">
                {items.map((i) => (
                  <li key={i.id} className="flex gap-4 py-5 sm:gap-6 sm:py-6">
                    <Link
                      href={`/product/${i.id}`}
                      className="relative block h-28 w-24 shrink-0 overflow-hidden bg-[#f1ebe3] sm:h-36 sm:w-32"
                    >
                      {i.image && (
                        <Image
                          src={i.image}
                          alt={i.name}
                          fill
                          unoptimized
                          sizes="128px"
                          className="object-cover"
                        />
                      )}
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/product/${i.id}`}
                            className="line-clamp-2 text-[15px] font-medium text-[#2a231f] transition-colors hover:text-[#8b5e3c] sm:text-lg"
                          >
                            {i.name}
                          </Link>
                          {i.note && (
                            <p className="mt-1 line-clamp-1 text-xs text-[#6b625a] sm:text-sm">
                              {i.note}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-[#9a9087] sm:text-sm">
                            {formatPrice(i.price)} each
                          </p>
                        </div>
                        <p className="shrink-0 text-[15px] font-medium text-[#2a231f] sm:text-lg">
                          {formatPrice(i.price * i.qty)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center rounded-md border border-[#e6e0d8] bg-white">
                          <button
                            type="button"
                            onClick={() => setQty(i.id, i.qty - 1)}
                            disabled={i.qty <= 1}
                            aria-label={`Decrease quantity of ${i.name}`}
                            className="flex h-9 w-9 cursor-pointer items-center justify-center text-[#2a231f] disabled:cursor-not-allowed disabled:text-[#c9c0b6]"
                          >
                            <FiMinus className="h-3.5 w-3.5" />
                          </button>
                          <span
                            className="w-8 text-center text-[13px] font-medium text-[#2a231f]"
                            aria-live="polite"
                          >
                            {i.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(i.id, i.qty + 1)}
                            aria-label={`Increase quantity of ${i.name}`}
                            className="flex h-9 w-9 cursor-pointer items-center justify-center text-[#2a231f]"
                          >
                            <FiPlus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(i.id)}
                          className="cursor-pointer text-[11px] uppercase tracking-[0.18em] text-[#6b625a] underline-offset-4 transition hover:text-[#8b5e3c] hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Order summary */}
              <aside className="rounded-2xl border border-[#e6e0d8] bg-white/60 p-5 sm:p-6 lg:sticky lg:top-28">
                <h2 className="text-xl font-semibold text-[#2a231f] sm:text-2xl">Order summary</h2>

                {/* Free shipping banner + progress */}
                <div className="mt-5 rounded-xl border border-[#efe9e1] bg-[#fdfcfa] p-4">
                  {freeShipping ? (
                    <>
                      <p className="flex items-center gap-2 text-sm font-medium text-[#2a231f] sm:text-[15px]">
                        <FiCheck className="h-4 w-4 shrink-0" />
                        Complimentary shipping unlocked
                      </p>
                      <p className="mt-1.5 text-[13px] text-[#6b625a] sm:text-sm">
                        Standard delivery is included for this order.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-[#2a231f] sm:text-[15px]">
                        Add {formatMoney(remaining)} more for complimentary shipping
                      </p>
                      <p className="mt-1.5 text-[13px] text-[#6b625a] sm:text-sm">
                        Free standard delivery on orders over {formatPrice(FREE_SHIPPING_THRESHOLD)}.
                      </p>
                    </>
                  )}
                  <div
                    className="mt-4 h-1 w-full overflow-hidden rounded-full bg-[#efe9e1]"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                    aria-label="Progress to complimentary shipping"
                  >
                    <div
                      className="h-full rounded-full bg-[#8b5e3c] transition-[width] duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <dl className="mt-5 space-y-3.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#6b625a]">Subtotal</dt>
                    <dd className="font-semibold text-[#2a231f]">{formatMoney(subtotal)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#6b625a]">Estimated shipping</dt>
                    <dd className={freeShipping ? "text-[#2a231f]" : "font-semibold text-[#2a231f]"}>
                      {freeShipping ? "Complimentary" : formatMoney(shipping)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#6b625a]">Estimated tax</dt>
                    <dd className="text-[#2a231f]">{formatMoney(tax)}</dd>
                  </div>
                </dl>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#e6e0d8] pt-5">
                  <span className="text-[15px] font-semibold text-[#2a231f]">Estimated total</span>
                  <span className="text-lg font-semibold text-[#2a231f] sm:text-xl">
                    {formatMoney(total)}
                  </span>
                </div>

                <Link
                  href="/checkout"
                  className="mt-6 flex w-full items-center justify-center gap-2 bg-[#2d221c] py-4 text-center text-xs font-medium uppercase tracking-[0.2em] text-white transition hover:bg-[#8b5e3c]"
                >
                  Proceed to checkout
                  <FiArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/shop"
                  className="mt-4 flex w-full items-center justify-center gap-2 text-center text-xs font-medium uppercase tracking-[0.2em] text-[#2a231f] transition hover:text-[#8b5e3c]"
                >
                  <FiArrowLeft className="h-4 w-4" />
                  Continue shopping
                </Link>
              </aside>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}