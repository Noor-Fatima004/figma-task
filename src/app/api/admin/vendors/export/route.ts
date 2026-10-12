import { NextRequest, NextResponse } from "next/server";
import Vendor from "@/app/models/Vendor";
import PurchaseOrder from "@/app/models/PurchaseOrder";
import VendorPayment from "@/app/models/VendorPayment";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { createInvoiceExcel } from "@/lib/invoiceExcel";

const csvCell = (value: unknown) => {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
};
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    const params = request.nextUrl.searchParams;
    const filter: Record<string, unknown> = { isDeleted: false };
    const search = params.get("search")?.trim() ?? "";
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ vendorCode: rx }, { companyName: rx }, { contactPerson: rx }, { email: rx }, { phone: rx }];
    }
    const status = params.get("status");
    const type = params.get("type");
    const terms = params.get("paymentTerms");
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (terms) filter.paymentTerms = terms;
    const city = params.get("city");
    const country = params.get("country");
    const category = params.get("category");
    const rating = params.get("rating");
    if (city) filter["address.city"] = new RegExp(escapeRegex(city), "i");
    if (country) filter["address.country"] = new RegExp(`^${escapeRegex(country)}$`, "i");
    if (category) {
      if (!/^[a-f\d]{24}$/i.test(category)) return NextResponse.json({ success: false, error: "Invalid category." }, { status: 400 });
      filter.categories = category;
    }
    if (rating) {
      const value = Number(rating);
      if (!Number.isInteger(value) || value < 1 || value > 5) return NextResponse.json({ success: false, error: "Invalid rating." }, { status: 400 });
      filter.rating = value;
    }
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");
    if (dateFrom || dateTo) {
      const range: Record<string, Date> = {};
      if (dateFrom) {
        const date = new Date(dateFrom);
        if (Number.isNaN(date.getTime())) return NextResponse.json({ success: false, error: "Invalid start date." }, { status: 400 });
        range.$gte = date;
      }
      if (dateTo) {
        const date = new Date(dateTo);
        if (Number.isNaN(date.getTime())) return NextResponse.json({ success: false, error: "Invalid end date." }, { status: 400 });
        date.setHours(23, 59, 59, 999);
        range.$lte = date;
      }
      filter.createdAt = range;
    }
    const vendors = await Vendor.find(filter).select("-bankDetails").sort({ companyName: 1 }).limit(50000).lean();
    const ids = vendors.map((vendor) => vendor._id);
    const [orders, payments] = await Promise.all([
      PurchaseOrder.aggregate([
        { $match: { vendor: { $in: ids }, isDeleted: false, status: { $ne: "cancelled" } } },
        { $group: { _id: "$vendor", total: { $sum: "$grandTotal" } } },
      ]),
      VendorPayment.aggregate([{ $match: { vendor: { $in: ids } } }, { $group: { _id: "$vendor", total: { $sum: "$amount" } } }]),
    ]);
    const orderMap = new Map(orders.map((row) => [row._id.toString(), row.total]));
    const paymentMap = new Map(payments.map((row) => [row._id.toString(), row.total]));
    const header = ["Vendor code", "Company", "Contact person", "Email", "Phone", "Type", "Status", "Payment terms", "City", "Country", "Total purchased", "Total paid", "Balance due"];
    const rows = vendors.map((vendor) => {
      const purchased = orderMap.get(vendor._id.toString()) ?? 0;
      const paid = paymentMap.get(vendor._id.toString()) ?? 0;
      return [
        vendor.vendorCode, vendor.companyName, vendor.contactPerson, vendor.email, vendor.phone,
        vendor.type, vendor.status, vendor.paymentTerms, vendor.address?.city, vendor.address?.country,
        purchased, paid, purchased - paid + (vendor.openingBalance ?? 0),
      ].map(csvCell).join(",");
    });
    if (params.get("format") === "xlsx") {
      const data = vendors.map((vendor) => {
        const purchased = orderMap.get(vendor._id.toString()) ?? 0;
        const paid = paymentMap.get(vendor._id.toString()) ?? 0;
        return [
          vendor.vendorCode, vendor.companyName, vendor.contactPerson, vendor.email, vendor.phone,
          vendor.type, vendor.status, vendor.paymentTerms, vendor.address?.city ?? "",
          vendor.address?.country ?? "", purchased, paid, purchased - paid + (vendor.openingBalance ?? 0),
        ];
      });
      const buffer = await createInvoiceExcel(header, data, "Vendors");
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="vendors.xlsx"',
          "Cache-Control": "no-store",
        },
      });
    }
    return new NextResponse([header.map(csvCell).join(","), ...rows].join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="vendors.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to export vendors:", error);
    return NextResponse.json({ success: false, error: "Failed to export vendors." }, { status: 500 });
  }
}
