import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/mongodb";
import {
  InvoiceStatusError,
  updateInvoicePaymentStatus,
} from "@/lib/invoices";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAdminActorId } from "@/lib/adminActor";

type Context = { params: Promise<{ id: string }> };
const statusSchema = z.object({
  paymentStatus: z.enum([
    "draft",
    "unpaid",
    "partially_paid",
    "paid",
    "overdue",
    "refunded",
    "cancelled",
  ]),
  note: z.string().trim().max(1000).default(""),
});

export async function PATCH(request: NextRequest, { params }: Context) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid invoice id." }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid status." }, { status: 400 });
  }
  try {
    await connectDB();
    const actor = await getAdminActorId();
    const data = await updateInvoicePaymentStatus(
      id,
      parsed.data.paymentStatus,
      parsed.data.note,
      actor
    );
    return NextResponse.json({
      success: true,
      data,
      message: "Invoice status updated.",
    });
  } catch (error) {
    if (error instanceof InvoiceStatusError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("Failed to update invoice status:", error);
    return NextResponse.json({ success: false, error: "Failed to update invoice status." }, { status: 500 });
  }
}
