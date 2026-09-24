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
        {/* LEFT – Attract Section */}
        <div className="lg:w-1/2 bg-gradient-to-br from-[#e8f5e9] to-[#c8e6c9] p-8 sm:p-10 lg:p-12 flex flex-col justify-between relative">
          <div className="flex items-center gap-2 mb-8">
            <img
              src="/Icon.jpg"
              alt="Nextcent"
              className="w-8 h-8 rounded"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
            <span className="text-xl sm:text-2xl font-semibold text-[#263238]">
              Nextcent
            </span>
          </div>

          <div className="space-y-5">
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-semibold leading-tight text-[#1e2b32]">
              Grow your <span className="text-[#4CAF4F]">community</span> with confidence.
            </h2>
            <p className="text-[#3a4a52] text-sm sm:text-base leading-relaxed max-w-md">
              Join <strong>2,245,341+</strong> members who manage clubs, events, and
              payments with Nextcent. Start your 8‑year journey of insights and
              automation.
            </p>

            <ul className="space-y-3 pt-2">
              {[
                "Full automation of membership renewals",
                "Trusted by Fortune 500+ clients",
                "Dedicated support & live community",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-[#2e3b42]">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#4CAF4F] flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/60">
            <p className="text-xs sm:text-sm italic text-[#2e3b42]">
              “Nextcent transformed how we manage 40+ clubs. Signup took two minutes.”
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-6 h-6 rounded-full bg-[#4CAF4F] flex items-center justify-center text-white text-[10px] font-bold">
                TS
              </div>
              <span className="text-[11px] font-semibold text-[#263238]">
                Tim Smith · British Dragon Boat Racing
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-8">
            {[FaInstagram, FaFacebookF, FaTwitter, FaYoutube].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/60 hover:bg-[#4CAF4F] hover:text-white text-[#263238] transition-colors"
              >
                <Icon className="w-3.5 h-3.5" />
              </a>
            ))}
          </div>

          <div className="absolute bottom-4 right-4 opacity-10 pointer-events-none">
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
              <circle cx="70" cy="70" r="40" stroke="#4CAF4F" strokeWidth="6" />
              <circle cx="30" cy="30" r="20" stroke="#4CAF4F" strokeWidth="4" />
            </svg>
          </div>
        </div>

        {/* RIGHT – Form */}
        <div className="lg:w-1/2 bg-white p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}