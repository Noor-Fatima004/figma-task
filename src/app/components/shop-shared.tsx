// Is file ko yahan rakho: components/shop-shared.tsx
// (Agar path alag ho to dono pages mein import "@/components/shop-shared" badal lena)

import Link from "next/link";

export type Product = {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  price: number;
  salePrice?: number;
  image?: string;
  images?: string[];
  createdAt?: string;
  soldCount?: number; // backend mein jitne bik chuke (best sellers ke liye)
  isBestSeller?: boolean; // optional manual flag
};

// TODO: apna API route / DB query yahan lagao
export async function fetchProducts(query = ""): Promise<Product[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/products${query}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.products ?? [];
  } catch {
    return [];
  }
}

export const fmt = (n: number) => `$${n.toFixed(2)}`;

export const discountPct = (p: Product) =>
  p.salePrice !== undefined && p.salePrice < p.price
    ? Math.round(((p.price - p.salePrice) / p.price) * 100)
    : 0;

export function ProductCard({ p, badge }: { p: Product; badge?: string }) {
  const id = p.slug ?? p._id ?? p.id;
  const img = p.image ?? p.images?.[0];
  const onSale = discountPct(p) > 0;

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
        {badge && (
          <span className="absolute left-3 top-3 rounded-sm bg-[#a0643c] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="text-sm text-[#2b2420] transition-colors group-hover:text-[#a0643c]">
          {p.name}
        </h3>
        <p className="text-sm">
          {onSale ? (
            <>
              <span className="font-semibold text-[#a0643c]">{fmt(p.salePrice!)}</span>{" "}
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

export function PageHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <header className="mb-8 text-center lg:mb-12">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#a0643c]">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#1f1a17] sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-[#6b5d52]">{sub}</p>
    </header>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-[#e9e4dd] bg-[#faf9f7] py-20 text-center">
      <p className="text-[#5b4a3f]">{text}</p>
      <Link
        href="/shop"
        className="mt-4 inline-block text-sm text-[#a0643c] underline underline-offset-4"
      >
        Browse all products
      </Link>
    </div>
  );
}

export const gridClass =
  "grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6";
export const wrapClass =
  "mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14";