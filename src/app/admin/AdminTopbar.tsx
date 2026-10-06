"use client";

import { useEffect, useRef, useState } from "react";
import { FaBars, FaSignOutAlt, FaSearch, FaTimes } from "react-icons/fa";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface AdminTopbarProps {
  name: string;
  email: string;
  onMenuClick: () => void;
}

export default function AdminTopbar({ name, email, onMenuClick }: AdminTopbarProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const current = searchParams.get("q") ?? "";
      const normalizedQuery = query.trim();
      if (!normalizedQuery && !current) return;
      const targetPath = "/admin/users";
      if (pathname === targetPath && current === normalizedQuery) return;
      const params = new URLSearchParams(searchParams.toString());
      if (normalizedQuery) params.set("q", normalizedQuery);
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `${targetPath}?${qs}` : targetPath, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
  }, [query, pathname, router, searchParams]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setOpen(false);
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center gap-2 sm:gap-4 px-3 sm:px-6 lg:px-10">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={onMenuClick}
          aria-label="Toggle sidebar"
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-theme text-text hover:bg-surface-hover hover:text-text-hover transition-colors shrink-0"
        >
          <FaBars className="w-4 h-4" />
        </button>

        <h1 className="hidden sm:block text-base lg:text-lg font-semibold text-text">
          Dashboard
        </h1>
      </div>

      {/* Center: user search */}
      <div className="flex-1 min-w-0 flex justify-center">
        <div className="relative w-full max-w-2xl">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users"
            aria-label="Search users"
            className="w-full h-10 pl-10 pr-9 rounded-theme bg-background border border-border text-base sm:text-sm text-text placeholder:text-muted outline-none hover:border-border-hover focus:bg-surface focus:border-primary-hover focus:ring-0 transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full text-muted hover:bg-surface-hover hover:text-text-hover transition-colors"
            >
              <FaTimes className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Right: profile dropdown */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Open profile menu"
          aria-haspopup="menu"
          aria-expanded={open}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-theme-gradient flex items-center justify-center text-white text-[12px] sm:text-xs font-bold ring-2 ring-transparent hover:ring-secondary focus:outline-none focus:ring-secondary transition"
        >
          {initials}
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-56 sm:w-72 max-w-[calc(100vw-1.5rem)] bg-surface rounded-theme border border-border shadow-xl z-50 overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 px-4 py-6 sm:p-4 text-center sm:text-left">
              <div className="w-14 h-14 sm:w-12 sm:h-12 rounded-full bg-theme-gradient flex items-center justify-center text-white text-lg sm:text-base font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0 w-full">
                <p className="text-sm font-semibold text-text truncate">{name}</p>
                <p className="text-xs text-muted truncate">{email}</p>
              </div>
            </div>

            <div className="border-t border-theme-gradient" />

            <button
              role="menuitem"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-4 sm:py-3 text-sm text-text hover:bg-surface-hover hover:text-text-hover transition-colors"
            >
              <FaSignOutAlt className="w-4 h-4 text-muted" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}