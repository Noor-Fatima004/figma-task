"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FaPlus,
  FaRegEdit,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaTrash,
} from "react-icons/fa";
import { z } from "zod";
import FormSelect from "@/app/components/FormSelect";
import { warehouseSchema } from "./add/schemas";

const warehouseListSchema = warehouseSchema.extend({
  email: z
    .union([z.string().trim().email().max(254), z.literal("")])
    .default(""),
  managerInfo: z
    .object({ name: z.string(), email: z.string() })
    .nullable()
    .default(null),
});

type WarehouseRow = z.output<typeof warehouseListSchema> & { _id: string };
type ListResponse = {
  items: WarehouseRow[];
  total: number;
  page: number;
  totalPages: number;
};
type SortKey = "name" | "type" | "city" | "capacity" | "contact" | "status";

const LIMITS = [10, 25, 50, 100];
const warehouseTypes = [
  ["main", "Main"],
  ["branch", "Branch"],
  ["distribution", "Distribution"],
  ["returns", "Returns"],
  ["third_party", "Third party"],
] as const;
const unitLabels: Record<string, string> = {
  units: "units",
  sqft: "sq ft",
  cbm: "CBM",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function responseError(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : fallback;
}

function parseWarehouse(value: unknown): WarehouseRow {
  if (!isRecord(value) || typeof value._id !== "string") {
    throw new Error("Invalid warehouse returned by the API.");
  }
  const parsed = warehouseListSchema.safeParse({
    ...value,
    manager: value.manager === "" ? null : value.manager,
  });
  if (!parsed.success) {
    throw new Error("Invalid warehouse data returned by the API.");
  }
  return { ...parsed.data, _id: value._id };
}

function parseList(value: unknown): ListResponse {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    typeof value.total !== "number" ||
    typeof value.page !== "number" ||
    typeof value.totalPages !== "number"
  ) {
    throw new Error("Invalid warehouses response from the API.");
  }
  return {
    items: value.items.map(parseWarehouse),
    total: value.total,
    page: value.page,
    totalPages: value.totalPages,
  };
}

function getSortValue(warehouse: WarehouseRow, key: SortKey): string | number {
  switch (key) {
    case "name":
      return warehouse.name;
    case "type":
      return warehouse.type;
    case "city":
      return warehouse.city;
    case "capacity":
      return Number(warehouse.capacity ?? 0);
    case "contact":
      return warehouse.contactPerson;
    case "status":
      return warehouse.isActive ? 1 : 0;
  }
}

function SortIcon({
  active,
  ascending,
}: {
  active: boolean;
  ascending: boolean;
}) {
  if (!active) return <FaSort className="h-3 w-3 text-muted" />;
  return ascending ? (
    <FaSortUp className="h-3 w-3 text-secondary" />
  ) : (
    <FaSortDown className="h-3 w-3 text-secondary" />
  );
}

function formatCapacity(warehouse: WarehouseRow) {
  if (warehouse.capacity === null || warehouse.capacity === undefined) {
    return "—";
  }
  const unit = unitLabels[warehouse.capacityUnit] ?? warehouse.capacityUnit;
  return `${Number(warehouse.capacity).toLocaleString()} ${unit}`;
}

function isPhoneLike(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && /^[+\d\s().-]+$/.test(value);
}

