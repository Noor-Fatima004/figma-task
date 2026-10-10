import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import connectDB from "@/lib/mongodb";
import Order from "@/app/models/Order";
import { releaseStock, StockError } from "@/lib/stock";
import { requireAdmin } from "@/lib/requireAdmin";
import {
  createInvoiceForOrder,
  syncInvoicePaymentFromOrder,
} from "@/lib/invoices";
import { getAdminActorId } from "@/lib/adminActor";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;
const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"] as const;

// GET /api/admin/orders/:id
export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await connectDB();

  const o = await Order.findById(id).lean();
  if (!o) return NextResponse.json({ error: "Order nahi mila" }, { status: 404 });

  const paid = o.paymentStatus === "paid" ? o.total : 0;
  const due = o.paymentStatus === "unpaid" ? o.total : 0;

  return NextResponse.json({
    _id: String(o._id),
    reference: o.orderNumber,
    createdAt: o.createdAt,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    customer: {
      name: o.customerSnapshot?.name ?? "",
      email: o.customerSnapshot?.email ?? "",
      phone: o.customerSnapshot?.phone ?? "",
    },
    shippingAddress: o.shippingAddress,
    items: (o.items ?? []).map((i) => ({
      name: i.nameSnapshot,
      sku: i.skuSnapshot ?? "",
      image: i.imageSnapshot ?? "",
      variantLabel: i.variantLabel ?? "",
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
    subtotal: o.subtotal,
    shippingFee: o.shippingFee,
    total: o.total,
    paid,
    due,
  });
}

// PATCH /api/admin/orders/:id   body: { status?, paymentStatus?, note? }
export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = z
    .object({
      status: z.enum(STATUSES).optional(),
      paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
      note: z.string().trim().max(500).optional(),
      customer: z
        .object({
          name: z.string().trim().min(1).max(120),
          email: z.string().trim().email().max(254),
          phone: z.string().trim().min(1).max(40),
        })
        .optional(),
      shippingAddress: z
        .object({
          name: z.string().trim().min(1).max(120),
          phone: z.string().trim().min(1).max(40),
          line1: z.string().trim().min(1).max(200),
          line2: z.string().trim().max(200).default(""),
          city: z.string().trim().min(1).max(100),
          state: z.string().trim().min(1).max(100),
          postalCode: z.string().trim().min(1).max(30),
          country: z.string().trim().min(1).max(100),
        })
        .optional(),
    })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid order data" },
      { status: 400 }
    );
  }
  await connectDB();

  const order = await Order.findById(id);
  if (!order) return NextResponse.json({ error: "Order nahi mila" }, { status: 404 });

  if (parsed.data.customer) {
    order.set("customerSnapshot", parsed.data.customer);
  }
  if (parsed.data.shippingAddress) {
    order.set("shippingAddress", parsed.data.shippingAddress);
  }

  if (parsed.data.status !== undefined) {
    if (parsed.data.status !== order.status) {
      order.status = parsed.data.status;
      order.statusHistory.push({
        status: parsed.data.status,
        note: parsed.data.note ?? "",
        changedBy: null,
        changedAt: new Date(),
      });
    }
  }

  if (parsed.data.paymentStatus !== undefined) {
    order.paymentStatus = parsed.data.paymentStatus;
  }

  await order.save();
  try {
    const actor = await getAdminActorId();
    const invoice = await createInvoiceForOrder(order, { performedBy: actor });
    await syncInvoicePaymentFromOrder(
      order._id,
      order.paymentStatus,
      order.status,
      undefined,
      actor
    );
    if (
      parsed.data.customer ||
      parsed.data.shippingAddress
    ) {
      invoice.set("customer", {
        ...invoice.customer,
        ...order.customerSnapshot,
        user: order.customer,
      });
      invoice.set("billingAddress", order.shippingAddress);
      invoice.set("shippingAddress", order.shippingAddress);
      await invoice.save();
    }
  } catch (error) {
    console.error("Failed to synchronize order invoice:", error);
  }
  return NextResponse.json({ ok: true, status: order.status, paymentStatus: order.paymentStatus });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await connectDB();
    const session = await Order.startSession();
    try {
      await session.withTransaction(async () => {
        const order = await Order.findById(id).session(session);
        if (!order) throw new StockError("Order not found", 404);
        if (order.status === "shipped" || order.status === "delivered") {
          throw new StockError(
            "Shipped or delivered orders cannot be deleted.",
            409
          );
        }
        if (order.paymentStatus === "paid") {
          throw new StockError("Paid orders cannot be deleted.", 409);
        }
        await releaseStock(order, session);
        await order.deleteOne({ session });
      });
    } finally {
      await session.endSession();
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof StockError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Delete order failed:", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}