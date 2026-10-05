"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import {
  FaTachometerAlt,
  FaUsers,
  FaImages,
  FaBoxes,
  FaChevronDown,
  FaBalanceScale,
  FaSlidersH,
  FaLayerGroup,
  FaTrademark,
  FaThList,
  FaBox,
  FaListUl,
  FaPlusSquare,
  FaExchangeAlt,
  FaStar,
} from "react-icons/fa";
import LogoutButton from "@/app/components/LogoutButton";

type NavLink = { label: string; href: string; icon: IconType };

// Simple top-level links
const menuItems: NavLink[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: FaTachometerAlt },
  { label: "Users", href: "/admin/users", icon: FaUsers },
  { label: "Gallery", href: "/admin/gallery", icon: FaImages },
];
const catalogLinks: NavLink[] = [
  { label: "Product Units", href: "/admin/catalog/units", icon: FaBalanceScale },
  { label: "Product Attributes", href: "/admin/catalog/attributes", icon: FaSlidersH },
  { label: "Product Variations", href: "/admin/catalog/variations", icon: FaLayerGroup },
  { label: "Product Brands", href: "/admin/catalog/brands", icon: FaTrademark },
  { label: "Product Categories", href: "/admin/catalog/categories", icon: FaThList },
];
const productsLinks: NavLink[] = [
  { label: "List Products", href: "/admin/catalog/products", icon: FaListUl },
  { label: "Add Product", href: "/admin/catalog/products/add", icon: FaPlusSquare },
  { label: "Import / Export", href: "/admin/catalog/products/import-export", icon: FaExchangeAlt },
];
const reviewsLink: NavLink = {
  label: "Product Reviews",
  href: "/admin/catalog/reviews",
  icon: FaStar,
};

interface AdminSidebarProps {
  open: boolean;
}

