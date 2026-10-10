import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import Invoice from "@/app/models/Invoice";
import Order from "@/app/models/Order";
import connectDB from "@/lib/mongodb";
import { createInvoiceForOrder, markOverdueInvoices } from "@/lib/invoices";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAdminActorId } from "@/lib/adminActor";

const STATUSES = [
  "draft",
  "unpaid",
  "partially_paid",
  "paid",
  "overdue",
  "refunded",
  "cancelled",
] as const;
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const errorResponse = (message: string, status: number) =>
  NextResponse.json({ success: false, error: message }, { status });

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  try {
    await connectDB();
    await markOverdueInvoices();
    const params = request.nextUrl.searchParams;
    const requestedPage = Number(params.get("page") || 1);
    const requestedLimit = Number(params.get("limit") || 10);
    if (!Number.isInteger(requestedPage) || requestedPage < 1) {
      return errorResponse("Invalid page number.", 400);
    }
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
      return errorResponse("Invalid page size.", 400);
    }
    const page = requestedPage;
    const limit = Math.min(100, requestedLimit);
    const search = params.get("search")?.trim() ?? "";
    const status = params.get("status") ?? "";
    const paymentMethod = params.get("paymentMethod") ?? "";
    const sortKeys: Record<string, string> = {
      invoiceNumber: "invoiceNumber",
      orderNumber: "orderNumberSnapshot",
      customer: "customer.name",
      issueDate: "issueDate",
      dueDate: "dueDate",
      grandTotal: "grandTotal",
      amountPaid: "amountPaid",
      balanceDue: "balanceDue",
      paymentStatus: "paymentStatus",
    };
    const sort = sortKeys[params.get("sort") ?? ""] ?? "issueDate";
    const direction = params.get("direction") === "asc" ? 1 : -1;
    const filter: Record<string, unknown> = { isDeleted: false };
    const orderId = params.get("orderId");
    if (orderId) {
      if (!/^[a-f\d]{24}$/i.test(orderId)) return errorResponse("Invalid order id.", 400);
      filter.order = new Types.ObjectId(orderId);
    }
    if (status && STATUSES.includes(status as (typeof STATUSES)[number])) {
      filter.paymentStatus = status;
    } else if (status) return errorResponse("Invalid payment status.", 400);
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");
    if (dateFrom || dateTo) {
      const range: Record<string, Date> = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (Number.isNaN(from.getTime())) return errorResponse("Invalid start date.", 400);
        range.$gte = from;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        if (Number.isNaN(to.getTime())) return errorResponse("Invalid end date.", 400);
        to.setHours(23, 59, 59, 999);
        range.$lte = to;
      }
      filter.issueDate = range;
    }
    const minAmount = params.get("minAmount");
    const maxAmount = params.get("maxAmount");
    if (minAmount || maxAmount) {
      const range: Record<string, number> = {};
      if (minAmount) {
        const value = Number(minAmount);
        if (!Number.isFinite(value) || value < 0) return errorResponse("Invalid minimum amount.", 400);
        range.$gte = value;
      }
      if (maxAmount) {
        const value = Number(maxAmount);
        if (!Number.isFinite(value) || value < 0) return errorResponse("Invalid maximum amount.", 400);
        range.$lte = value;
      }
      filter.grandTotal = range;
    }
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { invoiceNumber: rx },
        { orderNumberSnapshot: rx },
        { "customer.name": rx },
        { "customer.email": rx },
        { "customer.phone": rx },
      ];
    }

    const [docs, total, summaryRows] = await Promise.all([
      Invoice.find(filter)
        .select(
          "invoiceNumber order customer issueDate dueDate grandTotal amountPaid balanceDue paymentStatus paymentMethod currency"
        )
        .populate<{ order: { _id: Types.ObjectId; orderNumber: string } | null }>({
          path: "order",
          select: "orderNumber",
        })
        .sort({ [sort]: direction, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(filter),
      Invoice.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            revenue: { $sum: "$grandTotal" },
            paid: { $sum: "$amountPaid" },
            unpaid: {
              $sum: {
                $cond: [
                  { $in: ["$paymentStatus", ["unpaid", "partially_paid"]] },
                  "$balanceDue",
                  0,
                ],
              },
            },
            overdue: {
              $sum: {
                $cond: [
                  { $eq: ["$paymentStatus", "overdue"] },
                  "$balanceDue",
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);
    const summary = summaryRows[0] ?? {
      count: 0,
      revenue: 0,
      paid: 0,
      unpaid: 0,
      overdue: 0,
    };
    return NextResponse.json({
      success: true,
      data: {
        items: docs.map((invoice) => ({
          ...invoice,
          _id: invoice._id.toString(),
          order: invoice.order
            ? {
                _id: invoice.order._id.toString(),
                orderNumber: invoice.order.orderNumber,
              }
            : null,
        })),
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
        summary: {
          count: summary.count,
          revenue: summary.revenue,
          paid: summary.paid,
          unpaid: summary.unpaid,
          overdue: summary.overdue,
        },
      },
    });
  } catch (error) {
    console.error("Failed to list invoices:", error);
    return errorResponse("Failed to load invoices.", 500);
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }
  const parsed = z.object({ orderId: z.string().regex(/^[a-f\d]{24}$/i) }).safeParse(body);
  if (!parsed.success) return errorResponse("A valid orderId is required.", 400);
  try {
    await connectDB();
    const order = await Order.findById(parsed.data.orderId).lean();
    if (!order) return errorResponse("Order not found.", 404);
    const invoice = await createInvoiceForOrder(order, {
      performedBy: await getAdminActorId(),
    });
    return NextResponse.json(
      { success: true, data: { _id: invoice._id.toString(), invoiceNumber: invoice.invoiceNumber } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return errorResponse("Failed to create invoice.", 500);
  }
}
