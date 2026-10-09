"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  FaDollarSign,
  FaDownload,
  FaEllipsisV,
  FaEye,
  FaPlusCircle,
  FaRegEdit,
  FaTrash,
} from "react-icons/fa";
import OrderActionModal from "./OrderActionModal";
import SaleDetailModal from "./SaleDetailModal";

const orderListSchema = z.object({
  items: z.array(
    z.object({
      _id: z.string(),
      reference: z.string(),
      customerName: z.string(),
      customerEmail: z.string(),
      status: z.enum([
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ]),
      grandTotal: z.number(),
      paid: z.number(),
      due: z.number(),
      paymentStatus: z.enum(["unpaid", "paid", "refunded"]),
      paymentMethod: z.string(),
      itemCount: z.number(),
      createdAt: z.string(),
    })
  ),
  total: z.number(),
  page: z.number(),
  pages: z.number(),
});

type OrderRow = z.output<typeof orderListSchema>["items"][number];
type Action =
  | "detail"
  | "edit"
  | "payments"
  | "payment"
  | "pdf"
  | "delete";
type SelectedAction = { id: string; action: Action };

const statuses = [
  ["", "All statuses"],
  ["pending", "Pending"],
  ["confirmed", "Confirmed"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
] as const;

const actionItems: {
  action: Action;
  label: string;
  icon: typeof FaEye;
  className?: string;
}[] = [
  { action: "detail", label: "Sale Detail", icon: FaEye },
  { action: "edit", label: "Edit Sale", icon: FaRegEdit },
  { action: "payments", label: "Show Payments", icon: FaDollarSign },
  { action: "payment", label: "Create Payment", icon: FaPlusCircle },
  { action: "pdf", label: "Download PDF", icon: FaDownload },
  {
    action: "delete",
    label: "Delete Sale",
    icon: FaTrash,
    className: "text-red-600 hover:bg-red-50",
  },
];

const money = (value: number) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function responseError(value: unknown, fallback: string) {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}

function statusClass(status: OrderRow["status"]) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "confirmed":
      return "bg-blue-100 text-blue-800";
    case "shipped":
      return "bg-indigo-100 text-indigo-800";
    case "delivered":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
  }
}

function paymentClass(status: OrderRow["paymentStatus"]) {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-600";
    case "unpaid":
      return "bg-rose-50 text-rose-600";
    case "refunded":
      return "bg-amber-50 text-amber-600";
  }
}

export default function OrdersTable() {
  const menuRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [selected, setSelected] = useState<SelectedAction | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        search: query,
        page: String(page),
        limit: "10",
      });
      if (status) params.set("status", status);
      const response = await fetch(`/api/admin/orders?${params}`, {
        cache: "no-store",
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(responseError(body, "Failed to load orders."));
      }
      const parsed = orderListSchema.safeParse(body);
      if (!parsed.success) {
        throw new Error("Invalid orders response from the API.");
      }
      setItems(parsed.data.items);
      setTotal(parsed.data.total);
      setPages(Math.max(1, parsed.data.pages));
    } catch (cause) {
      console.error("Failed to load orders:", cause);
      setError(
        cause instanceof Error ? cause.message : "Failed to load orders."
      );
      setItems([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, query, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!openMenu) return;
    const closeMenu = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpenMenu(null);
      }
    };
    const closeOnScroll = () => setOpenMenu(null);
    document.addEventListener("pointerdown", closeMenu);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [openMenu]);

  const openAction = (id: string, action: Action) => {
    setOpenMenu(null);
    setSelected({ id, action });
  };
  const refresh = () => void load();

  const from = total === 0 ? 0 : (page - 1) * 10 + 1;
  const to = Math.min(page * 10, total);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3 sm:pb-4">
        <div>
          <h1 className="text-lg font-semibold text-text sm:text-2xl">Orders</h1>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            Review customer orders, payments, and delivery details.
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
       <div className="flex items-center justify-between gap-2 border-b border-border p-3 sm:gap-3 sm:p-4">
  <label className="sr-only" htmlFor="order-search">
    Search orders
  </label>
  <input
    id="order-search"
    type="search"
    value={search}
    onChange={(event) => setSearch(event.target.value)}
    placeholder="Search order, customer, or email..."
    className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-text outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-sm sm:px-3 sm:py-2 sm:text-sm"
  />
  <label className="flex shrink-0 items-center gap-2 text-sm text-muted">
    <span className="hidden sm:inline">Status</span>
    <select
      aria-label="Status"
      value={status}
      onChange={(event) => {
        setStatus(event.target.value);
        setPage(1);
      }}
      className="w-28 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-text sm:w-auto sm:px-3 sm:py-2 sm:text-sm"
    >
      {statuses.map(([value, label]) => (
        <option key={value || "all"} value={value}>
          {label}
        </option>
      ))}
    </select>
  </label>
