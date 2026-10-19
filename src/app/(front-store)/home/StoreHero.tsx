"use client";

// Rakho: src/app/components/storefront/StoreHero.tsx
// Use: <StoreHero /> (home page par navbar ke neeche)
// Image par scroll-linked smooth zoom: section se door hone par image zoom hoti hai,
// section par pahunchte hi apni asli position (scale 1) par aa jati hai.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiImage } from "react-icons/fi";

// Apni image public folder mein rakho aur path yahan badlo (jaise /frontStoreImages/hero.jpg)
const HERO_IMAGE = "/frontStoreImages/furniture-promo-banner.jpg";

// Zoom ki settings (chaho to badal do)
const MAX_ZOOM = 0.18; // 0.18 = zyada se zyada 18% extra zoom
const SMOOTHNESS = 0.08; // chhota number = zyada smooth/slow, bada = tez

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export default function StoreHero() {
  // Image na mile to broken icon ke bajaye soft placeholder dikhe
  const [imgFailed, setImgFailed] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Jin users ne "reduce motion" on kiya hai unke liye animation nahi
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const section = sectionRef.current;
    const el = zoomRef.current;
    if (!section || !el) return;

    // Section viewport ke beech se jitna door, utna zyada zoom. Beech ke paas scale = 1.
    const computeTarget = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const distance = Math.abs(rect.top + rect.height / 2 - vh / 2);
      const p = clamp((distance - vh * 0.15) / (vh * 0.6), 0, 1);
      return 1 + MAX_ZOOM * p;
    };

    let target = computeTarget();
    let current = target;
    let raf = 0;
    let running = false;

    const apply = () => {
      el.style.transform = `scale(${current.toFixed(4)})`;
    };

    const tick = () => {
      current += (target - current) * SMOOTHNESS;
      apply();
      if (Math.abs(target - current) > 0.0005) {
        raf = requestAnimationFrame(tick);
      } else {
        current = target;
        apply();
        running = false;
      }
    };

    const update = () => {
      target = computeTarget();
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    apply();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={sectionRef} className="bg-[#f7f4ef] py-6 sm:py-10 lg:py-14 2xl:py-20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 2xl:max-w-[1680px] 2xl:px-12">
        {/* Mobile: image upar, text neeche. Large screen: image left (~62%), text right */}
        <div className="grid overflow-hidden lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* IMAGE (overflow-hidden: zoom hone par image apne box se bahar na nikle) */}
          <div className="relative aspect-[4/3] overflow-hidden bg-[#f1ebe3] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[480px] 2xl:min-h-[580px]">
            {imgFailed ? (
              <div className="flex h-full w-full items-center justify-center">
                <FiImage className="h-12 w-12 text-[#c9c0b6]" />
              </div>
            ) : (
              <div ref={zoomRef} className="absolute inset-0 will-change-transform">
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
              </div>
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