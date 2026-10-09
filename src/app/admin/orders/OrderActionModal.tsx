"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FaTimes } from "react-icons/fa";
import { z } from "zod";

type Action = "edit" | "payments" | "payment" | "delete";
const orderDataSchema = z.object({
  reference: z.string(),
  paymentStatus: z.enum(["unpaid", "paid", "refunded"]),
  paymentMethod: z.string(),
  customer: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  shippingAddress: z.object({
    name: z.string().default(""),
    phone: z.string().default(""),
    line1: z.string(),
    line2: z.string().default(""),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string(),
  }),
  total: z.number(),
  paid: z.number(),
  due: z.number(),
});
type OrderData = z.output<typeof orderDataSchema>;
type FormValues = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressName: string;
  addressPhone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const emptyForm: FormValues = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  addressName: "",
  addressPhone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const titles: Record<Action, string> = {
  edit: "Edit Order",
  payments: "Payment Details",
  payment: "Create Payment",
  delete: "Delete Order",
};
const money = (value: number) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function responseError(value: unknown, fallback: string) {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}

export default function OrderActionModal({
  id,
  action,
  onClose,
  onUpdated,
  onDeleted,
}: {
  id: string;
  action: Action;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [data, setData] = useState<OrderData | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/admin/orders/${id}`, {
          cache: "no-store",
        });
        const body: unknown = await response.json();
        if (!response.ok) {
          throw new Error(responseError(body, "Failed to load order."));
        }
        const parsed = orderDataSchema.safeParse(body);
        if (!parsed.success) {
          throw new Error("Invalid order details returned by the API.");
        }
        const order = parsed.data;
        if (!active) return;
        setData(order);
        setForm({
          customerName: order.customer.name,
          customerEmail: order.customer.email,
          customerPhone: order.customer.phone,
          addressName: order.shippingAddress.name,
          addressPhone: order.shippingAddress.phone,
          line1: order.shippingAddress.line1,
          line2: order.shippingAddress.line2 ?? "",
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          postalCode: order.shippingAddress.postalCode,
          country: order.shippingAddress.country,
        });
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "Failed to load order."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  const update = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: form.customerName,
            email: form.customerEmail,
            phone: form.customerPhone,
          },
          shippingAddress: {
            name: form.addressName,
            phone: form.addressPhone,
            line1: form.line1,
            line2: form.line2,
            city: form.city,
            state: form.state,
            postalCode: form.postalCode,
            country: form.country,
          },
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(responseError(body, "Failed to update order."));
      }
      onUpdated();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to update order."
      );
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "paid" }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(responseError(body, "Failed to record payment."));
      }
      onUpdated();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to record payment."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteOrder = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: "DELETE",
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(responseError(body, "Failed to delete order."));
      }
      onDeleted();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to delete order."
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";
  const field = (key: keyof FormValues, label: string, type = "text") => (
    <label key={key} className="block space-y-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <input
        required={key !== "line2"}
        type={type}
        value={form[key]}
        onChange={(event) =>
          setForm((current) => ({ ...current, [key]: event.target.value }))
        }
        className={inputClass}
      />
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 lg:pl-[17rem]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-action-title"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl sm:max-h-[calc(100dvh-2rem)]"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2
              id="order-action-title"
              className="truncate text-sm font-semibold text-text sm:text-base"
            >
              {titles[action]}
            </h2>
            {data && (
              <p className="mt-0.5 truncate text-xs text-muted">Order #{data.reference}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            disabled={saving}
            onClick={onClose}
            className="shrink-0 rounded-md p-2 text-muted hover:bg-background hover:text-text disabled:opacity-50"
          >
            <FaTimes />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:p-5 [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted">
              Loading order...
            </p>
          ) : error && !data ? (
            <p role="alert" className="py-8 text-center text-sm text-red-600">
              {error}
            </p>
          ) : data && action === "edit" ? (
            <form id="edit-order-form" onSubmit={update} className="space-y-5">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-text">
                  Customer
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {field("customerName", "Name")}
                  {field("customerEmail", "Email", "email")}
                  {field("customerPhone", "Phone", "tel")}
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-text">
                  Shipping address
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {field("addressName", "Recipient name")}
                  {field("addressPhone", "Recipient phone", "tel")}
                  {field("line1", "Address")}
                  {field("line2", "Address line 2")}
                  {field("city", "City")}
                  {field("state", "State / province")}
                  {field("postalCode", "Postal code")}
                  {field("country", "Country")}
                </div>
              </div>
            </form>
          ) : data && action === "payments" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Payment status", data.paymentStatus],
                  ["Payment method", data.paymentMethod.toUpperCase()],
                  ["Order total", money(data.total)],
                  ["Paid", money(data.paid)],
                  ["Due", money(data.due)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <p className="text-xs text-muted">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-text">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted">
                This order stores payment status and totals only; individual
                payment transactions are not available.
              </p>
            </div>
          ) : data && action === "payment" ? (
            <div className="space-y-4">
              <p className="text-sm text-text">
                Record full payment of{" "}
                <strong>{money(data.due)}</strong> for this order.
              </p>
              <p className="text-xs text-muted">
                The current order data supports a paid/unpaid status, not
                partial payments or transaction records.
              </p>
              <div className="rounded-lg border border-border bg-background p-3 text-sm">
                <span className="text-muted">Payment method: </span>
                <span className="font-medium text-text">
                  {data.paymentMethod.toUpperCase()}
                </span>
              </div>
              {data.paymentStatus !== "unpaid" && (
                <p className="text-sm text-muted">
                  This order does not have an outstanding payment.
                </p>
              )}
            </div>
          ) : data && action === "delete" ? (
            <p className="text-sm text-text">
              Delete order <strong>#{data.reference}</strong>? Pending stock
              reservations will be released. Shipped, delivered, and paid
              orders cannot be deleted.
            </p>
          ) : null}
          {error && data && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        {!loading && data && (
          <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-end sm:px-5 sm:py-4">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="w-full rounded-md border border-border px-4 py-2 text-xs font-semibold text-text hover:bg-background disabled:opacity-50 sm:w-auto"
            >
              Cancel
            </button>
            {action === "edit" && (
              <button
                type="submit"
                form="edit-order-form"
                disabled={saving}
                className="w-full rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50 sm:w-auto"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            )}
            {action === "payment" && data.paymentStatus === "unpaid" && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void markPaid()}
                className="w-full rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50 sm:w-auto"
              >
                {saving ? "Recording..." : "Record full payment"}
              </button>
            )}
            {action === "delete" && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void deleteOrder()}
                className="w-full rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto"
              >
                {saving ? "Deleting..." : "Delete order"}
              </button>
            )}
          </footer>
        )}
      </section>
    </div>
  );
}