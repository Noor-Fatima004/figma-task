"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FiChevronRight,
  FiChevronLeft,
  FiChevronDown,
  FiMinus,
  FiPlus,
  FiTruck,
  FiRotateCcw,
  FiLock,
  FiShield,
  FiStar,
  FiCheckCircle,
  FiFeather,
  FiHeart,
  FiTool,
  FiArrowRight,
} from "react-icons/fi";
import { useGetStoreProductQuery } from "@/store/storefrontApi";
import type { StorefrontProduct } from "@/store/storefrontTypes";
import { useCart } from "@/app/components/storefront/cartStore";
import { useAvailability } from "@/app/components/storefront/useAvailability";

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

/* ───── Static content: yahan apna text edit kar sakte ho ───── */
const PERKS = [
  { icon: FiTruck, title: "Free Shipping", text: "Complimentary delivery on eligible orders." },
  { icon: FiRotateCcw, title: "30-Day Returns", text: "Hassle-free returns within 30 days of delivery." },
  { icon: FiLock, title: "Secure Checkout", text: "Encrypted payments and trusted payment partners." },
  { icon: FiShield, title: "Warranty", text: "Structural coverage on frames and joinery." },
];

const HIGHLIGHTS = [
  { icon: FiFeather, title: "Artisan finishing", text: "Hand-inspected details and soft-touch hardware throughout." },
  { icon: FiHeart, title: "Supportive comfort", text: "High-resilience cushioning with a relaxed sit." },
  { icon: FiTool, title: "Responsible materials", text: "Certified timber and low-VOC finishes where applicable." },
];

const QUOTE = {
  text: "Furniture should feel collected over time, not assembled in a day.",
  by: "Design studio",
};

const PAYMENTS = ["Visa", "Mastercard", "Apple Pay", "Google Pay", "PayPal"];

const CARE_TEXT = [
  "Dust regularly with a soft, dry cloth. Wipe spills immediately with a lightly damp cloth and dry the surface.",
  "Keep away from direct sunlight and heat sources to prevent fading and warping. Natural variation in grain and weave is part of the material's character.",
];

const SHIPPING_TEXT = [
  "Orders are processed within 1-3 business days. Delivery time depends on your location and the size of the item.",
  "If you are not satisfied, you can return the product within 30 days of delivery in its original condition.",
];

const FAQS = [
  {
    q: "How long does delivery take?",
    a: "Most orders arrive within 5-10 business days depending on your location and the size of the item.",
  },
  {
    q: "Can I return a large item?",
    a: "Yes. Returns are accepted within 30 days of delivery as long as the item is in its original condition.",
  },
  {
    q: "Is assembly required?",
    a: "Larger pieces are delivered ready to place. Smaller items may need light assembly, with instructions included.",
  },
];

type TabKey = "description" | "specs" | "care" | "shipping" | "reviews" | "faq";
const TABS: { key: TabKey; label: string }[] = [
  { key: "description", label: "Description" },
  { key: "specs", label: "Specifications" },
  { key: "care", label: "Materials & care" },
  { key: "shipping", label: "Shipping & returns" },
  { key: "reviews", label: "Reviews" },
  { key: "faq", label: "FAQ" },
];

// Backend se aksar ye fields bhi aati hain; type me na hon to bhi crash nahi karega
type ProductExtras = {
  sku?: string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  stock?: number;
};

// /api/reviews?productId= se aane wala review
type PublicReview = {
  _id: string;
  name: string;
  rating: number;
  review: string;
  createdAt?: string;
};

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <FiStar
          key={n}
          className={`h-4 w-4 ${
            n <= Math.round(value) ? "fill-[#c8a46b] text-[#c8a46b]" : "text-[#d9d1c7]"
          }`}
        />
      ))}
    </span>
  );
}

