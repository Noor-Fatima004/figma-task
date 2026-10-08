"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FaPlus, FaTrash } from "react-icons/fa";
import FormSelect from "@/app/components/FormSelect";
import {
  fetchJson,
  loadWarehouseOptions,
  readItems,
  reasonLabels,
  type WarehouseOption,
} from "../shared";

type Mode = "in" | "out" | "set";
type ProductOption = {
  _id: string;
  name: string;
  sku: string;
  variants: { variations: string[]; label: string }[];
};
type Line = { id: number; product: string; variant: string; quantity: string };

const inputCls =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";
const labelCls = "mb-1 block text-xs font-medium text-text sm:text-sm";

const modes: { key: Mode; label: string; hint: string }[] = [
  { key: "in", label: "Stock In", hint: "Receive stock into the warehouse." },
  { key: "out", label: "Stock Out", hint: "Remove stock (damaged, lost, used...)." },
  {
    key: "set",
    label: "Stock Count",
    hint: "Enter the counted quantity. The difference is recorded.",
  },
];

const reasonsByMode: Record<Mode, string[]> = {
  in: ["purchase", "opening_stock", "customer_return", "production", "other"],
  out: ["sale", "damaged", "expired", "lost", "internal_use", "other"],
  set: ["stock_count", "other"],
};

let nextLineId = 1;
const newLine = (): Line => ({
  id: nextLineId++,
  product: "",
  variant: "",
  quantity: "",
});

