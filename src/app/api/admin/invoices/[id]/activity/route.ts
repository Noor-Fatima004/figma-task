import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import InvoiceActivityLog from "@/app/models/InvoiceActivityLog";
import Invoice from "@/app/models/Invoice";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid invoice id." }, { status: 400 });
  }
  try {
    await connectDB();
    const exists = await Invoice.exists({ _id: id });
    if (!exists) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }
    const items = await InvoiceActivityLog.find({ invoice: id })
      .select("action performedBy oldValue newValue note createdAt")
      .populate({ path: "performedBy", select: "name email" })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return NextResponse.json({
      success: true,
      data: items.map((item) => ({
        ...item,
        _id: item._id.toString(),
        invoice: item.invoice.toString(),
        performedBy:
          item.performedBy && typeof item.performedBy === "object"
            ? {
                name: item.performedBy.name,
                email: item.performedBy.email,
              }
            : null,
      })),
    });
  } catch (error) {
    console.error("Failed to load invoice activity:", error);
    return NextResponse.json({ success: false, error: "Failed to load activity." }, { status: 500 });
  }
}
