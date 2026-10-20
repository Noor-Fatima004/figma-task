"use client";

// Rakho: src/app/rooms/page.tsx

import Image from "next/image";
import Link from "next/link";
import { useVisibleCategories } from "@/app/components/storefront/useVisibleCategories";
import { ROOM_KEYS } from "@/lib/roomKeys";

export default function RoomsPage() {
  // Sirf 5 rooms, aur unmein bhi wohi jin mein product ho
  const { categories, loading, isError, empty } = useVisibleCategories(ROOM_KEYS);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-[#1f1a17]">Shop by room</h1>

      {isError && (
        <p className="mt-8 text-sm text-[#6b625a]">
          Categories could not be loaded. Please refresh the page.
        </p>
      )}

      {empty && !isError && (
        <p className="mt-8 text-sm text-[#6b625a]">No products available yet.</p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} aria-hidden="true">
              <div className="aspect-[4/5] animate-pulse bg-[#f1ebe3]" />
              <div className="mx-auto mt-3 h-4 w-1/2 animate-pulse bg-[#efe9e1]" />
            </div>
          ))}

        {!loading &&
          categories.map((c) => (
            <Link
              key={c._id}
              href={`/rooms/${encodeURIComponent(c.key)}`}
              className="group block"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#f1ebe3]">
                {c.imageUrl && (
                  <Image
                    src={c.imageUrl}
                    alt={c.label}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                )}
              </div>
              <p className="mt-3 text-center text-sm font-medium text-[#2b2420] transition-colors group-hover:text-[#a0643c]">
                {c.label}
              </p>
            </Link>
          ))}
      </div>
    </main>
  );
}