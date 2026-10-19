// app/shop/new/page.tsx
// Navbar mein link pehle se hai: /shop/new
//
// ✅ Direct DB call use kiya gaya hai — API round-trip / NEXT_PUBLIC_BASE_URL /
//    response shape mismatch ke saare bugs khatam.
// ✅ Field names toStorefrontProduct ke saath match karte hain (discountPrice, etc.)
// ✅ createdAt missing hone par bhi product filter-out nahi hota.

import Link from "next/link";
import connectDB from "@/lib/mongodb";
import Product from "@/app/models/Product";
import "@/app/models/GalleryImage";
import "@/app/models/ProductBrand";
import {
  buildMediaUrlMap,
  buildVariationNameMap,
  toStorefrontProduct,
  type ProductLean,
} from "@/lib/storefrontProduct";

export const metadata = {
  title: "New Arrivals",
  description: "Our latest products, fresh in store.",
};

// Har request par fresh data (naya product add hote hi dikhe)
export const dynamic = "force-dynamic";

// ---- CONFIG ----
const NEW_DAYS = 30;
const LIMIT = 24;

type StoreProduct = ReturnType<typeof toStorefrontProduct> & {
  createdAt?: string | null;
};

async function getNewProducts(): Promise<StoreProduct[]> {
  await connectDB();

  const cutoff = new Date(Date.now() - NEW_DAYS * 24 * 60 * 60 * 1000);

  const docs = (await Product.find({
    isActive: true,
    createdAt: { $gte: cutoff },
  })
    .populate({
      path: "category",
      select: "name slug parent",
      populate: { path: "parent", select: "name slug" },
    })
    .populate("brand", "name")
    .sort({ createdAt: -1 })
    .limit(LIMIT)
    .lean()) as unknown as ProductLean[];

  const map = await buildMediaUrlMap(docs.flatMap((d) => d.media ?? []));
  const names = await buildVariationNameMap(docs);

  return docs.map((d) => {
    const created = (d as any).createdAt;
    return {
      ...toStorefrontProduct(d, map, names),
      createdAt:
        created instanceof Date
          ? created.toISOString()
          : created ?? null,
    } as StoreProduct;
  });
}

const fmt = (n: number) => `$${n.toFixed(2)}`;

function ProductCard({ p }: { p: StoreProduct }) {
  const pAny = p as any;
  const id = pAny.slug ?? pAny.id ?? pAny._id;

  // image: storefront mapper ke hisaab se adjust karo
  const img: string | undefined =
    pAny.image ?? pAny.images?.[0] ?? pAny.media?.[0]?.url;

  const price: number = pAny.price ?? 0;
  const discountPrice: number | undefined = pAny.discountPrice ?? undefined;

  const onSale =
    typeof discountPrice === "number" &&
    discountPrice > 0 &&
    discountPrice < price;

  return (
    <Link href={`/product/${id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-[#e9e4dd] bg-[#f6f2ed]">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={pAny.name ?? "Product"}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[#9a8b7e]">
            No image
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-sm bg-[#a0643c] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
          New
        </span>
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="text-sm text-[#2b2420] transition-colors group-hover:text-[#a0643c]">
          {pAny.name}
        </h3>
        <p className="text-sm">
          {onSale ? (
            <>
              <span className="font-semibold text-[#a0643c]">
                {fmt(discountPrice!)}
              </span>{" "}
              <span className="text-[#9a8b7e] line-through">{fmt(price)}</span>
            </>
          ) : (
            <span className="font-semibold text-[#5b4a3f]">{fmt(price)}</span>
          )}
        </p>
      </div>
    </Link>
  );
}

export default async function NewArrivalsPage() {
  const products = await getNewProducts();

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <header className="mb-8 text-center lg:mb-12">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#a0643c]">
          Just landed
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#1f1a17] sm:text-4xl">
          New Arrivals
        </h1>
        <p className="mt-2 text-sm text-[#6b5d52]">
          {products.length > 0
            ? `${products.length} new ${products.length === 1 ? "product" : "products"}`
            : "Check back soon"}
        </p>
      </header>

      {products.length === 0 ? (
        <div className="rounded-md border border-[#e9e4dd] bg-[#faf9f7] py-20 text-center">
          <p className="text-[#5b4a3f]">No new arrivals right now.</p>
          <Link
            href="/shop"
            className="mt-4 inline-block text-sm text-[#a0643c] underline underline-offset-4"
          >
            Browse all products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {products.map((p, i) => (
            <ProductCard
              key={(p as any).id ?? (p as any)._id ?? (p as any).slug ?? i}
              p={p}
            />
          ))}
        </div>
      )}
    </main>
  );
}