import mongoose from "mongoose";
import { NextResponse } from "next/server";
import Order from "@/app/models/Order";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return errorResponse("Invalid order id", 400);
  }
  try {
    await connectDB();
    const order = await Order.findById(id).lean();
    if (!order) return errorResponse("Order not found", 404);
    return NextResponse.json({
      order: {
        ...order,
        _id: order._id.toString(),
        customer: order.customer?.toString() ?? null,
        items: order.items.map((item) => ({
          ...item,
          product: item.product.toString(),
          variations: item.variations.map(String),
          allocations: item.allocations.map((allocation) => ({
            warehouse: allocation.warehouse.toString(),
            quantity: allocation.quantity,
          })),
        })),
        statusHistory: order.statusHistory.map((entry) => ({
          status: entry.status,
          note: entry.note,
          changedBy: entry.changedBy?.toString() ?? null,
          changedAt: entry.changedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Load order failed:", error);
    return errorResponse("Failed to load order", 500);
  }
}
