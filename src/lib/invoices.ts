import type { ClientSession, Types } from "mongoose";
import Order from "@/app/models/Order";
import Invoice from "@/app/models/Invoice";
import InvoiceActivityLog from "@/app/models/InvoiceActivityLog";
import { nextSequence } from "@/app/models/Counter";

type OrderSnapshot = {
  _id: Types.ObjectId;
  orderNumber: string;
  customer?: Types.ObjectId | null;
  customerSnapshot?: { name: string; email: string; phone: string } | null;
  shippingAddress?: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  items?: {
    product: Types.ObjectId;
    nameSnapshot: string;
    skuSnapshot?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[] | null;
  subtotal?: number;
  shippingFee?: number;
  total?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  status?: string;
  createdAt?: Date;
};

export async function createInvoiceForOrder(
  order: OrderSnapshot,
  options: { session?: ClientSession; performedBy?: Types.ObjectId | null } = {}
) {
  if (!order.customerSnapshot || !order.shippingAddress || !order.items?.length) {
    throw new Error(`Order ${order.orderNumber} is missing invoice data.`);
  }
  const session = options.session;
  const existingQuery = Invoice.findOne({ order: order._id });
  if (session) existingQuery.session(session);
  const existing = await existingQuery;
  if (existing) return existing;

  const issueDate = order.createdAt ?? new Date();
  const year = issueDate.getFullYear();
  const sequence = await nextSequence(`invoice-${year}`, session);
  const invoiceNumber = `INV-${year}-${String(sequence).padStart(4, "0")}`;
  const address = {
    name: order.shippingAddress.name,
    phone: order.shippingAddress.phone,
    line1: order.shippingAddress.line1,
    line2: order.shippingAddress.line2 ?? "",
    city: order.shippingAddress.city,
    state: order.shippingAddress.state,
    postalCode: order.shippingAddress.postalCode,
    country: order.shippingAddress.country,
  };
  const paid = order.paymentStatus === "paid";
  const initialStatus =
    order.paymentStatus === "refunded"
      ? "refunded"
      : order.status === "cancelled"
        ? "cancelled"
        : paid
          ? "paid"
          : "unpaid";
  const [invoice] = await Invoice.create(
    [
      {
        invoiceNumber,
        order: order._id,
        orderNumberSnapshot: order.orderNumber,
        customer: {
          user: order.customer ?? null,
          ...order.customerSnapshot,
        },
        billingAddress: address,
        shippingAddress: address,
        issueDate,
        dueDate: new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        items: order.items.map((item) => ({
          product: item.product,
          name: item.nameSnapshot,
          sku: item.skuSnapshot ?? "",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
        subtotal: order.subtotal ?? 0,
        shippingCharges: order.shippingFee ?? 0,
        grandTotal: order.total ?? 0,
        paymentMethod: order.paymentMethod ?? "cod",
        paymentStatus: initialStatus,
        payments: paid
          ? [
              {
                amount: order.total ?? 0,
                method: order.paymentMethod ?? "cod",
                paidAt: issueDate,
                note: "Payment recorded from order",
                recordedBy: options.performedBy ?? null,
              },
            ]
          : [],
        createdBy: options.performedBy ?? null,
        updatedBy: options.performedBy ?? null,
      },
    ],
    session ? { session } : undefined
  );
  await InvoiceActivityLog.create(
    [
      {
        invoice: invoice._id,
        action: "created",
        performedBy: options.performedBy ?? null,
        newValue: { invoiceNumber, orderNumber: order.orderNumber },
        note: "Invoice generated from order",
      },
    ],
    session ? { session } : undefined
  );
  return invoice;
}

export async function ensureInvoiceForOrderId(
  orderId: Types.ObjectId,
  performedBy?: Types.ObjectId | null
) {
  const order = await Order.findById(orderId).lean();
  if (!order) return null;
  return createInvoiceForOrder(order, { performedBy });
}

export async function syncInvoicePaymentFromOrder(
  orderId: Types.ObjectId,
  paymentStatus: string,
  orderStatus: string,
  session?: ClientSession,
  performedBy?: Types.ObjectId | null
) {
  const invoiceQuery = Invoice.findOne({ order: orderId, isDeleted: false });
  if (session) invoiceQuery.session(session);
  const invoice = await invoiceQuery;
  if (!invoice) return;
  const oldStatus = invoice.paymentStatus;
  if (paymentStatus === "paid" && invoice.balanceDue > 0) {
    invoice.payments.push({
      amount: invoice.balanceDue,
      method: invoice.paymentMethod || "manual",
      paidAt: new Date(),
      note: "Payment recorded from order",
      recordedBy: performedBy ?? null,
    });
  } else if (paymentStatus === "refunded") {
    invoice.paymentStatus = "refunded";
  } else if (orderStatus === "cancelled") {
    invoice.paymentStatus = "cancelled";
  }
  if (oldStatus !== invoice.paymentStatus || paymentStatus === "paid") {
    invoice.updatedBy = performedBy ?? null;
    await invoice.save(session ? { session } : undefined);
    await logInvoiceActivity(
      invoice._id,
      "status_changed",
      performedBy ?? null,
      {
        oldValue: oldStatus,
        newValue: invoice.paymentStatus,
        note: "Synchronized from order",
      },
      session
    );
  }
}

export async function markOverdueInvoices(invoiceId?: Types.ObjectId | string) {
  const now = new Date();
  const filter: Record<string, unknown> = {
    isDeleted: false,
    paymentStatus: { $in: ["unpaid", "partially_paid"] as const },
    dueDate: { $lt: now },
    ...(invoiceId ? { _id: invoiceId } : {}),
  };
  const overdue = await Invoice.find(filter as never)
    .select("_id paymentStatus")
    .lean();
  if (!overdue.length) return;
  await Invoice.updateMany(
    { _id: { $in: overdue.map((invoice) => invoice._id) } },
    { $set: { paymentStatus: "overdue" } }
  );
  await InvoiceActivityLog.insertMany(
    overdue.map((invoice) => ({
      invoice: invoice._id,
      action: "status_changed",
      oldValue: invoice.paymentStatus,
      newValue: "overdue",
      note: "Invoice passed its due date",
    }))
  );
}

export class InvoiceStatusError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
  }
}

export async function updateInvoicePaymentStatus(
  id: string,
  paymentStatus:
    | "draft"
    | "unpaid"
    | "partially_paid"
    | "paid"
    | "overdue"
    | "refunded"
    | "cancelled",
  note: string,
  performedBy: Types.ObjectId | null
) {
  const session = await Invoice.startSession();
  let result: { paymentStatus: string } | null = null;
  try {
    await session.withTransaction(async () => {
      const invoice = await Invoice.findOne({ _id: id, isDeleted: false }).session(session);
      if (!invoice) throw new InvoiceStatusError("Invoice not found.", 404);
      const oldStatus = invoice.paymentStatus;
      const oldPayment = {
        amountPaid: invoice.amountPaid,
        balanceDue: invoice.balanceDue,
      };
      let paymentRecorded = false;
      if (paymentStatus === "paid" && invoice.balanceDue > 0) {
        invoice.payments.push({
          amount: invoice.balanceDue,
          method: invoice.paymentMethod || "manual",
          transactionId: invoice.transactionId,
          paidAt: new Date(),
          note: note || "Marked paid",
          recordedBy: performedBy,
        });
        paymentRecorded = true;
      } else {
        invoice.paymentStatus = paymentStatus;
      }
      invoice.updatedBy = performedBy;
      await invoice.save({ session });
      if (paymentRecorded) {
        await logInvoiceActivity(
          invoice._id,
          "payment_recorded",
          performedBy,
          {
            oldValue: oldPayment,
            newValue: {
              amountPaid: invoice.amountPaid,
              balanceDue: invoice.balanceDue,
              amount: oldPayment.balanceDue,
            },
            note: note || "Balance settled",
          },
          session
        );
      }
      await logInvoiceActivity(
        invoice._id,
        "status_changed",
        performedBy,
        { oldValue: oldStatus, newValue: invoice.paymentStatus, note },
        session
      );
      result = { paymentStatus: invoice.paymentStatus };
    });
  } finally {
    await session.endSession();
  }
  if (!result) throw new Error("Invoice status transaction did not complete.");
  return result;
}

export async function logInvoiceActivity(
  invoice: Types.ObjectId,
  action: string,
  performedBy: Types.ObjectId | null,
  values: {
    oldValue?: unknown;
    newValue?: unknown;
    note?: string;
  } = {},
  session?: ClientSession
) {
  const entry = {
    invoice,
    action,
    performedBy,
    oldValue: values.oldValue ?? null,
    newValue: values.newValue ?? null,
    note: values.note ?? "",
  };
  const [created] = await InvoiceActivityLog.create(
    [entry],
    session ? { session } : undefined
  );
  return created;
}
