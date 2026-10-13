"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiChevronDown,
  FiHeart,
  FiLogOut,
  FiMenu,
  FiSearch,
  FiShoppingBag,
  FiShuffle,
  FiUser,
  FiX,
} from "react-icons/fi";
import { toast } from "sonner";
import { useWishlist } from "@/app/components/storefront/wishlistStore";

// Brand ka naam yahan badlo
const BRAND = "Naltar";

type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

// Menu items + dropdown links yahan se badlo
const NAV: NavItem[] = [
  {
    label:"Home",
    href:"/home"
  },
  {
    label: "Shop",
    href: "/shop",
    children: [
      { label: "All products", href: "/shop" },
      { label: "New arrivals", href: "/shop/new" },
      { label: "Best sellers", href: "/shop/best-sellers" },
      { label: "Sale", href: "/shop/sale" },
    ],
  },
  {
    label: "Collections",
    href: "/collections",
    children: [
      { label: "Spring edit", href: "/collections/spring" },
      { label: "Essentials", href: "/collections/essentials" },
      { label: "Limited edition", href: "/collections/limited" },
    ],
  },
  {
    label: "Rooms",
    href: "/rooms",
    children: [
      { label: "Living room", href: "/rooms/living" },
      { label: "Bedroom", href: "/rooms/bedroom" },
      { label: "Dining", href: "/rooms/dining" },
      { label: "Office", href: "/rooms/office" },
    ],
  },
  { label: "Journal", href: "/journal" },
  { label: "About", href: "/about" },
];

const TOP_LINKS = [
  { label: "My Account", href: "/account" },
  { label: "Track Order", href: "/track-order" },
  { label: "Help", href: "/help" },
];

// Wishlist ka number ab prop se nahi, seedha wishlist store se aata hai (real time)
type NavbarProps = {
  compareCount?: number;
  cartCount?: number;
};

