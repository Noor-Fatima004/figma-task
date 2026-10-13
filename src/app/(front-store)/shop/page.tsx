import { Suspense } from "react";
import type { Metadata } from "next";
import ShopPage from "./ShopPage";

export const metadata: Metadata = { title: "Shop" };

// Provider ab layout.tsx mein hai. Suspense isliye ke ShopPage URL ke search params padhta hai.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ShopPage />
    </Suspense>
  );
}