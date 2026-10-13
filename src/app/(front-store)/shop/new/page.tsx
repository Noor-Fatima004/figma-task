// Is file ko yahan rakho: app/shop/new/page.tsx
// Navbar mein link pehle se hai: /shop/new

import Link from "next/link";

export const metadata = {
  title: "New Arrivals",
  description: "Our latest products, fresh in store.",
};

// Har request par fresh data (backend se jo bhi naya product add ho foran dikhe).
// Agar caching chahiye to isay `export const revalidate = 60;` se badal do.
export const dynamic = "force-dynamic";

// ---- CONFIG: yahan apne hisaab se badlo ----
const NEW_DAYS = 30; // kitne din tak product "new" mana jaye
const LIMIT = 24; // page par max products

type Product = {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  price: number;
  salePrice?: number;
  image?: string;
  images?: string[];
  createdAt: string; // backend ka add hone ka date
  isNew?: boolean; // agar backend mein manual "new" flag hai
};

// TODO: Agar tumhara API route alag hai (jaise /api/products) to URL badlo.
// Agar DB direct use karte ho (Mongoose/Prisma) to yahan seedha query likh do:
//   Product.find().sort({ createdAt: -1 }).limit(LIMIT)
async function getNewProducts(): Promise<Product[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/products?sort=newest&limit=${LIMIT}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    // API {products: []} ya seedha [] dono handle
    const list: Product[] = Array.isArray(data) ? data : data.products ?? [];

    const cutoff = Date.now() - NEW_DAYS * 24 * 60 * 60 * 1000;
    return list
      .filter((p) => p.isNew || new Date(p.createdAt).getTime() >= cutoff)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  } catch {
    return [];
  }
}

const fmt = (n: number) => `$${n.toFixed(2)}`;

function ProductCard({ p }: { p: Product }) {
  const id = p.slug ?? p._id ?? p.id;
  const img = p.image ?? p.images?.[0];
  const onSale = p.salePrice !== undefined && p.salePrice < p.price;

  return (
    <Link href={`/product/${id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-[#e9e4dd] bg-[#f6f2ed]">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={p.name}
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
          {p.name}
        </h3>
        <p className="text-sm">
          {onSale ? (
            <>
              <span className="font-semibold text-[#a0643c]">
                {fmt(p.salePrice!)}
              </span>{" "}
              <span className="text-[#9a8b7e] line-through">{fmt(p.price)}</span>
            </>
          ) : (
            <span className="font-semibold text-[#5b4a3f]">{fmt(p.price)}</span>
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
          {products.map((p) => (
            <ProductCard key={p._id ?? p.id ?? p.slug} p={p} />
          ))}
        </div>
      )}
    </main>
  );
}