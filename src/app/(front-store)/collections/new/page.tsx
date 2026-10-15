"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Cat = { _id: string; key: string; label: string; imageUrl: string; count: number };

export default function NewCollectionPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories?recent=15", { cache: "no-store" })
      .then((r) => r.json())
      .then(setCats)
      .catch(() => setCats([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-[#1f1a17]">New Collection</h1>
      <p className="mt-1 text-sm text-[#6b5d52]">Categories added in the last 15 days</p>

      {loading ? (
        <p className="mt-8 text-sm text-[#6b5d52]">Loading...</p>
      ) : cats.length === 0 ? (
        <p className="mt-8 text-sm text-[#6b5d52]">No new categories right now.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {cats.map((c) => (
            <Link
              key={c._id}
              href={`/shop?category=${c.key}`}
              className="group overflow-hidden rounded-md border border-[#e9e4dd] bg-white"
            >
              <div className="aspect-[4/3] bg-[#f6f2ed]">
                {c.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt={c.label} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-[#2b2420]">{c.label}</p>
                <p className="text-xs text-[#6b5d52]">{c.count} products</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}