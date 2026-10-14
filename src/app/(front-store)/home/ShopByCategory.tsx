"use client";

// Rakho: src/app/components/storefront/ShopByCategory.tsx
// Use: <ShopByCategory /> (StoreHero ke neeche)

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiImage } from "react-icons/fi";
import { useGetStoreCategoriesQuery } from "@/store/storefrontApi";
import type { StorefrontCategory } from "@/store/storefrontTypes";

// Category ke saath image bhi aa sakti hai (API se). Dono naam handle kiye hain.
type CategoryWithImage = StorefrontCategory & {
  image?: string;
  imageUrl?: string;
};

function CategoryCard({ category }: { category: CategoryWithImage }) {
  // Image na ho ya load na ho to broken icon ke bajaye soft placeholder dikhe
  const [imgFailed, setImgFailed] = useState(false);
  const src = category.imageUrl || category.image || "";
  const showImage = !!src && !imgFailed;

  return (
    <Link
      href={`/shop?category=${encodeURIComponent(category.key)}`}
      className="group relative block aspect-[4/3] overflow-hidden bg-[#e7e0d6]"
    >
      {showImage ? (
        <Image
          src={src}
          alt={category.label}
          fill
          unoptimized
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <FiImage className="h-10 w-10 text-[#c9c0b6]" />
        </div>
      )}

      {/* Neeche halka dark gradient, taake white text saaf padhe */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent"
      />

      {/* Name (left) + Explore (right) */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-3 pb-3 text-white sm:px-4 sm:pb-3.5">
        <span className="text-xs font-medium sm:text-[13px]">{category.label}</span>
        <span className="inline-flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.2em] sm:text-[10px]">
          Explore
          <FiArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

export default function ShopByCategory() {
  // ---- Real data (API) ----
  const {
    data: categories = [],
    isLoading,
    isError,
    refetch,
  } = useGetStoreCategoriesQuery();

  return (
    <section className="border-t border-[#e6e0d8] bg-[#f0ebe3] py-10 sm:py-14 lg:py-16 2xl:py-20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 2xl:max-w-[1680px] 2xl:px-12">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#6b625a]">
              Shop by category
            </p>
            <h2 className="mt-3 text-3xl font-medium leading-tight text-[#2a231f] sm:text-4xl 2xl:text-5xl">
              Find your piece.
            </h2>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-[#4d453f] sm:text-sm">
              Explore considered furniture and objects designed for every corner of the home.
            </p>
          </div>

          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-[#2a231f] transition hover:text-[#8b5e3c]"
          >
            View all categories
            <FiArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* GRID: mobile 2 columns, large screen 4 columns */}
        <div
          aria-busy={isLoading}
          className="mt-8 grid grid-cols-2 gap-2.5 sm:mt-10 sm:gap-3 lg:grid-cols-4"
        >
          {/* Loading skeleton */}
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className="aspect-[4/3] animate-pulse bg-[#e7e0d6]"
              />
            ))}

          {!isLoading &&
            categories.map((category) => (
              <CategoryCard key={category._id} category={category as CategoryWithImage} />
            ))}
        </div>

        {isError && !isLoading && (
          <div className="mt-6 flex items-center gap-4 text-sm text-[#6b625a]">
            <span>Categories could not be loaded.</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="font-medium text-[#2a231f] underline underline-offset-4 hover:text-[#8b5e3c]"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !isError && categories.length === 0 && (
          <p className="mt-6 text-sm text-[#6b625a]">No categories yet.</p>
        )}
      </div>
    </section>
  );
}