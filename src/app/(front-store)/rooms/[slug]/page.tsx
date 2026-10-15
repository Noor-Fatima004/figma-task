"use client";

import { useParams } from "next/navigation";
import ProductGridPage from "@/app/components/storefront/ProductGridPage";

// Room ka slug hi category slug hai: /rooms/dining -> category "dining"
// (aur uski subcategories). Alag config ya rooms.ts ki zaroorat nahi.
export default function RoomPage() {
  const { slug } = useParams<{ slug: string }>();
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <ProductGridPage
      title={title}
      endpoint={`/api/shop/products?categories=${encodeURIComponent(slug)}`}
    />
  );
}