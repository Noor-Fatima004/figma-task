"use client";

// Rakho: app/(front-store)/orders/page.tsx
// Login zaroori hai. Data: GET /api/orders/my

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiChevronDown, FiChevronRight, FiPackage, FiUser } from "react-icons/fi";

const LOGIN_PATH = "/login";
const ORDERS_PATH = "/orders";

const formatMoney = (n: number) =>
  `Rs. ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type OrderItem = {
  id: string;
  name: string;
  image: string;
  note: string;
  price: number;
  qty: number;
};

type MyOrder = {
  _id: string;
  orderNumber: string;
  status: string;
  payment: string;
  createdAt: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  address: { name: string; line: string; city: string; country: string };
  items: OrderItem[];
};

// ⚠️ Status ke naam apne Order model ke hisaab se badlo
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[#faf3ea] text-[#8b5e3c]",
  confirmed: "bg-[#eef1f6] text-[#3f5a82]",
  shipped: "bg-[#eef1f6] text-[#3f5a82]",
  delivered: "bg-[#eaf3ec] text-[#2f6b3f]",
  cancelled: "bg-[#fbf0ee] text-[#b3402f]",
};

// Kin statuses par "Write a review" dikhana hai (cancelled par nahi)
const REVIEWABLE_STATUSES = ["pending", "confirmed", "shipped", "delivered"];

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on delivery",
  card: "Card",
};

const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

function OrderCard({ order }: { order: MyOrder }) {
  const [open, setOpen] = useState(false);
  const status = order.status.toLowerCase();
  const canReview = REVIEWABLE_STATUSES.includes(status);
  const pieces = order.items.reduce((n, i) => n + i.qty, 0);

  return (
    <article className="rounded-2xl border border-[#e6e0d8] bg-white/60">
      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-[#e6e0d8] p-4 sm:p-5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#6b625a] sm:text-[11px]">
            Order
          </p>
          <p className="mt-1 text-sm font-semibold text-[#2a231f] sm:text-base">
            {order.orderNumber}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#6b625a] sm:text-[11px]">
            Placed on
          </p>
          <p className="mt-1 text-sm text-[#2a231f]">
            {new Date(order.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#6b625a] sm:text-[11px]">
            Total
          </p>
          <p className="mt-1 text-sm font-semibold text-[#2a231f]">{formatMoney(order.total)}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-medium ${
            STATUS_STYLE[status] ?? "bg-[#f1ebe3] text-[#4d453f]"
          }`}
        >
          {label(order.status)}
        </span>
      </div>

      {/* ITEMS */}
      <ul className="divide-y divide-[#efe9e1] px-4 sm:px-5">
        {order.items.map((i, idx) => (
          <li key={`${i.id}-${idx}`} className="flex items-center gap-3 py-3 sm:gap-4 sm:py-4">
            <span className="relative block h-16 w-14 shrink-0 bg-[#f1ebe3] sm:h-20 sm:w-16">
              {i.image && (
                <Image src={i.image} alt={i.name} fill unoptimized sizes="64px" className="object-cover" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium text-[#2a231f]">{i.name}</p>
              {i.note && <p className="mt-0.5 truncate text-xs text-[#6b625a]">{i.note}</p>}
              <p className="mt-1 text-xs text-[#6b625a]">Qty {i.qty}</p>
              {canReview && i.id && (
                <Link
                  href={`/product/${i.id}#reviews`}
                  className="mt-1.5 inline-block text-xs font-medium text-[#8b5e3c] underline underline-offset-4 hover:text-[#6f4a2e]"
                >
                  Write a review
                </Link>
              )}
            </div>
            <p className="shrink-0 text-sm font-medium text-[#2a231f]">
              {formatMoney(i.price * i.qty)}
            </p>
          </li>
        ))}
      </ul>

      {/* DETAILS TOGGLE */}
      <div className="border-t border-[#e6e0d8] px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between text-[10px] font-medium uppercase tracking-[0.2em] text-[#2a231f] transition hover:text-[#8b5e3c] sm:text-[11px]"
        >
          {open ? "Hide details" : `View details · ${pieces} ${pieces === 1 ? "piece" : "pieces"}`}
          <FiChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="mt-4 grid gap-6 pb-2 sm:grid-cols-2">
            <div>
              <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#6b625a] sm:text-[11px]">
                Shipping address
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4d453f]">
                {order.address.name}
                <br />
                {order.address.line}
                <br />
                {order.address.city}
                <br />
                {order.address.country}
              </p>
              <p className="mt-3 text-xs text-[#6b625a]">
                Payment: {PAYMENT_LABEL[order.payment] ?? order.payment}
              </p>
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[#6b625a]">Subtotal</dt>
                <dd className="text-[#2a231f]">{formatMoney(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6b625a]">Shipping</dt>
                <dd className="text-[#2a231f]">
                  {order.shipping === 0 ? "Complimentary" : formatMoney(order.shipping)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6b625a]">Tax</dt>
                <dd className="text-[#2a231f]">{formatMoney(order.tax)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-[#e6e0d8] pt-3 font-semibold">
                <dt className="text-[#2a231f]">Total</dt>
                <dd className="text-[#2a231f]">{formatMoney(order.total)}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </article>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState<"loading" | "guest" | "error" | "ready">("loading");
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (p: number) => {
    try {
      const res = await fetch(`/api/orders/my?page=${p}`, { cache: "no-store" });
      if (res.status === 401) {
        setState("guest");
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrders((prev) => (p === 1 ? data.orders : [...prev, ...data.orders]));
      setHasMore(!!data.hasMore);
      setPage(p);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    await load(page + 1);
    setLoadingMore(false);
  };

  const loginHref = `${LOGIN_PATH}?redirect=${encodeURIComponent(ORDERS_PATH)}`;

  return (
    <section className="bg-[#f5f1ea] py-6 sm:py-12">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#6b625a] sm:mb-6 sm:text-sm"
        >
          <Link href="/home" className="underline-offset-4 hover:text-[#2a231f] hover:underline">
            Home
          </Link>
          <FiChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-[#2a231f]">My orders</span>
        </nav>

        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#8b5e3c] sm:text-[11px]">
          Account
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-[#2a231f] sm:text-5xl">
          My orders
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#6b625a] sm:text-base">
          Everything you have ordered, with its current status.
        </p>

        <div className="mt-8 sm:mt-10">
          {state === "loading" && (
            <div className="space-y-4" aria-busy="true">
              {[0, 1].map((i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl bg-[#efe9e1]" />
              ))}
            </div>
          )}

          {state === "guest" && (
            <div className="flex items-start gap-3 rounded-2xl border border-[#e8d9c9] bg-[#faf3ea] p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#8b5e3c]">
                <FiUser className="h-[18px] w-[18px]" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#2a231f]">Sign in to view your orders</p>
                <Link
                  href={loginHref}
                  className="mt-2 inline-block text-xs font-medium uppercase tracking-[0.18em] text-[#8b5e3c] underline underline-offset-4 hover:text-[#6f4a2e]"
                >
                  Log in
                </Link>
              </div>
            </div>
          )}

          {state === "error" && (
            <p className="text-sm text-[#6b625a]">
              Your orders could not be loaded.{" "}
              <button
                type="button"
                onClick={() => {
                  setState("loading");
                  load(1);
                }}
                className="font-medium text-[#2a231f] underline underline-offset-4 hover:text-[#8b5e3c]"
              >
                Try again
              </button>
            </p>
          )}

          {state === "ready" && orders.length === 0 && (
            <div className="rounded-2xl border border-[#e6e0d8] bg-white/60 p-6 sm:p-8">
              <p className="flex flex-wrap items-center gap-2 text-sm text-[#4d453f] sm:text-base">
                <FiPackage className="h-5 w-5 text-[#9a9087]" />
                You have not placed any orders yet.
                <Link
                  href="/shop"
                  className="font-medium text-[#8b5e3c] underline underline-offset-4 hover:text-[#6f4a2e]"
                >
                  Start shopping
                </Link>
              </p>
            </div>
          )}

          {state === "ready" && orders.length > 0 && (
            <div className="space-y-4 sm:space-y-5">
              {orders.map((o) => (
                <OrderCard key={o._id} order={o} />
              ))}

              {hasMore && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="mx-auto flex border border-[#2a231f] px-6 py-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#2a231f] transition hover:bg-[#2a231f] hover:text-white disabled:opacity-60 sm:text-[11px]"
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}