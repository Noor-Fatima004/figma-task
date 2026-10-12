import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import Vendor from "@/app/models/Vendor";
import Product from "@/app/models/Product";
import VendorProduct from "@/app/models/VendorProduct";
import PurchaseOrder from "@/app/models/PurchaseOrder";
import VendorActivityLog from "@/app/models/VendorActivityLog";
import { nextSequence } from "@/app/models/Counter";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAdminActorId } from "@/lib/adminActor";

const errorResponse = (message: string, status: number) =>
  NextResponse.json({ success: false, error: message }, { status });
const poSchema = z.object({
  vendor: z.string().regex(/^[a-f\d]{24}$/i),
  items: z.array(z.object({
    product: z.string().regex(/^[a-f\d]{24}$/i),
    quantity: z.number().int().min(1).max(1_000_000),
    unitCost: z.number().min(0).max(1_000_000_000),
    vendorSku: z.string().max(100).default(""),
  })).min(1).max(500),
  discount: z.number().min(0).max(1_000_000_000).default(0),
  tax: z.number().min(0).max(1_000_000_000).default(0),
  shippingCost: z.number().min(0).max(1_000_000_000).default(0),
  currency: z.string().length(3).default("USD"),
  expectedDate: z.coerce.date().nullable().default(null),
  notes: z.string().max(5000).default(""),
  status: z.enum(["draft", "sent"]).default("draft"),
});

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  try {
    await connectDB();
    const params = request.nextUrl.searchParams;
    const requestedPage = Number(params.get("page") || 1);
    const requestedLimit = Number(params.get("limit") || 10);
    if (!Number.isInteger(requestedPage) || requestedPage < 1) return errorResponse("Invalid page number.", 400);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1) return errorResponse("Invalid page size.", 400);
    const filter: Record<string, unknown> = { isDeleted: false };
    const vendor = params.get("vendor");
    if (vendor) {
      if (!Types.ObjectId.isValid(vendor)) return errorResponse("Invalid vendor id.", 400);
      filter.vendor = new Types.ObjectId(vendor);
    }
    const status = params.get("status");
    if (status) {
      if (!["draft", "sent", "confirmed", "partially_received", "received", "cancelled"].includes(status)) return errorResponse("Invalid purchase order status.", 400);
      filter.status = status;
    }
    const limit = Math.min(100, requestedLimit);
    const [items, total] = await Promise.all([
      PurchaseOrder.find(filter).populate("vendor", "vendorCode companyName status")
        .sort({ createdAt: -1 }).skip((requestedPage - 1) * limit).limit(limit).lean(),
      PurchaseOrder.countDocuments(filter),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page: requestedPage,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Failed to list purchase orders:", error);
    return errorResponse("Failed to load purchase orders.", 500);
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body.", 400); }
  const parsed = poSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid purchase order.", 400);
  if (new Set(parsed.data.items.map((item) => item.product)).size !== parsed.data.items.length) {
    return errorResponse("Each product may appear only once in a purchase order.", 400);
  }
  try {
    await connectDB();
    const vendor = await Vendor.findOne({ _id: parsed.data.vendor, isDeleted: false }).lean();
    if (!vendor) return errorResponse("Vendor not found.", 404);
    if (vendor.status !== "active") return errorResponse("Purchase orders can only be created for active vendors.", 409);
    const products = await Product.find({ _id: { $in: parsed.data.items.map((item) => item.product) } })
      .select("_id slug translations")
      .lean();
    if (products.length !== new Set(parsed.data.items.map((item) => item.product)).size) {
      return errorResponse("One or more selected products do not exist.", 404);
    }
    const links = await VendorProduct.find({
      vendor: vendor._id,
      product: { $in: products.map((product) => product._id) },
      isActive: true,
    }).select("product vendorSku costPrice").lean();
    const linkMap = new Map(links.map((link) => [link.product.toString(), link]));
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));
    const items = parsed.data.items.map((item) => {
      const product = productMap.get(item.product);
      if (!product) throw new Error("Selected product is missing.");
      const link = linkMap.get(item.product);
      const name = product.translations?.get("en")?.name ?? product.slug;
      return {
        product: new Types.ObjectId(item.product),
        vendorSku: item.vendorSku || link?.vendorSku || "",
        name,
        quantity: item.quantity,
        receivedQuantity: 0,
        unitCost: item.unitCost || link?.costPrice || 0,
        lineTotal: Math.round(item.quantity * (item.unitCost || link?.costPrice || 0) * 100) / 100,
      };
    });
    const subtotal = Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
    const grandTotal = Math.max(0, Math.round((subtotal - parsed.data.discount + parsed.data.tax + parsed.data.shippingCost) * 100) / 100);
    const year = new Date().getFullYear();
    const sequence = await nextSequence(`purchase-order-${year}`);
    const poNumber = `PO-${year}-${String(sequence).padStart(4, "0")}`;
    const actorId = await getAdminActorId();
    const [purchaseOrder] = await PurchaseOrder.create([{
      ...parsed.data,
      vendor: vendor._id,
      items,
      subtotal,
      grandTotal,
      poNumber,
      createdBy: actorId,
      updatedBy: actorId,
    }]);
    await VendorActivityLog.create([{
      vendor: vendor._id,
      action: "purchase_order_created",
      performedBy: actorId,
      newValue: { purchaseOrder: purchaseOrder._id.toString(), poNumber, grandTotal },
    }]);
    return NextResponse.json({ success: true, data: purchaseOrder, message: "Purchase order created." }, { status: 201 });
  } catch (error) {
    console.error("Failed to create purchase order:", error);
    return errorResponse("Failed to create purchase order.", 500);
  }
}
