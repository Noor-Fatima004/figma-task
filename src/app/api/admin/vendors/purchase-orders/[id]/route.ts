import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import PurchaseOrder from "@/app/models/PurchaseOrder";
import Vendor from "@/app/models/Vendor";
import VendorActivityLog from "@/app/models/VendorActivityLog";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAdminActorId } from "@/lib/adminActor";

type Context = { params: Promise<{ id: string }> };
const errorResponse = (message: string, status: number) =>
  NextResponse.json({ success: false, error: message }, { status });

export async function GET(_request: NextRequest, context: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return errorResponse("Invalid purchase order id.", 400);
  try {
    await connectDB();
    const order = await PurchaseOrder.findOne({ _id: id, isDeleted: false })
      .populate("vendor", "vendorCode companyName email phone address status")
      .populate("items.product", "slug translations sku")
      .lean();
    if (!order) return errorResponse("Purchase order not found.", 404);
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Failed to load purchase order:", error);
    return errorResponse("Failed to load purchase order.", 500);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return errorResponse("Invalid purchase order id.", 400);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body.", 400); }
  const parsed = z.object({
    status: z.enum(["sent", "confirmed", "cancelled"]),
    note: z.string().trim().max(1000).default(""),
  }).safeParse(body);
  if (!parsed.success) return errorResponse("Invalid purchase order status.", 400);
  try {
    await connectDB();
    const order = await PurchaseOrder.findOne({ _id: id, isDeleted: false });
    if (!order) return errorResponse("Purchase order not found.", 404);
    if (parsed.data.status === "cancelled" && order.items.some((item) => item.receivedQuantity > 0)) {
      return errorResponse("A purchase order with received stock cannot be cancelled.", 409);
    }
    if (["received", "cancelled"].includes(order.status)) return errorResponse("This purchase order can no longer be changed.", 409);
    const vendor = await Vendor.findById(order.vendor).select("_id").lean();
    const actorId = await getAdminActorId();
    const previousStatus = order.status;
    order.status = parsed.data.status;
    if (actorId) order.updatedBy = actorId;
    await order.save();
    if (vendor) await VendorActivityLog.create([{
      vendor: vendor._id,
      action: "purchase_order_status_changed",
      performedBy: actorId,
      oldValue: { status: previousStatus, poNumber: order.poNumber },
      newValue: { status: order.status, poNumber: order.poNumber },
      note: parsed.data.note,
    }]);
    return NextResponse.json({ success: true, data: order, message: "Purchase order updated." });
  } catch (error) {
    console.error("Failed to update purchase order:", error);
    return errorResponse("Failed to update purchase order.", 500);
  }
}
