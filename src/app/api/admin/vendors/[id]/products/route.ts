import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Vendor from "@/app/models/Vendor";
import VendorProduct from "@/app/models/VendorProduct";
import Product from "@/app/models/Product";
import VendorActivityLog from "@/app/models/VendorActivityLog";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAdminActorId } from "@/lib/adminActor";

const errorResponse = (message: string, status: number) =>
  NextResponse.json({ success: false, error: message }, { status });
const linkSchema = z.object({
  product: z.string().regex(/^[a-f\d]{24}$/i),
  vendorSku: z.string().trim().max(100).default(""),
  costPrice: z.number().min(0).max(1_000_000_000),
  currency: z.string().trim().length(3).default("USD"),
  minOrderQty: z.number().int().min(1).max(1_000_000).default(1),
  leadTimeDays: z.number().int().min(0).max(3650).default(0),
  isPreferred: z.boolean().default(false),
  notes: z.string().trim().max(1000).default(""),
});

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return errorResponse("Invalid vendor id.", 400);
  try {
    await connectDB();
    const vendor = await Vendor.exists({ _id: id, isDeleted: false });
    if (!vendor) return errorResponse("Vendor not found.", 404);
    const products = await VendorProduct.find({ vendor: id, isActive: true })
      .populate("product", "slug translations sku price media category")
      .sort({ isPreferred: -1, updatedAt: -1 })
      .lean();
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("Failed to load vendor products:", error);
    return errorResponse("Failed to load vendor products.", 500);
  }
}

export async function POST(request: NextRequest, context: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return errorResponse("Invalid vendor id.", 400);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body.", 400); }
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid product link.", 400);
  const session = await (await import("mongoose")).default.startSession();
  try {
    await connectDB();
    const vendor = await Vendor.findOne({ _id: id, isDeleted: false }).session(session);
    if (!vendor) return errorResponse("Vendor not found.", 404);
    if (vendor.status !== "active") return errorResponse("Only active vendors can be linked to products.", 409);
    const product = await Product.findById(parsed.data.product).select("_id").session(session);
    if (!product) return errorResponse("Product not found.", 404);
    const actorId = await getAdminActorId();
    let linkId = "";
    await session.withTransaction(async () => {
      const existing = await VendorProduct.findOne({
        vendor: vendor._id,
        product: product._id,
      }).session(session);
      if (parsed.data.isPreferred) {
        await VendorProduct.updateMany(
          { product: product._id, isPreferred: true },
          { $set: { isPreferred: false } },
          { session }
        );
        await Product.updateOne(
          { _id: product._id },
          { $set: { preferredVendor: vendor._id, costPrice: parsed.data.costPrice } },
          { session }
        );
      }
      const update = {
        ...parsed.data,
        vendor: vendor._id,
        product: product._id,
        isActive: true,
      };
      const link = existing
        ? Object.assign(existing, update)
        : new VendorProduct(update);
      await link.save({ session });
      linkId = link._id.toString();
      await VendorActivityLog.create([{
        vendor: vendor._id,
        action: existing ? "product_link_updated" : "product_link_created",
        performedBy: actorId,
        newValue: { product: product._id.toString(), isPreferred: parsed.data.isPreferred },
      }], { session });
    });
    return NextResponse.json({ success: true, data: { _id: linkId }, message: "Vendor product saved." });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return errorResponse("Product is already linked to this vendor.", 409);
    }
    console.error("Failed to save vendor product:", error);
    return errorResponse("Failed to save vendor product.", 500);
  } finally {
    await session.endSession();
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return errorResponse("Invalid vendor id.", 400);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body.", 400); }
  const parsed = z.object({ product: z.string().refine(isValidObjectId) }).safeParse(body);
  if (!parsed.success) return errorResponse("A valid product id is required.", 400);
  try {
    await connectDB();
    const link = await VendorProduct.findOneAndUpdate(
      { vendor: id, product: parsed.data.product, isActive: true },
      { $set: { isActive: false, isPreferred: false } },
      { new: true }
    );
    if (!link) return errorResponse("Vendor product link not found.", 404);
    const preferred = await VendorProduct.findOne({ product: link.product, isPreferred: true, isActive: true }).select("vendor costPrice").lean();
    await Product.updateOne(
      { _id: link.product, preferredVendor: id },
      preferred
        ? { $set: { preferredVendor: preferred.vendor, costPrice: preferred.costPrice } }
        : { $set: { preferredVendor: null, costPrice: null } }
    );
    await VendorActivityLog.create([{
      vendor: link.vendor,
      action: "product_link_removed",
      performedBy: await getAdminActorId(),
      oldValue: { product: link.product.toString() },
    }]);
    return NextResponse.json({ success: true, message: "Product unlinked." });
  } catch (error) {
    console.error("Failed to unlink vendor product:", error);
    return errorResponse("Failed to unlink vendor product.", 500);
  }
}
