"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = {
  _id: string;
  id: string; // slug
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  stock?: number;
};

type Props = { title: string; subtitle?: string; endpoint: string };

const LOW_STOCK = 5;

export default function ProductGridPage({ title, subtitle, endpoint }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [heading, setHeading] = useState(title);
  const [sub, setSub] = useState(subtitle ?? "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(endpoint, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) return setItems([]);
        const data = await r.json();
        if (Array.isArray(data)) {
          setItems(data);
        } else {
          // collection response: { label, description, products }
          setItems(data.products ?? []);
          if (data.label) setHeading(data.label);
          if (data.description) setSub(data.description);
        }
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [endpoint]);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-[#1f1a17]">{heading}</h1>
      {sub && <p className="mt-1 text-sm text-[#6b5d52]">{sub}</p>}

      {loading ? (
        <p className="mt-8 text-sm text-[#6b5d52]">Loading...</p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-[#6b5d52]">No products found.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <Link
              key={p._id}
              href={`/product/${p.id}`}
              className="group overflow-hidden rounded-md border border-[#e9e4dd] bg-white"
            >
              <div className="relative aspect-square bg-[#f6f2ed]">
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
                {p.badge && (
                  <span className="absolute left-2 top-2 rounded bg-[#1f1a17] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-medium text-[#2b2420]">{p.name}</p>
                <p className="mt-1 text-sm text-[#a0643c]">
                  {p.price.toLocaleString()}
                  {p.originalPrice && (
                    <span className="ml-2 text-xs text-[#9a8b7e] line-through">
                      {p.originalPrice.toLocaleString()}
                    </span>
                  )}
                </p>
                {typeof p.stock === "number" && p.stock > 0 && p.stock <= LOW_STOCK && (
                  <p className="mt-1 text-xs font-medium text-red-600">Only {p.stock} left</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}