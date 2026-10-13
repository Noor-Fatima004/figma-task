// Is file ko yahan rakho: app/shop/best-sellers/page.tsx

import {
  EmptyState,
  PageHeader,
  ProductCard,
  fetchProducts,
  gridClass,
  wrapClass,
} from "@/app/components/shop-shared";

export const metadata = {
  title: "Best Sellers",
  description: "Our most loved products.",
};
export const dynamic = "force-dynamic";

const LIMIT = 24; // top kitne products dikhane hain

export default async function BestSellersPage() {
  const all = await fetchProducts();

  // Jo sab se zyada bike (soldCount) wo upar. isBestSeller flag wale bhi shamil.
  const products = all
    .filter((p) => (p.soldCount ?? 0) > 0 || p.isBestSeller)
    .sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0))
    .slice(0, LIMIT);

  return (
    <main className={wrapClass}>
      <PageHeader
        eyebrow="Customer favourites"
        title="Best Sellers"
        sub={
          products.length
            ? `Top ${products.length} most loved ${products.length === 1 ? "product" : "products"}`
            : "Check back soon"
        }
      />

      {products.length === 0 ? (
        <EmptyState text="No best sellers yet." />
      ) : (
        <div className={gridClass}>
          {products.map((p, i) => (
            <ProductCard
              key={p._id ?? p.id ?? p.slug}
              p={p}
              badge={i < 3 ? `Top ${i + 1}` : "Best seller"}
            />
          ))}
        </div>
      )}
    </main>
  );
}