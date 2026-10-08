"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FaHistory, FaPlus } from "react-icons/fa";
import FormSelect from "@/app/components/FormSelect";
import {
  fetchJson,
  formatQty,
  loadWarehouseOptions,
  readItems,
  readNumber,
  type StockRow,
  type StockStatus,
  type StockSummary,
  type WarehouseOption,
} from "./shared";

const LIMITS = [10, 25, 50, 100];
const emptySummary: StockSummary = {
  lines: 0,
  totalOnHand: 0,
  totalAvailable: 0,
  low: 0,
  out: 0,
};

const statusStyles: Record<StockStatus, { label: string; cls: string; dot: string }> = {
  in: { label: "In stock", cls: "bg-green-100 text-green-800", dot: "bg-green-600" },
  low: { label: "Low stock", cls: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  out: { label: "Out of stock", cls: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

function readSummary(body: Record<string, unknown>): StockSummary {
  const value = body.summary;
  if (typeof value !== "object" || value === null) return emptySummary;
  const record = value as Record<string, unknown>;
  return {
    lines: readNumber(record, "lines"),
    totalOnHand: readNumber(record, "totalOnHand"),
    totalAvailable: readNumber(record, "totalAvailable"),
    low: readNumber(record, "low"),
    out: readNumber(record, "out"),
  };
}

function SummaryCard({
  label,
  value,
  tone = "text-text",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-sm sm:p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className={`mt-1 text-xl font-semibold sm:text-2xl ${tone}`}>{value}</p>
    </div>
  );
}

/** Inline editor for the low-stock alert threshold. */
function ReorderCell({ row, onSaved }: { row: StockRow; onSaved: () => void }) {
  const [value, setValue] = useState(String(row.reorderLevel));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const next = Number(value);
    if (value.trim() === "" || !Number.isFinite(next) || next < 0) {
      toast.error("Enter a valid number (0 or more).");
      setValue(String(row.reorderLevel));
      return;
    }
    if (next === row.reorderLevel) return;
    setSaving(true);
    try {
      await fetchJson("/api/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row._id, reorderLevel: next }),
      });
      toast.success("Reorder level updated.");
      onSaved();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update reorder level."
      );
      setValue(String(row.reorderLevel));
    } finally {
      setSaving(false);
    }
  };

  return (
    <input
      type="number"
      min="0"
      value={value}
      disabled={saving}
      aria-label={`Reorder level for ${row.productName}`}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => void save()}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className="w-20 rounded-md border border-border bg-background px-2 py-1 text-xs text-text outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
    />
  );
}

