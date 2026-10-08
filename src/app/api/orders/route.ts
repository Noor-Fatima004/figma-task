import { NextResponse } from "next/server";
import { z } from "zod";
import Order from "@/app/models/Order";
import connectDB from "@/lib/mongodb";
import { escapeRegex } from "@/lib/stock";
import { requireAdmin } from "@/lib/requireAdmin";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

const statuses = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export async function GET(request: Request) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const params = new URL(request.url).searchParams;
  const parsed = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      status: z.enum(statuses).optional(),
      q: z.string().trim().max(100).default(""),
    })
    .safeParse({
      page: params.get("page") ?? undefined,
      limit: params.get("limit") ?? undefined,
      status: params.get("status") || undefined,
      q: params.get("q") ?? "",
    });
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid filters", 400);
  }

  try {
    await connectDB();
    const filter: Record<string, unknown> = {};
    if (parsed.data.status) filter.status = parsed.data.status;
    if (parsed.data.q) {
      const expression = new RegExp(escapeRegex(parsed.data.q), "i");
      filter.$or = [
        { orderNumber: expression },
        { "customerSnapshot.name": expression },
        { "customerSnapshot.email": expression },
      ];
    }
    const [total, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .select(
          "orderNumber customerSnapshot subtotal shippingFee total status paymentMethod paymentStatus createdAt"
        )
        .sort({ createdAt: -1, _id: -1 })
        .skip((parsed.data.page - 1) * parsed.data.limit)
        .limit(parsed.data.limit)
        .lean(),
    ]);
    return NextResponse.json({
      items: orders.map((order) => ({
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        customer: order.customerSnapshot,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        total: order.total,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      })),
      total,
      page: parsed.data.page,
      totalPages: Math.max(1, Math.ceil(total / parsed.data.limit)),
    });
  } catch (error) {
    console.error("List orders failed:", error);
    return errorResponse("Failed to load orders", 500);
  }
}
