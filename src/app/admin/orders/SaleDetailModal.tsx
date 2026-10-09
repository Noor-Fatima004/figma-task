"use client";

import { useEffect, useState } from "react";
import { FaArrowLeft, FaPrint } from "react-icons/fa";

type Detail = {
  _id: string;
  reference: string;
  createdAt: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "unpaid" | "paid" | "refunded";
  paymentMethod: string;
  customer: { name: string; email: string; phone: string };
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: {
    name: string;
    sku: string;
    image: string;
    variantLabel: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paid: number;
  due: number;
};

const STATUS_STYLE: Record<Detail["status"], string> = {
  pending: "bg-sky-500 text-white",
  confirmed: "bg-indigo-500 text-white",
  shipped: "bg-amber-500 text-white",
  delivered: "bg-emerald-500 text-white",
  cancelled: "bg-rose-500 text-white",
};
const PAY_STYLE: Record<Detail["paymentStatus"], string> = {
  paid: "bg-emerald-50 text-emerald-600",
  unpaid: "bg-rose-50 text-rose-600",
  refunded: "bg-amber-50 text-amber-600",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const money = (n: number) => `$ ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default function SaleDetailModal({
  id,
  onClose,
  printable = false,
}: {
  id: string;
  onClose: () => void;
  printable?: boolean;
}) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/orders/${id}`, { cache: "no-store" });
        const body: unknown = await res.json();
        if (!res.ok) {
          const message =
            typeof body === "object" &&
            body !== null &&
            "error" in body &&
            typeof body.error === "string"
              ? body.error
              : "Failed to load order details.";
          throw new Error(message);
        }
        const d = body as Detail;
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Kuch galat hua");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const addr = data?.shippingAddress;

  return (
    <div
      id={printable ? "order-invoice-print" : undefined}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 sm:p-4 lg:pl-[17rem]"
      onClick={onClose}
    >
      {printable && (
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            #order-invoice-print, #order-invoice-print * { visibility: visible !important; }
            #order-invoice-print {
              position: fixed !important;
              inset: 0 !important;
              display: block !important;
              padding: 0 !important;
              background: white !important;
            }
            #order-invoice-print > div {
              width: 100% !important;
              max-width: none !important;
              max-height: none !important;
              overflow: visible !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
          }
        `}</style>
      )}
      <div
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-sm font-semibold text-gray-900 sm:text-base">Order Detail</h2>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {printable && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 sm:px-4"
              >
                <FaPrint className="h-3 w-3" />
                Print / Save PDF
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 sm:px-4"
            >
              <FaArrowLeft className="h-3 w-3" />
              Back to Orders
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-6 sm:py-5 [&::-webkit-scrollbar]:hidden">
          {!data && !error && <p className="py-10 text-center text-gray-500">Loading...</p>}
          {error && <p className="py-10 text-center text-rose-600">{error}</p>}

          {data && addr && (
            <>
              <div className="grid gap-5 text-sm sm:grid-cols-3 sm:gap-6">
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-semibold text-gray-800">Customer Info</p>
                  <p className="text-base font-medium text-gray-900">{data.customer.name}</p>
                  <p className="break-words text-xs text-gray-500">
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.postalCode},{" "}
                    {addr.country}
                  </p>
                  <p className="break-all text-xs text-gray-500">Email: {data.customer.email}</p>
                  <p className="text-xs text-gray-500">Phone: {data.customer.phone}</p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-800">Payment Summary</p>
                  <p className="text-xs text-gray-500">
                    Method: <span className="uppercase">{data.paymentMethod}</span>
                  </p>
                  <p className="text-xs text-gray-500">Total: {money(data.total)}</p>
                  <p className="text-xs text-gray-500">Paid: {money(data.paid)}</p>
                  <p className="text-xs text-gray-500">Due: {money(data.due)}</p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-800">Invoice Info</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <p>
                      Reference: <span className="font-medium text-orange-500">#{data.reference}</span>
                    </p>
                    <p>Date: {fmtDate(data.createdAt)}</p>
                    <p>
                      Status:{" "}
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[data.status]}`}>
                        {cap(data.status)}
                      </span>
                    </p>
                    <p>
                      Payment Status:{" "}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PAY_STYLE[data.paymentStatus]}`}
                      >
                        ● {cap(data.paymentStatus)}
                      </span>
                    </p>
                    <p>
                      Payment Method: <span className="uppercase">{data.paymentMethod}</span>
                    </p>
                  </div>
                </div>
              </div>

              <p className="mb-2 mt-6 text-xs font-semibold text-gray-800">Order Summary</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-gray-100">
                    <tr className="text-left text-xs font-semibold text-gray-700">
                      <th className="px-3 py-3 sm:px-4">Product</th>
                      <th className="px-3 py-3 sm:px-4">Variant</th>
                      <th className="px-3 py-3 sm:px-4">Unit Price($)</th>
                      <th className="px-3 py-3 sm:px-4">Qty</th>
                      <th className="px-3 py-3 sm:px-4">Total($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((it, idx) => (
                      <tr key={idx} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-3 sm:px-4">
                          <div className="flex items-center gap-3">
                            {it.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={it.image} alt={it.name} className="h-8 w-8 shrink-0 rounded-md object-cover" />
                            ) : (
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-gray-100 text-xs font-semibold text-gray-500">
                                {it.name.slice(0, 1).toUpperCase()}
                              </span>
                            )}
                            <div className="min-w-0">
                              <div className="text-gray-900">{it.name}</div>
                              {it.sku && <div className="text-xs text-gray-500">SKU: {it.sku}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-gray-600 sm:px-4">{it.variantLabel || "-"}</td>
                        <td className="px-3 py-3 text-gray-600 sm:px-4">{it.unitPrice.toFixed(2)}</td>
                        <td className="px-3 py-3 text-gray-600 sm:px-4">{it.quantity}</td>
                        <td className="px-3 py-3 text-gray-600 sm:px-4">{it.lineTotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <table className="w-full max-w-sm border border-gray-200 text-sm">
                  <tbody>
                    {[
                      ["Subtotal", data.subtotal],
                      ["Shipping Fee", data.shippingFee],
                      ["Grand Total", data.total],
                      ["Paid", data.paid],
                      ["Due", data.due],
                    ].map(([label, value]) => (
                      <tr key={label as string} className="border-b border-gray-200 last:border-0">
                        <td className="bg-gray-50 px-4 py-3 text-gray-700">{label}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{money(value as number)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t border-gray-200 px-4 py-3 sm:px-6 sm:py-4 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}