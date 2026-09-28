"use client";

import { useState, useEffect, useRef } from "react";
import { FaInstagram, FaFacebookF, FaTwitter, FaYoutube } from "react-icons/fa";
import {
  FaBars,
  FaXmark,
  FaHouse,
  FaRocket,
  FaUsers,
  FaBlog,
  FaTag,
  FaArrowRight,
  FaRightFromBracket,
} from "react-icons/fa6";
import logo_icon from "../../public/icons.png";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  // 👤 Logged-in user fetch
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  // 🖱️ Dropdown ke bahar click ho to band ho jaye
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // 🔒 Lock body scroll + ESC to close
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  const goTo = (path: string) => {
    setMenuOpen(false);
    if (path === "/login" || path === "/signup") {
      window.location.href = path; // bypass client router cache — always hits middleware
    } else {
      router.push(path);
    }
  };

  // 🚪 Logout handler
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
      setMenuOpen(false);
      setProfileOpen(false);
      toast.success("Logged out successfully");
      // toast dikhne ka time do, phir full reload
      setTimeout(() => {
        window.location.href = "/login";
      }, 900);
    } catch (err) {
      console.error("Logout failed:", err);
      toast.error("Logout failed, please try again");
      setLoggingOut(false);
    }
  };

  return (
    <>
      {/* NAVBAR */}
      <div className="w-full bg-surface">
        <nav className="mx-auto flex w-full items-center justify-between px-4 py-3 sm:px-6 md:px-8 lg:px-[5%] text-text">
          {/* Logo */}
          <div className="flex flex-1 items-center gap-1.5 sm:gap-2">
            <img src="/Icon.jpg" alt="Logo" className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
            <span className="text-sm sm:text-base md:text-lg font-semibold whitespace-nowrap">Nextcent</span>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3 lg:gap-6">
            {/* Links — sirf sm+ */}
            <ul className="hidden sm:flex list-none gap-2 sm:gap-3 lg:gap-9">
              {["Home", "Features", "Community", "Blog", "Pricing"].map((label) => (
                <li key={label}>
                  <a
                    href="#"
                    className="text-[10px] sm:text-xs lg:text-sm font-medium text-text no-underline hover:text-primary transition-colors whitespace-nowrap"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>

            {/* Account icon + dropdown — mobile aur desktop dono pe */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((p) => !p)}
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-white text-xs font-semibold ring-2 ring-transparent hover:ring-accent/30 focus:outline-none focus:ring-accent/40 active:scale-95 transition cursor-pointer"
              >
                {initials}
              </button>

              <div
                role="menu"
                className={`fixed right-3 top-[68px] sm:absolute sm:right-0 sm:top-full sm:mt-2 w-72 max-w-[calc(100vw-1.5rem)] origin-top-right rounded-theme bg-surface shadow-xl border border-theme z-50 overflow-hidden transition-all duration-200 ${
                profileOpen
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none"
                }`}
              >
                {/* User info */}
                <div className="flex items-center gap-3 p-4">
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white text-base font-semibold shrink-0">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text truncate">
                      {user?.name ?? "Loading..."}
                    </p>
                    <p className="text-xs text-muted truncate">{user?.email ?? ""}</p>
                  </div>
                </div>

                <div className="border-t border-theme" />

                {/* Sign out */}
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text hover:bg-background disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <FaRightFromBracket className="w-4 h-4 text-muted" />
                  {loggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>

            {/* Hamburger — sirf mobile */}
            <button
              aria-label="Open menu"
              onClick={() => {
                setProfileOpen(false);
                setMenuOpen(true);
              }}
              className="sm:hidden flex items-center justify-center w-10 h-10 rounded-theme text-text hover:bg-background active:scale-95 transition"
            >
              <FaBars className="w-5 h-5" />
            </button>
          </div>
        </nav>
      </div>

      {/* MOBILE MENU — Slide from right */}
      {/* Backdrop */}
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 sm:hidden ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-[80%] max-w-[340px] bg-surface shadow-2xl flex flex-col transform transition-transform duration-300 ease-out sm:hidden ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
          <div className="flex items-center gap-2">
            <img src="/Icon.jpg" alt="Logo" className="w-7 h-7 rounded" />
            <span className="text-base font-semibold text-text">Nextcent</span>
          </div>
          <button
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-center w-9 h-9 rounded-theme text-text hover:bg-background active:scale-95 transition"
          >
            <FaXmark className="w-5 h-5" />
          </button>
        </div>

        {/* Profile section */}
        <div
          className={`px-5 py-5 border-b border-theme bg-linear-to-br from-accent/10 to-surface transform transition-all duration-300 ${
            menuOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          }`}
          style={{ transitionDelay: menuOpen ? "80ms" : "0ms" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white text-base font-semibold ring-4 ring-surface shadow-md shadow-accent/30 flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text truncate">
                {user?.name ?? "Loading..."}
              </p>
              <p className="text-xs text-muted truncate">{user?.email ?? ""}</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {[
              { label: "Home", icon: FaHouse, href: "#" },
              { label: "Features", icon: FaRocket, href: "#" },
              { label: "Community", icon: FaUsers, href: "#" },
              { label: "Blog", icon: FaBlog, href: "#" },
              { label: "Pricing", icon: FaTag, href: "#" },
            ].map(({ label, icon: Icon, href }, i) => (
              <li
                key={label}
                style={{
                  transitionDelay: menuOpen ? `${100 + i * 60}ms` : "0ms",
                }}
                className={`transform transition-all duration-300 ${
                  menuOpen ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"
                }`}
              >
                <a
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="group flex items-center justify-between gap-3 px-4 py-3 rounded-theme text-text hover:bg-background active:bg-accent/10 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-theme bg-background group-hover:bg-accent/10 transition-colors">
                      <Icon className="w-4 h-4 text-accent" />
                    </span>
                    <span className="text-sm font-medium">{label}</span>
                  </span>
                  <FaArrowRight className="w-3 h-3 text-muted opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout footer */}
        <div
          className={`px-5 py-5 border-t border-theme transform transition-all duration-300 ${
            menuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
          style={{ transitionDelay: menuOpen ? "300ms" : "0ms" }}
        >
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 active:scale-[0.98] font-medium py-3 px-4 transition disabled:opacity-60"
          >
            <FaRightFromBracket className="w-4 h-4" />
            <span>{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </aside>

      {/* HERO */}
      <div className="w-full bg-background mb-6 sm:mb-7">
        <div className="mx-auto flex w-full max-w-[1140px] min-h-fit lg:min-h-[450px] flex-col-reverse sm:flex-row items-center justify-around gap-8 sm:gap-10 lg:gap-[72px] px-4 sm:px-8 md:px-12 lg:px-[100px] py-8 sm:py-10 lg:py-[67px]">
          <div className="flex w-full sm:w-1/2 lg:w-[490px] flex-col items-center sm:items-start gap-4 sm:gap-5 lg:gap-[22px] text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[46px] font-semibold leading-[1.15] text-text">
              Lessons and insights
            </h1>
            <span className="text-2xl sm:text-3xl md:text-4xl lg:text-[46px] font-semibold leading-[1.15] text-primary">
              From 8 years
            </span>
            <p className="text-sm sm:text-base font-normal leading-relaxed text-muted max-w-[420px]">
              Where to grow your business as a photographer: site or social media?
            </p>

            <button
              onClick={() => goTo("/signup")}
              className="w-fit px-6 py-3 lg:w-[128px] lg:h-[52px] rounded-theme bg-primary lg:pt-[10px] lg:pr-10 lg:pb-[10px] lg:pl-[22px] text-white text-sm lg:text-base transition duration-300 hover:opacity-90 cursor-pointer"
            >
              Register
            </button>
          </div>
          <div className="w-full sm:w-auto flex justify-center">
            <img
              src="/Illustration-removebg-preview.png"
              alt=""
              className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] md:w-[220px] md:h-[220px] lg:w-[282px] lg:h-[283px]"
            />
          </div>
        </div>
      </div>

      {/* CLIENTS */}
      <div className="mx-auto my-6 sm:my-[30px] w-full max-w-[1140px] h-auto px-4 sm:px-8 md:px-12 lg:px-[100px]">
        <div className="mx-auto flex w-full max-w-[773px] flex-col gap-2">
          <h2 className="text-center text-lg sm:text-xl md:text-2xl font-semibold leading-snug text-text">
            Our Clients
          </h2>
          <p className="text-center text-xs sm:text-sm font-normal leading-relaxed text-muted">
            We have been working with some Fortune 500+ clients
          </p>
        </div>

        <div className="block min-[375px]:hidden mt-6 overflow-hidden">
          <div className="flex overflow-x-auto scroll-smooth gap-8 pl-6 pr-4 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div key={n} className="flex-shrink-0">
                <img
                  src={`/Logo__${n}_-removebg-preview.png`}
                  alt=""
                  className="w-7 h-7 rounded-md"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="hidden min-[375px]:flex mt-6 flex-row flex-wrap items-center justify-center gap-6 sm:flex-nowrap sm:justify-between sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <div key={n} className="flex-shrink-0">
              <img
                src={`/Logo__${n}_-removebg-preview.png`}
                alt=""
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-md"
              />
            </div>
          ))}
        </div>
      </div>

      {/* COMMUNITY / WHO IT'S FOR */}
      <div className="mx-auto flex w-full max-w-[1140px] mt-9 h-auto flex-col gap-6 sm:gap-8 px-4 sm:px-8 md:px-12 lg:px-0">
        <div className="w-full h-auto">
          <h2 className="mx-auto h-auto w-full max-w-[377px] text-center text-lg sm:text-xl md:text-2xl font-semibold leading-snug text-text">
            Manage your entire community in a single system
          </h2>
          <p className="mt-2 h-auto w-full text-center text-xs sm:text-sm font-normal leading-relaxed text-text">
            Who is Nextcent suitable for?
          </p>
        </div>

        <div className="flex w-full h-auto flex-col sm:flex-row justify-between gap-6 lg:px-[100px]">
          {[
            { title: "Membership Organisations", img: "/Icon (3).png" },
            { title: "National Associations", img: "/Icon (2).png" },
            { title: "Clubs And Groups", img: "/Icon (1).png" },
          ].map((item, i) => (
            <div
              key={i}
              className="w-[85%] mx-auto sm:mx-0 sm:w-1/3 lg:w-[299px] shadow-sm hover:shadow-md transition-shadow duration-300 flex h-auto flex-col items-center gap-2 rounded-theme border border-theme bg-surface py-5 px-5"
            >
              <div className="flex w-full max-w-[186px] h-auto flex-col items-center gap-3">
                {/* Image instead of icon */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="h-auto w-full text-center text-base sm:text-lg font-bold leading-snug text-text">
                  {item.title}
                </h3>
              </div>
              <p className="w-full h-auto text-center max-w-[290px] text-xs sm:text-sm font-normal leading-relaxed text-muted">
                Our membership management software provides full automation of
                membership renewals and payments
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* BODY WRAPPER — PART 1 */}
      <div className="mx-auto mt-6 lg:mt-[26px] w-full max-w-[1140px] h-auto flex flex-col gap-8 px-4 sm:px-8 md:px-12 lg:px-0">
        <div className="w-full h-auto">
          <div className="flex w-full h-auto flex-col sm:flex-row items-center gap-8 lg:gap-16 justify-center lg:px-[100px]">
            <div className="w-full max-w-[308px] sm:w-[35%] lg:w-[308px] h-auto flex-shrink-0">
              <img src="/craiyon_111152_image.png" alt="" className="w-full h-auto" />
            </div>
            <div className="flex w-full h-auto flex-col items-center sm:items-start gap-4 lg:gap-[22px] px-4 sm:px-0">
              <div className="flex w-full h-auto flex-col gap-3 text-center sm:text-left">
                <h2 className="h-auto text-lg sm:text-xl md:text-2xl font-semibold leading-snug text-text">
                  The unseen of spending three years at Pixelgrade
                </h2>
                <p className="h-auto text-xs sm:text-sm font-normal leading-relaxed text-muted">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sit
                  amet justo ipsum. Sed accumsan quam vitae est varius fringilla.
                  Pellentesque placerat vestibulum lorem sed porta. Nullam mattis
                  tristique iaculis. Nullam pulvinar sit amet risus pretium
                  auctor. Etiam quis massa pulvinar, aliquam quam vitae, tempus
                  sem. Donec elementum pulvinar odio.
                </p>
              </div>
              <button className="w-fit rounded-theme bg-primary px-6 py-2 text-white text-sm hover:opacity-90 transition-colors">
                Learn more
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ACHIEVEMENTS */}
      <div className="w-full bg-background my-6 lg:my-[33px]">
        <div className="mx-auto flex w-full max-w-[1140px] h-auto flex-col sm:flex-row justify-between gap-8 lg:gap-16 py-8 lg:pt-[45px] lg:pb-[46px] px-4 sm:px-8 md:px-12 lg:px-[100px]">
          <div className="w-full sm:w-[42%] lg:w-[375px] h-auto flex-shrink-0">
            <div className="flex w-full h-auto flex-col gap-2 text-center sm:text-left items-center sm:items-start">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold leading-snug text-text">
                Helping a local
              </h2>
              <span className="text-lg sm:text-xl md:text-2xl font-semibold leading-snug text-primary">
                business reinvent itself
              </span>
              <p className="mt-2 h-auto text-xs sm:text-sm font-normal leading-relaxed text-text">
                We reached here with our hard work and dedication
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full sm:w-[55%] lg:w-[376px]">
            {[
              { icon: "/Icon (3).png", value: "2,245,341", label: "Members" },
              { icon: "/Icon (4).png", value: "46,328", label: "Clubs" },
              { icon: "/Icon (5).png", value: "828,867", label: "Event Bookings" },
              { icon: "/Vector.png", value: "1,926,436", label: "Payments" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-row items-center gap-3 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
                  <img src={stat.icon} alt="" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-sm sm:text-base md:text-lg font-bold leading-snug text-text">
                    {stat.value}
                  </h3>
                  <p className="text-[11px] sm:text-xs font-normal leading-relaxed text-muted">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BODY WRAPPER — PART 2 */}
      <div className="mx-auto w-full max-w-[1140px] h-auto flex flex-col gap-8 px-4 sm:px-8 md:px-12 lg:px-0">
        <div className="w-full h-auto">
          <div className="flex w-full h-auto flex-col-reverse sm:flex-row items-center gap-8 lg:gap-16 justify-center lg:px-[100px]">
            <div className="w-[55%] sm:w-[35%] lg:w-auto h-auto flex-shrink-0 mx-auto sm:mx-0 self-center mb-2 sm:mb-0">
              <img src="/pana-removebg-preview.png" alt="" className="w-full h-auto lg:h-[302px] lg:w-auto" />
            </div>
            <div className="flex w-full h-auto flex-col items-center sm:items-start gap-4 lg:gap-[22px] px-4 sm:px-0">
              <div className="w-full h-auto flex flex-col gap-2 text-center sm:text-left">
                <h2 className="h-auto text-lg sm:text-xl md:text-2xl font-semibold leading-snug text-text">
                  How to design your site footer like we did.
                </h2>
                <p className="h-auto text-xs sm:text-sm font-normal leading-relaxed text-muted">
                  Donec a eros justo. Fusce egestas tristique ultrices. Nam
                  tempor, augue nec tincidunt molestie, massa nunc varius arcu,
                  at scelerisque elit erat a magna. Donec quis erat at libero
                  ultrices mollis. In hac habitasse platea dictumst. Vivamus
                  vehicula leo dui, at porta nisi facilisis finibus. In euismod
                  augue vitae nisi ultricies, non aliquet urna tincidunt.
                  Integer in nisi eget nulla commodo faucibus efficitur quis
                  massa. Praesent felis est, finibus et nisi ac, hendrerit
                  venenatis libero. Donec consectetur faucibus ipsum id gravida.
                </p>
              </div>
              <button className="w-fit rounded-theme bg-primary px-6 py-2 text-white text-sm hover:opacity-90 transition-colors">
                Learn more
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CUSTOMERS / TESTIMONIAL */}
      <div className="w-full bg-background my-6 lg:my-[34px]">
        <div className="mx-auto flex w-full max-w-[1140px] h-auto flex-col-reverse sm:flex-row justify-center items-center gap-8 lg:gap-[54px] py-8 lg:pt-[22px] lg:pb-[22px] px-4 sm:px-8 md:px-12 lg:px-[100px]">
          <div className="mx-auto sm:mx-0 flex-shrink-0">
            <img
              src="/image 9.png"
              alt=""
              className="w-[260px] h-[180px] sm:w-[226px] sm:h-[290px] rounded-md shadow-[0px_5.57px_11.14px_0px_#ABBED166]"
            />
          </div>
          <div className="flex w-full lg:w-[721px] h-auto flex-col items-center sm:items-start gap-4 lg:gap-[22px] px-4 sm:px-0">
            <div className="flex w-full h-auto flex-col gap-3 text-center sm:text-left">
              <p className="h-auto w-full text-xs sm:text-sm font-medium leading-relaxed text-muted">
                Maecenas dignissim justo eget nulla rutrum molestie. Maecenas
                lobortis sem dui, vel rutrum risus tincidunt ullamcorper. Proin
                eu enim metus. Vivamus sed libero ornare, tristique quam in,
                gravida enim. Nullam ut molestie arcu, at hendrerit elit. Morbi
                laoreet elit at ligula molestie, nec molestie mi blandit.
                Suspendisse cursus tellus sed augue ultrices, quis tristique
                nulla sodales. Suspendisse eget lorem eu turpis vestibulum
                pretium. Suspendisse potenti. Quisque malesuada enim sapien,
                vitae placerat ante feugiat eget. Quisque vulputate odio neque,
                eget efficitur libero condimentum id. Curabitur id nibh id sem
                dignissim finibus ac sit amet magna.
              </p>
              <div className="flex flex-col gap-1">
                <h3 className="h-auto w-full text-sm font-semibold leading-[19px] text-primary">
                  Tim Smith
                </h3>
                <p className="h-auto w-full text-xs font-normal leading-[17px] text-muted">
                  British Dragon Boat Racing Association
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col sm:flex-row items-center gap-4 lg:gap-[22px]">
              <div className="flex w-full max-w-[343px] flex-row flex-wrap items-center justify-center gap-6 sm:flex-nowrap sm:justify-between sm:gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex-shrink-0">
                    <img src={`/Logo__${n}_-removebg-preview.png`} alt="" className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
              <div className="w-fit h-auto flex items-center gap-1.5">
                <p className="h-auto w-auto text-sm font-semibold leading-[19px] text-primary">
                  Meet all customers
                </p>
                <img src="/dr.png" alt="" className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BODY WRAPPER — PART 3 / BLOG */}
      <div className="mx-auto w-full max-w-[1140px] h-auto flex flex-col gap-8 px-4 sm:px-8 md:px-12 lg:px-0">
        <div className="my-6 lg:my-[33px] mb-10 lg:mb-[61px] flex w-full h-auto flex-col gap-6">
          <div className="mx-auto my-3 flex w-full max-w-[600px] flex-col gap-2 text-center">
            <h2 className="h-auto w-full text-center text-lg sm:text-xl md:text-2xl font-semibold leading-snug text-text">
              Caring is the new marketing
            </h2>
            <p className="mx-auto h-auto w-full max-w-[437px] sm:max-w-[637px] text-xs sm:text-sm font-normal leading-relaxed text-muted">
              The Nextcent blog is the best place to read about the latest
              membership insights, trends and more. See who&apos;s joining the
              community, read about how our community are increasing their
              membership income and lot&apos;s more.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 w-full h-auto justify-items-center gap-10 sm:gap-4 lg:gap-8 lg:px-[100px]">
            {[
              { img: "/image 18.png", text: "Creating Streamlined Safeguarding Processes with OneRen" },
              { img: "/image 18.png", text: "What are your safeguarding responsibilities and how can you manage them?" },
              { img: "/image 18.png", text: "Revamping the Membership Model with Triathlon Australia" },
            ].map((card, index) => (
              <div key={index} className="relative flex w-full max-w-[316px] h-auto flex-col">
                <img src={card.img} alt="" className="w-full h-auto sm:h-[199px] rounded-md" />
                <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 z-10 flex w-[85%] max-w-[221px] h-auto flex-col gap-3 rounded-theme border border-theme bg-surface p-3 shadow-sm">
                  <p className="h-auto w-full text-center text-xs sm:text-sm font-semibold leading-snug text-muted">
                    {card.text}
                  </p>
                  <div className="flex w-full h-auto flex-row items-center justify-center gap-1.5">
                    <span className="h-auto w-auto text-sm leading-[19px] text-primary">Read more</span>
                    <img src="/dr.png" alt="" className="h-[17px] w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="w-full mt-10 lg:mt-16 flex flex-col">
        {/* CTA */}
        <div className="w-full bg-background px-4 py-10 lg:py-4 lg:pt-[22px] lg:pb-[22px]">
          <div className="mx-auto flex w-full max-w-[1140px] flex-col items-center gap-4 lg:gap-[22px]">
            <h2 className="mx-auto h-auto w-full max-w-[617px] text-center text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold leading-[1.2] text-text">
              Pellentesque suscipit fringilla libero eu.
            </h2>
            <button
              onClick={() => goTo("/signup")}
              className="mx-auto w-fit rounded-theme bg-primary px-6 py-2 text-xs font-medium leading-[17px] text-white hover:opacity-90 transition-colors cursor-pointer"
            >
              Get a Demo
            </button>
          </div>
        </div>

        {/* FOOTER — DARK */}
        <div className="w-full bg-secondary px-4 sm:px-8 md:px-12 lg:px-[115px] py-10 lg:py-[64px]">
          <div className="mx-auto flex w-full max-w-[1140px] flex-col lg:flex-row justify-between gap-10 lg:gap-[125px]">
            <div className="flex w-full lg:w-[244px] h-auto flex-col gap-6 lg:gap-10">
              <div className="flex items-center gap-2">
                <img src={logo_icon.src} alt="Logo" className="w-8 h-8 rounded" />
                <span className="text-white text-lg sm:text-xl font-semibold">Nexcent</span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-white/80 text-xs sm:text-sm font-normal leading-[20px]">
                  Copyright © 2020 Nexcent ltd.
                </p>
                <p className="text-white/80 text-xs sm:text-sm font-normal leading-[20px]">
                  All rights reserved
                </p>
              </div>
              <div className="flex items-center gap-4">
                <a href="#" aria-label="Instagram" className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-accent transition-colors">
                  <FaInstagram className="w-4 h-4 text-white" />
                </a>
                <a href="#" aria-label="Facebook" className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-accent transition-colors">
                  <FaFacebookF className="w-4 h-4 text-white" />
                </a>
                <a href="#" aria-label="Twitter" className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-accent transition-colors">
                  <FaTwitter className="w-4 h-4 text-white" />
                </a>
                <a href="#" aria-label="YouTube" className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-accent transition-colors">
                  <FaYoutube className="w-4 h-4 text-white" />
                </a>
              </div>
            </div>

            <div className="flex w-full lg:w-[635px] h-auto flex-col sm:flex-row gap-10 sm:gap-8 lg:gap-[30px]">
              <div className="flex w-full sm:w-1/3 flex-col gap-4 lg:gap-6">
                <h3 className="text-white text-base sm:text-lg lg:text-xl font-semibold leading-[28px]">Company</h3>
                <ul className="flex flex-col gap-3">
                  {["About us", "Blog", "Contact us", "Pricing", "Testimonials"].map((item) => (
                    <li key={item} className="text-white/80 text-xs sm:text-sm font-normal leading-[20px] cursor-pointer hover:text-white transition-colors">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex w-full sm:w-1/3 flex-col gap-4 lg:gap-6">
                <h3 className="text-white text-base sm:text-lg lg:text-xl font-semibold leading-[28px]">Support</h3>
                <ul className="flex flex-col gap-3">
                  {["Help center", "Terms of service", "Legal", "Privacy policy", "Status"].map((item) => (
                    <li key={item} className="text-white/80 text-xs sm:text-sm font-normal leading-[20px] cursor-pointer hover:text-white transition-colors">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex w-full sm:w-1/3 flex-col gap-4 lg:gap-6">
                <h3 className="text-white text-base sm:text-lg lg:text-xl font-semibold leading-[28px]">Stay up to date</h3>
                <div className="flex items-center w-full max-w-[255px] h-10 rounded-theme bg-white/10 pl-4 pr-1">
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="flex-1 min-w-0 h-full border-none bg-transparent text-xs sm:text-sm text-white placeholder-white/60 focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Subscribe"
                    className="flex items-center justify-center w-7 h-7 rounded-theme bg-transparent hover:bg-accent transition-colors flex-shrink-0"
                  >
                    <img src="/dr.png" alt="" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}