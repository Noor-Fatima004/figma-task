"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FaEye, FaHistory, FaPlus, FaRegEdit, FaTrash } from "react-icons/fa";
import FormSelect from "@/app/components/FormSelect";
import {
  fetchJson,
  formatQty,
  loadWarehouseOptions,
  readItems,
  readNumber,
  reasonLabels,
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
  out: 0,
};

const statusStyles: Record<StockStatus, { label: string; cls: string; dot: string }> = {
  in: { label: "In stock", cls: "bg-green-100 text-green-800", dot: "bg-green-600" },
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

export default function StockListPage() {
  const [items, setItems] = useState<StockRow[]>([]);
  const [activeRow, setActiveRow] = useState<StockRow | null>(null);
  const [action, setAction] = useState<"view" | "edit" | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editBinLocation, setEditBinLocation] = useState("");
  const [editReason, setEditReason] = useState("stock_count");
  const [editReference, setEditReference] = useState("");
  const [editNote, setEditNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const openRowAction = (row: StockRow, nextAction: "view" | "edit") => {
    setActiveRow(row);
    setAction(nextAction);
    setEditQuantity(String(row.onHand));
    setEditBinLocation(row.binLocation);
    setEditReason("stock_count");
    setEditReference("");
    setEditNote("");
  };

  const saveCountedStock = async () => {
    if (!activeRow) return;
    const quantity = Number(editQuantity);
    if (
      editQuantity.trim() === "" ||
      !Number.isFinite(quantity) ||
      quantity < 0
    ) {
      toast.error("Enter a valid counted quantity (0 or more).");
      return;
    }

    setSavingEdit(true);
    try {
      await fetchJson("/api/stock/level", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeRow._id,
          quantity,
          binLocation: editBinLocation,
          reason: editReason,
          reference: editReference,
          note: editNote,
        }),
      });
      toast.success("Stock record updated.");
      setAction(null);
      setActiveRow(null);
      await load();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update stock."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete: sirf wahi row jiska on hand aur reserved dono 0 ho (server bhi check karta hai)
  const deleteRow = async (row: StockRow) => {
    const label = row.variantLabel
      ? `${row.productName} (${row.variantLabel})`
      : row.productName;
    if (
      !window.confirm(
        `Delete the stock record for ${label} in ${row.warehouseName}? Movement history will be kept.`
      )
    ) {
      return;
    }

    setDeletingId(row._id);
    try {
      await fetchJson("/api/stock/level", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row._id }),
      });
      toast.success("Stock record deleted.");
      await load();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete stock."
      );
    } finally {
      setDeletingId(null);
    }
  };

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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <SummaryCard label="Items tracked" value={formatQty(summary.lines)} />
        <SummaryCard label="Total on hand" value={formatQty(summary.totalOnHand)} />
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
                  { value: "out", label: "Out of stock" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text sm:text-sm md:min-w-[900px]">
            <thead className="bg-background">
              <tr className="border-b border-border">
                <th className={th}>Product</th>
                <th className={th}>Warehouse</th>
                <th className={`${th} text-right`}>On hand</th>
                <th className={`${th} hidden text-right md:table-cell`}>
                  Reserved
                </th>
                <th className={`${th} text-right`}>Available</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Actions</th>
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
                          cell === 3 ? "hidden md:table-cell" : ""
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
                  const canDelete = row.onHand === 0 && row.reserved === 0;
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
                      <td className="px-3 py-3 sm:px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium sm:text-xs ${style.cls}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          {style.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openRowAction(row, "view")}
                            aria-label={`View ${row.productName} stock`}
                            title="View"
                            className="flex h-9 w-9 items-center justify-center rounded-md text-icon transition-colors hover:bg-background hover:text-icon-hover"
                          >
                            <FaEye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openRowAction(row, "edit")}
                            aria-label={`Edit ${row.productName} stock`}
                            title="Edit counted quantity"
                            className="flex h-9 w-9 items-center justify-center rounded-md text-icon transition-colors hover:bg-background hover:text-icon-hover"
                          >
                            <FaRegEdit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteRow(row)}
                            disabled={!canDelete || deletingId === row._id}
                            aria-label={`Delete ${row.productName} stock`}
                            title={
                              canDelete
                                ? "Delete"
                                : "Only stock with 0 on hand and 0 reserved can be deleted"
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                          >
                            <FaTrash className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
      {action && activeRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (!savingEdit) setAction(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-action-title"
            className="w-full max-w-lg space-y-5 rounded-2xl border border-border bg-surface p-5 text-text shadow-xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <h2 id="stock-action-title" className="text-lg font-semibold">
                {action === "view" ? "Stock details" : "Edit stock quantity"}
              </h2>
              <p className="mt-1 text-sm text-muted">{activeRow.productName}</p>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted">SKU</dt>
                <dd className="mt-0.5">{activeRow.sku || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Variant</dt>
                <dd className="mt-0.5">{activeRow.variantLabel || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Warehouse</dt>
                <dd className="mt-0.5">{activeRow.warehouseName}</dd>
                <dd className="text-xs text-muted">{activeRow.warehouseCode}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Bin location</dt>
                <dd className="mt-0.5">{activeRow.binLocation || "—"}</dd>
              </div>
              {action === "view" ? (
                <>
                  <div>
                    <dt className="text-xs text-muted">On hand</dt>
                    <dd className="mt-0.5">{formatQty(activeRow.onHand)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Reserved</dt>
                    <dd className="mt-0.5">{formatQty(activeRow.reserved)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Available</dt>
                    <dd className="mt-0.5">{formatQty(activeRow.available)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Status</dt>
                    <dd className="mt-0.5">{statusStyles[activeRow.status].label}</dd>
                  </div>
                </>
              ) : (
                <div className="col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="stock-counted-quantity"
                      className="mb-1 block text-xs font-medium"
                    >
                      Counted quantity *
                    </label>
                    <input
                      id="stock-counted-quantity"
                      type="number"
                      min="0"
                      step="any"
                      value={editQuantity}
                      disabled={savingEdit}
                      onChange={(event) => setEditQuantity(event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-text outline-none focus:ring-2 focus:ring-primary/30 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="stock-bin-location"
                      className="mb-1 block text-xs font-medium"
                    >
                      Bin location
                    </label>
                    <input
                      id="stock-bin-location"
                      type="text"
                      maxLength={50}
                      value={editBinLocation}
                      disabled={savingEdit}
                      onChange={(event) => setEditBinLocation(event.target.value)}
                      placeholder="e.g. A-01-03"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-text outline-none focus:ring-2 focus:ring-primary/30 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="stock-edit-reason"
                      className="mb-1 block text-xs font-medium"
                    >
                      Adjustment reason *
                    </label>
                    <FormSelect
                      id="stock-edit-reason"
                      value={editReason}
                      onChange={setEditReason}
                      disabled={savingEdit}
                      options={Object.entries(reasonLabels).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="stock-edit-reference"
                      className="mb-1 block text-xs font-medium"
                    >
                      Reference no.
                    </label>
                    <input
                      id="stock-edit-reference"
                      type="text"
                      maxLength={100}
                      value={editReference}
                      disabled={savingEdit}
                      onChange={(event) => setEditReference(event.target.value)}
                      placeholder="PO, invoice, or count reference"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-text outline-none focus:ring-2 focus:ring-primary/30 sm:text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="stock-edit-note"
                      className="mb-1 block text-xs font-medium"
                    >
                      Note
                    </label>
                    <textarea
                      id="stock-edit-note"
                      maxLength={500}
                      rows={3}
                      value={editNote}
                      disabled={savingEdit}
                      onChange={(event) => setEditNote(event.target.value)}
                      className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-base text-text outline-none focus:ring-2 focus:ring-primary/30 sm:text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted sm:col-span-2">
                    Product, variant, and warehouse belong to this stock record and
                    aren&apos;t changed here. Quantity changes are recorded in stock
                    movement history.
                  </p>
                </div>
              )}
            </dl>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={savingEdit}
                onClick={() => setAction(null)}
                className="min-h-10 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-50"
              >
                Close
              </button>
              {action === "edit" && (
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => void saveCountedStock()}
                  className="min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save changes"}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}