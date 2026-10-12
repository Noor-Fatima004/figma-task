import mongoose, { isValidObjectId, Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Vendor from "@/app/models/Vendor";
import PurchaseOrder from "@/app/models/PurchaseOrder";
import VendorPayment from "@/app/models/VendorPayment";
import VendorActivityLog from "@/app/models/VendorActivityLog";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAdminActorId } from "@/lib/adminActor";

const errorResponse = (message: string, status: number) =>
  NextResponse.json({ success: false, error: message }, { status });

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  try {
    await connectDB();
    const params = request.nextUrl.searchParams;
    const filter: Record<string, unknown> = {};
    const vendor = params.get("vendor");
    if (vendor) {
      if (!isValidObjectId(vendor)) return errorResponse("Invalid vendor id.", 400);
      filter.vendor = new Types.ObjectId(vendor);
    }
    const page = Math.max(1, Number(params.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") || 25)));
    const [items, total] = await Promise.all([
      VendorPayment.find(filter).populate("vendor", "vendorCode companyName")
        .populate("purchaseOrder", "poNumber grandTotal")
        .sort({ paidAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      VendorPayment.countDocuments(filter),
    ]);
    return NextResponse.json({ success: true, data: { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (error) {
    console.error("Failed to load vendor payments:", error);
    return errorResponse("Failed to load vendor payments.", 500);
  }
}

const paymentSchema = z.object({
  vendor: z.string().regex(/^[a-f\d]{24}$/i),
  purchaseOrder: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  amount: z.number().positive().max(1_000_000_000),
  method: z.string().trim().min(1).max(100),
  transactionId: z.string().trim().max(200).default(""),
  paidAt: z.coerce.date().default(() => new Date()),
  note: z.string().trim().max(1000).default(""),
});

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body.", 400); }
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid payment.", 400);
  const session = await mongoose.startSession();
  try {
    await connectDB();
    let paymentId = "";
    await session.withTransaction(async () => {
      const vendor = await Vendor.findOneAndUpdate(
        { _id: parsed.data.vendor, isDeleted: false },
        { $inc: { paymentRevision: 1 } },
        { new: true, session }
      );
      if (!vendor) throw Object.assign(new Error("Vendor not found."), { status: 404 });
      const [purchases, existingPayments] = await Promise.all([
        PurchaseOrder.aggregate([
          { $match: { vendor: vendor._id, isDeleted: false, status: { $ne: "cancelled" } } },
          { $group: { _id: null, total: { $sum: "$grandTotal" } } },
        ]).session(session),
        VendorPayment.aggregate([
          { $match: { vendor: vendor._id } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]).session(session),
      ]);
      const balanceDue = (purchases[0]?.total ?? 0) -
        (existingPayments[0]?.total ?? 0) + (vendor.openingBalance ?? 0);
      if (parsed.data.amount > Math.max(0, balanceDue)) {
        throw Object.assign(new Error("Payment cannot exceed the vendor's current balance due."), { status: 400 });
      }
      let purchaseOrder = null;
      if (parsed.data.purchaseOrder) {
        purchaseOrder = await PurchaseOrder.findOne({
          _id: parsed.data.purchaseOrder,
          vendor: vendor._id,
          isDeleted: false,
          status: { $ne: "cancelled" },
        }).session(session);
        if (!purchaseOrder) throw Object.assign(new Error("Purchase order not found for this vendor."), { status: 404 });
        const payments = await VendorPayment.aggregate([
          { $match: { purchaseOrder: purchaseOrder._id } },
          { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]).session(session);
        if ((payments[0]?.amount ?? 0) + parsed.data.amount > purchaseOrder.grandTotal) {
          throw Object.assign(new Error("Payment cannot exceed the purchase order balance."), { status: 400 });
        }
      }
      const actorId = await getAdminActorId();
      const [payment] = await VendorPayment.create([{
        ...parsed.data,
        vendor: vendor._id,
        purchaseOrder: purchaseOrder?._id ?? null,
        recordedBy: actorId,
      }], { session });
      paymentId = payment._id.toString();
      if (purchaseOrder) {
        const totals = await VendorPayment.aggregate([
          { $match: { purchaseOrder: purchaseOrder._id } },
          { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]).session(session);
        const amountPaid = totals[0]?.amount ?? 0;
        purchaseOrder.paymentStatus = amountPaid >= purchaseOrder.grandTotal ? "paid" : amountPaid > 0 ? "partially_paid" : "unpaid";
        purchaseOrder.amountPaid = amountPaid;
        if (actorId) purchaseOrder.updatedBy = actorId;
        await purchaseOrder.save({ session });
      }
      await VendorActivityLog.create([{
        vendor: vendor._id,
        action: "payment_recorded",
        performedBy: actorId,
        newValue: {
          payment: payment._id.toString(),
          amount: payment.amount,
          purchaseOrder: purchaseOrder?.poNumber ?? null,
        },
        note: parsed.data.note,
      }], { session });
    });
    return NextResponse.json({ success: true, data: { _id: paymentId }, message: "Payment recorded." }, { status: 201 });
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
      ? error.status
      : 500;
    if (status === 500) console.error("Failed to record vendor payment:", error);
    return errorResponse(error instanceof Error ? error.message : "Failed to record payment.", status);
  } finally {
    await session.endSession();
  }
}
