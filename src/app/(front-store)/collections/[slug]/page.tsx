"use client";

import { useParams } from "next/navigation";
import ProductGridPage from "@/app/components/storefront/ProductGridPage";

export default function CollectionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  return <ProductGridPage title="Collection" endpoint={`/api/collections?slug=${encodeURIComponent(slug)}`} />;
}