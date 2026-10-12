import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import Vendor from "@/app/models/Vendor";
import VendorActivityLog from "@/app/models/VendorActivityLog";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";

type Context = { params: Promise<{ id: string }> };
const errorResponse = (message: string, status: number) =>
  NextResponse.json({ success: false, error: message }, { status });

export async function GET(request: NextRequest, context: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return errorResponse("Invalid vendor id.", 400);
  try {
    await connectDB();
    if (!(await Vendor.exists({ _id: id, isDeleted: false }))) return errorResponse("Vendor not found.", 404);
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 25)));
    const [items, total] = await Promise.all([
      VendorActivityLog.find({ vendor: id }).populate("performedBy", "name email")
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      VendorActivityLog.countDocuments({ vendor: id }),
    ]);
    return NextResponse.json({ success: true, data: { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (error) {
    console.error("Failed to load vendor activity:", error);
    return errorResponse("Failed to load vendor activity.", 500);
  }
}
