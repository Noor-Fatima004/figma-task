"use client";

// Rakho: src/app/components/storefront/StorefrontSearch.tsx
// Navbar ke search icon par click se khulta hai. Typing par category + product suggestions aate hain,
// click / Enter par seedha us category ya product ke page par chala jata hai.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiArrowRight, FiGrid, FiSearch, FiX } from "react-icons/fi";

type CategoryHit = { name: string; slug: string };
type ProductHit = { id: string; name: string; price: number; image: string };

// Apne routes ke hisaab se yahan badlo
const productHref = (id: string) => `/product/${id}`;
const categoryHref = (slug: string) => `/shop?category=${encodeURIComponent(slug)}`;
const searchHref = (q: string) => `/shop?search=${encodeURIComponent(q)}`;

const formatPrice = (n: number) => `Rs. ${n.toLocaleString("en-US")}`;

type Item =
  | { kind: "category"; key: string; label: string; href: string }
  | { kind: "product"; key: string; label: string; href: string; price: number; image: string };

export default function StorefrontSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<CategoryHit[]>([]);
  const [products, setProducts] = useState<ProductHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  const term = q.trim();

  // Khulte hi input par focus, page scroll band, Escape se close
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Band hone par sab saaf
  useEffect(() => {
    if (open) return;
    setQ("");
    setCategories([]);
    setProducts([]);
    setActive(-1);
  }, [open]);

  // Debounced fetch
  useEffect(() => {
    if (!open) return;
    if (term.length < 2) {
      setCategories([]);
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, {
        signal: ctrl.signal,
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : { categories: [], products: [] }))
        .then((d) => {
          setCategories(Array.isArray(d.categories) ? d.categories : []);
          setProducts(Array.isArray(d.products) ? d.products : []);
          setActive(-1);
        })
        .catch((err) => {
          if (err?.name !== "AbortError") {
            setCategories([]);
            setProducts([]);
          }
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term, open]);

  // Keyboard navigation ke liye ek flat list
  const items: Item[] = useMemo(
    () => [
      ...categories.map<Item>((c) => ({
        kind: "category",
        key: `c-${c.slug}`,
        label: c.name,
        href: categoryHref(c.slug),
      })),
      ...products.map<Item>((p) => ({
        kind: "product",
        key: `p-${p.id}`,
        label: p.name,
        href: productHref(p.id),
        price: p.price,
        image: p.image,
      })),
    ],
    [categories, products]
  );

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (items.length) setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length) setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && items[active]) go(items[active].href);
      else if (term) go(searchHref(term));
    }
  };

  if (!open) return null;

  const hasResults = items.length > 0;
  const noResults = term.length >= 2 && !loading && !hasResults;

  const rowBase =
    "flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors";

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Search">
      {/* Overlay */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-[#1f1a17]/50 backdrop-blur-[2px]"
      />

      {/* Panel */}
      <div className="absolute inset-x-0 top-0 bg-[#fdfcfa] shadow-2xl">
        <div className="mx-auto max-w-3xl px-4 pb-4 pt-4 sm:px-6 sm:pt-6">
          <div className="flex items-center gap-3 border-b border-[#2a231f] pb-3">
            <FiSearch className="h-5 w-5 shrink-0 text-[#6b625a]" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Search products or categories"
              aria-label="Search products or categories"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-base text-[#2a231f] outline-none placeholder:text-[#9a9087] sm:text-lg"
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="text-[#6b625a] hover:text-[#2a231f]"
              >
                <FiX className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-xs font-medium uppercase tracking-[0.18em] text-[#6b625a] hover:text-[#8b5e3c]"
            >
              Close
            </button>
          </div>

          <div className="mt-3 max-h-[65vh] overflow-y-auto">
            {term.length < 2 && (
              <p className="px-1 py-4 text-sm text-[#6b625a]">
                Type at least 2 letters to see suggestions.
              </p>
            )}

            {term.length >= 2 && loading && !hasResults && (
              <p className="px-1 py-4 text-sm text-[#6b625a]">Searching...</p>
            )}

            {noResults && (
              <p className="px-1 py-4 text-sm text-[#6b625a]">
                No matches for &ldquo;{term}&rdquo;.
              </p>
            )}

            {categories.length > 0 && (
              <div className="mb-2">
                <p className="px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#9a9087]">
                  Categories
                </p>
                <ul>
                  {categories.map((c, i) => (
                    <li key={c.slug}>
                      <button
                        type="button"
                        onClick={() => go(items[i].href)}
                        onMouseEnter={() => setActive(i)}
                        className={`${rowBase} ${
                          active === i ? "bg-[#f1ebe3] text-[#8b5e3c]" : "text-[#2a231f]"
                        }`}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#f1ebe3] text-[#6b625a]">
                          <FiGrid className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                        <FiArrowRight className="h-4 w-4 shrink-0 text-[#9a9087]" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {products.length > 0 && (
              <div>
                <p className="px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#9a9087]">
                  Products
                </p>
                <ul>
                  {products.map((p, j) => {
                    const i = categories.length + j;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => go(items[i].href)}
                          onMouseEnter={() => setActive(i)}
                          className={`${rowBase} ${
                            active === i ? "bg-[#f1ebe3] text-[#8b5e3c]" : "text-[#2a231f]"
                          }`}
                        >
                          <span className="relative h-12 w-12 shrink-0 overflow-hidden bg-[#f1ebe3]">
                            {p.image && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.image}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{p.name}</span>
                            <span className="block text-xs text-[#6b625a]">
                              {formatPrice(p.price)}
                            </span>
                          </span>
                          <FiArrowRight className="h-4 w-4 shrink-0 text-[#9a9087]" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {term.length >= 2 && (
              <button
                type="button"
                onClick={() => go(searchHref(term))}
                className="mt-2 flex w-full items-center justify-center gap-2 border-t border-[#e6e0d8] px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-[#2a231f] transition hover:text-[#8b5e3c]"
              >
                See all results for &ldquo;{term}&rdquo;
                <FiArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}