function RelatedCard({ p }: { p: StorefrontProduct }) {
  return (
    <div className="group">
      <Link href={`/product/${p.id}`} className="block">
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
          {p.badge && (
            <span className="absolute left-3 top-3 bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2a231f]">
              {p.badge}
            </span>
          )}
          {/* Hover par Add to cart bar */}
          <span className="absolute inset-x-0 bottom-0 translate-y-full bg-[#2a231f] py-3 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white transition-transform duration-300 group-hover:translate-y-0">
            View product
          </span>
        </div>
        {p.material && (
          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#9a9087]">
            {p.material}
          </p>
        )}
        <h3 className="mt-1 text-sm font-medium text-[#2a231f] transition-colors group-hover:text-[#8b5e3c] sm:text-[15px]">
          {p.name}
        </h3>
        <p className="mt-2 text-sm font-medium text-[#2a231f] sm:text-[15px]">
          {formatPrice(p.price)}
        </p>
      </Link>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#e6e0d8] py-3 text-sm">
      <dt className="text-[#6b625a]">{label}</dt>
      <dd className="text-right font-medium text-[#2a231f]">{value}</dd>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#e6e0d8]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-[#2a231f] sm:text-base"
      >
        {q}
        <FiChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="pb-4 text-sm leading-relaxed text-[#4d453f] sm:text-base">{a}</p>}
    </div>
  );
}

