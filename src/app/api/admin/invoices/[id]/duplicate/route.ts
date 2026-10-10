import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import Invoice from "@/app/models/Invoice";
import connectDB from "@/lib/mongodb";
import { nextSequence } from "@/app/models/Counter";
import { logInvoiceActivity } from "@/lib/invoices";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAdminActorId } from "@/lib/adminActor";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Context) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid invoice id." }, { status: 400 });
  }
  try {
    await connectDB();
    const source = await Invoice.findOne({ _id: id, isDeleted: false });
    if (!source) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }
    const year = new Date().getFullYear();
    const sequence = await nextSequence(`invoice-${year}`);
    const actor = await getAdminActorId();
    const duplicate = await Invoice.create({
      invoiceNumber: `INV-${year}-${String(sequence).padStart(4, "0")}`,
      order: null,
      orderNumberSnapshot: "",
      customer: source.customer ?? { name: "", email: "", phone: "" },
      billingAddress: source.billingAddress ?? {},
      shippingAddress: source.shippingAddress ?? {},
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: source.items.map((item) => ({ ...item })),
      discount: source.discount,
      tax: source.tax,
      shippingCharges: source.shippingCharges,
      currency: source.currency,
      paymentStatus: "draft",
      paymentMethod: source.paymentMethod,
      notes: source.notes,
      terms: source.terms,
      createdBy: actor,
      updatedBy: actor,
    });
    await logInvoiceActivity(duplicate._id, "duplicated", actor, {
      newValue: { copiedFrom: source.invoiceNumber },
      note: "Created as an unlinked draft copy to preserve one invoice per order",
    });
    return NextResponse.json(
      { success: true, data: { _id: duplicate._id.toString(), invoiceNumber: duplicate.invoiceNumber } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to duplicate invoice:", error);
    return NextResponse.json({ success: false, error: "Failed to duplicate invoice." }, { status: 500 });
  }
}