export default function AddStockPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);

  const [warehouse, setWarehouse] = useState("");
  const [mode, setMode] = useState<Mode>("in");
  const [reason, setReason] = useState("purchase");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);

  useEffect(() => {
    let active = true;
    const loadOptions = async () => {
      try {
        const [warehouseOptions, productBody] = await Promise.all([
          loadWarehouseOptions(true),
          fetchJson("/api/stock/products?limit=200"),
        ]);
        if (!active) return;
        setWarehouses(warehouseOptions);
        setProducts(readItems<ProductOption>(productBody));
      } catch (error: unknown) {
        console.error("Failed to load stock form options:", error);
        if (active) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load form data."
          );
        }
      } finally {
        if (active) setLoadingOptions(false);
      }
    };
    void loadOptions();
    return () => {
      active = false;
    };
  }, []);

  const productById = useMemo(
    () => new Map(products.map((product) => [product._id, product])),
    [products]
  );

  const changeMode = (next: Mode) => {
    setMode(next);
    setReason(reasonsByMode[next][0]);
  };

  const updateLine = (id: number, patch: Partial<Line>) =>
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line))
    );

  const removeLine = (id: number) =>
    setLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.id !== id)
    );

  const quantityLabel = mode === "set" ? "Counted qty" : "Quantity";

  const handleSave = async () => {
    if (!warehouse) {
      toast.error("Select a warehouse.");
      return;
    }
    const seen = new Set<string>();
    for (const [index, line] of lines.entries()) {
      const position = `Item ${index + 1}`;
      const product = productById.get(line.product);
      if (!product) {
        toast.error(`${position}: select a product.`);
        return;
      }
      if (product.variants.length > 0 && !line.variant) {
        toast.error(`${position}: select a variant.`);
        return;
      }
      const quantity = Number(line.quantity);
      if (
        line.quantity.trim() === "" ||
        !Number.isFinite(quantity) ||
        quantity < 0 ||
        (mode !== "set" && quantity === 0)
      ) {
        toast.error(
          `${position}: enter a valid quantity${mode === "set" ? "" : " greater than 0"}.`
        );
        return;
      }
      const key = `${line.product}:${line.variant}`;
      if (seen.has(key)) {
        toast.error(`${position}: this item is already in the list.`);
        return;
      }
      seen.add(key);
    }

    setSaving(true);
    try {
      await fetchJson("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouse,
          mode,
          reason,
          reference,
          note,
          items: lines.map((line) => ({
            product: line.product,
            variations: line.variant ? line.variant.split(",") : [],
            quantity: Number(line.quantity),
          })),
        }),
      });
      toast.success("Stock updated successfully.");
      router.push("/admin/inventory/stock");
    } catch (error: unknown) {
      console.error("Failed to update stock:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update stock."
      );
    } finally {
      setSaving(false);
    }
  };

  const activeMode = modes.find((item) => item.key === mode) ?? modes[0];

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:space-y-6 md:p-8">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">
            Add Stock
          </h1>
          <p className="mt-0.5 text-xs text-muted sm:text-sm">
            Every change is saved in the stock movement history.
          </p>
        </div>
        <Link
          href="/admin/inventory/stock"
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text transition-colors hover:bg-surface-hover sm:px-4 sm:text-sm"
        >
          Back to stock
        </Link>
      </div>

      {/* Details */}
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-text sm:text-lg">Details</h2>

        <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-border bg-background p-1 sm:inline-flex">
          {modes.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => changeMode(item.key)}
              disabled={saving}
              className={`min-h-10 rounded-lg px-3 text-xs font-medium transition-colors sm:px-5 sm:text-sm ${
                mode === item.key
                  ? "bg-primary text-white"
                  : "text-text hover:bg-surface-hover"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{activeMode.hint}</p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Warehouse *</label>
            <FormSelect
              value={warehouse}
              onChange={setWarehouse}
              placeholder={loadingOptions ? "Loading..." : "Select a warehouse"}
              options={warehouses.map((option) => ({
                value: option._id,
                label: `${option.name} (${option.code})`,
              }))}
            />
          </div>
          <div>
            <label className={labelCls}>Reason *</label>
            <FormSelect
              value={reason}
              onChange={setReason}
              options={reasonsByMode[mode].map((value) => ({
                value,
                label: reasonLabels[value] ?? value,
              }))}
            />
          </div>
          <div>
            <label className={labelCls}>Reference no.</label>
            <input
              value={reference}
              maxLength={100}
              onChange={(event) => setReference(event.target.value)}
              placeholder="PO-1024, invoice no., ..."
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Note</label>
            <input
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Items */}
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text sm:text-lg">Items</h2>
          <button
            type="button"
            onClick={() => setLines((current) => [...current, newLine()])}
            disabled={saving || lines.length >= 100}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-surface-hover disabled:opacity-60 sm:text-sm"
          >
            <FaPlus className="h-3 w-3" />
            Add item
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {lines.map((line, index) => {
            const product = productById.get(line.product);
            const variants = product?.variants ?? [];
            return (
              <div
                key={line.id}
                className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-background/50 p-3 sm:grid-cols-12 sm:items-end"
              >
                <div className="sm:col-span-5">
                  <label className={labelCls}>Product {index + 1} *</label>
                  <FormSelect
                    value={line.product}
                    onChange={(value) =>
                      updateLine(line.id, { product: value, variant: "" })
                    }
                    placeholder={loadingOptions ? "Loading..." : "Select a product"}
                    options={products.map((option) => ({
                      value: option._id,
                      label: option.sku
                        ? `${option.name} (${option.sku})`
                        : option.name,
                    }))}
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className={labelCls}>Variant</label>
                  <FormSelect
                    value={line.variant}
                    disabled={variants.length === 0}
                    onChange={(value) => updateLine(line.id, { variant: value })}
                    placeholder={
                      !product
                        ? "Select a product first"
                        : variants.length === 0
                          ? "No variants"
                          : "Select a variant"
                    }
                    options={variants.map((variant) => ({
                      value: variant.variations.join(","),
                      label: variant.label,
                    }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>{quantityLabel} *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(line.id, { quantity: event.target.value })
                    }
                    className={inputCls}
                  />
                </div>
                <div className="flex sm:col-span-1 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    disabled={saving || lines.length === 1}
                    aria-label={`Remove item ${index + 1}`}
                    title="Remove"
                    className="flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
                  >
                    <FaTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <Link
          href="/admin/inventory/stock"
          className="w-full rounded-lg border border-border px-5 py-2 text-center text-sm font-semibold text-text transition-colors hover:bg-surface-hover sm:w-auto"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || loadingOptions}
          className="w-full rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60 sm:w-auto"
        >
          {saving ? "Saving..." : "Save Stock"}
        </button>
      </div>
    </div>
  );
}
