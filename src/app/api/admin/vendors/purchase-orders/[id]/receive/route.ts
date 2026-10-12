import mongoose, { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Vendor from "@/app/models/Vendor";
import PurchaseOrder from "@/app/models/PurchaseOrder";
import VendorProduct from "@/app/models/VendorProduct";
import VendorActivityLog from "@/app/models/VendorActivityLog";
import Warehouse from "@/app/models/Warehouse";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAdminActorId } from "@/lib/adminActor";
import { applyStockChange } from "@/lib/stock";

type Context = { params: Promise<{ id: string }> };
const errorResponse = (message: string, status: number) =>
  NextResponse.json({ success: false, error: message }, { status });
const receiveSchema = z.object({
  received: z.array(z.object({
    product: z.string().regex(/^[a-f\d]{24}$/i),
    quantity: z.number().int().min(0).max(1_000_000),
  })).min(1).max(500),
  warehouse: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  note: z.string().trim().max(1000).default(""),
});

export async function POST(request: NextRequest, context: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return errorResponse("Invalid purchase order id.", 400);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body.", 400); }
  const parsed = receiveSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid receiving details.", 400);
  const session = await mongoose.startSession();
  try {
    await connectDB();
    const actorId = await getAdminActorId();
    let result: { status: string; poNumber: string } | undefined;
    await session.withTransaction(async () => {
      const purchaseOrder = await PurchaseOrder.findOne({ _id: id, isDeleted: false }).session(session);
      if (!purchaseOrder) throw Object.assign(new Error("Purchase order not found."), { status: 404 });
      if (["draft", "cancelled", "received"].includes(purchaseOrder.status)) {
        throw Object.assign(new Error("This purchase order cannot receive stock in its current status."), { status: 409 });
      }
      const vendor = await Vendor.findOne({ _id: purchaseOrder.vendor, isDeleted: false }).session(session);
      if (!vendor) throw Object.assign(new Error("Vendor not found."), { status: 404 });
      const requested = new Map<string, number>();
      for (const item of parsed.data.received) {
        if (requested.has(item.product)) throw Object.assign(new Error("Each product may be received only once per request."), { status: 400 });
        requested.set(item.product, item.quantity);
      }
      const poItemIds = new Set(purchaseOrder.items.map((item) => item.product.toString()));
      if ([...requested.keys()].some((productId) => !poItemIds.has(productId))) {
        throw Object.assign(new Error("A received product is not part of this purchase order."), { status: 400 });
      }
      const warehouse = parsed.data.warehouse
        ? await Warehouse.findOne({ _id: parsed.data.warehouse, isActive: true }).session(session)
        : await Warehouse.findOne({ isActive: true, isDefault: true }).sort({ priority: -1 }).session(session);
      if (!warehouse) throw Object.assign(new Error("Select an active warehouse to receive stock."), { status: 400 });
      const date = new Date();
      for (const item of purchaseOrder.items) {
        const quantity = requested.get(item.product.toString()) ?? 0;
        if (quantity === 0) continue;
        if (item.receivedQuantity + quantity > item.quantity) {
          throw Object.assign(new Error(`Received quantity for "${item.name}" exceeds the ordered amount.`), { status: 400 });
        }
        await applyStockChange({
          product: item.product.toString(),
          variations: [],
          warehouse: warehouse._id.toString(),
          mode: "in",
          quantity,
          reason: "purchase",
          reference: purchaseOrder.poNumber,
          note: parsed.data.note,
          allowNegative: true,
          userId: actorId?.toString() ?? null,
          label: item.name,
        }, session);
        item.receivedQuantity += quantity;
        await VendorProduct.updateOne(
          { vendor: vendor._id, product: item.product },
          { $set: { lastPurchasePrice: item.unitCost, lastPurchaseDate: date } },
          { session }
        );
      }
      if (!parsed.data.received.some((item) => item.quantity > 0)) {
        throw Object.assign(new Error("Enter a received quantity greater than zero."), { status: 400 });
      }
      const fullyReceived = purchaseOrder.items.every((item) => item.receivedQuantity >= item.quantity);
      purchaseOrder.status = fullyReceived ? "received" : "partially_received";
      purchaseOrder.receivedDate = fullyReceived ? date : purchaseOrder.receivedDate;
      if (actorId) purchaseOrder.updatedBy = actorId;
      await purchaseOrder.save({ session });
      await VendorActivityLog.create([{
        vendor: vendor._id,
        action: "purchase_order_received",
        performedBy: actorId,
        newValue: {
          purchaseOrder: purchaseOrder._id.toString(),
          poNumber: purchaseOrder.poNumber,
          status: purchaseOrder.status,
          received: parsed.data.received,
        },
        note: parsed.data.note,
      }], { session });
      result = { status: purchaseOrder.status, poNumber: purchaseOrder.poNumber };
    });
    return NextResponse.json({ success: true, data: result, message: "Stock received." });
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
      ? error.status
      : 500;
    if (status === 500) console.error("Failed to receive purchase order:", error);
    return errorResponse(error instanceof Error ? error.message : "Failed to receive stock.", status);
  } finally {
    await session.endSession();
  }
}
