"use client";

// Is file ko yahan rakho: app/wishlist/page.tsx  (src/app/... agar src folder use ho raha ho)

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiHeart, FiShoppingBag } from "react-icons/fi";
import type { StorefrontProduct } from "@/store/storefrontTypes";
import { useWishlist } from "@/app/components/storefront/wishlistStore";

const formatPrice = (n: number) => `Rs. ${n.toLocaleString("en-US")}`;

export default function WishlistPage() {
  const { items, count, remove, clear } = useWishlist();
  const router = useRouter();

  // TODO: apna cart action yahan lagao (CuratedCollection wale handleAddToCart jaisa)
  const handleAddToCart = (p: StorefrontProduct) => {
    void p;
  };

  const handleBack = () => {
    // Agar history me pichla page hai to wapas jao, warna home par bhejo
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      {/* BACK BUTTON */}
      <button
        type="button"
        onClick={handleBack}
        aria-label="Go back"
        className="group mb-6 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#e6e0d8] bg-white/70 px-3.5 py-2 text-[12px] font-medium text-[#2a231f] shadow-sm backdrop-blur transition-all duration-300 hover:-translate-x-0.5 hover:border-[#8b5e3c] hover:bg-[#8b5e3c] hover:text-white hover:shadow-md sm:mb-8 sm:px-4 sm:py-2.5 sm:text-[13px]"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f1ebe3] text-[#8b5e3c] transition-colors duration-300 group-hover:bg-white/20 group-hover:text-white sm:h-7 sm:w-7">
          <FiArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5 sm:h-4 sm:w-4" />
        </span>
        <span>Back</span>
      </button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium text-[#2a231f]">Wishlist</h1>
          <p className="mt-2 text-[13px] text-[#6b625a]">
            {count} {count === 1 ? "item" : "items"} saved
          </p>
        </div>
        {count > 0 && (
          <button
            type="button"
            onClick={clear}
            className="cursor-pointer text-[13px] font-medium text-[#8b5e3c] underline-offset-4 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {count === 0 ? (
        <div className="mt-12 flex flex-col items-center rounded-2xl border border-[#e6e0d8] bg-[#fdfcfa] px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f1ebe3] text-[#8b5e3c]">
            <FiHeart className="h-6 w-6" />
          </span>
          <h2 className="mt-5 text-lg font-medium text-[#2a231f]">Your wishlist is empty</h2>
          <p className="mt-2 max-w-sm text-[13px] text-[#6b625a]">
            Kisi bhi product ke heart par click karein, wo yahan save ho jayega.
          </p>
          <Link
            href="/home"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-[#8b5e3c] px-5 py-3 text-[13px] font-medium text-white transition hover:bg-[#6f4a2e]"
          >
            Continue shopping
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <li key={p.id} className="group relative flex flex-col">
              <Link href={`/product/${p.id}`} className="block">
                <div className="relative aspect-[4/5] sm:aspect-square lg:aspect-[4/5] overflow-hidden rounded-xl bg-[#f1ebe3]">
                  {p.image && (
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  )}
                  {p.badge && (
                    <span className="absolute left-3 top-3 bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2a231f]">
                      {p.badge}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-[14px] font-medium text-[#2a231f]">{p.name}</h3>
                {p.categoryLabel && (
                  <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[#6b625a]">
                    {p.categoryLabel}
                  </p>
                )}
                <p className="mt-1.5 text-[14px] font-medium text-[#2a231f]">
                  {formatPrice(p.price)}
                  {p.originalPrice && p.originalPrice > p.price && (
                    <span className="ml-2 text-xs font-normal text-[#9a9087] line-through">
                      {formatPrice(p.originalPrice)}
                    </span>
                  )}
                </p>
              </Link>

              {/* Brown heart, white circle: click karne par unwish (wishlist se remove) */}
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label={`Remove ${p.name} from wishlist`}
                aria-pressed
                className="absolute right-3 top-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white shadow-sm transition hover:scale-105"
              >
                <FiHeart className="h-[18px] w-[18px] fill-current text-[#8b5e3c]" />
              </button>

              {/* Add to cart */}
              <button
                type="button"
                onClick={() => handleAddToCart(p)}
                className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#8b5e3c] px-4 py-3 text-center text-[13px] font-medium text-white transition hover:bg-[#6f4a2e]"
              >
                <FiShoppingBag className="h-4 w-4" /> Add to cart
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}