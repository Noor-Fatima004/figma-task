import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import VendorProduct from "@/app/models/VendorProduct";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const product = request.nextUrl.searchParams.get("product");
  if (!product || !isValidObjectId(product)) {
    return NextResponse.json({ success: false, error: "A valid product id is required." }, { status: 400 });
  }
  try {
    await connectDB();
    const links = await VendorProduct.find({ product, isActive: true })
      .populate({ path: "vendor", select: "vendorCode companyName status isDeleted" })
      .sort({ isPreferred: -1, costPrice: 1 })
      .lean();
    const active = links.filter((link) =>
      typeof link.vendor === "object" && link.vendor !== null && "isDeleted" in link.vendor && !link.vendor.isDeleted
    );
    return NextResponse.json({
      success: true,
      data: active.map((link) => ({
        _id: link._id.toString(),
        vendor: link.vendor,
        vendorSku: link.vendorSku,
        costPrice: link.costPrice,
        currency: link.currency,
        isPreferred: link.isPreferred,
        leadTimeDays: link.leadTimeDays,
        minOrderQty: link.minOrderQty,
      })),
    });
  } catch (error) {
    console.error("Failed to load product vendors:", error);
    return NextResponse.json({ success: false, error: "Failed to load product vendors." }, { status: 500 });
  }
}
