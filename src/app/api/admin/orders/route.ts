import { NextRequest, NextResponse } from "next/server";
import  connectDB  from "@/lib/mongodb";
import Order from "@/app/models/Order";
import Invoice from "@/app/models/Invoice";
import { requireAdmin } from "@/lib/requireAdmin";

const SORT_MAP: Record<string, string> = {
  createdAt: "createdAt",
  customerName: "customerSnapshot.name",
  reference: "orderNumber",
  status: "status",
  grandTotal: "total",
  paymentStatus: "paymentStatus",
  paymentMethod: "paymentMethod",
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/admin/orders?search=&status=&paymentStatus=&customer=&days=7&page=1&limit=10&sort=createdAt&dir=desc
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const sp = req.nextUrl.searchParams;

  const search = sp.get("search")?.trim();
  const status = sp.get("status");
  const paymentStatus = sp.get("paymentStatus");
  const customer = sp.get("customer");
  const days = Number(sp.get("days") || 0);
  const page = Math.max(Number(sp.get("page") || 1), 1);
  const limit = Math.min(Math.max(Number(sp.get("limit") || 10), 1), 100);

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (customer) filter["customerSnapshot.name"] = customer;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { orderNumber: rx },
      { "customerSnapshot.name": rx },
      { "customerSnapshot.email": rx },
      { "customerSnapshot.phone": rx },
    ];
  }
  if (days > 0) {
    filter.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
  }

  const sortField = SORT_MAP[sp.get("sort") || ""] || "createdAt";
  const sortDir = sp.get("dir") === "asc" ? 1 : -1;

  const [docs, total, customers] = await Promise.all([
    Order.find(filter as never)
      .select("orderNumber customerSnapshot status paymentMethod paymentStatus total items.quantity createdAt")
      .sort({ [sortField]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter as never),
    Order.distinct("customerSnapshot.name"),
  ]);
  const invoices = docs.length
    ? await Invoice.find({
        order: { $in: docs.map((order) => order._id) },
        isDeleted: false,
      })
        .select("_id order")
        .lean()
    : [];
  const invoiceByOrder = new Map(
    invoices.flatMap((invoice) =>
      invoice.order
        ? [[invoice.order.toString(), invoice._id.toString()] as const]
        : []
    )
  );

  const items = docs.map((o) => {
    const paid = o.paymentStatus === "paid" ? o.total : 0;
    const due = o.paymentStatus === "unpaid" ? o.total : 0;
    return {
      _id: String(o._id),
      invoiceId: invoiceByOrder.get(o._id.toString()) ?? null,
      reference: o.orderNumber,
      customerName: o.customerSnapshot?.name ?? "",
      customerEmail: o.customerSnapshot?.email ?? "",
      status: o.status,
      grandTotal: o.total,
      paid,
      due,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      itemCount: (o.items ?? []).reduce((n, i) => n + (i.quantity ?? 0), 0),
      createdAt: o.createdAt,
    };
  });

  return NextResponse.json({
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
    customers: (customers as string[]).filter(Boolean).sort(),
  });
}