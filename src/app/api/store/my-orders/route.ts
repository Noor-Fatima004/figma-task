import { NextResponse } from "next/server";
import { z } from "zod";
import Order from "@/app/models/Order";
import connectDB from "@/lib/mongodb";
import { getAuthenticatedCustomer } from "@/lib/storefront";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    })
    .safeParse({
      page: params.get("page") ?? undefined,
      limit: params.get("limit") ?? undefined,
    });
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid page", 400);
  }

  try {
    const customer = await getAuthenticatedCustomer();
    if (!customer) return errorResponse("Unauthorized", 401);
    await connectDB();
    const filter = { customer: customer._id };
    const [total, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .select("orderNumber items subtotal shippingFee total status paymentStatus createdAt")
        .sort({ createdAt: -1, _id: -1 })
        .skip((parsed.data.page - 1) * parsed.data.limit)
        .limit(parsed.data.limit)
        .lean(),
    ]);
    return NextResponse.json({
      items: orders.map((order) => ({
        orderNumber: order.orderNumber,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      })),
      total,
      page: parsed.data.page,
      totalPages: Math.max(1, Math.ceil(total / parsed.data.limit)),
    });
  } catch (error) {
    console.error("List customer orders failed:", error);
    return errorResponse("Failed to load orders", 500);
  }
}
