import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Invoice from "@/app/models/Invoice";
import connectDB from "@/lib/mongodb";
import { sendInvoiceEmail } from "@/lib/invoiceEmail";
import { logInvoiceActivity } from "@/lib/invoices";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAdminActorId } from "@/lib/adminActor";

type Context = { params: Promise<{ id: string }> };
const sendSchema = z.object({
  to: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().max(5000).default("Please find your invoice attached."),
});

export async function POST(request: NextRequest, { params }: Context) {
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
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid email details." },
      { status: 400 }
    );
  }
  try {
    await connectDB();
    const invoice = await Invoice.findOne({ _id: id, isDeleted: false }).lean();
    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }
    await sendInvoiceEmail(invoice, parsed.data);
    const sentAt = new Date();
    const actor = await getAdminActorId();
    await Invoice.updateOne(
      { _id: invoice._id },
      { $set: { sentAt, lastSentTo: parsed.data.to, updatedBy: actor } }
    );
    await logInvoiceActivity(invoice._id, "sent", actor, {
      newValue: { to: parsed.data.to, sentAt },
    });
    return NextResponse.json({ success: true, data: { sentAt }, message: "Invoice sent." });
  } catch (error) {
    console.error("Failed to send invoice:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send invoice.",
      },
      { status: 500 }
    );
  }
}
