import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import Invoice from "@/app/models/Invoice";
import connectDB from "@/lib/mongodb";
import { createInvoicePdf } from "@/lib/invoicePdf";
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
    const invoice = await Invoice.findOne({ _id: id, isDeleted: false }).lean();
    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }
    const pdf = await createInvoicePdf(invoice);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate invoice PDF:", error);
    return NextResponse.json({ success: false, error: "Failed to generate invoice PDF." }, { status: 500 });
  }
}
