"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  success: z.literal(true),
  data: z.object({
    _id: z.string(),
    poNumber: z.string(),
    vendor: z.union([
      z.string(),
      z.object({
        _id: z.string(), vendorCode: z.string(), companyName: z.string(), email: z.string(),
        phone: z.string(), status: z.string(),
        address: z.object({ line1: z.string(), city: z.string(), state: z.string(), country: z.string() }).passthrough(),
      }).passthrough(),
    ]),
    items: z.array(z.object({
      product: z.unknown(),
      name: z.string(),
      quantity: z.number(),
      receivedQuantity: z.number(),
      unitCost: z.number(),
      lineTotal: z.number(),
      vendorSku: z.string(),
    })),
    subtotal: z.number(),
    discount: z.number(),
    tax: z.number(),
    shippingCost: z.number(),
    grandTotal: z.number(),
    currency: z.string(),
    status: z.string(),
    paymentStatus: z.string(),
    expectedDate: z.string().nullable(),
    receivedDate: z.string().nullable(),
    notes: z.string(),
    createdAt: z.string(),
  }).passthrough(),
});
type PurchaseOrder = z.output<typeof schema>["data"];
const money = (value: number, currency: string) => `${currency} ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const errorText = (body: unknown) => typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "Purchase order request failed.";

export default function PurchaseOrderDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/vendors/purchase-orders/${id}`, { cache: "no-store" });
    const body: unknown = await response.json();
    if (!response.ok) throw new Error(errorText(body));
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new Error("Invalid purchase order response.");
    setOrder(parsed.data.data);
  }, [id]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((cause) => toast.error(cause instanceof Error ? cause.message : "Could not load purchase order."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const updateStatus = async (status: "sent" | "confirmed" | "cancelled") => {
    if (status === "cancelled" && !window.confirm(`Cancel ${order?.poNumber}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/vendors/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(errorText(body));
      toast.success(`Purchase order ${status.replaceAll("_", " ")}.`);
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Could not update purchase order."); }
    finally { setBusy(false); }
  };

  if (!order) return <div className="mx-auto max-w-5xl animate-pulse rounded-xl bg-surface p-8 text-muted">Loading purchase order…</div>;
  const vendor = typeof order.vendor === "object" ? order.vendor : null;
  return <div className="mx-auto w-full max-w-5xl space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link href={vendor ? `/admin/vendors/${vendor._id}` : "/admin/vendors/purchase-orders"} className="text-sm text-primary hover:underline">← {vendor ? vendor.companyName : "Purchase orders"}</Link>
      <div className="flex flex-wrap gap-2">
        {order.status === "draft" && <button disabled={busy} onClick={() => void updateStatus("sent")} className="rounded-md bg-primary px-3 py-2 text-sm text-white disabled:opacity-50">Mark sent</button>}
        {order.status === "sent" && <button disabled={busy} onClick={() => void updateStatus("confirmed")} className="rounded-md border border-border px-3 py-2 text-sm text-text disabled:opacity-50">Confirm</button>}
        {!["received", "cancelled"].includes(order.status) && <button disabled={busy} onClick={() => void updateStatus("cancelled")} className="rounded-md border border-rose-300 px-3 py-2 text-sm text-rose-700 disabled:opacity-50">Cancel PO</button>}
        <button type="button" onClick={() => window.print()} className="rounded-md border border-border px-3 py-2 text-sm text-text">Print</button>
      </div>
    </div>
    <article className="rounded-xl border border-border bg-surface p-5 sm:p-8 print:border-0 print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div><h1 className="text-2xl font-bold text-text">PURCHASE ORDER</h1><p className="mt-2 text-lg text-primary">{order.poNumber}</p><p className="mt-1 text-sm capitalize text-muted">{order.status.replaceAll("_", " ")}</p></div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm"><dt className="text-muted">Created</dt><dd className="text-text">{new Date(order.createdAt).toLocaleDateString()}</dd><dt className="text-muted">Expected</dt><dd className="text-text">{order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : "—"}</dd><dt className="text-muted">Payment</dt><dd className="capitalize text-text">{order.paymentStatus.replaceAll("_", " ")}</dd></dl>
      </header>
      {vendor && <section className="py-5"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Supplier</h2><p className="mt-2 font-medium text-text">{vendor.companyName} ({vendor.vendorCode})</p><p className="text-sm text-text">{vendor.email} · {vendor.phone}</p><p className="text-sm text-muted">{[vendor.address.line1, vendor.address.city, vendor.address.state, vendor.address.country].filter(Boolean).join(", ")}</p></section>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[550px] text-left text-sm"><thead className="border-y border-border text-xs uppercase text-muted"><tr>{["Product", "SKU", "Quantity", "Received", "Unit cost", "Line total"].map((title) => <th key={title} className="px-3 py-3">{title}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">{order.items.map((item, index) => <tr key={`${item.name}-${index}`}><td className="px-3 py-3 text-text">{item.name}</td><td className="px-3 py-3 text-muted">{item.vendorSku || "—"}</td><td className="px-3 py-3 text-text">{item.quantity}</td><td className="px-3 py-3 text-text">{item.receivedQuantity}</td><td className="px-3 py-3 text-text">{money(item.unitCost, order.currency)}</td><td className="px-3 py-3 text-text">{money(item.lineTotal, order.currency)}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="ml-auto mt-5 max-w-sm space-y-2 text-sm"><div className="flex justify-between text-muted"><span>Subtotal</span><span>{money(order.subtotal, order.currency)}</span></div><div className="flex justify-between text-muted"><span>Discount</span><span>−{money(order.discount, order.currency)}</span></div><div className="flex justify-between text-muted"><span>Tax</span><span>{money(order.tax, order.currency)}</span></div><div className="flex justify-between text-muted"><span>Shipping</span><span>{money(order.shippingCost, order.currency)}</span></div><div className="flex justify-between border-t border-border pt-3 text-base font-semibold text-text"><span>Total</span><span>{money(order.grandTotal, order.currency)}</span></div></div>
      {order.notes && <section className="mt-8 border-t border-border pt-4"><h2 className="font-medium text-text">Notes</h2><p className="mt-2 whitespace-pre-wrap text-sm text-muted">{order.notes}</p></section>}
    </article>
    <style jsx global>{`@media print { body { background: white !important; } }`}</style>
  </div>;
}
