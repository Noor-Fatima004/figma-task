import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Vendor from "@/app/models/Vendor";
import VendorActivityLog from "@/app/models/VendorActivityLog";
import { nextSequence } from "@/app/models/Counter";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAdminActorId } from "@/lib/adminActor";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  if (!(await requireAdmin())) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!isValidObjectId(id)) return NextResponse.json({ success: false, error: "Invalid vendor id." }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = z.object({ email: z.string().trim().email().max(254) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: "A new valid vendor email is required." }, { status: 400 });
  try {
    await connectDB();
    const source = await Vendor.findOne({ _id: id, isDeleted: false }).select("+bankDetails").lean();
    if (!source) return NextResponse.json({ success: false, error: "Vendor not found." }, { status: 404 });
    if (await Vendor.exists({ email: parsed.data.email.toLowerCase(), isDeleted: false })) {
      return NextResponse.json({ success: false, error: "A vendor with this email already exists." }, { status: 409 });
    }
    const actorId = await getAdminActorId();
    const vendorCode = `VND-${String(await nextSequence("vendor")).padStart(4, "0")}`;
    const [duplicate] = await Vendor.create([{
      ...source,
      _id: undefined,
      vendorCode,
      email: parsed.data.email.toLowerCase(),
      companyName: `${source.companyName} (Copy)`,
      categories: source.categories,
      documents: [],
      status: "pending",
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
    await VendorActivityLog.create([{
      vendor: duplicate._id,
      action: "duplicated",
      performedBy: actorId,
      newValue: { source: source._id.toString(), vendorCode },
    }]);
    const safe = await Vendor.findById(duplicate._id).select("-bankDetails").lean();
    return NextResponse.json({ success: true, data: safe, message: "Vendor duplicated." }, { status: 201 });
  } catch (error) {
    console.error("Failed to duplicate vendor:", error);
    return NextResponse.json({ success: false, error: "Failed to duplicate vendor." }, { status: 500 });
  }
}
