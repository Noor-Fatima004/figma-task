import PDFDocument from "pdfkit";

type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: Date | string;
  dueDate: Date | string;
  currency: string;
  customer?: { name: string; email: string; phone: string } | null;
  billingAddress?: Record<string, string> | null;
  shippingAddress?: Record<string, string> | null;
  items?: {
    name: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  payments?: {
    amount: number;
    method: string;
    transactionId?: string;
    paidAt: Date | string;
  }[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  shippingCharges?: number;
  grandTotal?: number;
  amountPaid?: number;
  balanceDue?: number;
  paymentStatus: string;
  notes?: string;
  terms?: string;
};

const money = (amount: number, currency: string) =>
  `${currency} ${amount.toFixed(2)}`;
const date = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

export function createInvoicePdf(invoice: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(24).fillColor("#172554").text("INVOICE");
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor("#334155");
    doc.text(`Invoice: ${invoice.invoiceNumber}`);
    doc.text(`Issued: ${date(invoice.issueDate)}    Due: ${date(invoice.dueDate)}`);
    doc.text(`Payment status: ${invoice.paymentStatus.replaceAll("_", " ")}`);
    doc.moveDown();
    doc.fontSize(12).fillColor("#0f172a").text("Bill to");
    doc.fontSize(10).fillColor("#475569");
    doc.text(invoice.customer?.name ?? "");
    doc.text(invoice.customer?.email ?? "");
    doc.text(invoice.customer?.phone ?? "");
    const addressText = (address: Record<string, string> | null | undefined) =>
      [
        address?.line1,
        address?.line2,
        address?.city,
        address?.state,
        address?.postalCode,
        address?.country,
      ]
        .filter(Boolean)
        .join(", ");
    doc.text(addressText(invoice.billingAddress));
    doc.moveDown();
    doc.fontSize(12).fillColor("#0f172a").text("Ship to");
    doc.fontSize(10).fillColor("#475569").text(
      invoice.shippingAddress?.name ?? ""
    );
    doc.text(addressText(invoice.shippingAddress));
    doc.moveDown();
    doc.fontSize(12).fillColor("#0f172a").text("Items");
    doc.moveDown(0.5);
    const columns = { name: 48, qty: 330, price: 380, total: 470 };
    const row = (name: string, qty: string, price: string, total: string) => {
      const y = doc.y;
      doc.fontSize(9).fillColor("#334155");
      doc.text(name, columns.name, y, { width: 270 });
      doc.text(qty, columns.qty, y, { width: 40, align: "right" });
      doc.text(price, columns.price, y, { width: 80, align: "right" });
      doc.text(total, columns.total, y, { width: 80, align: "right" });
      doc.moveDown(0.8);
    };
    doc.fontSize(9).fillColor("#64748b");
    const headingY = doc.y;
    doc.text("Description", columns.name, headingY, { width: 270 });
    doc.text("Qty", columns.qty, headingY, { width: 40, align: "right" });
    doc.text("Unit price", columns.price, headingY, { width: 80, align: "right" });
    doc.text("Line total", columns.total, headingY, { width: 80, align: "right" });
    doc.moveDown(0.8);
    doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#cbd5e1").stroke();
    doc.moveDown(0.5);
    for (const item of invoice.items ?? []) {
      row(
        item.sku ? `${item.name} (${item.sku})` : item.name,
        String(item.quantity),
        money(item.unitPrice, invoice.currency),
        money(item.lineTotal, invoice.currency)
      );
    }
    doc.moveDown();
    const totals = [
      ["Subtotal", invoice.subtotal ?? 0],
      ["Discount", -(invoice.discount ?? 0)],
      ["Tax / VAT", invoice.tax ?? 0],
      ["Shipping", invoice.shippingCharges ?? 0],
      ["Grand total", invoice.grandTotal ?? 0],
      ["Amount paid", invoice.amountPaid ?? 0],
      ["Balance due", invoice.balanceDue ?? 0],
    ] as const;
    for (const [label, amount] of totals) {
      const y = doc.y;
      doc.fontSize(label === "Grand total" ? 12 : 10)
        .fillColor("#0f172a")
        .text(label, 345, y, { width: 100 });
      doc.text(money(amount, invoice.currency), 445, y, {
        width: 100,
        align: "right",
      });
      doc.moveDown(0.8);
    }
    if (invoice.payments?.length) {
      doc.moveDown().fontSize(10).fillColor("#0f172a").text("Payment history");
      for (const payment of invoice.payments) {
        doc.fontSize(9).fillColor("#475569").text(
          `${date(payment.paidAt)} · ${payment.method} · ${money(payment.amount, invoice.currency)}${payment.transactionId ? ` · ${payment.transactionId}` : ""}`
        );
      }
    }
    if (invoice.notes) {
      doc.moveDown().fontSize(10).fillColor("#0f172a").text("Notes");
      doc.fontSize(9).fillColor("#475569").text(invoice.notes);
    }
    if (invoice.terms) {
      doc.moveDown().fontSize(10).fillColor("#0f172a").text("Terms");
      doc.fontSize(9).fillColor("#475569").text(invoice.terms);
    }
    doc.end();
  });
}
