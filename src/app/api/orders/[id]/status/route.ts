import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import Order from "@/app/models/Order";
import connectDB from "@/lib/mongodb";
import { fulfillStock, releaseStock, StockError } from "@/lib/stock";
import { requireAdmin } from "@/lib/requireAdmin";
import {
  createInvoiceForOrder,
  syncInvoicePaymentFromOrder,
} from "@/lib/invoices";
import { getAdminActorId } from "@/lib/adminActor";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

const statuses = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;
type OrderStatus = (typeof statuses)[number];
const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return errorResponse("Invalid order id", 400);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  const parsed = z
    .object({
      status: z.enum(statuses),
      note: z.string().trim().max(500).optional().default(""),
    })
    .safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues[0]?.message ?? "Invalid order status",
      400
    );
  }

  try {
    await connectDB();
    const session = await mongoose.startSession();
    const actor = await getAdminActorId();
    let responseOrder: Record<string, unknown> | null = null;
    try {
      await session.withTransaction(async () => {
        const order = await Order.findById(id).session(session);
        if (!order) throw new StockError("Order not found", 404);

        if (order.status === parsed.data.status) {
          responseOrder = {
            _id: order._id.toString(),
            orderNumber: order.orderNumber,
            status: order.status,
            statusHistory: order.statusHistory,
          };
          return;
        }
        if (!transitions[order.status].includes(parsed.data.status)) {
          throw new StockError(
            `Cannot change order status from ${order.status} to ${parsed.data.status}.`,
            409
          );
        }

        if (parsed.data.status === "shipped") {
          await fulfillStock(order, session);
        } else if (parsed.data.status === "cancelled") {
          await releaseStock(order, session);
        }

        order.status = parsed.data.status;
        order.statusHistory.push({
          status: parsed.data.status,
          note: parsed.data.note,
          changedBy: null,
          changedAt: new Date(),
        });
        await order.save({ session });
        await createInvoiceForOrder(order, { session, performedBy: actor });
        await syncInvoicePaymentFromOrder(
          order._id,
          order.paymentStatus,
          order.status,
          session,
          actor
        );
        responseOrder = {
          _id: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
          statusHistory: order.statusHistory,
        };
      });
    } finally {
      await session.endSession();
    }
    return NextResponse.json({ order: responseOrder });
  } catch (error) {
    if (error instanceof StockError) {
      return errorResponse(error.message, error.status);
    }
    console.error("Update order status failed:", error);
    return errorResponse("Failed to update order status", 500);
  }
}
