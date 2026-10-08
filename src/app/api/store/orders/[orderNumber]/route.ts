import { NextResponse } from "next/server";
import { z } from "zod";
import Order from "@/app/models/Order";
import type { OrderDoc } from "@/app/models/Order";
import connectDB from "@/lib/mongodb";
import { getAuthenticatedCustomer } from "@/lib/storefront";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

type Context = { params: Promise<{ orderNumber: string }> };

function publicOrder(order: OrderDoc) {
  return {
    orderNumber: order.orderNumber,
    customer: order.customerSnapshot,
    shippingAddress: order.shippingAddress,
    items: order.items.map((item) => ({
      name: item.nameSnapshot,
      sku: item.skuSnapshot,
      image: item.imageSnapshot,
      variantLabel: item.variantLabel,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    total: order.total,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    statusHistory: order.statusHistory.map((entry) => ({
      status: entry.status,
      note: entry.note,
      changedAt: entry.changedAt,
    })),
    createdAt: order.createdAt,
  };
}

export async function GET(request: Request, { params }: Context) {
  const { orderNumber } = await params;
  const parsed = z
    .object({
      email: z.string().trim().email().max(254).optional(),
    })
    .safeParse({
      email: new URL(request.url).searchParams.get("email") ?? undefined,
    });
  if (!parsed.success) {
    return errorResponse("A valid email is required for guest order lookup", 400);
  }

  try {
    await connectDB();
    const customer = await getAuthenticatedCustomer();
    if (!customer && !parsed.data.email) {
      return errorResponse("A valid email is required for guest order lookup", 400);
    }
    const order = customer
      ? await Order.findOne({
          orderNumber: orderNumber.toUpperCase(),
          customer: customer._id,
        })
      : parsed.data.email
        ? await Order.findOne({
            orderNumber: orderNumber.toUpperCase(),
            customer: null,
            "customerSnapshot.email": parsed.data.email.toLowerCase(),
          })
        : null;
    if (!order) {
      return errorResponse("Order not found for these customer details", 404);
    }
    return NextResponse.json({ order: publicOrder(order) });
  } catch (error) {
    console.error("Load customer order failed:", error);
    return errorResponse("Failed to load order", 500);
  }
}
