"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiHeart, FiLogOut, FiPackage, FiShoppingBag, FiShuffle, FiUser } from "react-icons/fi";
import { toast } from "sonner";

// /api/auth/me ka response yahan flexible rakha hai: { user: {...} } ya seedha {...}
type AccountUser = {
  id?: string;
  _id?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  phone?: string;
  createdAt?: string;
};

type State =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "user"; user: AccountUser };

const displayName = (u: AccountUser) =>
  u.name || u.fullName || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Account";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "U";

const linkTile =
  "flex items-center gap-3 rounded-lg border border-[#e9e4dd] bg-white px-4 py-3.5 text-sm text-[#5b4a3f] transition-colors hover:border-[#896142] hover:text-[#896142]";

export default function AccountPage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [loggingOut, setLoggingOut] = useState(false);

  const loadAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setState({ status: "guest" });
        return;
      }
      const data = await res.json();
      const user: AccountUser | undefined = data?.user ?? data;
      setState(user && (user.email || user.name) ? { status: "user", user } : { status: "guest" });
    } catch {
      setState({ status: "guest" });
    }
  }, []);

  // Real time: page khulte hi, aur tab/window wapas focus hone par dobara check
  useEffect(() => {
    loadAccount();
    const onFocus = () => loadAccount();
    const onVisible = () => {
      if (document.visibilityState === "visible") loadAccount();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadAccount]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      let res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.status === 405) res = await fetch("/api/auth/logout", { method: "GET" });
      if (!res.ok) throw new Error("Logout failed");
      toast.success("Logged out");
      setState({ status: "guest" });
      router.replace("/home");
      router.refresh();
    } catch {
      toast.error("Could not log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const isGuest = state.status === "guest";
  const user = state.status === "user" ? state.user : null;
  const name = user ? displayName(user) : "Guest";

  return (
    <section className="min-h-[70vh] bg-[#f5f1ea] py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="text-3xl font-medium text-[#2a231f] sm:text-4xl">My Account</h1>

        {/* LOADING */}
        {state.status === "loading" && (
          <div className="mt-8 animate-pulse space-y-4" aria-busy="true">
            <div className="h-28 rounded-2xl bg-[#efe9e1]" />
            <div className="h-14 rounded-lg bg-[#efe9e1]" />
            <div className="h-14 rounded-lg bg-[#efe9e1]" />
          </div>
        )}

        {state.status !== "loading" && (
          <>
            {/* PROFILE CARD */}
            <div className="mt-8 flex flex-col gap-5 rounded-2xl border border-[#e6e0d8] bg-white p-6 sm:flex-row sm:items-center">
              <span
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white ${
                  isGuest ? "bg-[#9a9087]" : "bg-[#896142]"
                }`}
              >
                {isGuest ? <FiUser className="h-7 w-7" /> : initials(name)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-medium text-[#2a231f]">{name}</p>
                {isGuest ? (
                  <>
                    <span className="mt-2 inline-block rounded-full bg-[#efe9e1] px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-[#896142]">
                      Guest
                    </span>
                    <p className="mt-2 text-sm text-[#6b625a]">
                      You&apos;re browsing as a guest. Sign in to place orders. Your cart and wishlist stay saved.
                    </p>
                  </>
                ) : (
                  <>
                    {user?.email && <p className="mt-0.5 truncate text-sm text-[#6b625a]">{user.email}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {user?.role && (
                        <span className="rounded-full bg-[#efe9e1] px-2.5 py-1 font-medium uppercase tracking-wide text-[#896142]">
                          {user.role}
                        </span>
                      )}
                      {user?.createdAt && (
                        <span className="text-[#9a9087]">
                          Member since{" "}
                          {new Date(user.createdAt).toLocaleDateString("en-GB", {
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {isGuest ? (
                <div className="flex gap-3">
                  <Link
                    href="/login"
                    className="rounded-lg bg-[#896142] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#6f4a2e]"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-lg border border-[#896142] px-5 py-2.5 text-sm font-medium text-[#896142] transition hover:bg-[#896142] hover:text-white"
                  >
                    Sign up
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#e6e0d8] px-5 py-2.5 text-sm font-medium text-[#5b4a3f] transition hover:border-[#896142] hover:text-[#896142] disabled:opacity-60"
                >
                  <FiLogOut className="h-4 w-4" />
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              )}
            </div>

            {/* QUICK LINKS */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link href="/orders" className={linkTile}>
                <FiPackage className="h-5 w-5" /> Track order
              </Link>
              <Link href="/wishlist" className={linkTile}>
                <FiHeart className="h-5 w-5" /> Wishlist
              </Link>
              <Link href="/cart" className={linkTile}>
                <FiShoppingBag className="h-5 w-5" /> Cart
              </Link>
              <Link href="/compare" className={linkTile}>
                <FiShuffle className="h-5 w-5" /> Compare
              </Link>
              {user?.role === "admin" && (
                <Link href="/admin/dashboard" className={`${linkTile} sm:col-span-2`}>
                  <FiUser className="h-5 w-5" /> Admin dashboard
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}