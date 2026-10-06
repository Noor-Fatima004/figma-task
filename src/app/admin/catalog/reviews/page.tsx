"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  FaSort,
  FaSortUp,
  FaSortDown,
  FaChevronDown,
  FaStar,
  FaTrash,
} from "react-icons/fa";

type Review = {
  _id: string;
  review: string;
  email: string;
  name: string;
  rating: number;
  productName: string;
  status: "pending" | "approved";
};
type SortKey =
  | "createdAt"
  | "review"
  | "email"
  | "name"
  | "rating"
  | "productName"
  | "status";

const LIMITS = [10, 25, 50, 100];
const API = "/api/admin/product-reviews";

export default function ProductReviewsPage() {
  const [items, setItems] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const clearSearch = () => {
    setSearch("");
    setDebounced("");
    setPage(1);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debounced,
        page: String(page),
        limit: String(limit),
        sort,
        order,
      });
      const res = await fetch(`${API}?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.page !== page) setPage(data.page);
    } catch (e: any) {
      toast.error(e.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [debounced, page, limit, sort, order]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSort = (key: SortKey) => {
    if (sort === key) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setOrder("asc");
    }
  };

  // Status badge par click: approved <-> pending
  const toggleStatus = async (r: Review) => {
    if (updatingId || deletingId) return;
    const next = r.status === "approved" ? "pending" : "approved";
    setUpdatingId(r._id);
    try {
      const res = await fetch(`${API}/${r._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success(next === "approved" ? "Review approved" : "Review set to pending");
      setItems((list) => list.map((x) => (x._id === r._id ? { ...x, status: next } : x)));
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    } finally {
      setUpdatingId("");
    }
  };

  // Delete button: permanent delete (confirm ke baad)
  const deleteReview = async (r: Review) => {
    if (deletingId || updatingId) return;
    if (!window.confirm(`Delete review by ${r.name}? This cannot be undone.`)) return;
    setDeletingId(r._id);
    try {
      const res = await fetch(`${API}/${r._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Review deleted");
      // list dobara load: total/pages sahi ho jayenge, aur last item delete hone par page bhi adjust hoga
      await load();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setDeletingId("");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort !== k ? (
      <FaSort className="h-3 w-3 text-muted" />
    ) : order === "asc" ? (
      <FaSortUp className="h-3 w-3 text-secondary" />
    ) : (
      <FaSortDown className="h-3 w-3 text-secondary" />
    );

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const th = "px-3 py-2.5 font-semibold sm:px-4 sm:py-3";
  const td = "px-3 py-2.5 sm:px-4 sm:py-3 break-words";

  // Sortable header cell
  const SortTh = ({ k, label }: { k: SortKey; label: string }) => (
    <th className={`${th} cursor-pointer select-none`} onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-2">
        {label} <SortIcon k={k} />
      </span>
    </th>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-3 sm:pb-4">
        <h1 className="text-lg font-semibold text-text sm:text-xl lg:text-2xl">
          Product Reviews
        </h1>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm sm:p-5">
        {/* Toolbar: Show entries + Search ek hi row me */}
        <div className="mb-4 flex items-center justify-between gap-2 text-xs text-text sm:gap-3 sm:text-sm">
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            Show
            <EntriesSelect
              value={String(limit)}
              onChange={(v) => {
                setLimit(Number(v));
                setPage(1);
              }}
              options={LIMITS.map((l) => String(l))}
            />
            <span className="hidden sm:inline">entries</span>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
            <span className="shrink-0">Search:</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && clearSearch()}
              placeholder="Search..."
              className="w-full min-w-0 rounded-md border border-border bg-background px-3 py-1 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary sm:w-56 sm:py-1.5 sm:text-sm"
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
        </div>

        {/* Table: sab columns barabar width, left aligned */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border text-text">
                <SortTh k="createdAt" label="id" />
                <SortTh k="review" label="Customer Review" />
                <SortTh k="email" label="Customer Email" />
                <SortTh k="name" label="Customer Name" />
                <SortTh k="rating" label="Rating" />
                <SortTh k="productName" label="Product name" />
                <SortTh k="status" label="Status" />
                <th className={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    No reviews found
                  </td>
                </tr>
              ) : (
                items.map((r, i) => (
                  <tr key={r._id} className="group border-b border-border">
                    <td className="bg-background px-3 py-2.5 transition-colors group-hover:bg-surface-hover sm:px-4 sm:py-3">
                      {(page - 1) * limit + i + 1}
                    </td>
                    <td className={td}>
                      <span className="line-clamp-2" title={r.review}>
                        {r.review}
                      </span>
                    </td>
                    <td className={td}>{r.email}</td>
                    <td className={td}>{r.name}</td>
                    <td className={td}>
                      <span className="inline-flex items-center gap-1">
                        {r.rating}
                        <FaStar className="h-3 w-3 text-[#F5A623]" />
                      </span>
                    </td>
                    <td className={td}>{r.productName}</td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                      <button
                        type="button"
                        onClick={() => toggleStatus(r)}
                        disabled={updatingId === r._id || deletingId === r._id}
                        title="Click to change status"
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50 ${
                          r.status === "approved"
                            ? "bg-green-500/10 text-green-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {r.status === "approved" ? "Approved" : "Pending"}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                      <button
                        type="button"
                        onClick={() => deleteReview(r)}
                        disabled={deletingId === r._id || updatingId === r._id}
                        title="Delete review"
                        aria-label={`Delete review by ${r.name}`}
                        className="rounded-md border border-border p-2 text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <FaTrash className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: Previous / Next hamesha right me */}
        <div className="mt-4 flex flex-col gap-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:text-sm">
          <p className="shrink-0">
            Showing {from} to {to} of {total} entries
          </p>
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-primary-hover bg-primary px-2.5 py-1 text-white transition-colors hover:bg-primary-hover disabled:opacity-40 sm:px-3 sm:py-1.5"
            >
              Previous
            </button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
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

/* ───────── Chhota "Show N entries" dropdown (Variations page wale FormSelect ka compact version) ───────── */

function EntriesSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-w-[3.5rem] items-center justify-between gap-2 rounded-md border border-border bg-surface px-2 py-1 text-left text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/30 sm:text-sm"
      >
        <span>{value}</span>
        <FaChevronDown
          className={`h-3 w-3 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-[60] mt-1 max-h-44 min-w-full overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg sm:max-h-52"
        >
          {options.map((o) => (
            <li
              key={o}
              role="option"
              aria-selected={o === value}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className={`cursor-pointer px-3 py-2 text-xs transition-colors sm:text-sm ${
                o === value
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-text hover:bg-surface-hover hover:text-text-hover"
              }`}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}