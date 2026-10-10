import { isValidObjectId, Types } from "mongoose";
import { notFound } from "next/navigation";
import Invoice from "@/app/models/Invoice";
import connectDB from "@/lib/mongodb";
import { markOverdueInvoices } from "@/lib/invoices";
import InvoiceDocument from "../InvoiceDocument";
import InvoiceDetailActions from "../InvoiceDetailActions";
import type { Invoice as InvoiceView } from "../types";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  await markOverdueInvoices(id);
  const doc = await Invoice.findOne({ _id: id, isDeleted: false })
    .populate<{ order: { _id: Types.ObjectId; orderNumber: string } | null }>({
      path: "order",
      select: "orderNumber",
    })
    .lean();
  if (!doc) notFound();

  const invoice: InvoiceView = {
    _id: doc._id.toString(),
    invoiceNumber: doc.invoiceNumber,
    order: doc.order
      ? { _id: doc.order._id.toString(), orderNumber: doc.order.orderNumber }
      : null,
    customer: {
      user: doc.customer?.user?.toString() ?? null,
      name: doc.customer?.name ?? "",
      email: doc.customer?.email ?? "",
      phone: doc.customer?.phone ?? "",
    },
    billingAddress: {
      name: doc.billingAddress?.name ?? "",
      phone: doc.billingAddress?.phone ?? "",
      line1: doc.billingAddress?.line1 ?? "",
      line2: doc.billingAddress?.line2 ?? "",
      city: doc.billingAddress?.city ?? "",
      state: doc.billingAddress?.state ?? "",
      postalCode: doc.billingAddress?.postalCode ?? "",
      country: doc.billingAddress?.country ?? "",
    },
    shippingAddress: {
      name: doc.shippingAddress?.name ?? "",
      phone: doc.shippingAddress?.phone ?? "",
      line1: doc.shippingAddress?.line1 ?? "",
      line2: doc.shippingAddress?.line2 ?? "",
      city: doc.shippingAddress?.city ?? "",
      state: doc.shippingAddress?.state ?? "",
      postalCode: doc.shippingAddress?.postalCode ?? "",
      country: doc.shippingAddress?.country ?? "",
    },
    issueDate: doc.issueDate.toISOString(),
    dueDate: doc.dueDate.toISOString(),
    items: doc.items.map((item) => ({
      product: item.product?.toString() ?? null,
      name: item.name,
      sku: item.sku ?? "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    subtotal: doc.subtotal,
    discount: doc.discount ?? 0,
    tax: doc.tax ?? 0,
    shippingCharges: doc.shippingCharges ?? 0,
    grandTotal: doc.grandTotal,
    currency: doc.currency,
    paymentStatus: doc.paymentStatus,
    paymentMethod: doc.paymentMethod,
    transactionId: doc.transactionId ?? "",
    payments: doc.payments.map((payment) => ({
      amount: payment.amount,
      method: payment.method,
      transactionId: payment.transactionId ?? "",
      paidAt: payment.paidAt.toISOString(),
      note: payment.note ?? "",
      recordedBy: payment.recordedBy?.toString() ?? null,
    })),
    amountPaid: doc.amountPaid,
    balanceDue: doc.balanceDue,
    notes: doc.notes ?? "",
    terms: doc.terms ?? "",
    sentAt: doc.sentAt?.toISOString() ?? null,
    lastSentTo: doc.lastSentTo ?? "",
  };
  const query = await searchParams;

  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <InvoiceDetailActions id={invoice._id} printOnLoad={query.print === "1"} />
      <InvoiceDocument invoice={invoice} />
    </div>
  );
}
