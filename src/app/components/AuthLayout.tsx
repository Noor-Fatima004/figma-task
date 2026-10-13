"use client";

import { ReactNode } from "react";
import Image from "next/image";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eff6ff] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-[1140px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row">
        {/* LEFT – Image (small screens par hidden, form ko poori jagah milti hai) */}
        <div className="hidden lg:block lg:w-1/2 relative min-h-[600px]">
          {/* Image yahan se aati hai: public/auth-banner/side.jpg */}
          <Image
            src="/frontStoreImages/login.avif"
            alt="Edition Studio"
            fill
            priority
            sizes="(min-width: 1024px) 570px, 0px"
            className="object-cover"
          />

          {/* Neeche se halka dark gradient, taake text image par saaf parha jaye */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

          {/* Bottom-left heading + text */}
          <div className="absolute bottom-0 left-0 p-10 xl:p-12 max-w-md">
            <h2 className="text-3xl xl:text-4xl font-semibold leading-tight text-white">
              Edition Studio
            </h2>
            <p className="mt-2 text-sm xl:text-[15px] leading-relaxed text-white/85">
              Quietly considered. Made for everyday living.
            </p>
          </div>
        </div>

        {/* RIGHT – Form */}
        <div className="w-full lg:w-1/2 bg-white p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}