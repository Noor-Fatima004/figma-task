"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FaPlus } from "react-icons/fa";
import FormSelect from "@/app/components/FormSelect";
import {
  fetchJson,
  formatDateTime,
  formatQty,
  loadWarehouseOptions,
  readItems,
  readNumber,
  reasonLabels,
  type MovementRow,
  type WarehouseOption,
} from "../shared";

const LIMITS = [10, 25, 50, 100];

const typeStyles: Record<MovementRow["type"], { label: string; cls: string }> = {
  in: { label: "Stock in", cls: "bg-green-100 text-green-800" },
  out: { label: "Stock out", cls: "bg-red-100 text-red-700" },
  adjustment: { label: "Count", cls: "bg-blue-100 text-blue-800" },
};

const dateCls =
  "w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-text outline-none focus:ring-2 focus:ring-primary/30 sm:py-1.5 sm:text-sm";

export default function StockMovementsPage() {
  const [items, setItems] = useState<MovementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
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
      if (type) params.set("type", type);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const body = await fetchJson(`/api/stock/movements?${params}`);
      setItems(readItems<MovementRow>(body));
      setTotal(readNumber(body, "total"));
      setTotalPages(Math.max(1, readNumber(body, "totalPages")));
      const serverPage = readNumber(body, "page");
      if (serverPage && serverPage !== page) setPage(serverPage);
    } catch (error: unknown) {
      console.error("Failed to load stock movements:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load movements."
      );
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [debounced, from, limit, page, to, type, warehouse]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const rangeFrom = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeTo = Math.min(page * limit, total);
  const hasFilters = Boolean(debounced || warehouse || type || from || to);

  const th =
    "px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted sm:px-4";

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3 sm:items-center sm:pb-4">
        <div>
          <h1 className="text-lg font-semibold text-text sm:text-xl lg:text-2xl">
            Stock Movements
          </h1>
          <p className="mt-0.5 text-xs text-muted sm:text-sm">
            A permanent history of every stock change.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/admin/inventory/stock"
            className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text transition-colors hover:bg-surface-hover sm:px-4 sm:text-sm"
          >
            Stock
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

      {/* Card */}
      <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm sm:p-5">
        {/* Toolbar */}
        <div className="mb-4 space-y-2 text-xs text-text sm:space-y-3 sm:text-sm">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
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
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && setSearch("")}
              placeholder="Search product, SKU, reference..."
              aria-label="Search movements"
              className="ml-auto w-full min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-1 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary sm:w-64 sm:flex-none sm:py-1.5 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
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
            <div className="sm:w-40">
              <FormSelect
                value={type}
                onChange={(value) => {
                  setType(value);
                  setPage(1);
                }}
                placeholder="All types"
                options={[
                  { value: "", label: "All types" },
                  { value: "in", label: "Stock in" },
                  { value: "out", label: "Stock out" },
                  { value: "adjustment", label: "Count" },
                ]}
              />
            </div>
            <label className="flex items-center gap-2 sm:w-auto">
              <span className="shrink-0 text-muted">From</span>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(1);
                }}
                className={dateCls}
              />
            </label>
            <label className="flex items-center gap-2 sm:w-auto">
              <span className="shrink-0 text-muted">To</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
                className={dateCls}
              />
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text sm:text-sm md:min-w-[900px]">
            <thead className="bg-background">
              <tr className="border-b border-border">
                <th className={th}>Date</th>
                <th className={th}>Product</th>
                <th className={`${th} hidden sm:table-cell`}>Warehouse</th>
                <th className={th}>Type</th>
                <th className={`${th} text-right`}>Qty</th>
                <th className={`${th} hidden text-right md:table-cell`}>
                  Balance
                </th>
                <th className={`${th} hidden lg:table-cell`}>Reason</th>
                <th className={`${th} hidden lg:table-cell`}>Reference / By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, row) => (
                  <tr key={row} className="border-b border-border">
                    {Array.from({ length: 8 }).map((__, cell) => (
                      <td
                        key={cell}
                        className={`px-3 py-4 sm:px-4 ${
                          cell === 2
                            ? "hidden sm:table-cell"
                            : cell === 5
                              ? "hidden md:table-cell"
                              : cell >= 6
                                ? "hidden lg:table-cell"
                                : ""
                        }`}
                      >
                        <div className="h-3.5 w-full max-w-[100px] animate-pulse rounded bg-background" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-text">
                      {hasFilters
                        ? "No movements match your filters"
                        : "No stock movements yet"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {hasFilters
                        ? "Try changing or clearing the search and filters."
                        : "Movements appear here as soon as stock is added or removed."}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const style = typeStyles[row.type];
                  const positive = row.quantity > 0;
                  return (
                    <tr
                      key={row._id}
                      className="border-b border-border transition-colors hover:bg-surface-hover"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-muted sm:px-4">
                        {formatDateTime(row.createdAt)}
                      </td>
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
                      <td className="hidden px-3 py-3 sm:table-cell sm:px-4">
                        <span className="block">{row.warehouseName}</span>
                        <span className="block text-xs text-muted">
                          {row.warehouseCode}
                        </span>
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium sm:text-xs ${style.cls}`}
                        >
                          {style.label}
                        </span>
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-semibold tabular-nums sm:px-4 ${
                          positive ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {positive ? "+" : ""}
                        {formatQty(row.quantity)}
                      </td>
                      <td className="hidden px-3 py-3 text-right tabular-nums sm:px-4 md:table-cell">
                        {formatQty(row.balanceAfter)}
                      </td>
                      <td className="hidden px-3 py-3 sm:px-4 lg:table-cell">
                        {reasonLabels[row.reason] ?? row.reason}
                        {row.note && (
                          <span
                            className="mt-0.5 block max-w-[200px] truncate text-xs text-muted"
                            title={row.note}
                          >
                            {row.note}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-3 py-3 sm:px-4 lg:table-cell">
                        <span className="block">{row.reference || "—"}</span>
                        <span className="block text-xs text-muted">
                          {row.createdByName}
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
            Showing {rangeFrom} to {rangeTo} of {total} entries
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
