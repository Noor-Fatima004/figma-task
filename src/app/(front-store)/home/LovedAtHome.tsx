"use client";

// Rakho: src/app/components/storefront/LovedAtHome.tsx
// Use: <LovedAtHome /> (home page par Difference ke neeche)
// Data: GET /api/reviews (sirf approved reviews). Har 30 second baad aur tab wapas
// kholne par khud refresh hota hai, to naya approved review bina reload ke aa jata hai.
// Featured review ki image = us review ke product ki image (productId se).

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiStar } from "react-icons/fi";

// Fallback image: jab product ki image na mile (ya sample reviews hon)
const FEATURE_IMAGE = "/images/home/loved-at-home.jpg";
const REFRESH_MS = 30_000;

type PublicReview = {
  _id: string;
  name: string;
  productId?: string;
  productName: string;
  productImage?: string;
  productSlug?: string;
  rating: number;
  review: string;
  createdAt: string;
};

type Summary = { average: number; count: number; recommend: number };

// ⚠️ Sirf design dekhne ke liye placeholder reviews. Jab tak ek bhi asli approved review
// nahi hota tab tak ye dikhte hain. Launch se pehle USE_SAMPLES = false kar dena,
// kyunki dikhane wale customers ke liye ye asli nahi hain.
const USE_SAMPLES = true;

const SAMPLE_REVIEWS: PublicReview[] = [
  {
    _id: "s1",
    name: "Emily R.",
    productName: "Arden Modular Sofa",
    rating: 5,
    review:
      "Beautifully made, incredibly comfortable, and even better in person. The materials feel exceptional and the sofa completely changed the way we use the room.",
    createdAt: "",
  },
  {
    _id: "s2",
    name: "James M.",
    productName: "Linen Armchair",
    rating: 5,
    review: "The finish is beautiful and the proportions are exactly right.",
    createdAt: "",
  },
  {
    _id: "s3",
    name: "Olivia K.",
    productName: "Oak Dining Chair",
    rating: 5,
    review: "Delivery was seamless and the chair feels like something we'll keep for years.",
    createdAt: "",
  },
  {
    _id: "s4",
    name: "Noah K.",
    productName: "Walnut Coffee Table",
    rating: 5,
    review: "Quiet, solid craftsmanship, the kind of piece that settles a room.",
    createdAt: "",
  },
];

const SAMPLE_SUMMARY: Summary = { average: 4.9, count: 1200, recommend: 97 };

function Stars({ value, className = "h-3.5 w-3.5" }: { value: number; className?: string }) {
  return (
    <div className="flex gap-1 text-[#c4a57b]" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <FiStar key={n} className={`${className} ${n <= Math.round(value) ? "fill-current" : ""}`} />
      ))}
    </div>
  );
}

// Photo nahi hai, is liye naam ke pehle harf wala gol avatar
function Avatar({ name, className }: { name: string; className: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "C";
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#8b5e3c] font-medium text-white ${className}`}
    >
      {initials}
    </span>
  );
}

