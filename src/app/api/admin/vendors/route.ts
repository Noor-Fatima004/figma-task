import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import Vendor from "@/app/models/Vendor";
import VendorProduct from "@/app/models/VendorProduct";
import PurchaseOrder from "@/app/models/PurchaseOrder";
import VendorPayment from "@/app/models/VendorPayment";
import VendorActivityLog from "@/app/models/VendorActivityLog";
import ProductCategory from "@/app/models/ProductCategory";
import { nextSequence } from "@/app/models/Counter";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAdminActorId } from "@/lib/adminActor";

const errorResponse = (message: string, status: number) =>
  NextResponse.json({ success: false, error: message }, { status });
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const vendorTypes = ["manufacturer", "wholesaler", "distributor", "retailer", "dropshipper", "service_provider"] as const;
const vendorStatuses = ["active", "inactive", "pending", "blacklisted", "on_hold"] as const;
const paymentTerms = ["cod", "advance", "net_7", "net_15", "net_30", "net_60"] as const;
const addressSchema = z.object({
  line1: z.string().trim().max(200).default(""),
  line2: z.string().trim().max(200).default(""),
  city: z.string().trim().max(100).default(""),
  state: z.string().trim().max(100).default(""),
  postalCode: z.string().trim().max(30).default(""),
  country: z.string().trim().max(100).default(""),
});
const createSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  contactPerson: z.string().trim().max(120).default(""),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(1).max(40),
  alternatePhone: z.string().trim().max(40).default(""),
  website: z.string().trim().max(500).default(""),
  type: z.enum(vendorTypes).default("wholesaler"),
  status: z.enum(vendorStatuses).default("active"),
  logo: z.string().max(2000).default(""),
  address: addressSchema.default({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  }),
  billingAddress: addressSchema.nullable().optional(),
  paymentTerms: z.enum(paymentTerms).default("cod"),
  creditLimit: z.number().min(0).max(1_000_000_000).default(0),
  currency: z.string().trim().length(3).default("USD"),
  openingBalance: z.number().min(-1_000_000_000).max(1_000_000_000).default(0),
  leadTimeDays: z.number().int().min(0).max(3650).default(0),
  minimumOrderValue: z.number().min(0).default(0),
  minimumOrderQuantity: z.number().min(0).default(0),
  rating: z.number().min(1).max(5).nullable().default(null),
  notes: z.string().max(5000).default(""),
  tags: z.array(z.string().trim().min(1).max(50)).max(50).default([]),
  categories: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(200).default([]),
  taxInfo: z.object({
    taxId: z.string().max(100).default(""),
    taxType: z.string().max(100).default(""),
    isTaxExempt: z.boolean().default(false),
  }).default({ taxId: "", taxType: "", isTaxExempt: false }),
  bankDetails: z.object({
    bankName: z.string().max(150).default(""),
    accountTitle: z.string().max(150).default(""),
    accountNumber: z.string().max(100).default(""),
    iban: z.string().max(100).default(""),
    swift: z.string().max(50).default(""),
    branch: z.string().max(150).default(""),
  }).optional(),
});

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  try {
    await connectDB();
    const params = request.nextUrl.searchParams;
    const page = Number(params.get("page") || 1);
    const requestedLimit = Number(params.get("limit") || 10);
    if (!Number.isInteger(page) || page < 1) return errorResponse("Invalid page number.", 400);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1) return errorResponse("Invalid page size.", 400);
    const limit = Math.min(100, requestedLimit);
    const filter: Record<string, unknown> = { isDeleted: false };
    const search = params.get("search")?.trim() ?? "";
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { vendorCode: rx }, { companyName: rx }, { contactPerson: rx },
        { email: rx }, { phone: rx }, { alternatePhone: rx },
      ];
    }
    const status = params.get("status");
    if (status) {
      if (!vendorStatuses.includes(status as (typeof vendorStatuses)[number])) return errorResponse("Invalid status.", 400);
      filter.status = status;
    }
    const type = params.get("type");
    if (type) {
      if (!vendorTypes.includes(type as (typeof vendorTypes)[number])) return errorResponse("Invalid vendor type.", 400);
      filter.type = type;
    }
    const terms = params.get("paymentTerms");
    if (terms) {
      if (!paymentTerms.includes(terms as (typeof paymentTerms)[number])) return errorResponse("Invalid payment terms.", 400);
      filter.paymentTerms = terms;
    }
    const category = params.get("category");
    if (category) {
      if (!Types.ObjectId.isValid(category)) return errorResponse("Invalid category.", 400);
      filter.categories = new Types.ObjectId(category);
    }
    const city = params.get("city");
    if (city) filter["address.city"] = new RegExp(escapeRegex(city), "i");
    const country = params.get("country");
    if (country) filter["address.country"] = new RegExp(`^${escapeRegex(country)}$`, "i");
    const rating = params.get("rating");
    if (rating) {
      const value = Number(rating);
      if (!Number.isInteger(value) || value < 1 || value > 5) return errorResponse("Invalid rating.", 400);
      filter.rating = value;
    }
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");
    if (dateFrom || dateTo) {
      const range: Record<string, Date> = {};
      if (dateFrom) {
        const value = new Date(dateFrom);
        if (Number.isNaN(value.getTime())) return errorResponse("Invalid start date.", 400);
        range.$gte = value;
      }
      if (dateTo) {
        const value = new Date(dateTo);
        if (Number.isNaN(value.getTime())) return errorResponse("Invalid end date.", 400);
        value.setHours(23, 59, 59, 999);
        range.$lte = value;
      }
      filter.createdAt = range;
    }
    const [totalVendors, allVendorIds] = await Promise.all([
      Vendor.countDocuments({ isDeleted: false }),
      Vendor.find({ isDeleted: false }).distinct("_id"),
    ]);
    const sortFields: Record<string, string> = {
      vendorCode: "vendorCode", companyName: "companyName", contactPerson: "contactPerson",
      email: "email", status: "status", paymentTerms: "paymentTerms", createdAt: "createdAt",
    };
    const sortField = sortFields[params.get("sort") ?? ""] ?? "createdAt";
    const direction = params.get("direction") === "asc" ? 1 : -1;
    const [vendors, total, activeCount, pendingOrders, purchasedRows, paidRows, openingRows] = await Promise.all([
      Vendor.find(filter)
        .select("-bankDetails")
        .populate("categories", "name")
        .sort({ [sortField]: direction, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Vendor.countDocuments(filter),
      Vendor.countDocuments({ isDeleted: false, status: "active" }),
      PurchaseOrder.countDocuments({ isDeleted: false, status: { $in: ["draft", "sent", "confirmed", "partially_received"] } }),
      PurchaseOrder.aggregate([
        { $match: { vendor: { $in: allVendorIds }, isDeleted: false, status: { $ne: "cancelled" } } },
        { $group: { _id: "$vendor", total: { $sum: "$grandTotal" } } },
      ]),
      VendorPayment.aggregate([
        { $match: { vendor: { $in: allVendorIds } } },
        { $group: { _id: "$vendor", total: { $sum: "$amount" } } },
      ]),
      Vendor.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: null, openingBalance: { $sum: "$openingBalance" } } },
      ]),
    ]);
    const ids = vendors.map((vendor) => vendor._id);
    const [links, vendorPurchases, vendorPayments] = await Promise.all([
      VendorProduct.aggregate([{ $match: { vendor: { $in: ids }, isActive: true } }, { $group: { _id: "$vendor", count: { $sum: 1 } } }]),
      PurchaseOrder.aggregate([
        { $match: { vendor: { $in: ids }, isDeleted: false, status: { $ne: "cancelled" } } },
        { $group: { _id: "$vendor", total: { $sum: "$grandTotal" } } },
      ]),
      VendorPayment.aggregate([{ $match: { vendor: { $in: ids } } }, { $group: { _id: "$vendor", total: { $sum: "$amount" } } }]),
    ]);
    const countMap = new Map(links.map((row) => [row._id.toString(), row.count]));
    const purchasesMap = new Map(vendorPurchases.map((row) => [row._id.toString(), row.total]));
    const paymentsMap = new Map(vendorPayments.map((row) => [row._id.toString(), row.total]));
    const summary = {
      total: totalVendors,
      active: activeCount,
      purchased: purchasedRows.reduce((sum, row) => sum + row.total, 0),
      payable: purchasedRows.reduce((sum, row) => sum + row.total, 0) -
        paidRows.reduce((sum, row) => sum + row.total, 0) + (openingRows[0]?.openingBalance ?? 0),
      pendingPurchaseOrders: pendingOrders,
    };
    return NextResponse.json({
      success: true,
      data: {
        items: vendors.map((vendor) => ({
          ...vendor,
          _id: vendor._id.toString(),
          categories: vendor.categories.map((entry) =>
            typeof entry === "object" && entry !== null && "_id" in entry
              ? { _id: String(entry._id), name: "name" in entry ? String(entry.name) : "" }
              : { _id: String(entry), name: "" }
          ),
          productsCount: countMap.get(vendor._id.toString()) ?? 0,
          totalPurchased: purchasesMap.get(vendor._id.toString()) ?? 0,
          totalPaid: paymentsMap.get(vendor._id.toString()) ?? 0,
          balanceDue: (purchasesMap.get(vendor._id.toString()) ?? 0) -
            (paymentsMap.get(vendor._id.toString()) ?? 0) + (vendor.openingBalance ?? 0),
        })),
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
        summary,
      },
    });
  } catch (error) {
    console.error("Failed to list vendors:", error);
    return errorResponse("Failed to load vendors.", 500);
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body.", 400); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid vendor details.", 400);
  try {
    await connectDB();
    const actorId = await getAdminActorId();
    const existing = await Vendor.findOne({ email: parsed.data.email.toLowerCase(), isDeleted: false }).select("_id").lean();
    if (existing) return errorResponse("A vendor with this email already exists.", 409);
    const categoryIds = parsed.data.categories.map((id) => new Types.ObjectId(id));
    if (categoryIds.length && (await ProductCategory.countDocuments({ _id: { $in: categoryIds } })) !== categoryIds.length) {
      return errorResponse("One or more selected categories do not exist.", 400);
    }
    const sequence = await nextSequence("vendor");
    const vendorCode = `VND-${String(sequence).padStart(4, "0")}`;
    const [vendor] = await Vendor.create([{
      ...parsed.data,
      vendorCode,
      categories: categoryIds,
      createdBy: actorId,
      updatedBy: actorId,
    }]);
    await VendorActivityLog.create([{
      vendor: vendor._id,
      action: "created",
      performedBy: actorId,
      newValue: { vendorCode, companyName: vendor.companyName },
    }]);
    const safeVendor = await Vendor.findById(vendor._id).select("-bankDetails").lean();
    return NextResponse.json({ success: true, data: safeVendor, message: "Vendor created." }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return errorResponse("A vendor with this email or code already exists.", 409);
    }
    console.error("Failed to create vendor:", error);
    return errorResponse("Failed to create vendor.", 500);
  }
}
