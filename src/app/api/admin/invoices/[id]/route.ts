import { isValidObjectId, Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Invoice from "@/app/models/Invoice";
import connectDB from "@/lib/mongodb";
import {
  InvoiceStatusError,
  logInvoiceActivity,
  markOverdueInvoices,
  updateInvoicePaymentStatus,
} from "@/lib/invoices";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAdminActorId } from "@/lib/adminActor";

type Context = { params: Promise<{ id: string }> };
const errorResponse = (message: string, status: number) =>
  NextResponse.json({ success: false, error: message }, { status });

const addressSchema = z.object({
  name: z.string().trim().max(120).default(""),
  phone: z.string().trim().max(40).default(""),
  line1: z.string().trim().max(200).default(""),
  line2: z.string().trim().max(200).default(""),
  city: z.string().trim().max(100).default(""),
  state: z.string().trim().max(100).default(""),
  postalCode: z.string().trim().max(30).default(""),
  country: z.string().trim().max(100).default(""),
});
const editSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(40).default(""),
  }),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        sku: z.string().trim().max(100).default(""),
        product: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
        quantity: z.number().int().min(1).max(1_000_000),
        unitPrice: z.number().min(0).max(1_000_000_000),
      })
    )
    .min(1)
    .max(500),
  discount: z.number().min(0).max(1_000_000_000),
  tax: z.number().min(0).max(1_000_000_000),
  shippingCharges: z.number().min(0).max(1_000_000_000),
  notes: z.string().trim().max(5000),
  terms: z.string().trim().max(5000),
}).refine((value) => value.dueDate >= value.issueDate, {
  message: "Due date must be on or after the issue date.",
  path: ["dueDate"],
});

export async function GET(_request: NextRequest, { params }: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse("Invalid invoice id.", 400);
  try {
    await connectDB();
    await markOverdueInvoices(id);
    const invoice = await Invoice.findOne({ _id: id, isDeleted: false })
      .populate<{ order: { _id: Types.ObjectId; orderNumber: string } | null }>({
        path: "order",
        select: "orderNumber",
      })
      .lean();
    if (!invoice) return errorResponse("Invoice not found.", 404);
    return NextResponse.json({
      success: true,
      data: {
        ...invoice,
        _id: invoice._id.toString(),
        order: invoice.order
          ? { _id: invoice.order._id.toString(), orderNumber: invoice.order.orderNumber }
          : null,
        payments: invoice.payments.map((payment) => ({
          ...payment,
          recordedBy: payment.recordedBy?.toString() ?? null,
        })),
      },
    });
  } catch (error) {
    console.error("Failed to load invoice:", error);
    return errorResponse("Failed to load invoice.", 500);
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse("Invalid invoice id.", 400);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid invoice data.", 400);
  }
  try {
    await connectDB();
    const invoice = await Invoice.findOne({ _id: id, isDeleted: false });
    if (!invoice) return errorResponse("Invoice not found.", 404);
    const oldValue = {
      customer: invoice.customer,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      items: invoice.items.map((item) => item.toObject()),
      discount: invoice.discount,
      tax: invoice.tax,
      shippingCharges: invoice.shippingCharges,
    };
    const actor = await getAdminActorId();
    invoice.updatedBy = actor;
    invoice.set("customer", { ...invoice.customer, ...parsed.data.customer });
    invoice.set({
      billingAddress: parsed.data.billingAddress,
      shippingAddress: parsed.data.shippingAddress,
      issueDate: parsed.data.issueDate,
      dueDate: parsed.data.dueDate,
      items: parsed.data.items.map((item) => ({
        ...item,
        product: item.product ?? null,
        lineTotal: item.quantity * item.unitPrice,
      })),
      discount: parsed.data.discount,
      tax: parsed.data.tax,
      shippingCharges: parsed.data.shippingCharges,
      notes: parsed.data.notes,
      terms: parsed.data.terms,
    });
    await invoice.save();
    await logInvoiceActivity(
      invoice._id,
      "updated",
      actor,
      { oldValue, newValue: parsed.data }
    );
    return NextResponse.json({ success: true, data: { _id: invoice._id.toString() }, message: "Invoice updated." });
  } catch (error) {
    console.error("Failed to update invoice:", error);
    return errorResponse("Failed to update invoice.", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse("Invalid invoice id.", 400);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }
  const parsed = z
    .object({
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
    })
    .safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid status.", 400);
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
    return NextResponse.json({ success: true, data, message: "Invoice status updated." });
  } catch (error) {
    if (error instanceof InvoiceStatusError) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error("Failed to update invoice status:", error);
    return errorResponse("Failed to update invoice status.", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  const { id } = await params;
  if (!isValidObjectId(id)) return errorResponse("Invalid invoice id.", 400);
  try {
    await connectDB();
    const invoice = await Invoice.findOne({ _id: id, isDeleted: false });
    if (!invoice) return errorResponse("Invoice not found.", 404);
    invoice.isDeleted = true;
    invoice.deletedAt = new Date();
    const actor = await getAdminActorId();
    invoice.deletedBy = actor;
    invoice.updatedBy = actor;
    await invoice.save();
    await logInvoiceActivity(invoice._id, "deleted", actor, {
      newValue: { isDeleted: true },
      note: "Invoice soft-deleted",
    });
    return NextResponse.json({ success: true, message: "Invoice deleted." });
  } catch (error) {
    console.error("Failed to delete invoice:", error);
    return errorResponse("Failed to delete invoice.", 500);
  }
}
