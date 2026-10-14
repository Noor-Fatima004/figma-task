"use client";

// Rakho: src/app/components/storefront/CraftsmanshipBanner.tsx
// Use: <CraftsmanshipBanner /> (NewArrivals ke neeche, ya jahan dark banner chahiye)

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiImage } from "react-icons/fi";

// Apni image public folder mein rakho aur path yahan badlo (jaise /frontStoreImages/craftsmanship.jpg)
const BANNER_IMAGE = "/frontStoreImages/craftsmanship.jpg";

export default function CraftsmanshipBanner() {
  // Image na mile to broken icon ke bajaye soft placeholder dikhe
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <section className="bg-[#1a1613] py-6 sm:py-10 lg:py-12 2xl:py-16">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 2xl:max-w-[1680px] 2xl:px-12">
        {/* Mobile: image upar, text neeche. Large screen: text left (~30%), image right (~70%) */}
        <div className="grid items-stretch lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)] lg:gap-10 2xl:gap-16">
          {/* IMAGE */}
          <div className="relative order-1 aspect-[4/5] overflow-hidden bg-[#241e1a] sm:aspect-[4/3] lg:order-2 lg:aspect-auto lg:min-h-[620px] xl:min-h-[680px] 2xl:min-h-[780px]">
            {imgFailed ? (
              <div className="flex h-full w-full items-center justify-center">
                <FiImage className="h-12 w-12 text-[#4a4038]" />
              </div>
            ) : (
              <Image
                src={BANNER_IMAGE}
                alt="A dimly lit living room with a brass floor lamp and a deep green velvet sofa"
                fill
                unoptimized
                sizes="(min-width: 1024px) 68vw, 100vw"
                className="object-cover"
                onError={() => setImgFailed(true)}
              />
            )}
            {/* Image ke left kinare par halka fade (sirf lg+) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 hidden w-20 bg-gradient-to-r from-[#1a1613]/60 to-transparent lg:block"
            />
            {/* Mobile par image ke neeche halka fade, text se milane ke liye */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1a1613]/70 to-transparent lg:hidden"
            />
          </div>

          {/* TEXT PANEL */}
          <div className="order-2 flex flex-col justify-center px-1 py-8 sm:px-4 sm:py-10 lg:order-1 lg:px-0 lg:py-10">
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#c9a46c] sm:text-[11px]">
              Crafted with intention
            </p>

            <h2 className="mt-4 text-[32px] font-medium leading-[1.1] text-white sm:text-4xl lg:text-[34px] xl:text-[40px] 2xl:text-5xl">
              Made to last.
              <br />
              Designed to live with.
            </h2>

            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-[#d8d0c6] sm:mt-5 sm:text-sm 2xl:max-w-lg 2xl:text-base">
              From natural timber to hand-finished textures, every piece is considered for the
              way you live today — and for years to come.
            </p>

            {/* CTA buttons */}
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-3">
              <Link
                href="/craftsmanship"
                className="inline-flex w-full items-center justify-center gap-2 bg-[#f7f4ef] px-5 py-3.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#2a231f] transition hover:bg-white sm:w-auto"
              >
                Explore craftsmanship
                <FiArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/materials"
                className="inline-flex w-full items-center justify-center py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:text-[#c9a46c] sm:w-auto"
              >
                Discover materials
              </Link>
            </div>

            {/* Divider + footer line */}
            <div className="mt-8 max-w-sm border-t border-white/15 pt-5 sm:mt-10">
              <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#a89d90] sm:text-[10px]">
                01 — Material study
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[#e8e0d6] sm:text-xs">
                Oak · Linen · Leather · Stone
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}