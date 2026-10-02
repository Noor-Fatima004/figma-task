"use client";

import { useState } from "react";
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

  const [catalogOpen, setCatalogOpen] = useState(inCatalog);
  const [productsOpen, setProductsOpen] = useState(inProducts);
  const SubLink = ({ label, href, icon: Icon }: NavLink) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        title={label}
        className={`flex items-center justify-center md:justify-start gap-3 px-0 md:pl-4 md:pr-3 py-2 rounded-lg text-sm transition-colors ${
          active
            ? "text-[#4CAF4F] font-medium bg-[#4CAF4F]/15 md:bg-transparent"
            : "text-gray-300 hover:text-white hover:bg-white/5"
        }`}
      >
        {/* mobile: icon */}
        <Icon className="w-4 h-4 shrink-0 md:hidden" />
        {/* md+: bullet */}
        <span
          className={`hidden md:inline-block w-2.5 h-2.5 rounded-full border shrink-0 ${
            active ? "border-[#4CAF4F]" : "border-gray-400"
          }`}
        />
        <span className="hidden md:inline">{label}</span>
      </Link>
    );
  };

  return (
    <aside
      className={`${open ? "flex" : "hidden"} lg:flex flex-col
      fixed lg:static top-16 lg:top-0 bottom-0 left-0 lg:h-full z-40 bg-primary shrink-0
      w-16 md:w-64
      rounded-tr-2xl lg:rounded-none shadow-xl lg:shadow-none`}
    >
      <div className="h-16 flex items-center justify-center md:justify-start px-0 md:px-6 border-b border-white/10">
        <span className="hidden md:inline text-lg font-semibold text-white">
          Nextcent <span className="text-[#4CAF4F]">Admin</span>
        </span>
        <span className="md:hidden text-lg font-bold text-[#4CAF4F]">N</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 md:px-3 py-4 space-y-1">
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
                  ? "bg-[#4CAF4F]/15 text-[#4CAF4F]"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
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
            type="button"
            title="Catalog"
            onClick={() => setCatalogOpen((v) => !v)}
            aria-expanded={catalogOpen}
            className={`w-full flex items-center justify-center md:justify-start gap-3 px-0 md:px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              catalogOpen || inCatalog
                ? "bg-[#4CAF4F]/15 text-[#4CAF4F]"
                : "text-gray-300 hover:bg-white/5 hover:text-white"
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
            <div className="mt-1 space-y-0.5 rounded-lg bg-black/10 md:bg-transparent py-1 md:py-0">
              {catalogLinks.map((l) => (
                <SubLink key={l.href} {...l} />
              ))}

              {/* ───────── Nested: Products dropdown ───────── */}
              <div>
                <button
                  type="button"
                  title="Products"
                  onClick={() => setProductsOpen((v) => !v)}
                  aria-expanded={productsOpen}
                  className={`w-full flex items-center justify-center md:justify-start gap-3 px-0 md:pl-4 md:pr-3 py-2 rounded-lg text-sm transition-colors ${
                    inProducts
                      ? "text-[#4CAF4F] font-medium"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  } ${productsOpen ? "bg-white/5 md:bg-transparent" : ""}`}
                >
                  {/* mobile: icon */}
                  <FaBox className="w-4 h-4 shrink-0 md:hidden" />
                  {/* md+: bullet */}
                  <span
                    className={`hidden md:inline-block w-2.5 h-2.5 rounded-full border shrink-0 ${
                      inProducts ? "border-[#4CAF4F]" : "border-gray-400"
                    }`}
                  />
                  <span className="hidden md:inline flex-1 text-left">Products</span>
                  <FaChevronDown
                    className={`hidden md:inline w-3 h-3 transition-transform duration-200 ${
                      productsOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {productsOpen && (
                  <div className="mt-0.5 space-y-0.5">
                    {productsLinks.map(({ label, href, icon: Icon }) => {
                      const active = pathname === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          title={label}
                          className={`flex items-center justify-center md:justify-start gap-3 px-0 md:pl-11 md:pr-3 py-2 rounded-lg text-sm transition-colors ${
                            active
                              ? "text-[#4CAF4F] font-medium bg-[#4CAF4F]/15 md:bg-transparent"
                              : "text-gray-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0 md:hidden" />
                          <span className="hidden md:inline">{label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <SubLink {...reviewsLink} />
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