export default function LovedAtHome() {
  const [realReviews, setReviews] = useState<PublicReview[]>([]);
  const [realSummary, setSummary] = useState<Summary>({ average: 0, count: 0, recommend: 0 });
  const [loading, setLoading] = useState(true);

  // Asli reviews nahi hain (aur load ho chuka) to placeholder dikhao
  const usingSamples = USE_SAMPLES && !loading && realReviews.length === 0;
  const reviews = usingSamples ? SAMPLE_REVIEWS : realReviews;
  const summary = usingSamples ? SAMPLE_SUMMARY : realSummary;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/reviews", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setReviews(Array.isArray(data.items) ? data.items : []);
      setSummary({
        average: data.average ?? 0,
        count: data.count ?? 0,
        recommend: data.recommend ?? 0,
      });
    } catch {
      // network error: pehle wala data dikhta rehta hai
    } finally {
      setLoading(false);
    }
  }, []);

  // Pehli baar + har 30s + tab wapas active hone par
  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // Featured: sabse naya review (list pehle se newest-first aati hai).
  // Product ki image wale review ko pehle chuno, na ho to sabse naya 5-star, phir sabse naya.
  const featured =
    reviews.find((r) => r.productImage) ?? reviews.find((r) => r.rating === 5) ?? reviews[0];
  const others = reviews.filter((r) => r._id !== featured?._id).slice(0, 3);

  // Featured image: us review ke product ki image, warna fallback
  const featuredImage = featured?.productImage || FEATURE_IMAGE;
  const featuredHref = featured?.productSlug ? `/product/${featured.productSlug}` : null;

  // Samples band hon aur koi asli review na ho to section chhupa do
  if (!loading && reviews.length === 0) return null;

  return (
    <section className="border-t border-[#e0d9cf] bg-[#ede5dd] py-10 sm:py-14 lg:py-16 2xl:py-20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 2xl:max-w-[1680px] 2xl:px-12">
        {/* HEADER */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-8">
          <div>
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.25em] text-[#6b625a] sm:text-[11px]">
              Loved at home
            </p>
            <h2 className="max-w-[16ch] text-2xl font-medium leading-tight text-[#2a231f] sm:max-w-md sm:text-3xl lg:text-4xl 2xl:max-w-xl 2xl:text-5xl">
              Made for real homes. Chosen for a reason.
            </h2>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-[#4d453f] sm:text-[13px] 2xl:max-w-md 2xl:text-sm">
              Thoughtful pieces, considered materials and spaces our customers are proud to live
              with.
            </p>
          </div>

          {/* Rating card */}
          {summary.count > 0 && (
            <div className="flex w-full items-center gap-5 border border-[#e0d6cb] bg-[#f6f2ec] px-5 py-4 sm:w-auto sm:gap-6 sm:px-6">
              <div className="shrink-0">
                <p className="text-3xl font-medium leading-none text-[#2a231f] sm:text-4xl">
                  {summary.average.toFixed(1)}
                </p>
                <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.2em] text-[#6b625a] sm:text-[10px]">
                  Customer rating
                </p>
              </div>
              <div className="border-l border-[#d9d0c6] pl-5 sm:pl-6">
                <Stars value={summary.average} />
                <p className="mt-2 text-[11px] text-[#4d453f] sm:text-xs">
                  Based on {summary.count.toLocaleString("en-US")}{" "}
                  {summary.count === 1 ? "review" : "reviews"}
                </p>
                <p className="mt-0.5 text-[11px] text-[#9a8466] sm:text-xs">
                  {summary.recommend}% would recommend
                </p>
              </div>
            </div>
          )}
        </div>

        {/* LOADING */}
        {loading && (
          <div className="mt-8 sm:mt-10" aria-busy="true">
            <div className="grid animate-pulse overflow-hidden lg:grid-cols-2">
              <div className="aspect-[4/3] bg-[#e4ddd2] lg:aspect-auto lg:min-h-[420px]" />
              <div className="min-h-[260px] bg-[#3a2e27]" />
            </div>
          </div>
        )}

        {/* FEATURED VOICE */}
        {featured && (
          <div className="mt-8 grid overflow-hidden sm:mt-10 lg:grid-cols-2">
            <div className="relative aspect-[4/3] bg-[#e4ddd2] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[420px]">
              <Image
                key={featuredImage}
                src={featuredImage}
                alt={featured.productName || "A living room styled with our furniture"}
                fill
                unoptimized
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
              {featuredHref && (
                <Link
                  href={featuredHref}
                  aria-label={`View ${featured.productName}`}
                  className="absolute inset-0"
                />
              )}
            </div>

            <figure className="flex flex-col justify-center bg-[#2d221c] p-6 sm:p-10 lg:p-12 2xl:p-16">
              <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#c4a57b] sm:text-[11px]">
                Featured voice
              </p>
              <div className="mt-4">
                <Stars value={featured.rating} className="h-4 w-4" />
              </div>
              <blockquote className="mt-5 line-clamp-6 text-base font-medium leading-snug text-white sm:text-lg lg:text-xl 2xl:text-2xl">
                “{featured.review}”
              </blockquote>

              <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t border-white/15 pt-6">
                <figcaption className="flex items-center gap-3">
                  <Avatar name={featured.name} className="h-10 w-10 text-sm sm:h-11 sm:w-11" />
                  <div>
                    <p className="text-sm font-medium text-white">— {featured.name}</p>
                    <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-[#c4a57b]">
                      Customer
                    </p>
                  </div>
                </figcaption>
                {featuredHref ? (
                  <Link
                    href={featuredHref}
                    className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/90 underline-offset-4 hover:underline sm:text-[11px]"
                  >
                    {featured.productName}
                  </Link>
                ) : (
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/90 sm:text-[11px]">
                    {featured.productName}
                  </p>
                )}
              </div>
            </figure>
          </div>
        )}

        {/* MORE FROM OUR CUSTOMERS */}
        {others.length > 0 && (
          <div className="mt-10 sm:mt-12">
            <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.25em] text-[#6b625a] sm:text-[11px]">
              More from our customers
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 2xl:gap-8">
              {others.map((r, i) => (
                <figure
                  key={r._id}
                  className={`flex flex-col bg-[#f6f2ec] p-5 sm:p-6 ${
                    others.length === 3 && i === 2 ? "sm:col-span-2 lg:col-span-1" : ""
                  }`}
                >
                  <Stars value={r.rating} />
                  <blockquote className="mt-4 line-clamp-4 flex-1 text-xs leading-relaxed text-[#4d453f] sm:text-[13px]">
                    “{r.review}”
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-[#d9d0c6] pt-5">
                    <Avatar name={r.name} className="h-9 w-9 text-xs" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#2a231f]">— {r.name}</p>
                      <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.2em] text-[#9a8466]">
                        {r.productName}
                      </p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}