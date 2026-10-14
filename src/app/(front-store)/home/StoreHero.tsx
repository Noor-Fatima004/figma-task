"use client";

// Rakho: src/app/components/storefront/StoreHero.tsx
// Use: <StoreHero /> (home page par navbar ke neeche)

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiImage } from "react-icons/fi";

// Apni image public folder mein rakho aur path yahan badlo (jaise /frontStoreImages/hero.jpg)
const HERO_IMAGE = "/frontStoreImages/furniture-promo-banner.jpg";

export default function StoreHero() {
  // Image na mile to broken icon ke bajaye soft placeholder dikhe
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <section className="bg-[#f7f4ef] py-6 sm:py-10 lg:py-14 2xl:py-20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 2xl:max-w-[1680px] 2xl:px-12">
        {/* Mobile: image upar, text neeche. Large screen: image left (~62%), text right */}
        <div className="grid overflow-hidden lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* IMAGE */}
          <div className="relative aspect-[4/3] bg-[#f1ebe3] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[480px] 2xl:min-h-[580px]">
            {imgFailed ? (
              <div className="flex h-full w-full items-center justify-center">
                <FiImage className="h-12 w-12 text-[#c9c0b6]" />
              </div>
            ) : (
              <Image
                src={HERO_IMAGE}
                alt="Craftsperson sanding an oak panel on a wooden workbench"
                fill
                priority
                unoptimized
                sizes="(min-width: 1024px) 62vw, 100vw"
                className="object-cover"
                onError={() => setImgFailed(true)}
              />
            )}
            {/* Image ke right kinare par halka fade, text panel se milane ke liye (sirf lg+) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 hidden w-24 bg-gradient-to-r from-transparent to-[#f7f4ef]/70 lg:block"
            />
          </div>

          {/* TEXT PANEL */}
          <div className="flex flex-col justify-center bg-[#f7f4ef] px-1 py-8 sm:px-4 sm:py-10 lg:bg-white/40 lg:px-10 lg:py-12 2xl:px-14">
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#6b625a] sm:text-[11px]">
              The new collection
            </p>

            <h1 className="mt-4 text-[32px] font-medium leading-[1.1] text-[#2a231f] sm:text-4xl lg:text-[40px] xl:text-5xl 2xl:text-6xl">
              Bring warmth
              <br />
              into the everyday.
            </h1>

            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-[#4d453f] sm:mt-5 sm:text-sm lg:text-[15px] 2xl:max-w-lg 2xl:text-base">
              Discover sculptural forms, natural materials and timeless pieces created for
              beautifully lived-in spaces.
            </p>

            {/* CTA buttons */}
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:gap-6">
              <Link
                href="/shop"
                className="inline-flex w-full items-center justify-center gap-2 bg-[#8b5e3c] px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition hover:bg-[#6f4a2e] sm:w-auto"
              >
                Shop the collection
                <FiArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/collections"
                className="inline-flex w-full items-center justify-center py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#2a231f] transition hover:text-[#8b5e3c] sm:w-auto"
              >
                Explore the edit
              </Link>
            </div>

            {/* Divider + footer line */}
            <div className="mt-8 border-t border-[#e6e0d8] pt-5 sm:mt-10">
              <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#6b625a]">
                The living edit / 2026
              </p>
              <p className="mt-2 text-[13px] text-[#2a231f] sm:text-sm">Oak · Linen · Stone</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}