"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";
import {
  FaDownload,
  FaEllipsisV,
  FaEye,
  FaFileExport,
  FaPrint,
} from "react-icons/fa";
import FormSelect from "@/app/components/FormSelect";
import InvoiceActionModal from "./InvoiceActionModal";
import InvoiceSummaryCards from "./InvoiceSummaryCards";
import type { InvoiceAction, InvoiceStatus } from "./types";

const listSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(z.object({
      _id: z.string(),
      invoiceNumber: z.string(),
      order: z.object({ _id: z.string(), orderNumber: z.string() }).nullable(),
      customer: z.object({ name: z.string(), email: z.string(), phone: z.string() }),
      issueDate: z.string(),
      dueDate: z.string(),
      grandTotal: z.number(),
      amountPaid: z.number(),
      balanceDue: z.number(),
      paymentStatus: z.enum(["draft", "unpaid", "partially_paid", "paid", "overdue", "refunded", "cancelled"]),
      paymentMethod: z.string(),
      currency: z.string(),
    })),
    total: z.number(),
    page: z.number(),
    pages: z.number(),
    summary: z.object({
      count: z.number(),
      revenue: z.number(),
      paid: z.number(),
      unpaid: z.number(),
      overdue: z.number(),
    }),
  }),
});
type InvoiceRow = z.output<typeof listSchema>["data"]["items"][number];
type SortKey = "invoiceNumber" | "orderNumber" | "customer" | "issueDate" | "dueDate" | "grandTotal" | "amountPaid" | "balanceDue" | "paymentStatus";
const statusOptions = [
  ["", "All statuses"],
  ["draft", "Draft"],
  ["unpaid", "Unpaid"],
  ["partially_paid", "Partially paid"],
  ["paid", "Paid"],
  ["overdue", "Overdue"],
  ["refunded", "Refunded"],
  ["cancelled", "Cancelled"],
] as const;
const pageSizes = [10, 25, 50, 100];
const money = (amount: number, currency = "USD") =>
  `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const statusClass: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  unpaid: "bg-rose-50 text-rose-600",
  partially_paid: "bg-amber-50 text-amber-700",
  paid: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-100 text-red-800",
  refunded: "bg-violet-50 text-violet-700",
  cancelled: "bg-slate-100 text-slate-600",
};
const actionEntries: { action: InvoiceAction; label: string; icon?: typeof FaEye }[] = [
  { action: "view", label: "View", icon: FaEye },
  { action: "edit", label: "Edit" },
  { action: "status", label: "Update status" },
  { action: "payment", label: "Record payment" },
  { action: "send", label: "Send invoice" },
  { action: "activity", label: "Activity log" },
  { action: "duplicate", label: "Duplicate" },
  { action: "delete", label: "Delete" },
];

// Action menu geometry (10 items: 8 actions + Download PDF + Print)
const MENU_WIDTH = 192;
const MENU_ITEM_HEIGHT = 36;
const MENU_HEIGHT = (actionEntries.length + 2) * MENU_ITEM_HEIGHT + 8;
const VIEWPORT_GAP = 8;

// Shared responsive control styles. text-base on mobile avoids iOS zoom on focus.
const controlClass =
  "block w-full min-w-0 rounded-md border border-border bg-background px-2.5 py-2 text-base text-text outline-none focus:ring-2 focus:ring-primary sm:text-sm";

function responseError(value: unknown, fallback: string) {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
    ? value.error
    : fallback;
}

export default function InvoiceTable() {
  const [items, setItems] = useState<InvoiceRow[]>([]);
  const [summary, setSummary] = useState({ count: 0, revenue: 0, paid: 0, unpaid: 0, overdue: 0 });
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sort, setSort] = useState<SortKey>("issueDate");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<{ id: string; action: InvoiceAction } | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({
    top: VIEWPORT_GAP,
    left: VIEWPORT_GAP,
    width: MENU_WIDTH,
    maxHeight: MENU_HEIGHT,
  });
  const actionMenuRef = useRef<HTMLDivElement>(null);

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
        page: String(page),
        limit: String(limit),
        sort,
        direction,
      });
      if (query) params.set("search", query);
      if (status) params.set("status", status);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (paymentMethod) params.set("paymentMethod", paymentMethod);
      if (minAmount) params.set("minAmount", minAmount);
      if (maxAmount) params.set("maxAmount", maxAmount);
      const response = await fetch(`/api/admin/invoices?${params}`, { cache: "no-store" });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(responseError(body, "Failed to load invoices."));
      const parsed = listSchema.safeParse(body);
      if (!parsed.success) throw new Error("Invalid invoice list response.");
      setItems(parsed.data.data.items);
      setTotal(parsed.data.data.total);
      setPages(Math.max(1, parsed.data.data.pages));
      setSummary(parsed.data.data.summary);
      setSelectedIds([]);
    } catch (cause) {
      console.error("Failed to load invoices:", cause);
      const message = cause instanceof Error ? cause.message : "Failed to load invoices.";
      setError(message);
      setItems([]);
      setTotal(0);
      setPages(1);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, direction, limit, maxAmount, minAmount, page, paymentMethod, query, sort, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // Close the action menu on outside click, scroll, resize, or Escape
  useEffect(() => {
    if (!openMenu) return;
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !actionMenuRef.current?.contains(event.target)) setOpenMenu(null);
    };
    const closeMenu = () => setOpenMenu(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [openMenu]);

  const toggleSort = (key: SortKey) => {
    if (sort === key) setDirection((value) => value === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDirection("asc");
    }
    setPage(1);
  };
  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item._id));
  const toggleAll = () => setSelectedIds(allSelected ? [] : items.map((item) => item._id));
  const toggleSelected = (id: string) =>
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const download = async (url: string, filename: string, init?: RequestInit) => {
    const response = await fetch(url, init);
    if (!response.ok) {
      const body: unknown = await response.json();
      throw new Error(responseError(body, "Download failed."));
    }
    const objectUrl = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  const runBulk = async (action: "delete" | "mark_paid" | "download_pdf" | "send_email") => {
    if (!selectedIds.length) return;
    if (action === "delete") {
      const paidCount = items.filter((invoice) =>
        selectedIds.includes(invoice._id) && invoice.paymentStatus === "paid"
      ).length;
      const warning = paidCount
        ? ` This includes ${paidCount} paid invoice(s) and may affect accounting records.`
        : "";
      if (!window.confirm(`Soft-delete ${selectedIds.length} selected invoice(s)?${warning}`)) return;
    }
    setBulkBusy(true);
    try {
      if (action === "download_pdf") {
        await download("/api/admin/invoices/bulk", "invoices.zip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ids: selectedIds }),
        });
      } else {
        const response = await fetch("/api/admin/invoices/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ids: selectedIds }),
        });
        const body: unknown = await response.json();
        if (!response.ok) throw new Error(responseError(body, "Bulk action failed."));
        if (action === "send_email" && typeof body === "object" && body !== null && "data" in body) {
          const counts = (body as { data: { sent: number; failed: number } }).data;
          if (counts.failed) throw new Error(`${counts.sent} sent; ${counts.failed} failed. Configure SMTP or check recipient addresses.`);
        }
      }
      toast.success(`Bulk ${action.replaceAll("_", " ")} completed.`);
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Bulk action failed.");
    } finally {
      setBulkBusy(false);
    }
  };

  const exportInvoices = async (format: "csv" | "xlsx") => {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (status) params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    if (minAmount) params.set("minAmount", minAmount);
    if (maxAmount) params.set("maxAmount", maxAmount);
    params.set("format", format);
    try {
      await download(`/api/admin/invoices/export?${params}`, `invoices.${format}`);
      toast.success(format === "csv" ? "Invoice list exported to CSV." : "Invoice list exported to Excel.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Failed to export invoices.");
    }
  };

  const rows = useMemo(() => items, [items]);
  const headerClass = "whitespace-nowrap px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted sm:px-4";
  const cellClass = "px-3 py-3 align-middle sm:px-4";
  const sortButton = (key: SortKey, label: string) => (
    <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1.5 hover:text-text">
      {label}{sort === key && <span aria-hidden="true">{direction === "asc" ? "↑" : "↓"}</span>}
    </button>
  );
  const openAction = (id: string, action: InvoiceAction) => {
    setOpenMenu(null);
    setSelectedAction({ id, action });
  };

  // Position the menu so it always stays fully inside the viewport:
  // - width shrinks on very narrow screens
  // - horizontally clamped so it never crosses the left/right edge
  // - opens upward when there isn't enough room below
  const placeMenu = (bounds: DOMRect) => {
    const width = Math.min(MENU_WIDTH, window.innerWidth - VIEWPORT_GAP * 2);
    const left = Math.min(
      Math.max(VIEWPORT_GAP, bounds.right - width),
      window.innerWidth - width - VIEWPORT_GAP
    );
    const spaceBelow = window.innerHeight - bounds.bottom - VIEWPORT_GAP - 4;
    const spaceAbove = bounds.top - VIEWPORT_GAP - 4;
    const openUp = spaceBelow < MENU_HEIGHT && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(MENU_HEIGHT, openUp ? spaceAbove : spaceBelow));
    const top = openUp ? Math.max(VIEWPORT_GAP, bounds.top - 4 - maxHeight) : bounds.bottom + 4;
    setMenuPosition({ top, left, width, maxHeight });
  };

  const actionMenu = (invoice: InvoiceRow) => (
    <div className="relative inline-block shrink-0 text-left">
      <button
        type="button"
        aria-label={`Actions for ${invoice.invoiceNumber}`}
        aria-haspopup="menu"
        aria-expanded={openMenu === invoice._id}
        onClick={(event) => {
          if (openMenu === invoice._id) {
            setOpenMenu(null);
            return;
          }
          placeMenu(event.currentTarget.getBoundingClientRect());
          setOpenMenu(invoice._id);
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted hover:bg-background hover:text-text"
      >
        <FaEllipsisV className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3 sm:pb-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-text sm:text-2xl">Invoices</h1>
          <p className="mt-1 text-xs text-muted sm:text-sm">Manage billing, payments, and customer invoices.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button type="button" onClick={() => void exportInvoices("csv")} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium text-text hover:bg-background sm:flex-none sm:text-sm"><FaFileExport />Export CSV</button>
          <button type="button" onClick={() => void exportInvoices("xlsx")} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium text-text hover:bg-background sm:flex-none sm:text-sm">Export Excel</button>
        </div>
      </div>

      <InvoiceSummaryCards summary={summary} />

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        {/* Filters: 1 col on mobile, 2 on small, 3 on md, 6 on xl. Nothing can overflow the screen. */}
        <div className="grid grid-cols-1 gap-2 border-b border-border p-3 text-text sm:grid-cols-2 sm:gap-3 sm:p-4 md:grid-cols-3 xl:grid-cols-6">
          <div className="min-w-0 sm:col-span-2 md:col-span-3 xl:col-span-2">
            <label htmlFor="invoice-search" className="sr-only">Search invoices</label>
            <input
              id="invoice-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice, order, customer, email..."
              className={controlClass}
            />
          </div>

          <div className="min-w-0 [&>*]:w-full [&>*]:max-w-full">
            <FormSelect
              compact
              value={status}
              placeholder="All statuses"
              onChange={(value) => { setStatus(value); setPage(1); }}
              options={statusOptions.map(([value, label]) => ({ value, label }))}
            />
          </div>

          <select
            aria-label="Payment method"
            value={paymentMethod}
            onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }}
            className={`${controlClass} cursor-pointer truncate`}
          >
            <option value="">All methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="cod">COD</option>
            <option value="manual">Manual</option>
          </select>

          <input
            aria-label="Issue date from"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className={controlClass}
          />
          <input
            aria-label="Issue date to"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className={controlClass}
          />

          <div className="grid min-w-0 grid-cols-2 gap-2 sm:col-span-2 md:col-span-3 xl:col-span-2">
            <input
              aria-label="Minimum invoice total"
              type="number"
              min="0"
              step="0.01"
              value={minAmount}
              onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
              placeholder="Min total"
              className={controlClass}
            />
            <input
              aria-label="Maximum invoice total"
              type="number"
              min="0"
              step="0.01"
              value={maxAmount}
              onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }}
              placeholder="Max total"
              className={controlClass}
            />
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/60 px-3 py-2 sm:px-4">
            <span className="w-full text-xs text-muted sm:mr-auto sm:w-auto">{selectedIds.length} selected</span>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              {([
                ["mark_paid", "Mark paid"],
                ["send_email", "Send email"],
                ["download_pdf", "Download PDFs"],
                ["delete", "Delete"],
              ] as const).map(([action, label]) => (
                <button
                  key={action}
                  disabled={bulkBusy}
                  type="button"
                  onClick={() => void runBulk(action)}
                  className={`rounded-md border border-border px-2.5 py-2 text-xs font-medium hover:bg-surface disabled:opacity-50 sm:py-1.5 ${action === "delete" ? "text-red-600" : "text-text"}`}
                >
                  {bulkBusy ? "Working..." : label}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p role="alert" className="border-b border-border px-4 py-3 text-sm text-red-600">{error} <button type="button" onClick={() => void load()} className="ml-2 underline">Retry</button></p>}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1250px] text-left text-sm text-text">
            <thead className="bg-background">
              <tr>
                <th className={headerClass}><input aria-label="Select all invoices on this page" type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                <th className={headerClass}>{sortButton("invoiceNumber", "Invoice #")}</th>
                <th className={headerClass}>{sortButton("orderNumber", "Order #")}</th>
                <th className={headerClass}>{sortButton("customer", "Customer")}</th>
                <th className={headerClass}>{sortButton("issueDate", "Issue date")}</th>
                <th className={headerClass}>{sortButton("dueDate", "Due date")}</th>
                <th className={headerClass}>{sortButton("grandTotal", "Total")}</th>
                <th className={headerClass}>{sortButton("amountPaid", "Paid")}</th>
                <th className={headerClass}>{sortButton("balanceDue", "Balance due")}</th>
                <th className={headerClass}>{sortButton("paymentStatus", "Payment status")}</th>
                <th className={headerClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 5 }, (_, row) => <tr key={row} className="border-t border-border">{Array.from({ length: 11 }, (_, cell) => <td key={cell} className={cellClass}><div className="h-4 w-20 animate-pulse rounded bg-background" /></td>)}</tr>)
                : rows.length === 0 ? <tr><td colSpan={11} className="px-4 py-12 text-center text-sm text-muted">{error ? "Invoices could not be loaded." : "No invoices found."}</td></tr>
                  : rows.map((invoice) => <tr key={invoice._id} className="border-t border-border hover:bg-background/70">
                    <td className={cellClass}><input aria-label={`Select ${invoice.invoiceNumber}`} type="checkbox" checked={selectedIds.includes(invoice._id)} onChange={() => toggleSelected(invoice._id)} /></td>
                    <td className={`${cellClass} whitespace-nowrap font-semibold`}><Link href={`/admin/invoices/${invoice._id}`} className="text-primary hover:underline">{invoice.invoiceNumber}</Link></td>
                    <td className={`${cellClass} whitespace-nowrap`}>{invoice.order ? <Link href={`/admin/orders?search=${encodeURIComponent(invoice.order.orderNumber)}`} className="text-primary hover:underline">#{invoice.order.orderNumber}</Link> : <span className="text-muted">—</span>}</td>
                    <td className={cellClass}><span className="block font-medium">{invoice.customer.name}</span><span className="block max-w-48 truncate text-xs text-muted">{invoice.customer.email}</span></td>
                    <td className={`${cellClass} whitespace-nowrap text-muted`}>{formatDate(invoice.issueDate)}</td>
                    <td className={`${cellClass} whitespace-nowrap text-muted`}>{formatDate(invoice.dueDate)}</td>
                    <td className={`${cellClass} whitespace-nowrap`}>{money(invoice.grandTotal, invoice.currency)}</td>
                    <td className={`${cellClass} whitespace-nowrap`}>{money(invoice.amountPaid, invoice.currency)}</td>
                    <td className={`${cellClass} whitespace-nowrap`}>{money(invoice.balanceDue, invoice.currency)}</td>
                    <td className={cellClass}><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass[invoice.paymentStatus]}`}>{invoice.paymentStatus.replaceAll("_", " ")}</span></td>
                    <td className={cellClass}>{actionMenu(invoice)}</td>
                  </tr>)}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-border md:hidden">
          {loading ? Array.from({ length: 4 }, (_, row) => <div key={row} className="animate-pulse space-y-3 p-4"><div className="h-4 w-1/2 rounded bg-background" /><div className="h-12 rounded bg-background" /></div>)
            : rows.length === 0 ? <p className="px-4 py-12 text-center text-sm text-muted">{error ? "Invoices could not be loaded." : "No invoices found."}</p>
              : rows.map((invoice) => <article key={invoice._id} className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <input aria-label={`Select ${invoice.invoiceNumber}`} type="checkbox" className="mt-1 shrink-0" checked={selectedIds.includes(invoice._id)} onChange={() => toggleSelected(invoice._id)} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/invoices/${invoice._id}`} className="block truncate font-semibold text-primary">{invoice.invoiceNumber}</Link>
                    <p className="mt-0.5 truncate text-sm font-medium text-text">{invoice.customer.name}</p>
                    <p className="truncate text-xs text-muted">{invoice.customer.email}</p>
                    <span className={`mt-2 inline-block rounded-full px-2 py-1 text-[11px] font-medium capitalize ${statusClass[invoice.paymentStatus]}`}>{invoice.paymentStatus.replaceAll("_", " ")}</span>
                  </div>
                  {actionMenu(invoice)}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg bg-background p-3 text-xs">
                  <span className="text-muted">Order</span><span className="truncate text-right">{invoice.order ? `#${invoice.order.orderNumber}` : "—"}</span>
                  <span className="text-muted">Issue date</span><span className="text-right">{formatDate(invoice.issueDate)}</span>
                  <span className="text-muted">Due date</span><span className="text-right">{formatDate(invoice.dueDate)}</span>
                  <span className="text-muted">Total</span><span className="text-right font-semibold">{money(invoice.grandTotal, invoice.currency)}</span>
                  <span className="text-muted">Amount paid</span><span className="text-right">{money(invoice.amountPaid, invoice.currency)}</span>
                  <span className="text-muted">Balance due</span><span className="text-right">{money(invoice.balanceDue, invoice.currency)}</span>
                </div>
              </article>)}
        </div>

        <footer className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p>Showing {from} to {to} of {total} invoices</p>
            <label className="flex items-center gap-2">Rows
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="rounded-md border border-border bg-surface px-2 py-1.5 text-base text-text sm:py-1 sm:text-xs">{pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select>
            </label>
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-md border border-border px-3 py-1.5 text-text hover:bg-background disabled:opacity-40">Previous</button>
            <span className="px-1">{page} / {pages}</span>
            <button type="button" disabled={page >= pages || loading} onClick={() => setPage((value) => Math.min(pages, value + 1))} className="rounded-md border border-border px-3 py-1.5 text-text hover:bg-background disabled:opacity-40">Next</button>
          </div>
        </footer>
      </section>

      {openMenu && (() => {
        const invoice = rows.find((item) => item._id === openMenu);
        if (!invoice) return null;
        return (
          <div
            ref={actionMenuRef}
            role="menu"
            className="fixed z-[60] overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface p-1 shadow-lg"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }}
          >
            {actionEntries.map(({ action, label, icon: Icon }) => (
              <button
                key={action}
                type="button"
                role="menuitem"
                onClick={() => openAction(invoice._id, action)}
                className={`flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-background ${action === "delete" ? "text-red-600" : "text-text"}`}
              >
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{label}</span>
              </button>
            ))}
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                setOpenMenu(null);
                try {
                  await download(`/api/admin/invoices/${invoice._id}/pdf`, `${invoice.invoiceNumber}.pdf`);
                  toast.success("Invoice PDF downloaded.");
                } catch (cause) {
                  toast.error(cause instanceof Error ? cause.message : "PDF download failed.");
                }
              }}
              className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-text hover:bg-background"
            >
              <FaDownload className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Download PDF</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenMenu(null);
                window.open(`/admin/invoices/${invoice._id}?print=1`, "_blank", "noopener,noreferrer");
                toast.success("Print view opened.");
              }}
              className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-text hover:bg-background"
            >
              <FaPrint className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Print</span>
            </button>
          </div>
        );
      })()}

      {selectedAction && <InvoiceActionModal id={selectedAction.id} action={selectedAction.action} onClose={() => setSelectedAction(null)} onDone={() => { setSelectedAction(null); void load(); }} onActionChange={(action) => setSelectedAction({ id: selectedAction.id, action })} />}
    </div>
  );
}