"use client";

// Rakho: src/app/components/storefront/Footer.tsx
// Use: layout mein <Footer /> (ya jahan purana footer tha)
// Newsletter: POST /api/newsletter

import { useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiFacebook, FiInstagram } from "react-icons/fi";
import { FaPinterestP } from "react-icons/fa";

// ⚠️ Links apne routes ke hisaab se badlo
const columns = [
  {
    title: "Shop",
    links: [
      { label: "New Arrivals", href: "/shop?sort=newest" },
      { label: "Best Sellers", href: "/shop?sort=bestsellers" },
      { label: "Living", href: "/shop?category=living" },
      { label: "Dining", href: "/shop?category=dining" },
      { label: "Bedroom", href: "/shop?category=bedroom" },
      { label: "Accessories", href: "/shop?category=accessories" },
    ],
  },
  {
    title: "The Brand",
    links: [
      { label: "Our Story", href: "/about" },
      { label: "Craftsmanship", href: "/craftsmanship" },
      { label: "Materials", href: "/materials" },
      { label: "Journal", href: "/journal" },
      { label: "Trade", href: "/trade" },
    ],
  },
  {
    title: "Service",
    links: [
      { label: "Delivery", href: "/delivery" },
      { label: "Returns", href: "/returns" },
      { label: "Care Guide", href: "/care-guide" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

const socials = [
  { label: "Instagram", href: "https://instagram.com", Icon: FiInstagram },
  { label: "Pinterest", href: "https://pinterest.com", Icon: FaPinterestP },
  { label: "Facebook", href: "https://facebook.com", Icon: FiFacebook },
];

const legal = [
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Terms", href: "/legal/terms" },
  { label: "Cookies", href: "/legal/cookies" },
];

const labelCls =
  "text-[10px] font-medium uppercase tracking-[0.22em] text-[#c4a57b] sm:text-[11px]";
const linkCls =
  "text-[13px] text-[#d8cfc5] transition hover:text-white sm:text-sm";

type Status = "idle" | "submitting" | "success" | "error";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
      setMessage("Thank you. You are on the list.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <footer className="bg-[#201a16] text-[#d8cfc5]">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 lg:px-16 2xl:max-w-[1680px] 2xl:px-24">
        {/* COLLECTION CALL TO ACTION */}
        <div className="py-12 sm:py-16 lg:py-20 2xl:py-24">
          <p className={labelCls}>The collection</p>
          <h2 className="mt-4 max-w-[16ch] text-2xl font-medium leading-tight text-white sm:max-w-md sm:text-3xl lg:text-4xl 2xl:max-w-xl 2xl:text-5xl">
            Furniture for the way you want to live.
          </h2>
          <p className="mt-5 max-w-sm text-[13px] leading-relaxed text-[#d8cfc5] sm:max-w-md sm:text-sm">
            Thoughtfully designed pieces, natural materials and enduring forms for considered
            spaces.
          </p>
          <Link
            href="/shop"
            className="mt-7 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition hover:text-[#c4a57b] sm:text-xs"
          >
            Explore the collection
            <FiArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* LINKS + NEWSLETTER */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 border-t border-white/10 py-10 sm:grid-cols-3 sm:py-12 lg:grid-cols-[1fr_1fr_1fr_1.6fr] lg:gap-x-10 lg:py-14 2xl:gap-x-16">
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className={labelCls}>{col.title}</h3>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className={linkCls}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* The Edit: newsletter */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <h3 className={labelCls}>The Edit</h3>
            <p className="mt-5 max-w-sm text-[13px] leading-relaxed text-white sm:text-sm">
              Design notes, new collections and stories for considered spaces.
            </p>

            <form onSubmit={subscribe} noValidate className="mt-6 max-w-md">
              <div className="flex items-center gap-3 border-b border-white/30 pb-3 transition focus-within:border-[#c4a57b]">
                <label htmlFor="footer-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="footer-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status !== "idle") setStatus("idle");
                  }}
                  aria-invalid={status === "error"}
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-[#9a8f84] sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="inline-flex shrink-0 items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition hover:text-[#c4a57b] disabled:opacity-60 sm:text-xs"
                >
                  {status === "submitting" ? "Sending" : "Subscribe"}
                  <FiArrowRight className="h-4 w-4" />
                </button>
              </div>

              <p
                role={status === "error" ? "alert" : "status"}
                className={`mt-3 text-[11px] sm:text-xs ${
                  status === "error"
                    ? "text-[#e0907f]"
                    : status === "success"
                      ? "text-[#c4a57b]"
                      : "text-[#9a8f84]"
                }`}
              >
                {message || "No spam. Unsubscribe anytime."}
              </p>
            </form>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="flex flex-col gap-8 border-t border-white/10 py-8 sm:py-10 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="text-xl font-medium tracking-[0.25em] text-white sm:text-2xl"
            >
              Maison
            </Link>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[#c4a57b] sm:text-[11px]">
              Est. 2026
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#9a8f84] sm:text-[11px]">
                Follow
              </span>
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[13px] text-[#d8cfc5] transition hover:text-white sm:text-sm"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {legal.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[11px] text-[#9a8f84] transition hover:text-white sm:text-xs"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-[#9a8f84] sm:text-xs">
              © {new Date().getFullYear()} Maison. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}