export default function AdminSidebar({ open }: AdminSidebarProps) {
  const pathname = usePathname();

  const inCatalog = pathname.startsWith("/admin/catalog");
  const inProducts = pathname.startsWith("/admin/catalog/products");

  // md+ : sidebar ke andar khulne wala menu
  const [catalogOpen, setCatalogOpen] = useState(inCatalog);
  const [productsOpen, setProductsOpen] = useState(inProducts);

  // mobile : sidebar ke right side me khulne wala icon panel
  const [flyOpen, setFlyOpen] = useState(false);
  const [flyTop, setFlyTop] = useState(0);
  const catalogBtnRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const [flyLeft, setFlyLeft] = useState(64);
  const flyRef = useRef<HTMLDivElement>(null);

  // panel ko Catalog button ke barabar me rakhne ke liye
  const updateFlyTop = useCallback(() => {
    const r = catalogBtnRef.current?.getBoundingClientRect();
    if (r) setFlyTop(r.top);
    const a = asideRef.current?.getBoundingClientRect();
    if (a) setFlyLeft(a.right);
  }, []);

  const toggleCatalog = () => {
    setCatalogOpen((v) => !v);
    setFlyOpen((v) => !v);
    updateFlyTop();
  };

  // page badalne par mobile panel band
  useEffect(() => {
    setFlyOpen(false);
  }, [pathname]);

  // panel ke bahar click/tap karne par band
  useEffect(() => {
    if (!flyOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (flyRef.current?.contains(t) || catalogBtnRef.current?.contains(t)) return;
      setFlyOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [flyOpen]);

  // screen resize par position dobara set
  useEffect(() => {
    if (!flyOpen) return;
    window.addEventListener("resize", updateFlyTop);
    return () => window.removeEventListener("resize", updateFlyTop);
  }, [flyOpen, updateFlyTop]);

  // md+ : bullet + text sub-link
  const SubLink = ({ label, href }: NavLink) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg text-sm transition-colors ${
          active
            ? "text-white font-medium"
            : "text-white/70 hover:text-white hover:bg-white/10"
        }`}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full border shrink-0 ${
            active ? "border-secondary" : "border-white/30"
          }`}
        />
        {label}
      </Link>
    );
  };

  // mobile panel : sirf icon
  const FlyIcon = ({ label, href, icon: Icon }: NavLink) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        title={label}
        className={`flex items-center justify-center h-10 rounded-lg transition-colors ${
          active
            ? "text-white bg-white/10"
            : "text-white/70 hover:text-white hover:bg-white/10"
        }`}
      >
        <Icon className="w-4 h-4" />
      </Link>
    );
  };

  return (
    <aside
      ref={asideRef}
      className={`${open ? "flex" : "hidden"} lg:flex flex-col
      fixed lg:static top-16 lg:top-0 bottom-0 left-0 lg:h-full z-40 bg-primary shrink-0
      w-16 md:w-64
      rounded-none shadow-xl lg:shadow-none`}
    >
      <div className="h-16 flex items-center justify-center md:justify-start px-0 md:px-6 border-b border-white/10">
        <span className="hidden md:inline text-lg font-semibold text-white">
          Nextcent <span className="text-secondary">Admin</span>
        </span>
        <span className="md:hidden text-lg font-bold text-secondary">N</span>
      </div>

      <nav
        onScroll={() => flyOpen && updateFlyTop()}
        className="flex-1 overflow-y-auto px-2 md:px-3 py-4 space-y-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              className={`flex items-center justify-center md:justify-start gap-3 px-0 md:px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
        {/* ───────── Catalog dropdown ───────── */}
        <div>
          <button
            ref={catalogBtnRef}
            type="button"
            title="Catalog"
            onClick={toggleCatalog}
            aria-expanded={catalogOpen}
            className={`w-full flex items-center justify-center md:justify-start gap-3 px-0 md:px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              catalogOpen || inCatalog
                ? "bg-white/10 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <FaBoxes className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline flex-1 text-left">Catalog</span>
            <FaChevronDown
              className={`hidden md:inline w-3 h-3 transition-transform duration-200 ${
                catalogOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {catalogOpen && (
            <div className="hidden md:block mt-1 space-y-0.5">
              {catalogLinks.map((l) => (
                <SubLink key={l.href} {...l} />
              ))}

              <div>
                <button
                  type="button"
                  onClick={() => setProductsOpen((v) => !v)}
                  aria-expanded={productsOpen}
                  className={`w-full flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg text-sm transition-colors ${
                    inProducts
                      ? "text-white font-medium"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full border shrink-0 ${
                      inProducts ? "border-secondary" : "border-white/30"
                    }`}
                  />
                  <span className="flex-1 text-left">Products</span>
                  <FaChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      productsOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {productsOpen && (
                  <div className="mt-0.5 space-y-0.5">
                    {productsLinks.map(({ label, href }) => {
                      const active = pathname === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={`block pl-11 pr-3 py-2 rounded-lg text-sm transition-colors ${
                            active
                              ? "text-white font-medium"
                              : "text-white/60 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <SubLink {...reviewsLink} />
            </div>
          )}
          {flyOpen && (
            <div
              ref={flyRef}
              style={{ 
              top: flyTop,
              left: flyLeft-1,
               maxHeight: `calc(100vh - ${flyTop}px - 8px)` }}
              className="md:hidden fixed left-16 z-50 w-14 overflow-y-auto rounded-r-xl bg-primary border-l border-white/10 shadow-xl px-1.5 py-2 space-y-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {catalogLinks.map((l) => (
                <FlyIcon key={l.href} {...l} />
              ))}

              {/* Products: icon dabane par uske 3 icons khulte hain */}
              <button
                type="button"
                title="Products"
                onClick={() => setProductsOpen((v) => !v)}
                aria-expanded={productsOpen}
                className={`w-full flex items-center justify-center h-10 rounded-lg transition-colors ${
                  inProducts
                    ? "text-secondary"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                } ${productsOpen ? "bg-white/10" : ""}`}
              >
                <FaBox className="w-4 h-4" />
              </button>

              {productsOpen && (
                <div className="space-y-1 border-y border-white/10 py-1">
                  {productsLinks.map((l) => (
                    <FlyIcon key={l.href} {...l} />
                  ))}
                </div>
              )}

              <FlyIcon {...reviewsLink} />
            </div>
          )}
        </div>
      </nav>

      <div className="p-2 md:p-3 border-t border-white/10">
        <LogoutButton fullWidth hideLabelOnMobile />
      </div>
    </aside>
  );
}