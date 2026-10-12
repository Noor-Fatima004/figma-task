"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";
import { FaCopy, FaEdit, FaEllipsisV, FaEye, FaFileExport, FaPlus, FaSearch, FaToggleOff, FaToggleOn, FaTrash } from "react-icons/fa";
import FormSelect from "@/app/components/FormSelect";
import VendorAddForm from "./Vendoraddform";
import VendorSummaryCards, { type VendorSummary } from "./VendorSummaryCards";

const statuses = ["active", "inactive", "pending", "blacklisted", "on_hold"] as const;
const types = ["manufacturer", "wholesaler", "distributor", "retailer", "dropshipper", "service_provider"] as const;
const vendorRowSchema = z.object({
  _id: z.string(),
  vendorCode: z.string(),
  companyName: z.string(),
  contactPerson: z.string(),
  email: z.string(),
  phone: z.string(),
  type: z.enum(types),
  status: z.enum(statuses),
  paymentTerms: z.string(),
  currency: z.string(),
  rating: z.number().nullable().optional(),
  address: z.object({ city: z.string().optional(), country: z.string().optional() }).optional(),
  categories: z.array(z.object({ _id: z.string(), name: z.string() })),
  productsCount: z.number(),
  totalPurchased: z.number(),
  totalPaid: z.number(),
  balanceDue: z.number(),
});
type VendorRow = z.output<typeof vendorRowSchema>;
const responseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(vendorRowSchema),
    total: z.number(),
    page: z.number(),
    pages: z.number(),
    summary: z.object({
      total: z.number(),
      active: z.number(),
      purchased: z.number(),
      payable: z.number(),
      pendingPurchaseOrders: z.number(),
    }),
  }),
});
const iconButton =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-text hover:bg-background";
const statusLabel = (status: string) => status.replaceAll("_", " ");
const statusStyles: Record<(typeof statuses)[number], string> = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-700",
  pending: "bg-amber-50 text-amber-700",
  blacklisted: "bg-rose-100 text-rose-800",
  on_hold: "bg-orange-100 text-orange-800",
};
const money = (value: number, currency: string) =>
  `${currency} ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function getError(body: unknown) {
  return typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
    ? body.error
    : "Vendor request failed.";
}

type MenuItem = {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
};

/** Three-dots button with a dropdown. The menu is `fixed` so the table's overflow-x scroll can't clip it. */
function RowActions({ label, items }: { label: string; items: MenuItem[] }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setPos(null), []);

  useEffect(() => {
    if (!pos) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [pos, close]);

  const toggle = () => {
    if (pos) {
      close();
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 176;
    const menuHeight = items.length * 40 + 8;
    const top = rect.bottom + menuHeight > window.innerHeight ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4;
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
    setPos({ top, left });
  };

  const itemClass = (danger?: boolean) =>
    `flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-background ${danger ? "text-rose-700" : "text-text"}`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={pos !== null}
        className={iconButton}
      >
        <FaEllipsisV className="h-3.5 w-3.5" />
      </button>
      {pos && (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-50 w-44 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          {items.map((item) =>
            item.href ? (
              <Link key={item.label} href={item.href} role="menuitem" onClick={close} className={itemClass(item.danger)}>
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  item.onClick?.();
                }}
                className={itemClass(item.danger)}
              >
                {item.icon}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </>
  );
}

export default function VendorTable({ initialCategory = "" }: { initialCategory?: string }) {
  const [items, setItems] = useState<VendorRow[]>([]);
  const [summary, setSummary] = useState<VendorSummary>({
    total: 0, active: 0, purchased: 0, payable: 0, pendingPurchaseOrders: 0,
  });
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [rating, setRating] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [sortKey, setSortKey] = useState("companyName");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [categoryOptions, setCategoryOptions] = useState<{ _id: string; name: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // null = closed, {} = add vendor, { vendorId } = edit vendor (same form, popup mode)
  const [formModal, setFormModal] = useState<{ vendorId?: string } | null>(null);
  const [query, setQuery] = useState("");

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
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (query) params.set("search", query);
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (paymentTerms) params.set("paymentTerms", paymentTerms);
      if (city) params.set("city", city);
      if (country) params.set("country", country);
      if (rating) params.set("rating", rating);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (category) params.set("category", category);
      params.set("sort", sortKey);
      params.set("direction", direction);
      const response = await fetch(`/api/admin/vendors?${params}`, { cache: "no-store" });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(getError(body));
      const parsed = responseSchema.safeParse(body);
      if (!parsed.success) throw new Error("Invalid vendors response.");
      setItems(parsed.data.data.items);
      setTotal(parsed.data.data.total);
      setPages(Math.max(1, parsed.data.data.pages));
      setSummary(parsed.data.data.summary);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Failed to load vendors.";
      setError(message);
      setItems([]);
      setTotal(0);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [category, city, country, dateFrom, dateTo, direction, limit, page, paymentTerms, query, rating, sortKey, status, type]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/product-categories?all=1", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load product categories.");
        const body: unknown = await response.json();
        const parsed = z.array(z.object({ _id: z.string(), name: z.string() })).safeParse(body);
        if (!parsed.success) throw new Error("Invalid categories response.");
        if (active) setCategoryOptions(parsed.data);
      })
      .catch((cause) => toast.error(cause instanceof Error ? cause.message : "Could not load categories."));
    return () => { active = false; };
  }, []);

  const changeStatus = async (vendor: VendorRow) => {
    const next = vendor.status === "active" ? "inactive" : "active";
    const response = await fetch(`/api/admin/vendors/${vendor._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const body: unknown = await response.json();
    if (!response.ok) throw new Error(getError(body));
    toast.success(`Vendor ${next}.`);
    await load();
  };
  const remove = async (vendor: VendorRow) => {
    if (!window.confirm(`Soft-delete ${vendor.companyName} (${vendor.vendorCode})?`)) return;
    try {
      const response = await fetch(`/api/admin/vendors/${vendor._id}`, { method: "DELETE" });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(getError(body));
      toast.success("Vendor deleted.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not delete vendor.");
    }
  };
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const filters = () => {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (paymentTerms) params.set("paymentTerms", paymentTerms);
    if (city) params.set("city", city);
    if (country) params.set("country", country);
    if (rating) params.set("rating", rating);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (category) params.set("category", category);
    params.set("sort", sortKey);
    params.set("direction", direction);
    return params;
  };
  const exportVendors = async (format: "csv" | "xlsx") => {
    try {
      const params = filters();
      params.set("format", format);
      const response = await fetch(`/api/admin/vendors/export?${params}`, { cache: "no-store" });
      if (!response.ok) {
        const body: unknown = await response.json();
        throw new Error(getError(body));
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `vendors.${format}`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      toast.success(`Vendor list exported to ${format.toUpperCase()}.`);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Export failed."); }
  };
  const bulkAction = async (action: "activate" | "deactivate" | "delete") => {
    if (!selectedIds.length) return;
    if (action === "delete" && !window.confirm(`Soft-delete ${selectedIds.length} selected vendors? Vendors with unpaid balances or open orders cannot be deleted.`)) return;
    try {
      const response = await fetch("/api/admin/vendors/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: selectedIds }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(getError(body));
      toast.success("Bulk action completed.");
      setSelectedIds([]);
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Bulk action failed."); }
  };
  const toggleSelected = (id: string) => setSelectedIds((current) =>
    current.includes(id) ? current.filter((selected) => selected !== id) : [...current, id]
  );
  const duplicate = async (vendor: VendorRow) => {
    const email = window.prompt("Enter a new email address for the duplicated vendor:");
    if (!email) return;
    try {
      const response = await fetch(`/api/admin/vendors/${vendor._id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(getError(body));
      toast.success("Vendor duplicated.");
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Could not duplicate vendor."); }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3 sm:pb-4">
        <div>
          <h1 className="text-lg font-semibold text-text sm:text-2xl">Vendors</h1>
          <p className="mt-1 text-xs text-muted sm:text-sm">Manage suppliers, purchase terms, and linked products.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button type="button" onClick={() => void exportVendors("csv")} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-text sm:flex-none"><FaFileExport />Export CSV</button>
          <button type="button" onClick={() => void exportVendors("xlsx")} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-text sm:flex-none">Excel</button>
          <button type="button" onClick={() => setFormModal({})} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 sm:flex-none"><FaPlus /> Add Vendor</button>
        </div>
      </div>

      <VendorSummaryCards summary={summary} />
      <section className="space-y-4 rounded-xl border border-border bg-surface p-3 shadow-sm sm:p-4">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative min-w-0 sm:col-span-2">
            <span className="sr-only">Search vendors</span>
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search code, company, contact, email, phone" className="w-full min-w-0 rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-base text-text outline-none focus:ring-2 focus:ring-primary sm:text-sm" />
          </label>
          <FormSelect value={status} onChange={(value) => { setStatus(value); setPage(1); }} placeholder="All statuses" options={[{ value: "", label: "All statuses" }, ...statuses.map((value) => ({ value, label: statusLabel(value) }))]} />
          <FormSelect value={type} onChange={(value) => { setType(value); setPage(1); }} placeholder="All vendor types" options={[{ value: "", label: "All types" }, ...types.map((value) => ({ value, label: statusLabel(value) }))]} />
          <FormSelect value={paymentTerms} onChange={(value) => { setPaymentTerms(value); setPage(1); }} placeholder="All payment terms" options={[{ value: "", label: "All payment terms" }, ...["cod", "advance", "net_7", "net_15", "net_30", "net_60"].map((value) => ({ value, label: statusLabel(value) }))]} />
          <FormSelect value={category} onChange={(value) => { setCategory(value); setPage(1); }} placeholder="All categories" options={[{ value: "", label: "All categories" }, ...categoryOptions.map((entry) => ({ value: entry._id, label: entry.name }))]} />
          <input aria-label="Filter by city" value={city} onChange={(event) => { setCity(event.target.value); setPage(1); }} placeholder="City" className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-base sm:text-sm" />
          <input aria-label="Filter by country" value={country} onChange={(event) => { setCountry(event.target.value); setPage(1); }} placeholder="Country" className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-base sm:text-sm" />
          <select aria-label="Filter by rating" value={rating} onChange={(event) => { setRating(event.target.value); setPage(1); }} className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-base sm:text-sm"><option value="">All ratings</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select>
          <input aria-label="Created from" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-base sm:text-sm" />
          <input aria-label="Created to" type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-base sm:text-sm" />
        </div>

        {selectedIds.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-lg bg-background p-3 text-sm text-text"><span className="mr-2">{selectedIds.length} selected</span><button type="button" onClick={() => void bulkAction("activate")} className="rounded border border-border px-3 py-1.5">Activate</button><button type="button" onClick={() => void bulkAction("deactivate")} className="rounded border border-border px-3 py-1.5">Deactivate</button><button type="button" onClick={() => void bulkAction("delete")} className="rounded border border-rose-200 px-3 py-1.5 text-rose-700">Delete</button><button type="button" onClick={() => setSelectedIds([])} className="ml-auto">Clear</button></div>}
        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <span>{error}</span><button type="button" onClick={() => void load()} className="font-medium underline">Retry</button>
          </div>
        )}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[1050px] border-collapse text-sm">
            <thead className="bg-background text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-3 py-3"><input aria-label="Select all vendors on this page" type="checkbox" checked={items.length > 0 && items.every((vendor) => selectedIds.includes(vendor._id))} onChange={() => setSelectedIds(items.every((vendor) => selectedIds.includes(vendor._id)) ? [] : items.map((vendor) => vendor._id))} /></th>{["Vendor", "Contact", "Email / phone", "Categories", "Products", "Terms", "Purchased", "Balance due", "Rating", "Status", "Actions"].map((heading) => {
                const key = ({ Vendor: "companyName", Contact: "contactPerson", Terms: "paymentTerms", Status: "status" } as Record<string, string>)[heading];
                return <th key={heading} className="px-3 py-3 font-semibold">{key ? <button type="button" onClick={() => { if (sortKey === key) setDirection((value) => value === "asc" ? "desc" : "asc"); else { setSortKey(key); setDirection("asc"); } setPage(1); }} className="whitespace-nowrap hover:text-text">{heading}{sortKey === key ? direction === "asc" ? " ↑" : " ↓" : ""}</button> : heading}</th>;
              })}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }, (_, index) => <tr key={index}><td colSpan={12} className="px-3 py-4"><div className="h-5 animate-pulse rounded bg-background" /></td></tr>)
              ) : items.length === 0 ? (
                <tr><td colSpan={12} className="px-3 py-12 text-center text-muted">No vendors found. Add a vendor to get started.</td></tr>
              ) : items.map((vendor) => (
                <tr key={vendor._id} className="hover:bg-background/60">
                  <td className="px-3 py-3"><input aria-label={`Select ${vendor.companyName}`} type="checkbox" checked={selectedIds.includes(vendor._id)} onChange={() => toggleSelected(vendor._id)} /></td>
                  <td className="px-3 py-3"><Link href={`/admin/vendors/${vendor._id}`} className="font-medium text-primary hover:underline">{vendor.companyName}</Link><div className="mt-0.5 text-xs text-muted">{vendor.vendorCode}</div></td>
                  <td className="px-3 py-3">{vendor.contactPerson || "—"}</td>
                  <td className="px-3 py-3"><div>{vendor.email}</div><div className="mt-0.5 text-xs text-muted">{vendor.phone}</div></td>
                  <td className="max-w-48 px-3 py-3"><div className="flex flex-wrap gap-1">{vendor.categories.slice(0, 2).map((category) => <span key={category._id} className="rounded bg-background px-1.5 py-0.5 text-xs">{category.name}</span>)}{vendor.categories.length > 2 && <span className="text-xs text-muted">+{vendor.categories.length - 2}</span>}{vendor.categories.length === 0 && "—"}</div></td>
                  <td className="px-3 py-3">{vendor.productsCount}</td>
                  <td className="px-3 py-3 capitalize">{statusLabel(vendor.paymentTerms)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{money(vendor.totalPurchased, vendor.currency)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{money(vendor.balanceDue, vendor.currency)}</td>
                  <td className="px-3 py-3">{vendor.rating ? `${"★".repeat(Math.round(vendor.rating))} ${vendor.rating}` : "—"}</td>
                  <td className="px-3 py-3"><span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium capitalize ${statusStyles[vendor.status]}`}>{statusLabel(vendor.status)}</span></td>
                  <td className="px-3 py-3">
                    <RowActions
                      label={`Actions for ${vendor.companyName}`}
                      items={[
                        { label: "View details", icon: <FaEye className="h-3.5 w-3.5" />, href: `/admin/vendors/${vendor._id}` },
                        { label: "Edit", icon: <FaEdit className="h-3.5 w-3.5 text-primary" />, onClick: () => setFormModal({ vendorId: vendor._id }) },
                        { label: "Duplicate", icon: <FaCopy className="h-3.5 w-3.5" />, onClick: () => void duplicate(vendor) },
                        {
                          label: vendor.status === "active" ? "Disable" : "Activate",
                          icon: vendor.status === "active"
                            ? <FaToggleOn className="h-4 w-4 text-emerald-600" />
                            : <FaToggleOff className="h-4 w-4 text-muted" />,
                          onClick: () => void changeStatus(vendor).catch((cause) => toast.error(cause instanceof Error ? cause.message : "Could not update status.")),
                        },
                        { label: "Delete", icon: <FaTrash className="h-3.5 w-3.5" />, onClick: () => void remove(vendor), danger: true },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && items.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <p>Showing {from} to {to} of {total} vendors</p>
            <div className="flex items-center gap-2">
              <label htmlFor="vendor-page-size">Rows</label>
              <select id="vendor-page-size" value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} className="rounded-md border border-border bg-surface px-2 py-1 text-base text-text sm:text-sm">
                {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-md border border-border px-3 py-1 disabled:opacity-50">Previous</button>
              <span>{page} / {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-md border border-border px-3 py-1 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </section>

      {formModal && (
        <VendorAddForm
          key={formModal.vendorId ?? "new"}
          vendorId={formModal.vendorId}
          onClose={() => setFormModal(null)}
          onSaved={() => {
            setFormModal(null);
            void load();
          }}
        />
      )}
    </div>
  );
}