function Navbar({ compareCount = 0, cartCount = 0 }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { count: wishlistCount } = useWishlist();
  const [loggedIn, setLoggedIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  // Desktop dropdown: konsa menu khula hai (hover/focus se khulta, click par band hota hai)
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setOpenAccordion(null);
  }, []);

  // Desktop link/dropdown item par click: dropdown band + focus hata do taake dobara na khule
  const closeMenus = (e: React.MouseEvent<HTMLElement>) => {
    setOpenMenu(null);
    e.currentTarget.blur();
  };

  // Guest bhi site dekh sakta hai, is liye Logout sirf tab dikhta hai jab user login ho.
  // Login hone par route badalta hai (/home), to har route change par dobara check hota hai.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => {
        if (!cancelled) setLoggedIn(res.ok);
      })
      .catch(() => {
        if (!cancelled) setLoggedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      let res = await fetch("/api/auth/logout", { method: "POST" });
      // Agar tumhara logout route sirf GET leta ho to
      if (res.status === 405) res = await fetch("/api/auth/logout", { method: "GET" });
      if (!res.ok) throw new Error("Logout failed");

      setLoggedIn(false);
      closeMobile();
      toast.success("Logged out");
      router.replace("/home");
      router.refresh();
    } catch {
      toast.error("Could not log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  // Drawer khula ho to: page scroll band, Escape se close, bari screen par jate hi close
  useEffect(() => {
    if (!mobileOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) closeMobile();
    };

    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onChange);
    closeBtnRef.current?.focus();

    const menuBtn = menuBtnRef.current;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
      menuBtn?.focus();
    };
  }, [mobileOpen, closeMobile]);

  const iconBtn =
    "relative inline-flex items-center gap-1 text-[#5b4a3f] transition-colors hover:text-[#a0643c]";
  const count = "text-[11px] font-semibold text-[#2b2420]";
  const tile =
    "flex flex-col items-center gap-1.5 rounded-md border border-[#e9e4dd] bg-white py-3.5 text-xs text-[#5b4a3f] transition-colors hover:border-[#a0643c] hover:text-[#a0643c]";

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* TOP BAR */}
      <div className="border-b border-[#e9e4dd] bg-[#faf9f7]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-end gap-4 px-4 py-2 text-[11px] text-[#6b5d52] sm:gap-5 sm:px-6 sm:text-xs lg:px-8">
          {TOP_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-[#a0643c]"
            >
              {link.label}
            </Link>
          ))}
          {loggedIn && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-[#a0643c] disabled:opacity-60"
            >
              <FiLogOut className="h-3.5 w-3.5" />
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          )}
        </div>
      </div>

      {/* MAIN BAR */}
      <div className="border-b border-[#e9e4dd] bg-[#f6f2ed]">
        <div className="mx-auto grid h-16 max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6 lg:h-[72px] lg:px-8">
          {/* LEFT: hamburger (mobile/tablet) / menu (desktop) */}
          <div className="flex items-center">
            <button
              ref={menuBtnRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              className="-ml-2 p-2 text-[#2b2420] lg:hidden"
            >
              <FiMenu className="h-6 w-6" />
            </button>

            <nav aria-label="Main" className="hidden items-center gap-8 lg:flex xl:gap-10">
              {NAV.map((item) => {
                const open = openMenu === item.label;
                return (
                  <div
                    key={item.label}
                    className="group relative"
                    onMouseEnter={() => item.children && setOpenMenu(item.label)}
                    onMouseLeave={() => setOpenMenu(null)}
                    onFocus={() => item.children && setOpenMenu(item.label)}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        setOpenMenu(null);
                      }
                    }}
                  >
                    {/* Hover par neeche ki line left se right animate hoti hai + color change */}
                    <Link
                      href={item.href}
                      onClick={closeMenus}
                      className={`relative inline-flex items-center gap-1.5 py-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-[#5b4a3f] transition-colors duration-200 group-hover:text-[#a0643c] focus-visible:text-[#a0643c] after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:bg-[#a0643c] after:transition-transform after:duration-300 after:ease-out group-hover:after:scale-x-100 focus-visible:after:scale-x-100 ${
                        isActive(item.href) ? "after:scale-x-100" : "after:scale-x-0"
                      }`}
                    >
                      {item.label}
                      {item.children && (
                        <FiChevronDown
                          className={`h-3 w-3 text-[#9a8b7e] transition-transform duration-200 ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </Link>

                    {item.children && (
                      <div
                        className={`absolute left-0 top-full z-50 pt-3 transition-all duration-150 ${
                          open ? "visible opacity-100" : "invisible opacity-0"
                        }`}
                      >
                        <ul className="min-w-[200px] rounded-md border border-[#e9e4dd] bg-white py-2 shadow-lg">
                          {item.children.map((child) => (
                            <li key={child.label}>
                              <Link
                                href={child.href}
                                onClick={closeMenus}
                                className="block px-4 py-2 text-sm text-[#5b4a3f] transition-colors hover:bg-[#f6f2ed] hover:text-[#a0643c]"
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* CENTER: logo */}
          <Link
            href="/"
            className="text-center text-xl font-semibold tracking-tight text-[#1f1a17] sm:text-2xl"
          >
            {BRAND}
          </Link>

          {/* RIGHT: icons */}
          <div className="flex items-center justify-end gap-3 sm:gap-4 lg:gap-5">
            <button type="button" aria-label="Search" className={iconBtn}>
              <FiSearch className="h-[18px] w-[18px]" />
            </button>
            <Link href="/account" aria-label="My account" className={`${iconBtn} hidden sm:inline-flex`}>
              <FiUser className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/wishlist"
              aria-label={`Wishlist (${wishlistCount})`}
              className={`${iconBtn} hidden sm:inline-flex`}
            >
              <FiHeart className="h-[18px] w-[18px]" />
              <span className={count}>{wishlistCount}</span>
            </Link>
            <Link href="/compare" aria-label="Compare" className={`${iconBtn} hidden md:inline-flex`}>
              <FiShuffle className="h-[18px] w-[18px]" />
              <span className={count}>{compareCount}</span>
            </Link>
            <Link href="/cart" aria-label="Cart" className={iconBtn}>
              <FiShoppingBag className="h-[18px] w-[18px]" />
              <span className={count}>{cartCount}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* MOBILE / TABLET MENU: left se slide hone wala drawer */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`fixed inset-0 z-[60] transition-[visibility] duration-300 lg:hidden ${
          mobileOpen ? "visible" : "invisible pointer-events-none"
        }`}
      >
        {/* Overlay: click karne par menu band */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close menu"
          onClick={closeMobile}
          className={`absolute inset-0 h-full w-full cursor-default bg-[#1f1a17]/45 transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Panel */}
        <aside
          className={`absolute left-0 top-0 flex h-full w-[86%] max-w-[380px] flex-col bg-[#f6f2ed] shadow-2xl transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Panel header */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#e9e4dd] px-5 sm:px-6">
            <Link
              href="/"
              onClick={closeMobile}
              className="text-xl font-semibold tracking-tight text-[#1f1a17]"
            >
              {BRAND}
            </Link>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={closeMobile}
              aria-label="Close menu"
              className="-mr-2 p-2 text-[#2b2420] transition-colors hover:text-[#a0643c]"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>

          {/* Links */}
          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 py-2 sm:px-6">
            <ul className="divide-y divide-[#e9e4dd]">
              {NAV.map((item) => {
                const expanded = openAccordion === item.label;
                return (
                  <li key={item.label}>
                    {item.children ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setOpenAccordion(expanded ? null : item.label)}
                          aria-expanded={expanded}
                          className={`flex w-full items-center justify-between py-4 text-left text-[13px] font-medium uppercase tracking-[0.14em] sm:text-sm ${
                            isActive(item.href) ? "text-[#a0643c]" : "text-[#5b4a3f]"
                          }`}
                        >
                          {item.label}
                          <FiChevronDown
                            className={`h-4 w-4 text-[#9a8b7e] transition-transform ${
                              expanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {expanded && (
                          <ul className="pb-3 pl-3">
                            {item.children.map((child) => (
                              <li key={child.label}>
                                <Link
                                  href={child.href}
                                  onClick={closeMobile}
                                  className="block py-2.5 text-[15px] text-[#6b5d52] transition-colors hover:text-[#a0643c]"
                                >
                                  {child.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={closeMobile}
                        className={`block py-4 text-[13px] font-medium uppercase tracking-[0.14em] sm:text-sm ${
                          isActive(item.href) ? "text-[#a0643c]" : "text-[#5b4a3f]"
                        }`}
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Chhoti screens par jo icons header mein hidden hain, wo yahan milte hain */}
          <div className="grid shrink-0 grid-cols-3 gap-3 border-t border-[#e9e4dd] bg-[#faf9f7] p-5 sm:p-6">
            <Link href="/account" onClick={closeMobile} className={tile}>
              <FiUser className="h-5 w-5" />
              Account
            </Link>
            <Link href="/wishlist" onClick={closeMobile} className={tile}>
              <FiHeart className="h-5 w-5" />
              Wishlist ({wishlistCount})
            </Link>
            <Link href="/compare" onClick={closeMobile} className={tile}>
              <FiShuffle className="h-5 w-5" />
              Compare ({compareCount})
            </Link>

            {loggedIn && (
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="col-span-3 flex items-center justify-center gap-2 rounded-md border border-[#e9e4dd] bg-white py-3 text-sm font-medium text-[#5b4a3f] transition-colors hover:border-[#a0643c] hover:text-[#a0643c] disabled:opacity-60"
              >
                <FiLogOut className="h-[18px] w-[18px]" />
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            )}
          </div>
        </aside>
      </div>
    </header>
  );
}

export default Navbar;