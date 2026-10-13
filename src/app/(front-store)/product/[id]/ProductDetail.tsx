"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FiChevronRight } from "react-icons/fi";
import { useGetStoreProductQuery } from "@/store/storefrontApi";
import type { StorefrontProduct } from "@/store/storefrontTypes";

// Price format: server aur browser dono par same rahe
const formatPrice = (n: number) => `Rs. ${n.toLocaleString("en-US")}`;

// Admin editor se description HTML bhi aa sakti hai, usko safe plain text bana dete hain
const htmlToText = (html: string) =>
  html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

function RelatedCard({ p }: { p: StorefrontProduct }) {
  return (
    <Link href={`/product/${p.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#f1ebe3]">
        {p.image && (
          <Image
            src={p.image}
            alt={p.name}
            fill
            unoptimized
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        )}
      </div>
      <h3 className="mt-4 text-sm font-medium text-[#2a231f] transition-colors group-hover:text-[#8b5e3c] sm:text-[15px]">
        {p.name}
      </h3>
      {p.material && <p className="mt-0.5 text-xs text-[#6b625a] sm:text-sm">{p.material}</p>}
      <p className="mt-2 text-sm font-medium text-[#2a231f] sm:text-[15px]">
        {formatPrice(p.price)}
      </p>
    </Link>
  );
}

export default function ProductDetail() {
  // Folder ka naam [id] ho ya [slug], dono chalenge
  const params = useParams();
  const router = useRouter();
  const raw = params?.id ?? params?.slug ?? "";
  const slug = Array.isArray(raw) ? raw[0] : String(raw);

  // Breadcrumb me category par click: pichle page par wapas.
  // Agar user seedha is product ke link se aaya ho (peeche koi page nahi), to /home khulega.
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/home");
  };

  const { currentData, isFetching, isError, error, refetch } = useGetStoreProductQuery(slug, {
    skip: !slug,
  });

  // Kaun si image selected hai (product badalne par pehli image par wapas)
  const [sel, setSel] = useState({ slug: "", idx: 0 });
  const activeIdx = sel.slug === slug ? sel.idx : 0;

  const product = currentData?.product;
  const related = currentData?.related ?? [];
  const notFound = (error as { status?: number } | undefined)?.status === 404;

  /* ───── Loading ───── */
  if (isFetching || !slug) {
    return (
      <section className="bg-[#fdfcfa] py-10 sm:py-14">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8">
          <div className="aspect-[4/5] animate-pulse bg-[#f1ebe3]" />
          <div className="space-y-4 pt-4">
            <div className="h-4 w-32 animate-pulse bg-[#efe9e1]" />
            <div className="h-9 w-3/4 animate-pulse bg-[#efe9e1]" />
            <div className="h-6 w-40 animate-pulse bg-[#efe9e1]" />
            <div className="h-24 w-full animate-pulse bg-[#efe9e1]" />
          </div>
        </div>
      </section>
    );
  }

  /* ───── Not found / error ───── */
  if (isError || !product) {
    return (
      <section className="bg-[#fdfcfa] py-20">
        <div className="mx-auto max-w-xl px-4 text-center">
          <h1 className="text-2xl font-medium text-[#2a231f] sm:text-3xl">
            {notFound ? "Product not found" : "Something went wrong"}
          </h1>
          <p className="mt-3 text-[#6b625a]">
            {notFound
              ? "This product is not available anymore."
              : "We could not load this product. Please try again."}
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm">
            {!notFound && (
              <button
                type="button"
                onClick={() => refetch()}
                className="font-medium text-[#2a231f] underline underline-offset-4 hover:text-[#8b5e3c]"
              >
                Try again
              </button>
            )}
            <Link
              href="/home"
              className="font-medium text-[#2a231f] underline underline-offset-4 hover:text-[#8b5e3c]"
            >
              Back to home
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const images = product.images.length ? product.images : product.image ? [product.image] : [];
  const mainImage = images[activeIdx] ?? images[0];
  const description = product.description ? htmlToText(product.description) : "";

  return (
    <section className="bg-[#fdfcfa] py-8 sm:py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* BREADCRUMB */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-[#6b625a] sm:text-sm"
        >
          <Link
            href="/home"
            className="cursor-pointer hover:text-[#2a231f] hover:underline underline-offset-4"
          >
            Home
          </Link>
          <FiChevronRight className="h-3.5 w-3.5" />
          {product.categoryLabel && (
            <>
              <button
                type="button"
                onClick={goBack}
                className="cursor-pointer hover:text-[#2a231f] hover:underline underline-offset-4"
              >
                {product.categoryLabel}
              </button>
              <FiChevronRight className="h-3.5 w-3.5" />
            </>
          )}
          <span className="text-[#2a231f]">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          {/* GALLERY */}
          <div>
            <div className="relative aspect-[4/5] overflow-hidden bg-[#f1ebe3]">
              {mainImage && (
                <Image
                  src={mainImage}
                  alt={product.name}
                  fill
                  priority
                  unoptimized
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              )}
              {product.badge && (
                <span className="absolute left-3 top-3 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2a231f]">
                  {product.badge}
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-3">
                {images.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setSel({ slug, idx: i })}
                    aria-label={`Show image ${i + 1}`}
                    aria-pressed={i === activeIdx}
                    className={`relative aspect-square overflow-hidden bg-[#f1ebe3] ring-1 transition ${
                      i === activeIdx ? "ring-2 ring-[#2a231f]" : "ring-[#e6e0d8] hover:ring-[#2a231f]"
                    }`}
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      unoptimized
                      sizes="20vw"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INFO */}
          <div className="lg:pt-4">
            {product.categoryLabel && (
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-[#6b625a]">
                {product.categoryLabel}
              </p>
            )}
            <h1 className="text-3xl font-medium leading-tight text-[#2a231f] sm:text-4xl">
              {product.name}
            </h1>
            {product.material && (
              <p className="mt-2 text-base text-[#6b625a]">{product.material}</p>
            )}

            <p className="mt-5 text-2xl font-medium text-[#2a231f]">
              {formatPrice(product.price)}
              {product.originalPrice && (
                <span className="ml-3 text-base font-normal text-[#9a9087] line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </p>

            {description && (
              <div className="mt-6 border-t border-[#e6e0d8] pt-6">
                <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#2a231f]">
                  Description
                </h2>
                <p className="whitespace-pre-line text-base leading-relaxed text-[#4d453f]">
                  {description}
                </p>
              </div>
            )}

            {product.dimensions && (
              <div className="mt-6 border-t border-[#e6e0d8] pt-6">
                <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#2a231f]">
                  Dimensions
                </h2>
                <p className="text-base text-[#4d453f]">{product.dimensions}</p>
              </div>
            )}
          </div>
        </div>

        {/* RELATED */}
        {related.length > 0 && (
          <div className="mt-16 border-t border-[#e6e0d8] pt-10 sm:mt-20">
            <h2 className="text-2xl font-medium text-[#2a231f] sm:text-3xl">You may also like</h2>
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              {related.map((p) => (
                <RelatedCard key={p._id} p={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}