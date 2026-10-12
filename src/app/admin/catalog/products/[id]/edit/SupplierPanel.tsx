"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  success: z.literal(true),
  data: z.array(z.object({
    _id: z.string(),
    vendor: z.object({
      _id: z.string(),
      vendorCode: z.string(),
      companyName: z.string(),
      status: z.string(),
    }),
    vendorSku: z.string(),
    costPrice: z.number(),
    currency: z.string(),
    isPreferred: z.boolean(),
    leadTimeDays: z.number(),
  })),
});

type LinkRow = z.output<typeof schema>["data"][number];
type VendorOption = { _id: string; companyName: string; vendorCode: string; currency: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const errorText = (v: unknown) =>
  isRecord(v) && typeof v.error === "string" ? v.error : "Request failed.";

/** Vendors list API ka format alag ho sakta hai: data[], data.items[] ya items[] — teeno handle hote hain */
function readVendorOptions(body: unknown): VendorOption[] {
  if (!isRecord(body)) return [];
  const data = body.data;
  const list: unknown[] = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.items)
      ? data.items
      : Array.isArray(body.items)
        ? body.items
        : [];
  return list.flatMap((entry): VendorOption[] => {
    if (!isRecord(entry) || typeof entry._id !== "string") return [];
    return [{
      _id: entry._id,
      companyName: typeof entry.companyName === "string" ? entry.companyName : "Vendor",
      vendorCode: typeof entry.vendorCode === "string" ? entry.vendorCode : "",
      currency: typeof entry.currency === "string" ? entry.currency : "USD",
    }];
  });
}

export default function SupplierPanel({ productId }: { productId: string }) {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);

  // link form
  const [showForm, setShowForm] = useState(false);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [vendorSku, setVendorSku] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [preferred, setPreferred] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadLinks = useCallback(async () => {
    const response = await fetch(
      `/api/admin/vendors/products?product=${encodeURIComponent(productId)}`,
      { cache: "no-store" }
    );
    const body: unknown = await response.json();
    if (!response.ok) throw new Error("Could not load linked vendors.");
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new Error("Invalid vendor data for product.");
    setLinks(parsed.data.data);
  }, [productId]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void loadLinks()
        .catch((error: unknown) => {
          if (active) toast.error(error instanceof Error ? error.message : "Could not load linked vendors.");
        })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadLinks]);

  const openForm = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/vendors?limit=100", { cache: "no-store" });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(errorText(body));
      setVendors(readVendorOptions(body));
      setVendorId("");
      setVendorSku("");
      setCostPrice("");
      setLeadTime("");
      setPreferred(false);
      setShowForm(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load vendors.");
    } finally {
      setBusy(false);
    }
  };

  const saveLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const vendor = vendors.find((v) => v._id === vendorId);
    if (!vendor) {
      toast.error("Select a vendor.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/vendors/${vendor._id}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: productId,
          vendorSku,
          costPrice: Number(costPrice),
          currency: vendor.currency,
          isPreferred: preferred,
          ...(leadTime ? { leadTimeDays: Number(leadTime) } : {}),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(errorText(body));
      toast.success("Vendor linked.");
      setShowForm(false);
      await loadLinks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not link vendor.");
    } finally {
      setBusy(false);
    }
  };

  const unlink = async (link: LinkRow) => {
    if (!window.confirm(`Unlink ${link.vendor.companyName} from this product?`)) return;
    try {
      const response = await fetch(`/api/admin/vendors/${link.vendor._id}/products`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: productId }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(errorText(body));
      toast.success("Vendor unlinked.");
      await loadLinks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not unlink vendor.");
    }
  };

  // Jo vendors pehle se linked hain wo dropdown mein na aayein
  const linkedIds = new Set(links.map((l) => l.vendor._id));
  const availableVendors = vendors.filter((v) => !linkedIds.has(v._id));

  return (
    <section className="mt-6 rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-text">Suppliers</h2>
          <p className="mt-1 text-sm text-muted">Linked vendors, purchase costs, and preferred sourcing.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/admin/vendors?product=${encodeURIComponent(productId)}`} className="text-sm text-primary hover:underline">Manage vendors</Link>
          <button
            type="button"
            onClick={() => void openForm()}
            disabled={busy}
            className="rounded-md bg-primary px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Link vendor
          </button>
        </div>
      </div>

      {loading ? <p className="mt-4 text-sm text-muted">Loading suppliers…</p> :
        links.length === 0 ? <p className="mt-4 text-sm text-muted">No vendors are linked to this product.</p> :
          <div className="mt-4 space-y-2">
            {links.map((link) => <article key={link._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div><Link href={`/admin/vendors/${link.vendor._id}`} className="font-medium text-primary hover:underline">{link.vendor.companyName}</Link><p className="text-xs text-muted">{link.vendor.vendorCode} · {link.vendor.status}</p></div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-text">
                <span>{link.currency} {link.costPrice.toFixed(2)}</span>
                <span>Lead time: {link.leadTimeDays}d</span>
                {link.isPreferred && <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Preferred</span>}
                <button type="button" onClick={() => void unlink(link)} className="text-rose-700 hover:underline">Unlink</button>
              </div>
            </article>)}
          </div>}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setShowForm(false); }}
        >
          <form onSubmit={saveLink} className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-2xl bg-surface p-5 sm:rounded-xl">
            <h2 className="text-lg font-semibold text-text">Link vendor to this product</h2>

            <label className="block text-sm text-text">Vendor
              <select required value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm">
                <option value="">Select vendor</option>
                {availableVendors.map((v) => (
                  <option key={v._id} value={v._id}>{v.companyName}{v.vendorCode ? ` · ${v.vendorCode}` : ""}</option>
                ))}
              </select>
              {availableVendors.length === 0 && <span className="mt-1 block text-xs text-muted">No vendors available. Create a vendor first or all are already linked.</span>}
            </label>

            <label className="block text-sm text-text">Vendor SKU
              <input value={vendorSku} onChange={(e) => setVendorSku(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-text">Cost price
                <input required min="0" step="0.01" type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm" />
              </label>
              <label className="block text-sm text-text">Lead time (days)
                <input min="0" step="1" type="number" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm" />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={preferred} onChange={(e) => setPreferred(e.target.checked)} />
              Set as preferred vendor
            </label>

            <div className="flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setShowForm(false)} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
              <button type="submit" disabled={busy || !vendorId} className="rounded-md bg-primary px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? "Saving…" : "Save link"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}