export default function WarehouseListPage() {
  const [items, setItems] = useState<WarehouseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [ascending, setAscending] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const clearSearch = () => {
    setSearch("");
    setDebounced("");
    setPage(1);
  };

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debounced.trim(),
        page: String(page),
        limit: String(limit),
      });
      if (status) params.set("status", status);
      if (type) params.set("type", type);

      const response = await fetch(`/api/warehouse?${params}`, {
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(responseError(body, "Failed to load warehouses."));
      }
      const data = parseList(body);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.page !== page) setPage(data.page);
    } catch (error: unknown) {
      console.error("Failed to load warehouses:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load warehouses."
      );
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [debounced, limit, page, status, type]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        const a = getSortValue(left, sort);
        const b = getSortValue(right, sort);
        const result =
          typeof a === "number" && typeof b === "number"
            ? a - b
            : String(a).localeCompare(String(b));
        return ascending ? result : -result;
      }),
    [ascending, items, sort]
  );

  const toggleSort = (key: SortKey) => {
    if (sort === key) setAscending((current) => !current);
    else {
      setSort(key);
      setAscending(true);
    }
  };

  const handleDelete = async (warehouse: WarehouseRow) => {
    if (!window.confirm(`Delete warehouse "${warehouse.name}"?`)) return;
    setBusyId(warehouse._id);
    try {
      const response = await fetch(
        `/api/warehouse/${encodeURIComponent(warehouse._id)}`,
        { method: "DELETE" }
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(responseError(body, "Failed to delete warehouse."));
      }
      toast.success("Warehouse deleted successfully.");
      await load();
    } catch (error: unknown) {
      console.error("Failed to delete warehouse:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete warehouse."
      );
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = async (warehouse: WarehouseRow) => {
    setBusyId(warehouse._id);
    try {
      const response = await fetch(
        `/api/warehouse/${encodeURIComponent(warehouse._id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...warehouse,
            isActive: !warehouse.isActive,
          }),
        }
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(responseError(body, "Failed to update warehouse."));
      }
      toast.success(
        `${warehouse.name} marked ${warehouse.isActive ? "inactive" : "active"}.`
      );
      await load();
    } catch (error: unknown) {
      console.error("Failed to update warehouse status:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update status."
      );
    } finally {
      setBusyId(null);
    }
  };

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const hasFilters = Boolean(debounced || status || type);

    const sortableHeader = (label: string, key: SortKey, className = "") => (
    <th
      className={`select-none whitespace-nowrap px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted sm:px-4 ${className}`}
      onClick={() => toggleSort(key)}
    >
      <span className="inline-flex cursor-pointer items-center gap-1.5">
        {label}
        <SortIcon active={sort === key} ascending={ascending} />
      </span>
    </th>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3 sm:items-center sm:pb-4">
        <div>
          <h1 className="text-lg font-semibold text-text sm:text-xl lg:text-2xl">
            Warehouses
          </h1>
          <p className="mt-0.5 text-xs text-muted sm:text-sm">
            Manage your storage locations, capacity and contacts.
          </p>
        </div>
        <Link
          href="/admin/warehouse/add"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover sm:px-4 sm:text-sm"
        >
          <FaPlus className="h-3 w-3" />
          Add Warehouse
        </Link>
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
              onKeyDown={(event) => event.key === "Escape" && clearSearch()}
              placeholder="Search name, code, city..."
              aria-label="Search warehouses"
              className="w-full min-w-0 rounded-md border border-border bg-background px-3 py-1 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary sm:w-64 sm:py-1.5 sm:text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="hidden shrink-0 items-center rounded-md border border-border px-3 py-1.5 text-sm text-text transition-colors hover:bg-surface-hover hover:text-text-hover sm:flex"
              >
                Clear
              </button>
            )}
          </div>

          <div className="order-3 grid w-full grid-cols-2 gap-2 sm:flex sm:gap-3 lg:order-2 lg:w-auto">
            <div className="sm:w-40">
              <FormSelect
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                placeholder="All statuses"
                options={[
                  { value: "", label: "All statuses" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </div>
            <div className="sm:w-48">
              <FormSelect
                value={type}
                onChange={(value) => {
                  setType(value);
                  setPage(1);
                }}
                placeholder="All types"
                options={[
                  { value: "", label: "All types" },
                  ...warehouseTypes.map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
            </div>
          </div>
        </div>
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-max min-w-full text-left text-xs text-text sm:text-sm">
            <thead className="bg-background">
              <tr className="border-b border-border">
                <th className="whitespace-nowrap px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted sm:px-4">
                  #
                </th>
                {sortableHeader("Warehouse", "name")}
                {sortableHeader("Type", "type")}
                {sortableHeader("Location", "city")}
                {sortableHeader("Capacity", "capacity")}
                {sortableHeader("Contact", "contact")}
                <th className="whitespace-nowrap px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted sm:px-4">
                  Manager
                </th>
                {sortableHeader("Status", "status")}
                <th className="whitespace-nowrap px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted sm:px-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, row) => (
                  <tr key={row} className="border-b border-border">
                    {Array.from({ length: 10 }).map((__, cell) => (
                      <td key={cell} className="px-3 py-4 sm:px-4">
                        <div className="h-3.5 w-20 animate-pulse rounded bg-background" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-text">
                      {hasFilters
                        ? "No warehouses match your filters"
                        : "No warehouses yet"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {hasFilters
                        ? "Try changing or clearing the search and filters."
                        : "Add your first warehouse to get started."}
                    </p>
                    {!hasFilters && (
                      <Link
                        href="/admin/warehouse/add"
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover sm:text-sm"
                      >
                        <FaPlus className="h-3 w-3" />
                        Add Warehouse
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                sortedItems.map((warehouse, index) => (
                  <tr
                    key={warehouse._id}
                    className="border-b border-border transition-colors hover:bg-surface-hover"
                  >
                    <td className="whitespace-nowrap px-3 py-3 text-muted sm:px-4">
                      {(page - 1) * limit + index + 1}
                    </td>

                    {/* Name + code + default badge */}
                    <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                      <div className="flex items-center gap-x-2">
                        <span className="font-medium text-text">
                          {warehouse.name}
                        </span>
                        {warehouse.isDefault && (
                          <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="mt-0.5 block text-[11px] text-muted sm:text-xs">
                        {warehouse.code}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                      {warehouseTypes.find(
                        ([value]) => value === warehouse.type
                      )?.[1] ?? warehouse.type}
                    </td>

                    {/* City + country */}
                    <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                      <span className="block">{warehouse.city || "—"}</span>
                      {warehouse.country && (
                        <span className="block text-[11px] text-muted sm:text-xs">
                          {warehouse.country}
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                      {formatCapacity(warehouse)}
                    </td>

                    {/* Contact person + phone */}
                    <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                      {warehouse.contactPerson.trim() &&
                        !isPhoneLike(warehouse.contactPerson) && (
                          <span className="block">
                            {warehouse.contactPerson}
                          </span>
                        )}
                      {warehouse.phone.trim() && (
                        <span className="block text-xs text-muted">
                          {warehouse.phone}
                        </span>
                      )}
                    </td>
                    {/* Manager */}
                    <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                      {warehouse.managerInfo ? (
                        <>
                          <span className="block">
                            {warehouse.managerInfo.name}
                          </span>
                          <a
                            href={`mailto:${warehouse.managerInfo.email}`}
                            className="block text-xs text-muted no-underline hover:text-primary"
                          >
                            {warehouse.managerInfo.email}
                          </a>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={warehouse.isActive}
                        aria-label={`Set ${warehouse.name} ${
                          warehouse.isActive ? "inactive" : "active"
                        }`}
                        title="Click to change status"
                        disabled={busyId === warehouse._id}
                        onClick={() => void toggleStatus(warehouse)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors disabled:opacity-50 sm:text-xs ${
                          warehouse.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-background text-muted"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            warehouse.isActive ? "bg-green-600" : "bg-muted"
                          }`}
                        />
                        {warehouse.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/warehouse/${encodeURIComponent(
                            warehouse._id
                          )}/edit`}
                          aria-label={`Edit ${warehouse.name}`}
                          title="Edit"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-icon transition-colors hover:bg-background hover:text-icon-hover"
                        >
                          <FaRegEdit className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDelete(warehouse)}
                          disabled={
                            busyId === warehouse._id || warehouse.isDefault
                          }
                          aria-label={`Delete ${warehouse.name}`}
                          title={
                            warehouse.isDefault
                              ? "The default warehouse cannot be deleted"
                              : "Delete"
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
                        >
                          <FaTrash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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