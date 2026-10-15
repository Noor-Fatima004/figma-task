"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Col = { _id: string; key: string; label: string; description: string; imageUrl: string; count: number };

export default function CollectionsPage() {
  const [items, setItems] = useState<Col[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/collections", { cache: "no-store" })
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-[#1f1a17]">Collections</h1>
      <p className="mt-1 text-sm text-[#6b5d52]">Hand-picked groups of furniture, bedding and tech</p>

      {loading ? (
        <p className="mt-8 text-sm text-[#6b5d52]">Loading...</p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-[#6b5d52]">No collections yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Link
              key={c._id}
              href={`/collections/${c.key}`}
              className="group overflow-hidden rounded-md border border-[#e9e4dd] bg-white"
            >
              <div className="aspect-[4/3] bg-[#f6f2ed]">
                {c.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt={c.label} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                )}
              </div>
              <div className="p-4">
                <p className="text-base font-medium text-[#2b2420]">{c.label}</p>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-[#6b5d52]">{c.description}</p>
                )}
                <p className="mt-2 text-xs text-[#a0643c]">{c.count} products</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}