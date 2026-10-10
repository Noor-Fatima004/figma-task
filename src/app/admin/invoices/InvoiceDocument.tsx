"use client";

import Link from "next/link";
import type { Invoice } from "./types";

const money = (amount: number, currency: string) =>
  `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const date = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function Address({ title, value }: { title: string; value: Invoice["billingAddress"] }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <p className="font-semibold text-slate-900">{value.name}</p>
      <p>{value.line1}{value.line2 ? `, ${value.line2}` : ""}</p>
      <p>{[value.city, value.state, value.postalCode].filter(Boolean).join(", ")}</p>
      <p>{value.country}</p>
      {value.phone && <p>{value.phone}</p>}
    </section>
  );
}

export default function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  return (
    <article className="invoice-printable mx-auto w-full max-w-4xl bg-white p-5 text-sm text-slate-700 sm:p-8 lg:p-10">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .invoice-printable, .invoice-printable * { visibility: visible !important; }
          .invoice-printable {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
          }
          .print\\:hidden { display: none !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            Nextcent
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Invoice
          </h1>
          <p className="mt-1 font-medium text-slate-500">{invoice.invoiceNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500">Payment status</p>
          <span className="mt-1 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-700">
            {invoice.paymentStatus.replaceAll("_", " ")}
          </span>
          <p className="mt-3">Issue date: <strong>{date(invoice.issueDate)}</strong></p>
          <p>Due date: <strong>{date(invoice.dueDate)}</strong></p>
          {invoice.order && (
            <Link
              href={`/admin/orders?search=${encodeURIComponent(invoice.order.orderNumber)}`}
              className="mt-2 inline-block text-blue-700 underline print:hidden"
            >
              View order #{invoice.order.orderNumber}
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 border-b border-slate-200 py-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Customer
          </h3>
          <p className="font-semibold text-slate-900">{invoice.customer.name}</p>
          <p className="break-all">{invoice.customer.email}</p>
          <p>{invoice.customer.phone}</p>
        </div>
        <Address title="Billing address" value={invoice.billingAddress} />
        <Address title="Shipping address" value={invoice.shippingAddress} />
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Payment
          </h3>
          <p>Method: <span className="capitalize">{invoice.paymentMethod}</span></p>
          {invoice.transactionId && <p>Transaction: {invoice.transactionId}</p>}
          <p>Currency: {invoice.currency}</p>
        </section>
      </div>

      <div className="overflow-x-auto py-6">
        <table className="w-full min-w-[520px] text-left">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-3 pr-3">Description</th>
              <th className="pb-3 px-3 text-right">Qty</th>
              <th className="pb-3 px-3 text-right">Unit price</th>
              <th className="pb-3 pl-3 text-right">Line total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={`${item.name}-${index}`} className="border-b border-slate-100">
                <td className="py-3 pr-3">
                  <p className="font-medium text-slate-900">{item.name}</p>
                  {item.sku && <p className="text-xs text-slate-500">SKU: {item.sku}</p>}
                </td>
                <td className="px-3 py-3 text-right">{item.quantity}</td>
                <td className="px-3 py-3 text-right">{money(item.unitPrice, invoice.currency)}</td>
                <td className="py-3 pl-3 text-right font-medium">{money(item.lineTotal, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end border-b border-slate-200 pb-6">
        <dl className="w-full max-w-sm space-y-2">
          {[
            ["Subtotal", invoice.subtotal],
            ["Discount", -invoice.discount],
            ["Tax / VAT", invoice.tax],
            ["Shipping", invoice.shippingCharges],
          ].map(([label, amount]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt>{label}</dt>
              <dd>{money(Number(amount), invoice.currency)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-950">
            <dt>Total</dt>
            <dd>{money(invoice.grandTotal, invoice.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Amount paid</dt>
            <dd>{money(invoice.amountPaid, invoice.currency)}</dd>
          </div>
          <div className="flex justify-between font-semibold text-slate-900">
            <dt>Balance due</dt>
            <dd>{money(invoice.balanceDue, invoice.currency)}</dd>
          </div>
        </dl>
      </div>

      {invoice.payments.length > 0 && (
        <section className="border-b border-slate-200 py-6">
          <h2 className="mb-3 font-semibold text-slate-900">Payment history</h2>
          <div className="space-y-2">
            {invoice.payments.map((payment, index) => (
              <div key={`${payment.paidAt}-${index}`} className="flex flex-wrap justify-between gap-2 text-xs">
                <span>{date(payment.paidAt)} · <span className="capitalize">{payment.method}</span></span>
                <span className="font-medium">{money(payment.amount, invoice.currency)}</span>
                {payment.transactionId && <span className="w-full text-slate-500">Transaction: {payment.transactionId}</span>}
                {payment.note && <span className="w-full text-slate-500">{payment.note}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {(invoice.notes || invoice.terms) && (
        <div className="grid gap-5 py-6 sm:grid-cols-2">
          {invoice.notes && <section><h2 className="mb-1 font-semibold text-slate-900">Notes</h2><p className="whitespace-pre-wrap">{invoice.notes}</p></section>}
          {invoice.terms && <section><h2 className="mb-1 font-semibold text-slate-900">Terms</h2><p className="whitespace-pre-wrap">{invoice.terms}</p></section>}
        </div>
      )}
    </article>
  );
}
