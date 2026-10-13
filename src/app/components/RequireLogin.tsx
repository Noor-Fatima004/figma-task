"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

// Checkout / order jaise pages ko isse wrap karo.
// Admin aur signed-up user andar ja sakte hain. Guest ko /login par bheja jata hai
// (?redirect= ke saath), login ke baad wo wapas isi page par aata hai. Cart wagera safe rehta hai.
export default function RequireLogin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setAllowed(true);
        } else {
          toast.info("Please sign in to place your order. Your cart is saved.");
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      })
      .catch(() => {
        if (cancelled) return;
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[#6b625a]" aria-busy="true">
        Checking your account…
      </div>
    );
  }

  return <>{children}</>;
}