</div>

        {error && (
          <p role="alert" className="border-b border-border px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm text-text">
            <thead className="bg-background text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Grand Total</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Payment Status</th>
                <th className="px-4 py-3">Biller</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, row) => (
                  <tr key={row} className="border-t border-border">
                    {Array.from({ length: 10 }).map((__, cell) => (
                      <td key={cell} className="px-4 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-background" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-12 text-center text-sm text-muted"
                  >
                    {error ? "Orders could not be loaded." : "No orders found."}
                  </td>
                </tr>
              ) : (
                items.map((order) => (
                  <tr
                    key={order._id}
                    className="border-t border-border hover:bg-background/70"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                          {(order.customerName || "G").slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <span className="block font-medium">
                            {order.customerName || "Guest"}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {order.customerEmail}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      #{order.reference}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {new Date(order.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {money(order.grandTotal)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {money(order.paid)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {money(order.due)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium capitalize ${paymentClass(order.paymentStatus)}`}
                      >
                        ● {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">Admin</td>
                    <td className="px-4 py-3 text-center">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          aria-label={`Actions for order ${order.reference}`}
                          aria-expanded={openMenu === order._id}
                          onClick={(event) => {
                            if (openMenu === order._id) {
                              setOpenMenu(null);
                              return;
                            }
                            const bounds =
                              event.currentTarget.getBoundingClientRect();
                            setMenuPosition({
                              top: Math.min(bounds.bottom + 4, window.innerHeight - 240),
                              right: Math.max(8, window.innerWidth - bounds.right),
                            });
                            setOpenMenu(order._id);
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted hover:bg-background hover:text-text"
                        >
                          <FaEllipsisV className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {from} to {to} of {total} orders
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-md border border-border px-3 py-1.5 text-text hover:bg-background disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-1">
              {page} / {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => setPage((current) => Math.min(pages, current + 1))}
              className="rounded-md border border-border px-3 py-1.5 text-text hover:bg-background disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      {openMenu && (
        <div
          ref={menuRef}
          className="fixed z-40 w-48 rounded-lg border border-border bg-surface p-1 shadow-lg"
          style={{ top: menuPosition.top, right: menuPosition.right }}
        >
          {actionItems.map(({ action, label, icon: Icon, className }) => (
            <button
              key={action}
              type="button"
              onClick={() => openAction(openMenu, action)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-text hover:bg-background ${className ?? ""}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {selected?.action === "detail" && (
        <SaleDetailModal
          id={selected.id}
          onClose={() => setSelected(null)}
        />
      )}
      {selected?.action === "pdf" && (
        <SaleDetailModal
          id={selected.id}
          printable
          onClose={() => setSelected(null)}
        />
      )}
      {selected &&
        selected.action !== "detail" &&
        selected.action !== "pdf" && (
          <OrderActionModal
            key={`${selected.id}:${selected.action}`}
            id={selected.id}
            action={selected.action}
            onClose={() => setSelected(null)}
            onUpdated={() => {
              refresh();
              setSelected(null);
            }}
            onDeleted={() => {
              setSelected(null);
              if (items.length === 1 && page > 1) {
                setPage((current) => current - 1);
              } else {
                refresh();
              }
            }}
          />
        )}
    </div>
  );
}