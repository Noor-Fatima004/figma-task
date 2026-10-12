import { isValidObjectId, Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Vendor from "@/app/models/Vendor";
import VendorActivityLog from "@/app/models/VendorActivityLog";
import VendorProduct from "@/app/models/VendorProduct";
import PurchaseOrder from "@/app/models/PurchaseOrder";
import VendorPayment from "@/app/models/VendorPayment";
import Product from "@/app/models/Product";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAdminActorId } from "@/lib/adminActor";

const errorResponse = (message: string, status: number) =>
  NextResponse.json({ success: false, error: message }, { status });
const schema = z.object({
  action: z.enum(["activate", "deactivate", "delete"]),
  ids: z.array(z.string().refine(isValidObjectId)).min(1).max(500),
});

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body.", 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid bulk action.", 400);
  try {
    await connectDB();
    const ids = parsed.data.ids.map((id) => new Types.ObjectId(id));
    const vendors = await Vendor.find({ _id: { $in: ids }, isDeleted: false }).select("_id status vendorCode openingBalance").lean();
    if (vendors.length !== ids.length) return errorResponse("One or more vendors were not found.", 404);
    const actorId = await getAdminActorId();
    if (parsed.data.action === "delete") {
      const [blockedOrders, purchases, payments] = await Promise.all([
        Vendor.aggregate([
          { $match: { _id: { $in: ids } } },
          {
            $lookup: {
              from: "purchaseorders",
              let: { vendorId: "$_id" },
              pipeline: [
                { $match: { $expr: { $and: [{ $eq: ["$vendor", "$$vendorId"] }, { $eq: ["$isDeleted", false] }, { $in: ["$status", ["draft", "sent", "confirmed", "partially_received"]] }] } } },
                { $limit: 1 },
              ],
              as: "openOrders",
            },
          },
          { $match: { "openOrders.0": { $exists: true } } },
          { $limit: 1 },
        ]),
        PurchaseOrder.aggregate([
          { $match: { vendor: { $in: ids }, isDeleted: false, status: { $ne: "cancelled" } } },
          { $group: { _id: "$vendor", total: { $sum: "$grandTotal" } } },
        ]),
        VendorPayment.aggregate([
          { $match: { vendor: { $in: ids } } },
          { $group: { _id: "$vendor", total: { $sum: "$amount" } } },
        ]),
      ]);
      const paidMap = new Map(payments.map((row) => [row._id.toString(), row.total]));
      const purchaseMap = new Map(purchases.map((row) => [row._id.toString(), row.total]));
      const hasBalance = vendors.some((vendor) => (purchaseMap.get(vendor._id.toString()) ?? 0) - (paidMap.get(vendor._id.toString()) ?? 0) + (vendor.openingBalance ?? 0) > 0);
      if (blockedOrders.length || hasBalance) {
        return errorResponse("Resolve open purchase orders and unpaid balances before deleting vendors.", 409);
      }
      await Vendor.updateMany(
        { _id: { $in: ids }, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: actorId } }
      );
      await VendorProduct.updateMany({ vendor: { $in: ids } }, { $set: { isActive: false, isPreferred: false } });
      await Product.updateMany(
        { preferredVendor: { $in: ids } },
        { $set: { preferredVendor: null, costPrice: null } }
      );
    } else {
      const status = parsed.data.action === "activate" ? "active" : "inactive";
      await Vendor.updateMany({ _id: { $in: ids }, isDeleted: false }, { $set: { status, updatedBy: actorId } });
    }
    await VendorActivityLog.insertMany(vendors.map((vendor) => ({
      vendor: vendor._id,
      action: parsed.data.action === "delete" ? "deleted" : "status_changed",
      performedBy: actorId,
      oldValue: { status: vendor.status },
      newValue: parsed.data.action === "delete" ? { isDeleted: true } : { status: parsed.data.action === "activate" ? "active" : "inactive" },
    })));
    return NextResponse.json({ success: true, data: { updated: vendors.length }, message: "Bulk action completed." });
  } catch (error) {
    console.error("Failed to apply bulk vendor action:", error);
    return errorResponse("Failed to apply bulk action.", 500);
  }
}
