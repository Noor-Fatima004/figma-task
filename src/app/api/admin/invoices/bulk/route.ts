import { Types } from "mongoose";
import { ZipArchive } from "archiver";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Invoice from "@/app/models/Invoice";
import connectDB from "@/lib/mongodb";
import { createInvoicePdf } from "@/lib/invoicePdf";
import { sendInvoiceEmail } from "@/lib/invoiceEmail";
import { logInvoiceActivity } from "@/lib/invoices";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAdminActorId } from "@/lib/adminActor";

const bulkSchema = z.object({
  action: z.enum(["delete", "mark_paid", "download_pdf", "send_email"]),
  ids: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(100),
});

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid bulk action." }, { status: 400 });
  }
  try {
    await connectDB();
    const actor = await getAdminActorId();
    const invoices = await Invoice.find({
      _id: { $in: parsed.data.ids.map((id) => new Types.ObjectId(id)) },
      isDeleted: false,
    }).limit(100);
    if (invoices.length !== parsed.data.ids.length) {
      return NextResponse.json({ success: false, error: "One or more invoices were not found." }, { status: 404 });
    }
    if (parsed.data.action === "download_pdf") {
      const archive = new ZipArchive({ zlib: { level: 6 } });
      const chunks: Buffer[] = [];
      const zip = new Promise<Buffer>((resolve, reject) => {
        archive.on("data", (chunk: Buffer) => chunks.push(chunk));
        archive.on("error", reject);
        archive.on("end", () => resolve(Buffer.concat(chunks)));
      });
      for (const invoice of invoices) {
        archive.append(await createInvoicePdf(invoice.toObject()), {
          name: `${invoice.invoiceNumber}.pdf`,
        });
      }
      await archive.finalize();
      const output = await zip;
      return new NextResponse(new Uint8Array(output), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="invoices.zip"',
          "Cache-Control": "no-store",
        },
      });
    }
    if (parsed.data.action === "send_email") {
      const results = await Promise.allSettled(
        invoices.map(async (invoice) => {
          await sendInvoiceEmail(invoice.toObject(), {
            to: invoice.customer?.email ?? "",
            subject: `Invoice ${invoice.invoiceNumber}`,
            message: `Please find invoice ${invoice.invoiceNumber} attached.`,
          });
          invoice.sentAt = new Date();
          invoice.lastSentTo = invoice.customer?.email ?? "";
          invoice.updatedBy = actor;
          await invoice.save();
          await logInvoiceActivity(invoice._id, "sent", actor, {
            newValue: { to: invoice.customer?.email ?? "", sentAt: invoice.sentAt },
          });
        })
      );
      const failed = results.filter((result) => result.status === "rejected").length;
      return NextResponse.json({
        success: failed === 0,
        data: { sent: results.length - failed, failed },
        ...(failed ? { error: `${failed} invoice email(s) could not be sent.` } : {}),
      }, { status: failed ? 502 : 200 });
    }
    if (parsed.data.action === "delete") {
      const now = new Date();
      await Invoice.updateMany(
        { _id: { $in: invoices.map((invoice) => invoice._id) } },
        { $set: { isDeleted: true, deletedAt: now, deletedBy: actor, updatedBy: actor } }
      );
      await Promise.all(
        invoices.map((invoice) =>
          logInvoiceActivity(invoice._id, "deleted", actor, {
            newValue: { isDeleted: true },
            note: "Bulk soft delete",
          })
        )
      );
    } else {
      const session = await Invoice.startSession();
      try {
        await session.withTransaction(async () => {
          for (const invoice of invoices) {
            const current = await Invoice.findOne({
              _id: invoice._id,
              isDeleted: false,
            }).session(session);
            if (!current) continue;
            const oldStatus = current.paymentStatus;
            const oldPayment = {
              amountPaid: current.amountPaid,
              balanceDue: current.balanceDue,
            };
            const paymentRecorded = current.balanceDue > 0;
            if (current.balanceDue > 0) {
              current.payments.push({
                amount: current.balanceDue,
                method: current.paymentMethod || "manual",
                transactionId: current.transactionId,
                paidAt: new Date(),
                note: "Bulk marked paid",
                recordedBy: actor,
              });
            }
            current.updatedBy = actor;
            await current.save({ session });
            if (paymentRecorded) {
              await logInvoiceActivity(
                current._id,
                "payment_recorded",
                actor,
                {
                  oldValue: oldPayment,
                  newValue: {
                    amountPaid: current.amountPaid,
                    balanceDue: current.balanceDue,
                    amount: oldPayment.balanceDue,
                  },
                  note: "Bulk marked paid",
                },
                session
              );
            }
            await logInvoiceActivity(
              current._id,
              "status_changed",
              actor,
              { oldValue: oldStatus, newValue: current.paymentStatus, note: "Bulk marked paid" },
              session
            );
          }
        });
      } finally {
        await session.endSession();
      }
    }
    return NextResponse.json({
      success: true,
      data: { count: invoices.length },
      message: `Bulk ${parsed.data.action.replaceAll("_", " ")} completed.`,
    });
  } catch (error) {
    console.error("Failed to execute invoice bulk action:", error);
    return NextResponse.json({ success: false, error: "Bulk action failed." }, { status: 500 });
  }
}
