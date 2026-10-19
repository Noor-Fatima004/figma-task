"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiChevronLeft, FiChevronRight } from "react-icons/fi";

// Images apni /public/images folder mein rakho ya path badal do
const slides = [
  {
    eyebrow: "The Signature Collection",
    title: ["Designed for", "the way you live."],
    text: "Thoughtfully crafted furniture that brings warmth, balance and character to modern interiors.",
    product: "Velvet Three-Seat Sofa",
    image: "/frontStoreImages/furniture-hero-01.avif",
    primary: { label: "Explore Living Room", href: "/shop/living-room" },
    secondary: { label: "Discover The Collection", href: "/shop" },
  },
  {
    eyebrow: "The Dining Edit",
    title: ["Where materials", "become", "memories."],
    text: "Natural textures, considered proportions and timeless forms designed to stay with you.",
    product: "Oak Dining Table",
    image: "/frontStoreImages/furniture-hero-02.avif",
    primary: { label: "Explore Dining", href: "/shop/dining" },
    secondary: { label: "Explore Materials", href: "/shop" },
  },
  {
    eyebrow: "The Bedroom Series",
    title: ["Quiet spaces.", "Beautifully made."],
    text: "Create a bedroom that feels calm, considered and entirely your own.",
    product: "UPHOLSTERED PLATFORM BED",
    image: "/frontStoreImages/furniture-hero-03.avif",
    primary: { label: "Explore Bedroom", href: "/shop/bedroom" },
    secondary: { label: "View The Edit", href: "/shop" },
  },
];

export default function HeroSlider() {
  const [index, setIndex] = useState(0);
  const total = slides.length;

  // Auto-slide nahi hai: sirf user click karne par change hoga
  const next = () => setIndex((i) => (i + 1) % total);
  const prev = () => setIndex((i) => (i - 1 + total) % total);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    // Mobile + tablet: ek column (image upar, text neeche). Side-by-side 2 columns sirf laptop (lg, 1024px+) par.
    <section className="grid w-full grid-cols-1 bg-[#f7f3ee] lg:min-h-[calc(100vh-80px)] lg:grid-cols-2">
      {/* CONTENT: mobile/tablet par image ke neeche, laptop par left side */}
      <div className="order-2 flex flex-col px-5 pb-8 pt-4 sm:px-8 sm:py-10 lg:order-1 lg:px-10 lg:py-8 xl:px-16 2xl:px-24">
        {/*
          Saari slides ek hi grid cell mein stack hoti hain, is liye height
          sabse lambi slide ke hisab se fix rehti hai aur controls
          slide badalne par upar neeche nahi hilte.
        */}
        <div className="my-auto grid grid-cols-1">
          {slides.map((s, i) => {
            const active = i === index;
            return (
              <div
                key={s.image}
                aria-hidden={!active}
                className={`col-start-1 row-start-1 transition-[opacity,visibility,transform] duration-500 ease-out ${
                  active
                    ? "visible translate-y-0 opacity-100"
                    : "invisible translate-y-3 opacity-0"
                }`}
              >
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[#6b625a] sm:text-xs">
                  {s.eyebrow}
                </p>

                <h1 className="text-[clamp(1.625rem,6.5vw,2.5rem)] font-medium leading-[1.1] text-[#2a231f] lg:text-[clamp(1.5rem,min(3.4vw,6vh),3.5rem)]">
                  {s.title.map((line, n) => (
                    <span key={n} className="block">
                      {line}
                    </span>
                  ))}
                </h1>

                <p className="mt-3 max-w-md text-sm leading-relaxed text-[#4d453f] sm:text-base lg:text-[17px]">
                  {s.text}
                </p>

                <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[#6b625a] sm:text-xs">
                  {s.product}
                </p>

                {/* Dono buttons hamesha ek hi row mein */}
                <div className="mt-5 flex flex-row flex-nowrap items-center gap-3 sm:gap-5 lg:gap-4 xl:gap-6">
                  <Link
                    href={s.primary.href}
                    className="whitespace-nowrap bg-[#8b5e3c] px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#744c2e] sm:px-6 sm:text-xs sm:tracking-[0.18em] lg:px-5 xl:px-7"
                  >
                    {s.primary.label}
                  </Link>
                  <Link
                    href={s.secondary.href}
                    className="flex items-center gap-1.5 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.14em] text-[#2a231f] transition hover:text-[#8b5e3c] sm:gap-2 sm:text-xs sm:tracking-[0.18em]"
                  >
                    {s.secondary.label}
                    <FiArrowRight className="shrink-0" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Slider controls: mobile/tablet par text ke upar (center), laptop par neeche (left) */}
        <div className="order-first mb-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 lg:order-none lg:mb-0 lg:mt-6 lg:justify-start lg:pt-4">
          <span className="text-xs tracking-[0.2em] text-[#6b625a] sm:text-sm">
            {pad(index + 1)} <span className="mx-1 opacity-50">/</span> {pad(total)}
          </span>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="py-3"
              >
                <span
                  className={`block h-[2px] w-8 transition-colors sm:w-12 lg:w-8 xl:w-12 ${
                    i === index ? "bg-[#8b5e3c]" : "bg-[#d9d0c6]"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={prev}
              aria-label="Previous slide"
              className="flex h-10 w-10 items-center justify-center text-[#2a231f] transition hover:bg-[#8b5e3c] hover:text-white"
            >
              <FiChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              aria-label="Next slide"
              className="flex h-10 w-10 items-center justify-center text-[#2a231f] transition hover:bg-[#8b5e3c] hover:text-white"
            >
              <FiChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* IMAGE: koi top/bottom padding nahi, image seedha topbar se lagti hai.
          overflow-hidden + scale-110 = thodi zoom hui image, edges container se crop. */}
      <div className="order-1 flex flex-col lg:order-2">
        <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9] md:aspect-[2/1] lg:aspect-auto lg:min-h-0 lg:flex-1">
          {slides.map((s, i) => (
            <Image
              key={s.image}
              src={s.image}
              alt={s.product}
              fill
              priority={i === 0}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className={`scale-110 object-cover transition-opacity duration-700 ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}