export default function StockListPage() {
  const [items, setItems] = useState<StockRow[]>([]);
  const [summary, setSummary] = useState<StockSummary>(emptySummary);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [status, setStatus] = useState("");
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    loadWarehouseOptions()
      .then((options) => {
        if (active) setWarehouses(options);
      })
      .catch((error: unknown) => {
        console.error("Failed to load warehouses:", error);
        toast.error("Failed to load warehouses.");
      });
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debounced.trim(),
        page: String(page),
        limit: String(limit),
      });
      if (warehouse) params.set("warehouse", warehouse);
      if (status) params.set("status", status);

      const body = await fetchJson(`/api/stock?${params}`);
      setItems(readItems<StockRow>(body));
      setSummary(readSummary(body));
      setTotal(readNumber(body, "total"));
      setTotalPages(Math.max(1, readNumber(body, "totalPages")));
      const serverPage = readNumber(body, "page");
      if (serverPage && serverPage !== page) setPage(serverPage);
    } catch (error: unknown) {
      console.error("Failed to load stock:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load stock.");
      setItems([]);
      setSummary(emptySummary);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [debounced, limit, page, status, warehouse]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const hasFilters = Boolean(debounced || warehouse || status);

  const th =
    "px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted sm:px-4";

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3 sm:items-center sm:pb-4">
        <div>
          <h1 className="text-lg font-semibold text-text sm:text-xl lg:text-2xl">
            Stock
          </h1>
          <p className="mt-0.5 text-xs text-muted sm:text-sm">
            See how much of each item is in every warehouse.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/admin/inventory/stock/movements"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text transition-colors hover:bg-surface-hover sm:px-4 sm:text-sm"
          >
            <FaHistory className="h-3 w-3" />
            <span className="hidden sm:inline">Movements</span>
          </Link>
          <Link
            href="/admin/inventory/stock/add"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover sm:px-4 sm:text-sm"
          >
            <FaPlus className="h-3 w-3" />
            Add Stock
          </Link>
        </div>
      </div>

      {/* Summary (respects the current filters) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Items tracked" value={formatQty(summary.lines)} />
        <SummaryCard label="Total on hand" value={formatQty(summary.totalOnHand)} />
        <SummaryCard
          label="Low stock"
          value={formatQty(summary.low)}
          tone={summary.low > 0 ? "text-amber-600" : "text-text"}
        />
        <SummaryCard
          label="Out of stock"
          value={formatQty(summary.out)}
          tone={summary.out > 0 ? "text-red-600" : "text-text"}
        />
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm sm:p-5">
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-text sm:gap-3 sm:text-sm lg:flex-nowrap">
          <div className="order-1 flex shrink-0 items-center gap-2 whitespace-nowrap">
            Show
            <FormSelect
              compact
              value={String(limit)}
              onChange={(value) => {
                setLimit(Number(value));
                setPage(1);
              }}
              options={LIMITS.map((value) => ({
                value: String(value),
                label: String(value),
              }))}
            />
            <span className="hidden sm:inline">entries</span>
          </div>

          <div className="order-2 flex min-w-0 flex-1 items-center justify-end gap-2 sm:ml-auto sm:flex-none lg:order-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && setSearch("")}
              placeholder="Search product, SKU, variant..."
              aria-label="Search stock"
              className="w-full min-w-0 rounded-md border border-border bg-background px-3 py-1 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary sm:w-64 sm:py-1.5 sm:text-sm"
            />
          </div>

          <div className="order-3 grid w-full grid-cols-2 gap-2 sm:flex sm:gap-3 lg:order-2 lg:w-auto">
            <div className="sm:w-52">
              <FormSelect
                value={warehouse}
                onChange={(value) => {
                  setWarehouse(value);
                  setPage(1);
                }}
                placeholder="All warehouses"
                options={[
                  { value: "", label: "All warehouses" },
                  ...warehouses.map((option) => ({
                    value: option._id,
                    label: option.name,
                  })),
                ]}
              />
            </div>
            <div className="sm:w-44">
              <FormSelect
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                placeholder="All stock levels"
                options={[
                  { value: "", label: "All stock levels" },
                  { value: "in", label: "In stock" },
                  { value: "low", label: "Low stock" },
                  { value: "out", label: "Out of stock" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text sm:text-sm md:min-w-[860px]">
            <thead className="bg-background">
              <tr className="border-b border-border">
                <th className={th}>Product</th>
                <th className={th}>Warehouse</th>
                <th className={`${th} text-right`}>On hand</th>
                <th className={`${th} hidden text-right md:table-cell`}>
                  Reserved
                </th>
                <th className={`${th} text-right`}>Available</th>
                <th className={`${th} hidden lg:table-cell`}>Reorder at</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, row) => (
                  <tr key={row} className="border-b border-border">
                    {Array.from({ length: 7 }).map((__, cell) => (
                      <td
                        key={cell}
                        className={`px-3 py-4 sm:px-4 ${
                          cell === 3
                            ? "hidden md:table-cell"
                            : cell === 5
                              ? "hidden lg:table-cell"
                              : ""
                        }`}
                      >
                        <div className="h-3.5 w-full max-w-[110px] animate-pulse rounded bg-background" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-text">
                      {hasFilters ? "No stock matches your filters" : "No stock yet"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {hasFilters
                        ? "Try changing or clearing the search and filters."
                        : "Add stock to a warehouse to see it here."}
                    </p>
                    {!hasFilters && (
                      <Link
                        href="/admin/inventory/stock/add"
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover sm:text-sm"
                      >
                        <FaPlus className="h-3 w-3" />
                        Add Stock
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const style = statusStyles[row.status];
                  return (
                    <tr
                      key={row._id}
                      className="border-b border-border transition-colors hover:bg-surface-hover"
                    >
                      <td className="px-3 py-3 sm:px-4">
                        <span className="block font-medium text-text">
                          {row.productName}
                        </span>
                        {row.variantLabel && (
                          <span className="mt-0.5 inline-block rounded bg-background px-1.5 py-0.5 text-[11px] text-text">
                            {row.variantLabel}
                          </span>
                        )}
                        {row.sku && (
                          <span className="mt-0.5 block text-[11px] text-muted sm:text-xs">
                            SKU: {row.sku}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <span className="block">{row.warehouseName}</span>
                        <span className="block text-[11px] text-muted sm:text-xs">
                          {row.warehouseCode}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums sm:px-4">
                        {formatQty(row.onHand)}
                      </td>
                      <td className="hidden px-3 py-3 text-right tabular-nums text-muted sm:px-4 md:table-cell">
                        {formatQty(row.reserved)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums sm:px-4">
                        {formatQty(row.available)}
                      </td>
                      <td className="hidden px-3 py-3 sm:px-4 lg:table-cell">
                        <ReorderCell row={row} onSaved={() => void load()} />
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium sm:text-xs ${style.cls}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          {style.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-4 flex flex-col gap-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:text-sm">
          <p className="shrink-0">
            Showing {from} to {to} of {total} entries
          </p>
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-md border border-primary-hover bg-primary px-2.5 py-1 text-white transition-colors hover:bg-primary-hover disabled:opacity-40 sm:px-3 sm:py-1.5"
            >
              Previous
            </button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="rounded-md border border-primary-hover bg-primary px-2.5 py-1 text-white transition-colors hover:bg-primary-hover disabled:opacity-40 sm:px-3 sm:py-1.5"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
