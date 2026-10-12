"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(z.object({
      _id: z.string(),
      poNumber: z.string(),
      vendor: z.union([z.string(), z.object({ _id: z.string(), vendorCode: z.string(), companyName: z.string(), status: z.string() }).passthrough()]),
      grandTotal: z.number(),
      currency: z.string(),
      status: z.string(),
      paymentStatus: z.string(),
      createdAt: z.string(),
      expectedDate: z.string().nullable(),
    }).passthrough()),
    total: z.number(),
    page: z.number(),
    pages: z.number(),
  }),
});
type Item = z.output<typeof schema>["data"]["items"][number];
const getError = (body: unknown) => typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "Failed to load purchase orders.";
const money = (value: number, currency: string) => `${currency} ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PurchaseOrderTable({ vendorId }: { vendorId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page), limit: "25" });
        if (vendorId) params.set("vendor", vendorId);
        if (status) params.set("status", status);
        const response = await fetch(`/api/admin/vendors/purchase-orders?${params}`, { cache: "no-store" });
        const body: unknown = await response.json();
        if (!response.ok) throw new Error(getError(body));
        const parsed = schema.safeParse(body);
        if (!parsed.success) throw new Error("Invalid purchase order response.");
        if (active) {
          setItems(parsed.data.data.items);
          setPages(parsed.data.data.pages);
          setTotal(parsed.data.data.total);
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Failed to load purchase orders.";
        if (active) { setError(message); setItems([]); toast.error(message); }
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [page, reloadKey, status, vendorId]);

  return <div className="mx-auto w-full max-w-7xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
      <div><Link href={vendorId ? `/admin/vendors/${vendorId}` : "/admin/vendors"} className="text-sm text-primary hover:underline">← {vendorId ? "Vendor" : "Vendors"}</Link><h1 className="mt-2 text-xl font-semibold text-text sm:text-2xl">Purchase orders</h1><p className="mt-1 text-sm text-muted">{total} purchase orders</p></div>
      <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter purchase order status" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-text sm:w-auto sm:text-sm"><option value="">All statuses</option>{["draft", "sent", "confirmed", "partially_received", "received", "cancelled"].map((entry) => <option key={entry} value={entry}>{entry.replaceAll("_", " ")}</option>)}</select>
    </div>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error} <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="font-medium underline">Retry</button></div>}
    <section className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-background text-xs uppercase text-muted"><tr>{["PO #", "Vendor", "Created", "Expected", "Total", "Status", "Payment", "Action"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">
          {loading ? <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">Loading purchase orders…</td></tr> :
            items.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">No purchase orders found.</td></tr> :
              items.map((item) => {
                const vendor = typeof item.vendor === "object" ? item.vendor : null;
                return <tr key={item._id}>
                  <td className="px-4 py-3 font-medium"><Link href={`/admin/vendors/purchase-orders/${item._id}`} className="text-primary hover:underline">{item.poNumber}</Link></td>
                  <td className="px-4 py-3">{vendor ? <Link href={`/admin/vendors/${vendor._id}`} className="hover:underline">{vendor.companyName}<small className="block text-muted">{vendor.vendorCode}</small></Link> : "—"}</td>
                  <td className="px-4 py-3">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{item.expectedDate ? new Date(item.expectedDate).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">{money(item.grandTotal, item.currency)}</td>
                  <td className="px-4 py-3 capitalize">{item.status.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 capitalize">{item.paymentStatus.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3"><Link href={`/admin/vendors/purchase-orders/${item._id}`} className="text-primary hover:underline">View</Link></td>
                </tr>;
              })}
        </tbody>
      </table>
      <div className="flex items-center justify-end gap-3 border-t border-border p-3 text-sm text-muted"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border border-border px-3 py-1 disabled:opacity-50">Previous</button><span>{page} / {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded border border-border px-3 py-1 disabled:opacity-50">Next</button></div>
    </section>
  </div>;
}
