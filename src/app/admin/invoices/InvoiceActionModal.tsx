"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import InvoiceDocument from "./InvoiceDocument";
import type { Invoice, InvoiceAction, InvoiceAddress, InvoiceItem, InvoiceStatus } from "./types";

type Activity = {
  _id: string;
  action: string;
  note: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
  performedBy: { name: string; email: string } | null;
};
type EditForm = {
  customer: Invoice["customer"];
  billingAddress: InvoiceAddress;
  shippingAddress: InvoiceAddress;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  discount: string;
  tax: string;
  shippingCharges: string;
  notes: string;
  terms: string;
};
const statuses: { value: InvoiceStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "refunded", label: "Refunded" },
  { value: "cancelled", label: "Cancelled" },
];
const addressKeys: (keyof InvoiceAddress)[] = [
  "name",
  "phone",
  "line1",
  "line2",
  "city",
  "state",
  "postalCode",
  "country",
];
const fieldClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-primary";
const buttonClass =
  "rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50";
const formatDate = (value: string) => new Date(value).toISOString().slice(0, 10);
const money = (amount: number, currency: string) =>
  `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function responseError(body: unknown, fallback: string) {
  return typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
    ? body.error
    : fallback;
}

export default function InvoiceActionModal({
  id,
  action,
  onClose,
  onDone,
  onActionChange,
}: {
  id: string;
  action: InvoiceAction;
  onClose: () => void;
  onDone: () => void;
  onActionChange: (action: InvoiceAction) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paidDeleteConfirmed, setPaidDeleteConfirmed] = useState(false);
  const [status, setStatus] = useState<InvoiceStatus>("unpaid");
  const [statusNote, setStatusNote] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [transactionId, setTransactionId] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [paymentNote, setPaymentNote] = useState("");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [edit, setEdit] = useState<EditForm | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/admin/invoices/${id}`, { cache: "no-store" });
        const body: unknown = await response.json();
        if (!response.ok) throw new Error(responseError(body, "Failed to load invoice."));
        if (!active) return;
        const data = (body as { data: Invoice }).data;
        setInvoice(data);
        setStatus(data.paymentStatus);
        setAmount(data.balanceDue.toFixed(2));
        setRecipient(data.customer.email);
        setSubject(`Invoice ${data.invoiceNumber}`);
        setMessage(`Hello ${data.customer.name},\n\nPlease find invoice ${data.invoiceNumber} attached.`);
        setEdit({
          customer: { ...data.customer },
          billingAddress: { ...data.billingAddress },
          shippingAddress: { ...data.shippingAddress },
          issueDate: formatDate(data.issueDate),
          dueDate: formatDate(data.dueDate),
          items: data.items.map((item) => ({ ...item })),
          discount: String(data.discount),
          tax: String(data.tax),
          shippingCharges: String(data.shippingCharges),
          notes: data.notes,
          terms: data.terms,
        });
        if (action === "activity") {
          const activityResponse = await fetch(`/api/admin/invoices/${id}/activity`, { cache: "no-store" });
          const activityBody: unknown = await activityResponse.json();
          if (!activityResponse.ok) {
            throw new Error(responseError(activityBody, "Failed to load activity history."));
          }
          setActivities((activityBody as { data: Activity[] }).data);
        }
      } catch (cause) {
        if (active) {
          const messageText = cause instanceof Error ? cause.message : "Failed to load invoice.";
          setError(messageText);
          toast.error(messageText);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [action, id]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.querySelector<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
    )?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
      if (event.key !== "Tab") return;
      const elements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
        )
      ).filter((element) => element.offsetParent !== null);
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, submitting, action, loading]);

  const request = async (url: string, methodName: string, body?: unknown) => {
    const response = await fetch(url, {
      method: methodName,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const result: unknown = await response.json();
    if (!response.ok) throw new Error(responseError(result, "Invoice action failed."));
    return result;
  };

  const downloadPdf = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/invoices/${id}/pdf`);
      if (!response.ok) {
        const body: unknown = await response.json();
        throw new Error(responseError(body, "PDF download failed."));
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${invoice?.invoiceNumber ?? "invoice"}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Invoice PDF downloaded.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "PDF download failed.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const finish = (messageText: string) => {
    toast.success(messageText);
    onDone();
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!edit) return;
    const editSchema = z.object({
      customer: z.object({
        name: z.string().trim().min(1, "Customer name is required.").max(120),
        email: z.string().trim().email().max(254),
        phone: z.string().trim().max(40),
      }),
      billingAddress: z.object(Object.fromEntries(addressKeys.map((key) => [key, z.string().max(200)]))),
      shippingAddress: z.object(Object.fromEntries(addressKeys.map((key) => [key, z.string().max(200)]))),
      issueDate: z.string().min(1),
      dueDate: z.string().min(1),
      items: z.array(z.object({
        name: z.string().trim().min(1).max(200),
        sku: z.string().max(100),
        product: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
        quantity: z.number().int().min(1),
        unitPrice: z.number().min(0),
      })).min(1),
      discount: z.number().min(0),
      tax: z.number().min(0),
      shippingCharges: z.number().min(0),
      notes: z.string().max(5000),
      terms: z.string().max(5000),
    }).refine((value) => value.dueDate >= value.issueDate, {
      message: "Due date must be on or after the issue date.",
      path: ["dueDate"],
    });
    const parsed = editSchema.safeParse({
      ...edit,
      discount: Number(edit.discount),
      tax: Number(edit.tax),
      shippingCharges: Number(edit.shippingCharges),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the invoice details.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await request(`/api/admin/invoices/${id}`, "PUT", parsed.data);
      finish("Invoice updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to update invoice.");
      toast.error(cause instanceof Error ? cause.message : "Failed to update invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitAction = async (event: FormEvent<HTMLFormElement>, url: string, methodName: string, body: unknown, success: string) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await request(url, methodName, body);
      finish(success);
    } catch (cause) {
      const messageText = cause instanceof Error ? cause.message : "Invoice action failed.";
      setError(messageText);
      toast.error(messageText);
    } finally {
      setSubmitting(false);
    }
  };

  const duplicate = async () => {
    setSubmitting(true);
    try {
      const body = await request(`/api/admin/invoices/${id}/duplicate`, "POST");
      const invoiceNumber = (body as { data: { invoiceNumber: string } }).data.invoiceNumber;
      toast.success(`Draft ${invoiceNumber} created.`);
      onDone();
    } catch (cause) {
      const messageText = cause instanceof Error ? cause.message : "Failed to duplicate invoice.";
      setError(messageText);
      toast.error(messageText);
    } finally {
      setSubmitting(false);
    }
  };

  const title: Record<InvoiceAction, string> = {
    view: "Invoice preview",
    edit: "Edit invoice",
    status: "Update payment status",
    payment: "Record payment",
    send: "Send invoice",
    activity: "Invoice activity",
    delete: "Delete invoice",
    duplicate: "Duplicate invoice",
  };
  const subtotal = edit
    ? edit.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    : 0;
  const total = edit
    ? Math.max(0, subtotal - Number(edit.discount || 0) + Number(edit.tax || 0) + Number(edit.shippingCharges || 0))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 lg:pl-[17rem]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-modal-title"
        className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl sm:max-h-[calc(100dvh-2rem)] ${
      action === "view" || action === "edit" ? "max-w-4xl" : "max-w-2xl"
    }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <h2 id="invoice-modal-title" className="font-semibold text-text">{title[action]}</h2>
          <button type="button" disabled={submitting} onClick={onClose} aria-label="Close dialog" className="rounded-md px-3 py-1.5 text-sm text-muted hover:bg-background disabled:opacity-50">Close</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {loading && <div className="animate-pulse space-y-3"><div className="h-5 w-1/3 rounded bg-background" /><div className="h-32 rounded bg-background" /></div>}
          {error && <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {!loading && invoice && action === "view" && (
            <>
              <InvoiceDocument invoice={invoice} />
              <div className="mt-4 flex flex-wrap justify-end gap-2 print:hidden">
                <button type="button" onClick={() => { window.print(); toast.success("Print dialog opened."); }} className="rounded-md border border-border px-4 py-2 text-sm">Print</button>
                <button type="button" disabled={submitting} onClick={() => void downloadPdf()} className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-50">Download PDF</button>
                <button type="button" onClick={() => onActionChange("send")} className="rounded-md border border-border px-4 py-2 text-sm">Send</button>
                <button type="button" onClick={() => onActionChange("edit")} className={buttonClass}>Edit</button>
                <button type="button" onClick={onClose} className={buttonClass}>Done</button>
              </div>
            </>
          )}
          {!loading && invoice && action === "edit" && edit && (
            <form className="space-y-5" onSubmit={saveEdit}>
              <section className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs text-muted">Customer name<input className={`${fieldClass} mt-1`} value={edit.customer.name} onChange={(e) => setEdit({ ...edit, customer: { ...edit.customer, name: e.target.value } })} required /></label>
                <label className="text-xs text-muted">Email<input type="email" className={`${fieldClass} mt-1`} value={edit.customer.email} onChange={(e) => setEdit({ ...edit, customer: { ...edit.customer, email: e.target.value } })} required /></label>
                <label className="text-xs text-muted">Phone<input className={`${fieldClass} mt-1`} value={edit.customer.phone} onChange={(e) => setEdit({ ...edit, customer: { ...edit.customer, phone: e.target.value } })} /></label>
              </section>
              {[["Billing address", "billingAddress"], ["Shipping address", "shippingAddress"]].map(([titleText, addressKey]) => {
                const key = addressKey as "billingAddress" | "shippingAddress";
                return <section key={key}><h3 className="mb-2 font-medium text-text">{titleText}</h3><div className="grid gap-2 sm:grid-cols-2">{addressKeys.map((field) => <label key={field} className="text-xs capitalize text-muted">{field}<input className={`${fieldClass} mt-1`} value={edit[key][field]} onChange={(e) => setEdit({ ...edit, [key]: { ...edit[key], [field]: e.target.value } })} /></label>)}</div></section>;
              })}
              <section className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-muted">Issue date<input type="date" className={`${fieldClass} mt-1`} value={edit.issueDate} onChange={(e) => setEdit({ ...edit, issueDate: e.target.value })} required /></label>
                <label className="text-xs text-muted">Due date<input type="date" className={`${fieldClass} mt-1`} value={edit.dueDate} onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })} required /></label>
              </section>
              <section>
                <div className="mb-2 flex items-center justify-between"><h3 className="font-medium text-text">Line items</h3><button type="button" className="text-sm font-medium text-primary" onClick={() => setEdit({ ...edit, items: [...edit.items, { name: "", sku: "", quantity: 1, unitPrice: 0, lineTotal: 0 }] })}>Add item</button></div>
                <div className="space-y-2">{edit.items.map((item, index) => <div key={index} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]"><input aria-label="Item name" placeholder="Item name" className={fieldClass} value={item.name} onChange={(e) => setEdit({ ...edit, items: edit.items.map((line, i) => i === index ? { ...line, name: e.target.value } : line) })} required /><input aria-label="Quantity" type="number" min="1" className={fieldClass} value={item.quantity} onChange={(e) => setEdit({ ...edit, items: edit.items.map((line, i) => i === index ? { ...line, quantity: Number(e.target.value) } : line) })} /><input aria-label="Unit price" type="number" min="0" step="0.01" className={fieldClass} value={item.unitPrice} onChange={(e) => setEdit({ ...edit, items: edit.items.map((line, i) => i === index ? { ...line, unitPrice: Number(e.target.value) } : line) })} /><button type="button" aria-label={`Remove item ${index + 1}`} disabled={edit.items.length === 1} onClick={() => setEdit({ ...edit, items: edit.items.filter((_, i) => i !== index) })} className="rounded-md px-3 text-red-600 disabled:opacity-40">Remove</button></div>)}</div>
              </section>
              <section className="grid gap-3 sm:grid-cols-3">
                {(["discount", "tax", "shippingCharges"] as const).map((key) => <label key={key} className="text-xs capitalize text-muted">{key === "shippingCharges" ? "Shipping" : key}<input type="number" min="0" step="0.01" className={`${fieldClass} mt-1`} value={edit[key]} onChange={(e) => setEdit({ ...edit, [key]: e.target.value })} /></label>)}
              </section>
              <div className="space-y-1 text-right text-sm"><p className="text-muted">Subtotal: {money(subtotal, invoice.currency)}</p><p className="font-semibold text-text">Updated total: {money(total, invoice.currency)}</p></div>
              <section className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted">Notes<textarea className={`${fieldClass} mt-1`} rows={3} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label><label className="text-xs text-muted">Terms<textarea className={`${fieldClass} mt-1`} rows={3} value={edit.terms} onChange={(e) => setEdit({ ...edit, terms: e.target.value })} /></label></section>
              <div className="flex justify-end gap-2"><button type="button" disabled={submitting} onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button><button type="submit" disabled={submitting} className={buttonClass}>{submitting ? "Saving..." : "Save changes"}</button></div>
            </form>
          )}
          {!loading && invoice && action === "status" && (
            <form onSubmit={(event) => void submitAction(event, `/api/admin/invoices/${id}/status`, "PATCH", { paymentStatus: status, note: statusNote }, "Invoice status updated.")} className="space-y-4">
              <label className="block text-sm text-muted">Payment status<select className={`${fieldClass} mt-1`} value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="block text-sm text-muted">Note<textarea className={`${fieldClass} mt-1`} rows={3} value={statusNote} maxLength={1000} onChange={(e) => setStatusNote(e.target.value)} /></label>
              <div className="flex justify-end"><button type="submit" disabled={submitting} className={buttonClass}>{submitting ? "Updating..." : "Update status"}</button></div>
            </form>
          )}
          {!loading && invoice && action === "payment" && (
            <form onSubmit={(event) => {
              const schema = z.object({ amount: z.number().positive().max(invoice.balanceDue, "Payment cannot exceed the balance due."), method: z.string().min(1), transactionId: z.string().max(200), paidAt: z.string().min(1), note: z.string().max(500) });
              const values = schema.safeParse({ amount: Number(amount), method, transactionId, paidAt, note: paymentNote });
              if (!values.success) { event.preventDefault(); toast.error(values.error.issues[0]?.message ?? "Invalid payment."); return; }
              void submitAction(event, `/api/admin/invoices/${id}/payment`, "POST", { ...values.data, paidAt: new Date(`${paidAt}T12:00:00`).toISOString() }, "Payment recorded.");
            }} className="space-y-4">
              <p className="rounded-md bg-background p-3 text-sm">Balance due: <strong>{money(invoice.balanceDue, invoice.currency)}</strong></p>
              <label className="block text-sm text-muted">Amount<input type="number" min="0.01" max={invoice.balanceDue} step="0.01" required className={`${fieldClass} mt-1`} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
              <label className="block text-sm text-muted">Payment method<select className={`${fieldClass} mt-1`} value={method} onChange={(e) => setMethod(e.target.value)}><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="cod">Cash on delivery</option><option value="other">Other</option></select></label>
              <label className="block text-sm text-muted">Transaction ID<input className={`${fieldClass} mt-1`} value={transactionId} maxLength={200} onChange={(e) => setTransactionId(e.target.value)} /></label>
              <label className="block text-sm text-muted">Payment date<input type="date" required className={`${fieldClass} mt-1`} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></label>
              <label className="block text-sm text-muted">Note<textarea className={`${fieldClass} mt-1`} rows={2} value={paymentNote} maxLength={500} onChange={(e) => setPaymentNote(e.target.value)} /></label>
              <div className="flex justify-end"><button type="submit" disabled={submitting || invoice.balanceDue <= 0} className={buttonClass}>{submitting ? "Recording..." : "Record payment"}</button></div>
            </form>
          )}
          {!loading && invoice && action === "send" && (
            <form onSubmit={(event) => {
              const schema = z.object({ to: z.string().email(), subject: z.string().trim().min(1).max(200), message: z.string().max(5000) });
              const parsed = schema.safeParse({ to: recipient, subject, message });
              if (!parsed.success) { event.preventDefault(); toast.error(parsed.error.issues[0]?.message ?? "Invalid email details."); return; }
              void submitAction(event, `/api/admin/invoices/${id}/send`, "POST", parsed.data, "Invoice sent.");
            }} className="space-y-4">
              <label className="block text-sm text-muted">Recipient email<input type="email" required className={`${fieldClass} mt-1`} value={recipient} onChange={(e) => setRecipient(e.target.value)} /></label>
              <label className="block text-sm text-muted">Subject<input required maxLength={200} className={`${fieldClass} mt-1`} value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
              <label className="block text-sm text-muted">Message<textarea rows={6} maxLength={5000} className={`${fieldClass} mt-1`} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
              <p className="text-xs text-muted">A PDF copy of {invoice.invoiceNumber} will be attached.</p>
              <div className="flex justify-end"><button type="submit" disabled={submitting} className={buttonClass}>{submitting ? "Sending..." : "Send invoice"}</button></div>
            </form>
          )}
          {!loading && invoice && action === "activity" && (
            <ol className="space-y-4">
              {activities.length === 0 && <li className="text-sm text-muted">No activity has been recorded.</li>}
              {activities.map((entry) => <li key={entry._id} className="relative border-l-2 border-primary/20 pb-2 pl-4"><span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" /><p className="font-medium capitalize text-text">{entry.action.replaceAll("_", " ")}</p><p className="text-xs text-muted">{new Date(entry.createdAt).toLocaleString()} · {entry.performedBy?.name ?? "System"}</p>{entry.note && <p className="mt-1 text-sm">{entry.note}</p>}{Boolean(entry.oldValue || entry.newValue) && <details className="mt-1 text-xs"><summary className="cursor-pointer">Change details</summary><pre className="mt-2 max-h-40 overflow-auto rounded bg-background p-2">{JSON.stringify({ old: entry.oldValue, new: entry.newValue }, null, 2)}</pre></details>}</li>)}
            </ol>
          )}
          {!loading && invoice && action === "delete" && (
            <div className="space-y-4">
              <p className="text-sm text-text">Delete <strong>{invoice.invoiceNumber}</strong>? The invoice will be hidden from the active list but retained in the system.</p>
              {invoice.paymentStatus === "paid" && <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><strong>This invoice is paid.</strong> Deleting it may affect accounting records. Confirm that you want to continue.<label className="mt-3 flex items-start gap-2"><input type="checkbox" checked={paidDeleteConfirmed} onChange={(e) => setPaidDeleteConfirmed(e.target.checked)} /><span>I understand and want to soft-delete this paid invoice.</span></label></div>}
              <div className="flex justify-end gap-2"><button type="button" onClick={onClose} disabled={submitting} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button><button type="button" disabled={submitting || (invoice.paymentStatus === "paid" && !paidDeleteConfirmed)} onClick={() => {
                setSubmitting(true);
                void request(`/api/admin/invoices/${id}`, "DELETE").then(() => finish("Invoice deleted.")).catch((cause: unknown) => { const messageText = cause instanceof Error ? cause.message : "Failed to delete invoice."; setError(messageText); toast.error(messageText); }).finally(() => setSubmitting(false));
              }} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{submitting ? "Deleting..." : "Delete invoice"}</button></div>
            </div>
          )}
          {!loading && invoice && action === "duplicate" && (
            <div className="space-y-4">
              <p className="text-sm">Create a new draft based on <strong>{invoice.invoiceNumber}</strong>? The copy will be unlinked from the source order to preserve one invoice per order.</p>
              <div className="flex justify-end gap-2"><button type="button" disabled={submitting} onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button><button type="button" disabled={submitting} onClick={() => void duplicate()} className={buttonClass}>{submitting ? "Creating..." : "Create draft copy"}</button></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