export default function ProductDetail() {
  // Folder ka naam [id] ho ya [slug], dono chalenge
  const params = useParams();
  const router = useRouter();
  const raw = params?.id ?? params?.slug ?? "";
  const slug = Array.isArray(raw) ? raw[0] : String(raw);

  // Cart: addItem se product cartStore mein jata hai aur CartDrawer khul jata hai
  const { addItem, closeCart } = useCart();

  // Breadcrumb me category par click: pichle page par wapas.
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

  // Quantity (product badalne par 1 par wapas)
  const [qtyState, setQtyState] = useState({ slug: "", n: 1 });
  const qty = qtyState.slug === slug ? qtyState.n : 1;
  const setQty = (n: number) => setQtyState({ slug, n: Math.max(1, Math.min(99, n)) });

  // Variations (product badalne par reset)
  const [picked, setPicked] = useState<{ slug: string; options: Record<string, string> }>({
    slug: "",
    options: {},
  });
  const pickedOptions = picked.slug === slug ? picked.options : {};
  const setOption = (groupId: string, optionId: string) =>
    setPicked((prev) => ({
      slug,
      options: { ...(prev.slug === slug ? prev.options : {}), [groupId]: optionId },
    }));

  const [tab, setTab] = useState<TabKey>("description");

  // Review form
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // Is product ke sab customers ke approved reviews
  const [reviewsData, setReviewsData] = useState<{
    items: PublicReview[];
    average: number;
    count: number;
  }>({ items: [], average: 0, count: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsTick, setReviewsTick] = useState(0); // badalne par reviews dobara load hote hain

  // Delivery check (abhi sirf UI, API se connect karna ho to handleCheckDelivery me)
  const [zip, setZip] = useState("");
  const [zipMsg, setZipMsg] = useState("");
  const handleCheckDelivery = () => {
    if (!zip.trim()) return setZipMsg("Please enter your postal code.");
    setZipMsg("Delivery is available to your area.");
  };

  const product = currentData?.product;
  const related = currentData?.related ?? [];
  const notFound = (error as { status?: number } | undefined)?.status === 404;

  // Variation state: hook se pehle chahiye, isliye early returns se UPAR (product undefined ho sakta hai)
  const groups = (product?.productType === "variable" ? (product.variationGroups ?? []) : []).filter(
    (g) => g.options && g.options.length > 0
  );
  const isVariable = groups.length > 0;
  const allPicked = !isVariable || groups.every((g) => Boolean(pickedOptions[g.id]));
  const selectedIds: string[] = isVariable
    ? groups.map((g) => pickedOptions[g.id]).filter(Boolean)
    : [];

  // IMPORTANT: har hook early returns se PEHLE call hona chahiye
  const { availability } = useAvailability(
    product && allPicked ? product._id : undefined,
    selectedIds
  );

  // /product/<slug>#reviews se aane par Reviews tab kholo aur form dikhao
  const productKey = product?._id;
  useEffect(() => {
    if (!productKey || typeof window === "undefined") return;
    if (window.location.hash === "#reviews") {
      setTab("reviews");
      setReviewOpen(true);
      setTimeout(() => {
        document.getElementById("pdp-information")?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    }
  }, [productKey, slug]);

  // Product khulte hi uske sab approved reviews load karo (naya customer bhi purane dekhe)
  useEffect(() => {
    if (!productKey) return;
    let cancelled = false;
    setReviewsLoading(true);
    fetch(`/api/reviews?productId=${encodeURIComponent(String(productKey))}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setReviewsData({
          items: Array.isArray(d.items) ? d.items : [],
          average: Number(d.average) || 0,
          count: Number(d.count) || 0,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productKey, reviewsTick]);

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

  /* ───── Yahan se neeche koi hook nahi, sirf plain values ───── */
  const images = product.images.length ? product.images : product.image ? [product.image] : [];
  const mainImage = images[activeIdx] ?? images[0];
  const description = product.description ? htmlToText(product.description) : "";
  const descriptionParagraphs = description ? description.split(/\n{2,}/) : [];
  const { sku, brand, rating, reviewCount, stock } = product as StorefrontProduct & ProductExtras;
  const inStock = stock === undefined ? true : stock > 0;

  // Reviews API ka data pehle, na ho to product ki apni rating
  const avgRating = reviewsData.count > 0 ? reviewsData.average : rating;
  const totalReviews = reviewsData.count > 0 ? reviewsData.count : reviewCount;

  const variantLabel = isVariable
    ? groups
        .map((g) => g.options.find((o) => o.id === pickedOptions[g.id])?.name)
        .filter(Boolean)
        .join(" / ")
    : undefined;

  const soldOut = isVariable ? allPicked && availability?.status === "out" : !inStock;
  const canOrder = inStock && (!isVariable || allPicked) && !soldOut;

  const showImage = (i: number) => setSel({ slug, idx: (i + images.length) % images.length });

  // Cart mein product add karo (CartDrawer apne aap khul jata hai)
  const handleAddToCart = () => {
    if (!canOrder) return;
    addItem(product, qty, {
      variations: selectedIds,
      variantLabel,
      image: product.image || images[0],
    });
  };
  const handleBuyNow = () => {
    if (!canOrder) return;
    addItem(product, qty, {
      variations: selectedIds,
      variantLabel,
      image: product.image || images[0],
    });
    closeCart(); // addItem drawer kholta hai, checkout par jaate waqt band kar do
    router.push("/checkout");
  };

  const submitReview = async () => {
    if (!reviewRating) {
      setReviewMsg({ type: "error", text: "Please select a star rating." });
      return;
    }
    setReviewSubmitting(true);
    setReviewMsg(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: String(product._id),
          productName: product.name,
          rating: reviewRating,
          review: reviewComment.trim(),
        }),
      });
      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(`/product/${slug}#reviews`)}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not submit your review.");
      setReviewMsg({ type: "ok", text: "Thank you! Your review has been submitted." });
      setReviewRating(0);
      setReviewComment("");
      setReviewOpen(false);
      setReviewsTick((t) => t + 1);
      refetch();
    } catch (e) {
      setReviewMsg({
        type: "error",
        text: e instanceof Error ? e.message : "Could not submit your review.",
      });
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <section className="bg-[#fdfcfa] py-8 sm:py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* BREADCRUMB */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-[#6b625a] sm:text-sm"
        >
          <Link href="/home" className="hover:text-[#2a231f] hover:underline underline-offset-4">
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
          {/* GALLERY: thumbnails left (desktop) / below (mobile) */}
          <div className="flex flex-col-reverse gap-3 lg:sticky lg:top-24 lg:flex-row lg:gap-4 lg:self-start">
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-3 lg:flex lg:w-20 lg:shrink-0 lg:flex-col lg:gap-3">
                {images.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setSel({ slug, idx: i })}
                    aria-label={`Show image ${i + 1}`}
                    aria-pressed={i === activeIdx}
                    className={`relative aspect-square overflow-hidden bg-[#f1ebe3] transition lg:w-20 ${
                      i === activeIdx
                        ? "ring-2 ring-[#2a231f]"
                        : "ring-1 ring-[#e6e0d8] hover:ring-[#2a231f]"
                    }`}
                  >
                    <Image src={src} alt="" fill unoptimized sizes="80px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="relative aspect-[4/5] flex-1 overflow-hidden bg-[#f1ebe3]">
              {mainImage && (
                <Image
                  src={mainImage}
                  alt={product.name}
                  fill
                  priority
                  unoptimized
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
              )}
              {product.badge && (
                <span className="absolute left-3 top-3 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2a231f]">
                  {product.badge}
                </span>
              )}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => showImage(activeIdx - 1)}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#2a231f] shadow transition hover:bg-white"
                  >
                    <FiChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => showImage(activeIdx + 1)}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#2a231f] shadow transition hover:bg-white"
                  >
                    <FiChevronRight className="h-4 w-4" />
                  </button>
                  <span className="absolute bottom-3 right-3 bg-white/90 px-2 py-0.5 text-[11px] font-medium text-[#2a231f]">
                    {activeIdx + 1} / {images.length}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* INFO */}
          <div className="lg:pt-2">
            {product.categoryLabel && (
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-[#6b625a]">
                {product.categoryLabel}
              </p>
            )}
            <h1 className="text-3xl font-medium leading-tight text-[#2a231f] sm:text-4xl">
              {product.name}
            </h1>

            {/* Rating row: sirf tab dikhegi jab backend rating de */}
            {typeof rating === "number" && rating > 0 && (
              <div className="mt-3 flex items-center gap-3 text-sm text-[#6b625a]">
                <Stars value={rating} />
                {reviewCount ? <span>({reviewCount})</span> : null}
                <button
                  type="button"
                  onClick={() => {
                    setTab("reviews");
                    document.getElementById("pdp-information")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="underline underline-offset-4 hover:text-[#2a231f]"
                >
                  Read reviews
                </button>
              </div>
            )}

            {descriptionParagraphs[0] && (
              <p className="mt-4 line-clamp-3 text-base leading-relaxed text-[#4d453f]">
                {descriptionParagraphs[0]}
              </p>
            )}

            <p className="mt-5 text-2xl font-medium text-[#2a231f]">
              {formatPrice(product.price)}
              {product.originalPrice && (
                <span className="ml-3 text-base font-normal text-[#9a9087] line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </p>

            {/* Stock line */}
            <p
              className={`mt-3 flex items-center gap-2 text-sm ${
                canOrder || (!allPicked && isVariable)
                  ? "text-[#4d6b4a]"
                  : "text-[#a14b3b]"
              }`}
            >
              <FiCheckCircle className="h-4 w-4" />
              {soldOut
                ? "Currently out of stock"
                : isVariable && !allPicked
                  ? "Please select options to check availability"
                  : availability?.status === "low"
                    ? `Only ${availability.available} left in stock`
                    : inStock
                      ? "In stock. White-glove delivery available"
                      : "Currently out of stock"}
            </p>

            {/* Quick spec rows */}
            <dl className="mt-6 border-t border-[#e6e0d8]">
              <SpecRow label="SKU" value={sku} />
              <SpecRow label="Brand" value={brand} />
              <SpecRow label="Category" value={product.categoryLabel} />
              <SpecRow label="Material" value={product.material} />
            </dl>

            {/* Variation Selectors (for variable products) */}
            {groups.map((g) => {
              const selectedOptionId = pickedOptions[g.id];
              const selectedOption = g.options.find((o) => o.id === selectedOptionId);
              return (
                <div key={g.id} className="mt-6 border-t border-[#e6e0d8] pt-5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#2a231f]">
                      {g.name}:{" "}
                      <span className="font-normal text-[#6b625a]">
                        {selectedOption?.name ?? "Choose an option"}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.options.map((o) => {
                      const active = selectedOptionId === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setOption(g.id, o.id)}
                          className={`cursor-pointer rounded border px-4 py-2.5 text-xs font-medium uppercase tracking-wider transition ${
                            active
                              ? "border-[#2a231f] bg-[#2a231f] text-white"
                              : "border-[#d9d1c7] bg-white text-[#2a231f] hover:border-[#2a231f]"
                          }`}
                        >
                          {o.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Quantity + actions */}
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#2a231f]">
                Quantity
              </p>
              <div className="flex flex-wrap items-stretch gap-3">
                <div className="flex items-center border border-[#d9d1c7] bg-white">
                  <button
                    type="button"
                    onClick={() => setQty(qty - 1)}
                    disabled={qty <= 1}
                    aria-label="Decrease quantity"
                    className="flex h-12 w-11 items-center justify-center text-[#2a231f] transition hover:bg-[#f1ebe3] disabled:opacity-40"
                  >
                    <FiMinus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium text-[#2a231f]" aria-live="polite">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty(qty + 1)}
                    aria-label="Increase quantity"
                    className="flex h-12 w-11 items-center justify-center text-[#2a231f] transition hover:bg-[#f1ebe3]"
                  >
                    <FiPlus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!canOrder}
                  className="h-12 min-w-[10rem] flex-1 bg-[#2a231f] px-6 text-sm font-medium uppercase tracking-[0.15em] text-white transition hover:bg-[#8b5e3c] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isVariable && !allPicked
                    ? "Select options"
                    : soldOut
                      ? "Out of stock"
                      : "Add to cart"}
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={!canOrder}
                  className="h-12 min-w-[10rem] flex-1 border border-[#2a231f] bg-transparent px-6 text-sm font-medium uppercase tracking-[0.15em] text-[#2a231f] transition hover:bg-[#2a231f] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Buy now
                </button>
              </div>
            </div>

            {/* Perks */}
            <ul className="mt-8 grid gap-4 border-t border-[#e6e0d8] pt-6 sm:grid-cols-2">
              {PERKS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#8b5e3c]" />
                  <div>
                    <p className="text-sm font-medium text-[#2a231f]">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#6b625a]">{text}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Delivery & pickup */}
            <div className="mt-6 border border-[#e6e0d8] bg-white p-4 sm:p-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#2a231f]">
                Delivery &amp; pickup
              </p>
              <label htmlFor="pdp-zip" className="mt-3 block text-xs text-[#6b625a]">
                ZIP / Postal code
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="pdp-zip"
                  value={zip}
                  onChange={(e) => {
                    setZip(e.target.value);
                    setZipMsg("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleCheckDelivery()}
                  className="h-11 min-w-0 flex-1 border border-[#d9d1c7] bg-white px-3 text-sm text-[#2a231f] outline-none focus:border-[#2a231f]"
                />
                <button
                  type="button"
                  onClick={handleCheckDelivery}
                  className="h-11 border border-[#2a231f] px-5 text-xs font-medium uppercase tracking-[0.15em] text-[#2a231f] transition hover:bg-[#2a231f] hover:text-white"
                >
                  Check
                </button>
              </div>
              {zipMsg && <p className="mt-2 text-xs text-[#6b625a]">{zipMsg}</p>}
            </div>

            {/* Secure payment */}
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#2a231f]">
                Secure payment
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {PAYMENTS.map((p) => (
                  <li
                    key={p}
                    className="border border-[#e6e0d8] bg-white px-3 py-1.5 text-xs font-medium text-[#4d453f]"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div id="pdp-information" className="mt-14 scroll-mt-24 border-t border-[#e6e0d8] pt-8 sm:mt-16">
          <div
            role="tablist"
            aria-label="Product information"
            className="flex gap-6 overflow-x-auto border-b border-[#e6e0d8] sm:gap-8"
          >
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? "border-[#2a231f] text-[#2a231f]"
                    : "border-transparent text-[#6b625a] hover:text-[#2a231f]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" className="max-w-3xl py-8">
            {tab === "description" && (
              <>
                {descriptionParagraphs.length > 0 ? (
                  <>
                    <h2 className="mb-4 text-2xl font-medium text-[#2a231f] sm:text-3xl">
                      Designed for everyday living
                    </h2>
                    <div className="space-y-4 text-base leading-relaxed text-[#4d453f]">
                      {descriptionParagraphs.map((para, i) => (
                        <p key={i} className="whitespace-pre-line">
                          {para}
                        </p>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-[#6b625a]">No description available.</p>
                )}

                <ul className="mt-8 grid gap-6 sm:grid-cols-3">
                  {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
                    <li key={title}>
                      <Icon className="h-5 w-5 text-[#8b5e3c]" />
                      <p className="mt-3 text-sm font-medium text-[#2a231f]">{title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-[#6b625a]">{text}</p>
                    </li>
                  ))}
                </ul>

                <blockquote className="mt-10 border-l-2 border-[#8b5e3c] pl-5">
                  <p className="text-lg italic leading-relaxed text-[#2a231f] sm:text-xl">
                    &ldquo;{QUOTE.text}&rdquo;
                  </p>
                  <footer className="mt-2 text-sm text-[#6b625a]">{QUOTE.by}</footer>
                </blockquote>
              </>
            )}

            {tab === "specs" && (
              <dl className="border-t border-[#e6e0d8]">
                <SpecRow label="SKU" value={sku} />
                <SpecRow label="Brand" value={brand} />
                <SpecRow label="Category" value={product.categoryLabel} />
                <SpecRow label="Material" value={product.material} />
                <SpecRow label="Dimensions" value={product.dimensions} />
                {!sku && !brand && !product.material && !product.dimensions && (
                  <p className="pt-4 text-[#6b625a]">No specifications available.</p>
                )}
              </dl>
            )}

            {tab === "care" && (
              <div className="space-y-4 text-base leading-relaxed text-[#4d453f]">
                {product.material && (
                  <p>
                    <span className="font-medium text-[#2a231f]">Material:</span> {product.material}
                  </p>
                )}
                {CARE_TEXT.map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
              </div>
            )}

            {tab === "shipping" && (
              <div className="space-y-4 text-base leading-relaxed text-[#4d453f]">
                {SHIPPING_TEXT.map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
              </div>
            )}

            {tab === "reviews" && (
              <div className="text-[#6b625a]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {typeof avgRating === "number" && avgRating > 0 ? (
                    <div className="flex items-center gap-3">
                      <Stars value={avgRating} />
                      <span className="text-sm">
                        {avgRating.toFixed(1)} out of 5
                        {totalReviews
                          ? ` (${totalReviews} ${totalReviews === 1 ? "review" : "reviews"})`
                          : ""}
                      </span>
                    </div>
                  ) : reviewsLoading ? (
                    <p>Loading reviews...</p>
                  ) : (
                    <p>No reviews yet. Be the first to review this product.</p>
                  )}
                  {!reviewOpen && (
                    <button
                      type="button"
                      onClick={() => setReviewOpen(true)}
                      className="h-11 border border-[#2a231f] px-5 text-xs font-medium uppercase tracking-[0.15em] text-[#2a231f] transition hover:bg-[#2a231f] hover:text-white"
                    >
                      Write a review
                    </button>
                  )}
                </div>

                {reviewMsg && (
                  <p
                    className={`mt-4 text-sm ${
                      reviewMsg.type === "ok" ? "text-[#4d6b4a]" : "text-[#a14b3b]"
                    }`}
                  >
                    {reviewMsg.text}
                  </p>
                )}

                {reviewOpen && (
                  <div className="mt-6 border border-[#e6e0d8] bg-white p-4 sm:p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#2a231f]">
                      Your rating
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setReviewRating(n)}
                          aria-label={`${n} star${n > 1 ? "s" : ""}`}
                          aria-pressed={reviewRating === n}
                          className="p-0.5"
                        >
                          <FiStar
                            className={`h-7 w-7 transition ${
                              n <= reviewRating
                                ? "fill-[#c8a46b] text-[#c8a46b]"
                                : "text-[#d9d1c7] hover:text-[#c8a46b]"
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    <label
                      htmlFor="pdp-review"
                      className="mt-5 block text-xs font-medium uppercase tracking-[0.2em] text-[#2a231f]"
                    >
                      Your review
                    </label>
                    <textarea
                      id="pdp-review"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={4}
                      maxLength={1000}
                      placeholder="Share what you liked or disliked about this product"
                      className="mt-2 w-full resize-y border border-[#d9d1c7] bg-white p-3 text-sm text-[#2a231f] outline-none focus:border-[#2a231f]"
                    />

                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={submitReview}
                        disabled={reviewSubmitting}
                        className="h-11 bg-[#2a231f] px-6 text-xs font-medium uppercase tracking-[0.15em] text-white transition hover:bg-[#8b5e3c] disabled:opacity-50"
                      >
                        {reviewSubmitting ? "Submitting..." : "Submit review"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewOpen(false)}
                        className="text-xs font-medium uppercase tracking-[0.15em] text-[#6b625a] hover:text-[#2a231f]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Sab customers ke approved reviews (purane bhi) */}
                {reviewsData.items.length > 0 && (
                  <ul className="mt-8 border-t border-[#e6e0d8]">
                    {reviewsData.items.map((r) => (
                      <li key={r._id} className="border-b border-[#e6e0d8] py-5">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Stars value={r.rating} />
                          <span className="text-sm font-medium text-[#2a231f]">{r.name}</span>
                          {r.createdAt && (
                            <span className="text-xs text-[#9a9087]">
                              {new Date(r.createdAt).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#4d453f] sm:text-base">
                          {r.review}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === "faq" && (
              <div className="border-t border-[#e6e0d8]">
                {FAQS.map((f) => (
                  <FaqItem key={f.q} q={f.q} a={f.a} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RELATED */}
        {related.length > 0 && (
          <div className="mt-12 border-t border-[#e6e0d8] pt-10 sm:mt-16">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-medium text-[#2a231f] sm:text-3xl">You Also May Like</h2>
              <Link
                href="/home"
                className="flex items-center gap-1.5 text-sm font-medium text-[#2a231f] hover:text-[#8b5e3c]"
              >
                Shop all furniture <FiArrowRight className="h-4 w-4" />
              </Link>
            </div>
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