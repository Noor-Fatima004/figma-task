import nodemailer from "nodemailer";
import { createInvoicePdf } from "@/lib/invoicePdf";

export async function sendInvoiceEmail(
  invoice: Parameters<typeof createInvoicePdf>[0],
  options: { to: string; subject: string; message: string }
) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } =
    process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
    throw new Error(
      "Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM."
    );
  }
  const port = Number(SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  const pdf = await createInvoicePdf(invoice);
  await transporter.sendMail({
    from: SMTP_FROM,
    to: options.to,
    subject: options.subject,
    text: options.message,
    attachments: [
      {
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdf,
        contentType: "application/pdf",
      },
    ],
  });
}
