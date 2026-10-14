"use client";

// Rakho: app/components/storefront/CartDrawer.tsx
// Ise storefront layout mein sirf EK baar render karo: <CartDrawer />

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiMinus, FiPlus, FiShoppingBag, FiX } from "react-icons/fi";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT,
  useCart,
} from "@/app/components/storefront/cartStore";

const formatPrice = (n: number) => `Rs. ${n.toLocaleString("en-US")}`;

// Summary mein 2 decimals (jaise Rs. 5,020.00)
const formatMoney = (n: number) =>
  `Rs. ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Khali cart ki image. Abhi random path hai, baad mein apni image ka path yahan badal do
// (public folder mein rakho, jaise: /images/empty-cart.jpg)
const EMPTY_CART_IMAGE = "/frontStoreImages/cart.jpg";

export default function CartDrawer() {
  const { items, open, count, subtotal, setQty, removeItem, closeCart } = useCart();
  // Image na mile to broken icon ke bajaye chhup jaye
  const [emptyImgFailed, setEmptyImgFailed] = useState(false);

  // Footer summary ka hisaab (tax checkout par lagta hai, drawer mein nahi)
  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shipping = freeShipping ? 0 : SHIPPING_FLAT;
  const total = subtotal + shipping;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  // Khula ho to: page scroll band + Escape se close
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Capture phase: Escape sirf drawer band kare, neeche khula quick view popup nahi
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        closeCart();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, closeCart]);

  return (
    <div
      className={`fixed inset-0 z-[80] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close shopping bag"
        onClick={closeCart}
        className={`absolute inset-0 h-full w-full cursor-default bg-[#1f1a17]/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel: mobile par full width, tablet/desktop par 420px */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        className={`absolute right-0 top-0 flex h-full w-full max-w-full flex-col bg-[#fdfcfa] shadow-2xl transition-[transform,visibility] duration-300 ease-out sm:max-w-[420px] ${
          open ? "visible translate-x-0" : "invisible translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#e6e0d8] px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="text-lg font-medium text-[#2a231f] sm:text-xl">Shopping Bag</h2>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[#6b625a]">
              {count} {count === 1 ? "item" : "items"}
            </p>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#2a231f] transition hover:bg-[#efe9e1]"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center overflow-y-auto px-5 py-6 text-center sm:px-6 sm:py-8">
            <div className="relative aspect-[4/5] w-full max-w-[220px] shrink-0 overflow-hidden bg-[#f1ebe3] sm:max-w-[260px]">
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

            <h3 className="mt-6 text-xl font-semibold text-[#2a231f] sm:text-2xl">
              Your bag is empty
            </h3>
            <p className="mt-2 text-sm text-[#6b625a]">
              Discover products from our furniture collection.
            </p>

            <Link
              href="/shop"
              onClick={closeCart}
              className="mt-6 block w-full bg-[#8b5e3c] py-3.5 text-center text-xs font-medium uppercase tracking-[0.2em] text-white transition hover:bg-[#6f4a2e]"
            >
              Explore collection
            </Link>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-[#e6e0d8] overflow-y-auto px-5 sm:px-6">
            {items.map((i) => (
              // key: product + variation, taake Blue aur Red alag lines rahein
              <li key={i.key} className="flex gap-3 py-4 sm:gap-4 sm:py-5">
                <Link
                  href={`/product/${i.id}`}
                  onClick={closeCart}
                  className="relative block h-[88px] w-[72px] shrink-0 overflow-hidden bg-[#f1ebe3] sm:h-[108px] sm:w-[88px]"
                >
                  {i.image && (
                    <Image
                      src={i.image}
                      alt={i.name}
                      fill
                      unoptimized
                      sizes="88px"
                      className="object-cover"
                    />
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <Link
                      href={`/product/${i.id}`}
                      onClick={closeCart}
                      className="line-clamp-2 text-[15px] font-medium text-[#2a231f] hover:text-[#8b5e3c] sm:text-base"
                    >
                      {i.name}
                    </Link>
                    {i.note && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-[#6b625a]">{i.note}</p>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center rounded-md border border-[#e6e0d8] bg-white">
                      <button
                        type="button"
                        onClick={() => setQty(i.key, i.qty - 1)}
                        disabled={i.qty <= 1}
                        aria-label={`Decrease quantity of ${i.name}`}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center text-[#2a231f] disabled:cursor-not-allowed disabled:text-[#c9c0b6]"
                      >
                        <FiMinus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-7 text-center text-[13px] font-medium text-[#2a231f]">
                        {i.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(i.key, i.qty + 1)}
                        aria-label={`Increase quantity of ${i.name}`}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center text-[#2a231f]"
                      >
                        <FiPlus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-sm font-medium text-[#2a231f] sm:text-[15px]">
                      {formatPrice(i.price * i.qty)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(i.key)}
                    className="mt-2 w-fit cursor-pointer text-[11px] uppercase tracking-[0.18em] text-[#6b625a] transition hover:text-[#8b5e3c]"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        {items.length > 0 && (
          <div className="space-y-3 border-t border-[#e6e0d8] bg-[#fdfcfa] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-5">
            {/* Free shipping banner + progress */}
            <div className="border border-[#efe9e1] bg-[#faf9f7] p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#6b625a]">
                Complimentary shipping
              </p>
              <p className="mt-2 text-sm text-[#2a231f] sm:text-[15px]">
                {freeShipping
                  ? "You\u2019ve unlocked complimentary shipping"
                  : `Add ${formatMoney(remaining)} more to unlock complimentary shipping`}
              </p>
              <div
                className="mt-3 h-0.5 w-full overflow-hidden bg-[#efe9e1]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                aria-label="Progress to complimentary shipping"
              >
                <div
                  className="h-full bg-[#8b5e3c] transition-[width] duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Subtotal / shipping / total */}
            <dl className="space-y-2.5 pt-1 text-sm">
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
              <div className="flex items-center justify-between gap-3 border-t border-[#e6e0d8] pt-3">
                <dt className="font-semibold text-[#2a231f]">Estimated total</dt>
                <dd className="font-semibold text-[#2a231f]">{formatMoney(total)}</dd>
              </div>
            </dl>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="block w-full bg-[#8b5e3c] py-3.5 text-center text-xs font-medium uppercase tracking-[0.2em] text-white transition hover:bg-[#6f4a2e]"
            >
              Checkout
            </Link>
            <Link
              href="/cart"
              onClick={closeCart}
              className="block w-full border border-[#e6e0d8] bg-white py-3.5 text-center text-xs font-medium uppercase tracking-[0.2em] text-[#2a231f] transition hover:border-[#8b5e3c] hover:text-[#8b5e3c]"
            >
              View shopping bag
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}