import { isValidObjectId, Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Vendor from "@/app/models/Vendor";
import VendorProduct from "@/app/models/VendorProduct";
import PurchaseOrder from "@/app/models/PurchaseOrder";
import VendorPayment from "@/app/models/VendorPayment";
import VendorActivityLog from "@/app/models/VendorActivityLog";
import ProductCategory from "@/app/models/ProductCategory";
import Product from "@/app/models/Product";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAdminActorId } from "@/lib/adminActor";

type Context = { params: Promise<{ id: string }> };
const errorResponse = (message: string, status: number) =>
  NextResponse.json({ success: false, error: message }, { status });
const addressSchema = z.object({
  line1: z.string().trim().max(200).default(""),
  line2: z.string().trim().max(200).default(""),
  city: z.string().trim().max(100).default(""),
  state: z.string().trim().max(100).default(""),
  postalCode: z.string().trim().max(30).default(""),
  country: z.string().trim().max(100).default(""),
});
const editSchema = z.object({
  companyName: z.string().trim().min(1).max(200).optional(),
  contactPerson: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().min(1).max(40).optional(),
  alternatePhone: z.string().trim().max(40).optional(),
  website: z.string().trim().max(500).optional(),
  type: z.enum(["manufacturer", "wholesaler", "distributor", "retailer", "dropshipper", "service_provider"]).optional(),
  // blacklisted / on_hold jaan boojh kar yahan nahi hain: unke liye reason chahiye (PATCH use hota hai)
  status: z.enum(["active", "inactive", "pending"]).optional(),
  logo: z.string().max(2000).optional(),
  address: addressSchema.optional(),
  billingAddress: addressSchema.nullable().optional(),
  paymentTerms: z.enum(["cod", "advance", "net_7", "net_15", "net_30", "net_60"]).optional(),
  creditLimit: z.number().min(0).max(1_000_000_000).optional(),
  currency: z.string().trim().length(3).optional(),
  openingBalance: z.number().min(-1_000_000_000).max(1_000_000_000).optional(),
  leadTimeDays: z.number().int().min(0).max(3650).optional(),
  minimumOrderValue: z.number().min(0).optional(),
  minimumOrderQuantity: z.number().min(0).optional(),
  rating: z.number().min(1).max(5).nullable().optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(50).optional(),
  categories: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(200).optional(),
  documents: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    url: z.string().trim().min(1).max(1000),
    type: z.string().trim().max(50).default("other"),
    expiryDate: z.coerce.date().nullable().optional(),
  })).max(50).optional(),
  taxInfo: z.object({
    taxId: z.string().max(100),
    taxType: z.string().max(100),
    isTaxExempt: z.boolean(),
  }).optional(),
  bankDetails: z.object({
    bankName: z.string().max(150),
    accountTitle: z.string().max(150),
    accountNumber: z.string().max(100),
    iban: z.string().max(100),
    swift: z.string().max(50),
    branch: z.string().max(150),
  }).optional(),
}).strict();

