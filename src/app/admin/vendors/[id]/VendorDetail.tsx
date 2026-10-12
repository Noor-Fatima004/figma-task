"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";

const vendorSchema = z.object({
  _id: z.string(),
  vendorCode: z.string(),
  companyName: z.string(),
  contactPerson: z.string(),
  email: z.string(),
  phone: z.string(),
  type: z.string(),
  status: z.string(),
  paymentTerms: z.string(),
  currency: z.string(),
  notes: z.string(),
  address: z.object({
    line1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  categories: z.array(z.union([z.object({ _id: z.string(), name: z.string() }), z.string()])),
});
const payloadSchema = z.object({
  success: z.literal(true),
  data: z.object({
    vendor: vendorSchema,
    products: z.array(z.object({
      _id: z.string(),
      product: z.union([
        z.string(),
        z.object({
          _id: z.string(),
          slug: z.string(),
          sku: z.string().optional(),
          translations: z.unknown().optional(),
        }).passthrough(),
      ]),
      vendorSku: z.string(),
      costPrice: z.number(),
      currency: z.string(),
      minOrderQty: z.number(),
      isPreferred: z.boolean(),
      lastPurchasePrice: z.number().nullable().optional(),
    }).passthrough()),
    purchaseOrders: z.array(z.object({
      _id: z.string(),
      poNumber: z.string(),
      grandTotal: z.number(),
      currency: z.string(),
      status: z.string(),
      paymentStatus: z.string(),
      expectedDate: z.string().nullable(),
      createdAt: z.string(),
    }).passthrough()),
    payments: z.array(z.object({
      _id: z.string(),
      amount: z.number(),
      method: z.string(),
      paidAt: z.string(),
      transactionId: z.string(),
      note: z.string(),
    }).passthrough()),
    stats: z.object({
      totalPurchased: z.number(),
      totalPaid: z.number(),
      balanceDue: z.number(),
      totalPurchaseOrders: z.number(),
    }),
  }),
});
type Data = z.output<typeof payloadSchema>["data"];
type ProductOption = { _id: string; name: string; sku: string };
type Tab = "overview" | "products" | "purchase-orders" | "payments" | "activity";
const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "products", label: "Products" },
  { id: "purchase-orders", label: "Purchase orders" },
  { id: "payments", label: "Payments / Ledger" },
  { id: "activity", label: "Activity" },
];
const money = (value: number, currency: string) =>
  `${currency} ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const errorText = (value: unknown) =>
  typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
    ? value.error
    : "Request failed.";

export default function VendorDetail({ id }: { id: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<Record<string, unknown>[]>([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showProductsForm, setShowProductsForm] = useState(false);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [productLinkId, setProductLinkId] = useState("");
  const [vendorSku, setVendorSku] = useState("");
  const [productCost, setProductCost] = useState("");
  const [productPreferred, setProductPreferred] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [cost, setCost] = useState("0");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentOrder, setPaymentOrder] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [receivingOrder, setReceivingOrder] = useState("");
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [receiveWarehouse, setReceiveWarehouse] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/vendors/${id}`, { cache: "no-store" });
    const body: unknown = await response.json();
    if (!response.ok) throw new Error(errorText(body));
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) throw new Error("Invalid vendor response.");
    setData(parsed.data.data);
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((cause) => toast.error(cause instanceof Error ? cause.message : "Could not load vendor."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (tab !== "activity") return;
    void fetch(`/api/admin/vendors/${id}/activity`)
      .then(async (response) => {
        const body: unknown = await response.json();
        if (!response.ok) throw new Error(errorText(body));
        if (typeof body === "object" && body !== null && "data" in body) {
          const result = body.data;
          if (typeof result === "object" && result !== null && "items" in result && Array.isArray(result.items)) setActivity(result.items);
        }
      })
      .catch((cause) => toast.error(cause instanceof Error ? cause.message : "Could not load activity."));
  }, [id, tab]);

  if (!data) return <div className="mx-auto max-w-7xl animate-pulse rounded-xl bg-surface p-8 text-muted">Loading vendor…</div>;
  const { vendor, products, purchaseOrders, payments, stats } = data;
  const selectedLink = products.find((link) =>
    typeof link.product === "object" && link.product._id === selectedProduct
  );

  const openProductManager = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/catalog/products?limit=100", { cache: "no-store" });
      const body: unknown = await response.json();
      if (!response.ok || typeof body !== "object" || body === null || !("items" in body) || !Array.isArray(body.items)) {
        throw new Error("Could not load products.");
      }
      const list = body.items.flatMap((entry): ProductOption[] => {
        if (typeof entry !== "object" || entry === null || !("_id" in entry) || typeof entry._id !== "string") return [];
        const translations = "translations" in entry ? entry.translations : null;
        const en = typeof translations === "object" && translations !== null && "en" in translations
          ? translations.en
          : null;
        const name = typeof en === "object" && en !== null && "name" in en && typeof en.name === "string"
          ? en.name
          : "slug" in entry && typeof entry.slug === "string" ? entry.slug : "Product";
        const sku = "sku" in entry && typeof entry.sku === "string" ? entry.sku : "";
        return [{ _id: entry._id, name, sku }];
      });
      setProductOptions(list);
      setProductLinkId("");
      setVendorSku("");
      setProductCost("");
      setProductPreferred(false);
      setShowProductsForm(true);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not load products.");
    } finally { setBusy(false); }
  };
  const saveProductLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/vendors/${id}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: productLinkId,
          vendorSku,
          costPrice: Number(productCost),
          currency: vendor.currency,
          isPreferred: productPreferred,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(errorText(body));
      toast.success("Vendor product saved.");
      setShowProductsForm(false);
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Could not save vendor product."); }
    finally { setBusy(false); }
  };
  const unlinkProduct = async (productId: string) => {
    if (!window.confirm("Unlink this product from the vendor?")) return;
    try {
      const response = await fetch(`/api/admin/vendors/${id}/products`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: productId }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(errorText(body));
      toast.success("Product unlinked.");
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Could not unlink product."); }
  };
  const send = async (url: string, method: string, body: unknown) => {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result: unknown = await response.json();
    if (!response.ok) throw new Error(errorText(result));
    return result;
  };
  const createOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProduct || !selectedLink) {
      toast.error("Select a product linked to this vendor.");
      return;
    }
    setBusy(true);
    try {
      await send("/api/admin/vendors/purchase-orders", "POST", {
        vendor: id,
        items: [{ product: selectedProduct, quantity: Number(quantity), unitCost: Number(cost) }],
        currency: vendor.currency,
        status: "draft",
      });
      toast.success("Purchase order created.");
      setShowOrderForm(false);
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not create purchase order.");
    } finally { setBusy(false); }
  };
  const recordPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      await send("/api/admin/vendors/payments", "POST", {
        vendor: id,
        purchaseOrder: paymentOrder || null,
        amount: Number(paymentAmount),
        method: paymentMethod,
        note: paymentNote,
      });
      toast.success("Payment recorded.");
      setShowPaymentForm(false);
      setPaymentAmount("");
      setPaymentNote("");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not record payment.");
    } finally { setBusy(false); }
  };
  const receiveStock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const order = purchaseOrders.find((entry) => entry._id === receivingOrder);
    if (!order) return;
    setBusy(true);
    try {
      await send(`/api/admin/vendors/purchase-orders/${order._id}/receive`, "POST", {
        received: Object.entries(receivedQuantities).map(([product, amount]) => ({ product, quantity: amount })),
        warehouse: receiveWarehouse || undefined,
      });
      toast.success("Stock received.");
      setReceivingOrder("");
      setReceivedQuantities({});
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not receive stock.");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <Link href="/admin/vendors" className="text-sm text-primary hover:underline">← Vendors</Link>
          <h1 className="mt-2 text-xl font-semibold text-text sm:text-2xl">{vendor.companyName}</h1>
          <p className="mt-1 text-sm text-muted">{vendor.vendorCode} · {vendor.status.replaceAll("_", " ")}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <button type="button" onClick={() => setShowOrderForm(true)} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm text-white sm:flex-none">Create PO</button>
          <button type="button" onClick={() => setShowPaymentForm(true)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm text-text sm:flex-none">Record payment</button>
          <Link href={`/admin/vendors/purchase-orders?vendor=${id}`} className="flex-1 rounded-md border border-border px-3 py-2 text-center text-sm text-text sm:flex-none">All purchase orders</Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total purchased", money(stats.totalPurchased, vendor.currency)],
          ["Total paid", money(stats.totalPaid, vendor.currency)],
          ["Balance due", money(stats.balanceDue, vendor.currency)],
          ["Purchase orders", stats.totalPurchaseOrders.toLocaleString()],
        ].map(([label, value]) => <article key={label} className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-muted">{label}</p><p className="mt-2 truncate font-semibold text-text">{value}</p></article>)}
      </section>

      <div className="overflow-x-auto border-b border-border">
        <nav aria-label="Vendor details" className="flex min-w-max gap-1">
          {tabs.map((entry) => <button key={entry.id} type="button" onClick={() => setTab(entry.id)} className={`border-b-2 px-3 py-2 text-sm ${tab === entry.id ? "border-primary font-medium text-primary" : "border-transparent text-muted hover:text-text"}`}>{entry.label}</button>)}
        </nav>
      </div>

      {tab === "overview" && (
        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-semibold text-text">Contact information</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-muted">Contact person</dt><dd className="text-text">{vendor.contactPerson || "—"}</dd></div>
              <div><dt className="text-muted">Email</dt><dd className="break-all text-text">{vendor.email}</dd></div>
              <div><dt className="text-muted">Phone</dt><dd className="text-text">{vendor.phone}</dd></div>
              <div><dt className="text-muted">Address</dt><dd className="text-text">{[vendor.address?.line1, vendor.address?.city, vendor.address?.state, vendor.address?.country].filter(Boolean).join(", ") || "—"}</dd></div>
              <div><dt className="text-muted">Type / terms</dt><dd className="capitalize text-text">{vendor.type.replaceAll("_", " ")} · {vendor.paymentTerms.replaceAll("_", " ")}</dd></div>
            </dl>
          </article>
          <article className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-semibold text-text">Supplied categories</h2>
            <div className="mt-3 flex flex-wrap gap-2">{vendor.categories.map((entry) => <span key={typeof entry === "string" ? entry : entry._id} className="rounded-full bg-background px-3 py-1 text-sm text-text">{typeof entry === "string" ? entry : entry.name}</span>)}{vendor.categories.length === 0 && <span className="text-sm text-muted">No categories assigned.</span>}</div>
            <h2 className="mt-6 font-semibold text-text">Notes</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{vendor.notes || "No notes."}</p>
          </article>
        </section>
      )}

      {tab === "products" && (
        <section className="overflow-x-auto rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between gap-3 p-4"><h2 className="font-semibold text-text">Linked products</h2><button type="button" onClick={() => void openProductManager()} className="rounded-md bg-primary px-3 py-2 text-sm text-white">Manage products</button></div>
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-background text-xs uppercase text-muted"><tr>{["Product", "Vendor SKU", "Cost", "Minimum quantity", "Preferred", "Last purchase", "Action"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {products.map((link) => {
                const product = typeof link.product === "object" ? link.product : null;
                const name = product?.translations && typeof product.translations === "object" && "en" in product.translations
                  ? String((product.translations.en as { name?: string }).name ?? product.slug)
                  : product?.slug ?? "Product";
                const productId = product?._id ?? (typeof link.product === "string" ? link.product : "");
                return <tr key={link._id}><td className="px-4 py-3">{name}</td><td className="px-4 py-3">{link.vendorSku || "—"}</td><td className="px-4 py-3">{money(link.costPrice, link.currency)}</td><td className="px-4 py-3">{link.minOrderQty}</td><td className="px-4 py-3">{link.isPreferred ? "Yes" : "No"}</td><td className="px-4 py-3">{link.lastPurchasePrice === undefined || link.lastPurchasePrice === null ? "—" : money(link.lastPurchasePrice, link.currency)}</td><td className="px-4 py-3"><button type="button" onClick={() => void unlinkProduct(productId)} className="text-rose-700 hover:underline">Unlink</button></td></tr>;
              })}
              {products.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">No linked products yet.</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {tab === "purchase-orders" && (
        <section className="space-y-3">
          {purchaseOrders.map((order) => <article key={order._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
            <div><Link href={`/admin/vendors/purchase-orders/${order._id}`} className="font-medium text-primary hover:underline">{order.poNumber}</Link><p className="mt-1 text-xs capitalize text-muted">{order.status.replaceAll("_", " ")} · Payment {order.paymentStatus.replaceAll("_", " ")}</p></div>
            <div className="flex items-center gap-3"><span className="text-sm font-medium text-text">{money(order.grandTotal, order.currency)}</span>{["sent", "confirmed", "partially_received"].includes(order.status) && <button type="button" onClick={() => { setReceivingOrder(order._id); setReceivedQuantities({}); }} className="rounded-md border border-border px-3 py-2 text-sm text-text">Receive stock</button>}</div>
          </article>)}
          {purchaseOrders.length === 0 && <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">No purchase orders yet.</p>}
        </section>
      )}

      {tab === "payments" && (
        <section className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-background text-xs uppercase text-muted"><tr>{["Date", "Amount", "Method", "Transaction", "Note"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">{payments.map((payment) => <tr key={payment._id}><td className="px-4 py-3">{new Date(payment.paidAt).toLocaleDateString()}</td><td className="px-4 py-3">{money(payment.amount, vendor.currency)}</td><td className="px-4 py-3 capitalize">{payment.method.replaceAll("_", " ")}</td><td className="px-4 py-3">{payment.transactionId || "—"}</td><td className="px-4 py-3">{payment.note || "—"}</td></tr>)}{payments.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">No payments recorded.</td></tr>}</tbody>
          </table>
        </section>
      )}

      {tab === "activity" && (
        <section className="space-y-3">{activity.map((entry, index) => {
          const action = typeof entry.action === "string" ? entry.action.replaceAll("_", " ") : "Updated";
          const createdAt = typeof entry.createdAt === "string" ? new Date(entry.createdAt).toLocaleString() : "";
          const note = typeof entry.note === "string" ? entry.note : "";
          return <article key={String(entry._id ?? index)} className="rounded-xl border border-border bg-surface p-4"><p className="font-medium capitalize text-text">{action}</p><p className="mt-1 text-xs text-muted">{createdAt}</p>{note && <p className="mt-2 text-sm text-muted">{note}</p>}</article>;
        })}{activity.length === 0 && <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">No activity recorded.</p>}</section>
      )}

      {showOrderForm && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4 lg:pl-[17rem]" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setShowOrderForm(false); }}>
        <form onSubmit={createOrder} className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-2xl bg-surface p-5 sm:rounded-xl">
          <h2 className="text-lg font-semibold text-text">Create purchase order</h2>
          {products.length === 0 ? <p className="text-sm text-muted">Link a product to this vendor before creating a purchase order.</p> : <>
            <label className="block text-sm text-text">Vendor product<select required value={selectedProduct} onChange={(event) => { setSelectedProduct(event.target.value); const selected = products.find((link) => typeof link.product === "object" && link.product._id === event.target.value); if (selected) setCost(String(selected.costPrice)); }} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm"><option value="">Select product</option>{products.map((link) => typeof link.product === "object" && <option key={link._id} value={link.product._id}>{link.product.slug} · {money(link.costPrice, link.currency)}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3"><label className="text-sm text-text">Quantity<input required min="1" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm" /></label><label className="text-sm text-text">Unit cost<input required min="0" step="0.01" type="number" value={cost} onChange={(event) => setCost(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm" /></label></div>
          </>}
          <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setShowOrderForm(false)} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button><button type="submit" disabled={busy || products.length === 0} className="rounded-md bg-primary px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? "Saving…" : "Create PO"}</button></div>
        </form>
      </div>}

      {showProductsForm && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4 lg:pl-[17rem]" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setShowProductsForm(false); }}>
        <form onSubmit={saveProductLink} className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-2xl bg-surface p-5 sm:rounded-xl">
          <h2 className="text-lg font-semibold text-text">Link product</h2>
          <label className="block text-sm text-text">Product<select required value={productLinkId} onChange={(event) => setProductLinkId(event.target.value)} className="mt-1 w-full min-w-0 rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm"><option value="">Select product</option>{productOptions.map((option) => <option key={option._id} value={option._id}>{option.name}{option.sku ? ` · ${option.sku}` : ""}</option>)}</select></label>
          <label className="block text-sm text-text">Vendor SKU<input value={vendorSku} onChange={(event) => setVendorSku(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm" /></label>
          <label className="block text-sm text-text">Cost price<input required min="0" step="0.01" type="number" value={productCost} onChange={(event) => setProductCost(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm" /></label>
          <label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={productPreferred} onChange={(event) => setProductPreferred(event.target.checked)} />Set as preferred vendor (replaces the current preferred vendor)</label>
          <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setShowProductsForm(false)} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button><button type="submit" disabled={busy || !productLinkId} className="rounded-md bg-primary px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? "Saving…" : "Save link"}</button></div>
        </form>
      </div>}

      {showPaymentForm && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4 lg:pl-[17rem]" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setShowPaymentForm(false); }}>
        <form onSubmit={recordPayment} className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-2xl bg-surface p-5 sm:rounded-xl">
          <h2 className="text-lg font-semibold text-text">Record vendor payment</h2>
          <label className="block text-sm text-text">Amount<input required min="0.01" max={Math.max(stats.balanceDue, 0)} step="0.01" type="number" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm" /></label>
          <label className="block text-sm text-text">Method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm">{["bank_transfer", "cash", "card", "cheque", "other"].map((method) => <option key={method} value={method}>{method.replaceAll("_", " ")}</option>)}</select></label>
          <label className="block text-sm text-text">Apply to purchase order (optional)<select value={paymentOrder} onChange={(event) => setPaymentOrder(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm"><option value="">Unallocated payment</option>{purchaseOrders.filter((order) => order.status !== "cancelled").map((order) => <option key={order._id} value={order._id}>{order.poNumber} · {money(order.grandTotal, order.currency)}</option>)}</select></label>
          <label className="block text-sm text-text">Note<textarea value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm" /></label>
          <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setShowPaymentForm(false)} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button><button type="submit" disabled={busy || stats.balanceDue <= 0} className="rounded-md bg-primary px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? "Saving…" : "Record payment"}</button></div>
        </form>
      </div>}

      {receivingOrder && (() => {
        const order = purchaseOrders.find((entry) => entry._id === receivingOrder);
        if (!order) return null;
        const rawItems = Array.isArray(order.items) ? order.items as Record<string, unknown>[] : [];
        return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4 lg:pl-[17rem]" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setReceivingOrder(""); }}>
          <form onSubmit={receiveStock} className="max-h-[90dvh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-t-2xl bg-surface p-5 sm:rounded-xl">
            <h2 className="text-lg font-semibold text-text">Receive stock · {order.poNumber}</h2>
            <p className="text-sm text-muted">An active default warehouse is required to receive stock.</p>
            <label className="block text-sm text-text">Warehouse ID (optional if default configured)<input value={receiveWarehouse} onChange={(event) => setReceiveWarehouse(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm" placeholder="MongoDB warehouse ID" /></label>
            <div className="space-y-2">{rawItems.map((item) => {
              const productId = String(item.product);
              const ordered = Number(item.quantity ?? 0);
              const already = Number(item.receivedQuantity ?? 0);
              return <label key={productId} className="grid grid-cols-[1fr_7rem] items-center gap-3 rounded-lg border border-border p-3 text-sm text-text"><span>{String(item.name)}<small className="block text-muted">Remaining: {Math.max(0, ordered - already)}</small></span><input type="number" min="0" max={Math.max(0, ordered - already)} value={receivedQuantities[productId] ?? 0} onChange={(event) => setReceivedQuantities({ ...receivedQuantities, [productId]: Number(event.target.value) })} className="w-full rounded-md border border-border bg-background px-2 py-2 text-base sm:text-sm" /></label>;
            })}</div>
            <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setReceivingOrder("")} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button><button type="submit" disabled={busy} className="rounded-md bg-primary px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? "Receiving…" : "Receive stock"}</button></div>
          </form>
        </div>;
      })()}
    </div>
  );
}
