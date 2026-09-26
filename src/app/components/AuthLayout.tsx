"use client";

import { ReactNode } from "react";
import { FaInstagram, FaFacebookF, FaTwitter, FaYoutube } from "react-icons/fa";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-[1140px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row">
        {/* LEFT – Attract Section (hidden on small screens, form takes full focus) */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between gap-10 bg-gradient-to-br from-[#eef8ef] via-[#e3f4e4] to-[#d3ebd5] p-10 xl:p-12 overflow-hidden">
          {/* Soft decorative glow — replaces the small corner circles */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#4CAF4F]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-16 w-72 h-72 rounded-full bg-[#4CAF4F]/10 blur-3xl" />

          {/* Logo */}
          <div className="relative flex items-center gap-2">
            <img
              src="/Icon.jpg"
              alt="Nextcent"
              className="w-8 h-8 rounded-lg object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
            <span className="text-xl font-semibold text-[#263238]">
              Nextcent
            </span>
          </div>

          {/* Headline + feature list */}
          <div className="relative space-y-6">
            <div className="space-y-3">
              <h2 className="text-3xl xl:text-[38px] font-semibold leading-[1.15] text-[#1e2b32]">
                Grow your <span className="text-[#4CAF4F]">community</span>{" "}
                with confidence.
              </h2>
              <p className="text-[#5a6b70] text-sm xl:text-[15px] leading-relaxed max-w-sm">
                Join over 2.2M members who manage clubs, events, and payments
                with Nextcent.
              </p>
            </div>

            <ul className="space-y-3">
              {[
                "Automated membership renewals",
                "Trusted by Fortune 500+ clients",
                "Dedicated support, always on",
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-[13.5px] text-[#2e3b42]"
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#4CAF4F] flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Testimonial + socials, grouped at the bottom with consistent spacing */}
          <div className="relative space-y-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/70 shadow-sm">
              <svg
                className="w-5 h-5 text-[#4CAF4F]/50 mb-1.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M9.17 6C6.31 6 4 8.31 4 11.17c0 2.6 1.98 4.7 4.5 4.95v1.88c-3.63-.27-6.5-3.3-6.5-7.03C2 7.03 5.03 4 9.17 4v2zm10 0c-2.86 0-5.17 2.31-5.17 5.17 0 2.6 1.98 4.7 4.5 4.95v1.88c-3.63-.27-6.5-3.3-6.5-7.03C12 7.03 15.03 4 19.17 4v2z" />
              </svg>
              <p className="text-[13px] italic text-[#2e3b42] leading-relaxed">
                Nextcent transformed how we manage 40+ clubs. Signup took two
                minutes.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-7 h-7 rounded-full bg-[#4CAF4F] flex items-center justify-center text-white text-[10px] font-bold">
                  TS
                </div>
                <span className="text-[11px] font-semibold text-[#263238]">
                  Tim Smith
                  <span className="font-normal text-[#5a6b70]">
                    {" "}
                    · British Dragon Boat Racing
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {[FaInstagram, FaFacebookF, FaTwitter, FaYoutube].map(
                (Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-white/70 hover:bg-[#4CAF4F] hover:text-white text-[#263238] transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </a>
                )
              )}
            </div>
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