export async function GET(request: NextRequest, _context: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await _context.params;
  if (!isValidObjectId(id)) return errorResponse("Invalid vendor id.", 400);
  try {
    await connectDB();
    const select = request.nextUrl.searchParams.get("includeBankDetails") === "1" ? "+bankDetails" : "-bankDetails";
    const [vendor, products, purchaseOrders, payments] = await Promise.all([
      Vendor.findOne({ _id: id, isDeleted: false }).select(select).populate("categories", "name").lean(),
      VendorProduct.find({ vendor: id, isActive: true })
        .populate("product", "slug translations sku price media")
        .select("-__v")
        .lean(),
      PurchaseOrder.find({ vendor: id, isDeleted: false }).sort({ createdAt: -1 }).limit(20).select("-__v").lean(),
      VendorPayment.find({ vendor: id }).sort({ paidAt: -1 }).limit(50).select("-__v").lean(),
    ]);
    if (!vendor) return errorResponse("Vendor not found.", 404);
    const [purchased, paid, purchaseOrderCount] = await Promise.all([
      PurchaseOrder.aggregate([{ $match: { vendor: vendor._id, isDeleted: false, status: { $ne: "cancelled" } } }, { $group: { _id: null, total: { $sum: "$grandTotal" } } }]),
      VendorPayment.aggregate([{ $match: { vendor: vendor._id } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      PurchaseOrder.countDocuments({ vendor: vendor._id, isDeleted: false }),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        vendor: { ...vendor, _id: vendor._id.toString() },
        products,
        purchaseOrders,
        payments,
        stats: {
          totalPurchased: purchased[0]?.total ?? 0,
          totalPaid: paid[0]?.total ?? 0,
          balanceDue: (purchased[0]?.total ?? 0) - (paid[0]?.total ?? 0) + (vendor.openingBalance ?? 0),
          totalPurchaseOrders: purchaseOrderCount,
        },
      },
    });
  } catch (error) {
    console.error("Failed to load vendor:", error);
    return errorResponse("Failed to load vendor.", 500);
  }
}

export async function PUT(request: NextRequest, context: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return errorResponse("Invalid vendor id.", 400);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body.", 400); }
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid vendor details.", 400);
  try {
    await connectDB();
    const vendor = await Vendor.findOne({ _id: id, isDeleted: false });
    if (!vendor) return errorResponse("Vendor not found.", 404);
    if (parsed.data.email && parsed.data.email.toLowerCase() !== vendor.email) {
      const duplicate = await Vendor.exists({ email: parsed.data.email.toLowerCase(), isDeleted: false, _id: { $ne: id } });
      if (duplicate) return errorResponse("A vendor with this email already exists.", 409);
    }
    const actorId = await getAdminActorId();
    const oldValue = {
      companyName: vendor.companyName,
      email: vendor.email,
      phone: vendor.phone,
      type: vendor.type,
      paymentTerms: vendor.paymentTerms,
      status: vendor.status,
    };
    const { status: nextStatus, ...data } = parsed.data;
    Object.assign(vendor, data);
    if (data.categories) {
      const categoryIds = data.categories.map((categoryId) => new Types.ObjectId(categoryId));
      if (categoryIds.length && (await ProductCategory.countDocuments({ _id: { $in: categoryIds } })) !== categoryIds.length) {
        return errorResponse("One or more selected categories do not exist.", 400);
      }
      vendor.categories = categoryIds;
    }
    // Status edit se badle to PATCH wali hi rules: active na rahe to preferred vendor hata do
    if (nextStatus && nextStatus !== vendor.status) {
      vendor.status = nextStatus;
      if (nextStatus !== "active") {
        await VendorProduct.updateMany(
          { vendor: vendor._id, isPreferred: true },
          { $set: { isPreferred: false } }
        );
        await Product.updateMany(
          { preferredVendor: vendor._id },
          { $set: { preferredVendor: null, costPrice: null } }
        );
      }
    }
    if (actorId) vendor.updatedBy = actorId;
    await vendor.save();
    await VendorActivityLog.create([{
      vendor: vendor._id,
      action: "updated",
      performedBy: actorId,
      oldValue,
      newValue: {
        companyName: vendor.companyName,
        email: vendor.email,
        phone: vendor.phone,
        type: vendor.type,
        paymentTerms: vendor.paymentTerms,
        status: vendor.status,
      },
    }]);
    const safe = await Vendor.findById(vendor._id).select("-bankDetails").lean();
    return NextResponse.json({ success: true, data: safe, message: "Vendor updated." });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return errorResponse("A vendor with this email already exists.", 409);
    }
    console.error("Failed to update vendor:", error);
    return errorResponse("Failed to update vendor.", 500);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return errorResponse("Invalid vendor id.", 400);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body.", 400); }
  const parsed = z.object({
    status: z.enum(["active", "inactive", "pending", "blacklisted", "on_hold"]),
    reason: z.string().trim().max(1000).default(""),
  }).safeParse(body);
  if (!parsed.success) return errorResponse("Invalid status update.", 400);
  if (["blacklisted", "on_hold"].includes(parsed.data.status) && !parsed.data.reason) {
    return errorResponse("A reason is required for this status.", 400);
  }
  try {
    await connectDB();
    const actorId = await getAdminActorId();
    const vendor = await Vendor.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { status: parsed.data.status, updatedBy: actorId } },
      { new: true, runValidators: true }
    ).select("-bankDetails").lean();
    if (!vendor) return errorResponse("Vendor not found.", 404);
    if (parsed.data.status !== "active") {
      await VendorProduct.updateMany(
        { vendor: vendor._id, isPreferred: true },
        { $set: { isPreferred: false } }
      );
      await Product.updateMany(
        { preferredVendor: vendor._id },
        { $set: { preferredVendor: null, costPrice: null } }
      );
    }
    await VendorActivityLog.create([{
      vendor: vendor._id,
      action: "status_changed",
      performedBy: actorId,
      newValue: { status: parsed.data.status },
      note: parsed.data.reason,
    }]);
    return NextResponse.json({ success: true, data: vendor, message: "Vendor status updated." });
  } catch (error) {
    console.error("Failed to update vendor status:", error);
    return errorResponse("Failed to update vendor status.", 500);
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return errorResponse("Invalid vendor id.", 400);
  try {
    await connectDB();
    const vendor = await Vendor.findOne({ _id: id, isDeleted: false });
    if (!vendor) return errorResponse("Vendor not found.", 404);
    const [openOrders, purchaseRows, paidRows] = await Promise.all([
      PurchaseOrder.countDocuments({
        vendor: id,
        isDeleted: false,
        status: { $in: ["draft", "sent", "confirmed", "partially_received"] },
      }),
      PurchaseOrder.aggregate([{ $match: { vendor: vendor._id, isDeleted: false, status: { $ne: "cancelled" } } }, { $group: { _id: null, total: { $sum: "$grandTotal" } } }]),
      VendorPayment.aggregate([{ $match: { vendor: vendor._id } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);
    const balance = (purchaseRows[0]?.total ?? 0) - (paidRows[0]?.total ?? 0) + (vendor.openingBalance ?? 0);
    if (openOrders || balance > 0) {
      return NextResponse.json({
        success: false,
        error: "Vendor has open purchase orders or an unpaid balance; resolve them before deleting.",
        data: { openOrders, balanceDue: balance },
      }, { status: 409 });
    }
    const actorId = await getAdminActorId();
    vendor.isDeleted = true;
    vendor.deletedAt = new Date();
    if (actorId) vendor.deletedBy = actorId;
    await vendor.save();
    await VendorProduct.updateMany({ vendor: id }, { $set: { isActive: false } });
    await Product.updateMany(
      { preferredVendor: vendor._id },
      { $set: { preferredVendor: null, costPrice: null } }
    );
    await VendorActivityLog.create([{
      vendor: vendor._id,
      action: "deleted",
      performedBy: actorId,
      oldValue: { companyName: vendor.companyName, vendorCode: vendor.vendorCode },
    }]);
    return NextResponse.json({ success: true, message: "Vendor deleted." });
  } catch (error) {
    console.error("Failed to delete vendor:", error);
    return errorResponse("Failed to delete vendor.", 500);
  }
}