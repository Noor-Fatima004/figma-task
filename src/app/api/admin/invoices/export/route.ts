import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import Invoice from "@/app/models/Invoice";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { createInvoiceExcel } from "@/lib/invoiceExcel";

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const csvCell = (value: unknown) => {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectDB();
    const params = request.nextUrl.searchParams;
    const filter: Record<string, unknown> = { isDeleted: false };
    const status = params.get("status");
    const paymentMethod = params.get("paymentMethod");
    const statuses = ["draft", "unpaid", "partially_paid", "paid", "overdue", "refunded", "cancelled"];
    if (status && !statuses.includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid payment status." }, { status: 400 });
    }
    if (status) filter.paymentStatus = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (params.get("dateFrom") || params.get("dateTo")) {
      const range: Record<string, Date> = {};
      if (params.get("dateFrom")) {
        const date = new Date(params.get("dateFrom")!);
        if (Number.isNaN(date.getTime())) {
          return NextResponse.json({ success: false, error: "Invalid start date." }, { status: 400 });
        }
        range.$gte = date;
      }
      if (params.get("dateTo")) {
        const date = new Date(params.get("dateTo")!);
        if (Number.isNaN(date.getTime())) {
          return NextResponse.json({ success: false, error: "Invalid end date." }, { status: 400 });
        }
        date.setHours(23, 59, 59, 999);
        range.$lte = date;
      }
      filter.issueDate = range;
    }
    const min = params.get("minAmount");
    const max = params.get("maxAmount");
    if (min || max) {
      const range: Record<string, number> = {};
      if (min) range.$gte = Number(min);
      if (max) range.$lte = Number(max);
      if (Object.values(range).some((value) => !Number.isFinite(value) || value < 0)) {
        return NextResponse.json({ success: false, error: "Invalid amount filter." }, { status: 400 });
      }
      filter.grandTotal = range;
    }
    const search = params.get("search")?.trim();
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { invoiceNumber: regex },
        { orderNumberSnapshot: regex },
        { "customer.name": regex },
        { "customer.email": regex },
        { "customer.phone": regex },
      ];
    }
    const invoices = await Invoice.find(filter)
      .select("invoiceNumber order customer issueDate dueDate grandTotal amountPaid balanceDue paymentStatus paymentMethod currency")
      .populate<{ order: { _id: Types.ObjectId; orderNumber: string } | null }>({
        path: "order",
        select: "orderNumber",
      })
      .sort({ issueDate: -1 })
      .limit(10_000)
      .lean();
    const format = params.get("format") ?? "csv";
    if (format !== "csv" && format !== "xlsx") {
      return NextResponse.json({ success: false, error: "Unsupported export format." }, { status: 400 });
    }
    const headers = [
      "Invoice #",
      "Order #",
      "Customer",
      "Email",
      "Issue Date",
      "Due Date",
      "Total",
      "Amount Paid",
      "Balance Due",
      "Payment Status",
      "Payment Method",
    ];
    const rows = invoices.map((invoice) => [
      invoice.invoiceNumber,
      invoice.order && typeof invoice.order === "object" ? invoice.order.orderNumber : "",
      invoice.customer?.name ?? "",
      invoice.customer?.email ?? "",
      invoice.issueDate.toISOString(),
      invoice.dueDate.toISOString(),
      invoice.grandTotal,
      invoice.amountPaid,
      invoice.balanceDue,
      invoice.paymentStatus,
      invoice.paymentMethod,
    ]);
    if (format === "xlsx") {
      const output = await createInvoiceExcel(headers, rows);
      return new NextResponse(new Uint8Array(output), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="invoices.xlsx"',
          "Cache-Control": "no-store",
        },
      });
    }
    const lines = [
      headers,
      ...rows,
    ];
    const csv = `\uFEFF${lines.map((line) => line.map(csvCell).join(",")).join("\r\n")}`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="invoices.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to export invoices:", error);
    return NextResponse.json({ success: false, error: "Failed to export invoices." }, { status: 500 });
  }
}
