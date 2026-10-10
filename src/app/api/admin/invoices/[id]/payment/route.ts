import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Invoice from "@/app/models/Invoice";
import connectDB from "@/lib/mongodb";
import { logInvoiceActivity } from "@/lib/invoices";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAdminActorId } from "@/lib/adminActor";

type Context = { params: Promise<{ id: string }> };
const paymentSchema = z.object({
  amount: z.number().positive().max(1_000_000_000),
  method: z.string().trim().min(1).max(100),
  transactionId: z.string().trim().max(200).default(""),
  paidAt: z.coerce.date(),
  note: z.string().trim().max(500).default(""),
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
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid payment." },
      { status: 400 }
    );
  }
  try {
    await connectDB();
    const session = await Invoice.startSession();
    let response: { amountPaid: number; balanceDue: number; paymentStatus: string } | null = null;
    try {
      await session.withTransaction(async () => {
        const invoice = await Invoice.findOne({ _id: id, isDeleted: false }).session(session);
        if (!invoice) throw new Error("INVOICE_NOT_FOUND");
        if (parsed.data.amount > invoice.balanceDue) throw new Error("PAYMENT_EXCEEDS_BALANCE");
        const oldValue = {
          amountPaid: invoice.amountPaid,
          balanceDue: invoice.balanceDue,
          paymentStatus: invoice.paymentStatus,
        };
        const actor = await getAdminActorId();
        invoice.payments.push({ ...parsed.data, recordedBy: actor });
        invoice.paymentMethod = parsed.data.method;
        if (parsed.data.transactionId) invoice.transactionId = parsed.data.transactionId;
        invoice.updatedBy = actor;
        await invoice.save({ session });
        await logInvoiceActivity(
          invoice._id,
          "payment_recorded",
          actor,
          {
            oldValue,
            newValue: {
              amountPaid: invoice.amountPaid,
              balanceDue: invoice.balanceDue,
              paymentStatus: invoice.paymentStatus,
              payment: parsed.data,
            },
          },
          session
        );
        response = {
          amountPaid: invoice.amountPaid,
          balanceDue: invoice.balanceDue,
          paymentStatus: invoice.paymentStatus,
        };
      });
    } finally {
      await session.endSession();
    }
    if (!response) throw new Error("Payment transaction did not complete.");
    return NextResponse.json({ success: true, data: response, message: "Payment recorded." });
  } catch (error) {
    if (error instanceof Error && error.message === "INVOICE_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "PAYMENT_EXCEEDS_BALANCE") {
      return NextResponse.json({ success: false, error: "Payment cannot exceed the balance due." }, { status: 409 });
    }
    console.error("Failed to record invoice payment:", error);
    return NextResponse.json({ success: false, error: "Failed to record payment." }, { status: 500 });
  }
}
