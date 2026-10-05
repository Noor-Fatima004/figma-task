"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  FaPlus,
  FaRegEdit,
  FaTrash,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaChevronDown,
} from "react-icons/fa";

type Variation = {
  _id: string;
  name: string;
  attribute: string;
  attributeName: string;
};
type AttributeOption = { _id: string; name: string };
type SortKey = "createdAt" | "name" | "attribute";
type ModalState =
  | null
  | { mode: "add" }
  | { mode: "edit"; variation: Variation };

const LIMITS = [10, 25, 50, 100];
const API = "/api/admin/product-variations";
const ATTR_API = "/api/admin/product-attributes";

export default function ProductVariationsPage() {
  const [items, setItems] = useState<Variation[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);

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
    setDebounced(""); // turant reset, 300ms wait nahi
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
      toast.error(e.message || "Failed to load variations");
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

  const handleDelete = async (v: Variation) => {
    if (!confirm(`Delete variation "${v.name}"?`)) return;
    try {
      const res = await fetch(`${API}/${v._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Variation deleted");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort !== k ? (
      <FaSort className="w-3 h-3 text-gray-300" />
    ) : order === "asc" ? (
      <FaSortUp className="w-3 h-3 text-[#4CAF4F]" />
    ) : (
      <FaSortDown className="w-3 h-3 text-[#4CAF4F]" />
    );

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="relative flex items-center justify-between pb-3 sm:pb-4 border-b border-gray-200">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[#263238]">
          Product Variations
        </h1>
        <div className="relative">
          <button
            onClick={() => setModal({ mode: "add" })}
            title="Add variation"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow transition-colors"
          >
            <FaPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {modal && (
            <VariationModal
              state={modal}
              onClose={() => setModal(null)}
              onSaved={() => {
                setModal(null);
                load();
              }}
            />
          )}
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-5">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 mb-4 text-xs sm:text-sm text-[#263238]">
          <label className="flex items-center gap-2 shrink-0 whitespace-nowrap">
            Show
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="border border-gray-200 rounded-md px-2 py-1 bg-white text-xs sm:text-sm"
            >
              {LIMITS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <span className="hidden sm:inline">entries</span>
          </label>

          <div className="flex min-w-0 flex-1 sm:flex-none items-center justify-end gap-2">
            <span className="shrink-0">Search:</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && clearSearch()}
              placeholder="Search..."
              className="min-w-0 w-full sm:w-56 border border-gray-200 rounded-md px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="hidden min-[400px]:flex shrink-0 items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm border border-gray-200 text-[#263238] hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] table-fixed text-xs sm:text-sm text-left">
            <thead>
              <tr className="text-[#263238] border-b border-gray-200">
                <th className="w-1/4 px-3 sm:px-4 py-2.5 sm:py-3 font-semibold">
                  ID
                </th>
                <th
                  className="w-1/4 px-3 sm:px-4 py-2.5 sm:py-3 font-semibold cursor-pointer select-none"
                  onClick={() => toggleSort("name")}
                >
                  <span className="inline-flex items-center gap-2">
                    Name <SortIcon k="name" />
                  </span>
                </th>
                <th
                  className="w-1/4 px-3 sm:px-4 py-2.5 sm:py-3 font-semibold cursor-pointer select-none"
                  onClick={() => toggleSort("attribute")}
                >
                  <span className="inline-flex items-center gap-2">
                    Attribute <SortIcon k="attribute" />
                  </span>
                </th>
                <th className="w-1/4 px-3 sm:px-4 py-2.5 sm:py-3 font-semibold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-[#717171]"
                  >
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-[#717171]"
                  >
                    No variations found
                  </td>
                </tr>
              ) : (
                items.map((v, i) => (
                  <tr
                    key={v._id}
                    className="group border-b border-gray-100"
                  >
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 group-hover:bg-gray-100 transition-colors">
                      {(page - 1) * limit + i + 1}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 break-words">
                      {v.name}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 break-words">
                      {v.attributeName || "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                      <div className="flex items-center gap-3 text-[#263238]">
                        <button
                          onClick={() =>
                            setModal({ mode: "edit", variation: v })
                          }
                          title="Edit"
                          className="text-[#3F7A60] hover:text-[#285943] transition-colors"
                        >
                          <FaRegEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(v)}
                          title="Delete"
                          className="hover:text-red-500 transition-colors"
                        >
                          <FaTrash className="w-3.5 h-3.5" />
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 text-xs sm:text-sm text-[#717171]">
          <p className="shrink-0">
            Showing {from} to {to} of {total} entries
          </p>
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-white bg-primary hover:bg-primary-hover border border-primary-hover disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-white bg-primary hover:bg-primary-hover border border-primary-hover disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VariationModal({
  state,
  onClose,
  onSaved,
}: {
  state: Exclude<ModalState, null>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = state.mode === "edit";
  const [name, setName] = useState(editing ? state.variation.name : "");
  const [attribute, setAttribute] = useState(
    editing ? state.variation.attribute : ""
  );
  const [attributes, setAttributes] = useState<AttributeOption[]>([]);
  const [loadingAttrs, setLoadingAttrs] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${ATTR_API}?limit=100&sort=name&order=asc`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load attributes");
        setAttributes(data.items);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoadingAttrs(false);
      }
    })();
  }, []);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!attribute) {
      toast.error("Please select an attribute");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(editing ? `${API}/${state.variation._id}` : API, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, attribute }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success(editing ? "Variation updated" : "Variation added");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute right-0 top-full mt-3 z-50 w-[calc(100vw-2rem)] sm:w-96 bg-white rounded-xl shadow-xl border border-green-200 p-4 sm:p-6 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45" />

        <h2 className="text-base sm:text-lg font-semibold text-[#263238] mb-4">
          {editing ? "Edit Variation" : "Add Variation"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-[#263238] mb-1">
              Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="e.g. XL, SM, Red"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-[#263238] mb-1">
              Attribute
            </label>
            <FormSelect
              value={attribute}
              onChange={setAttribute}
              disabled={loadingAttrs}
              placeholder={
                loadingAttrs ? "Loading attributes..." : "Select Attribute"
              }
              options={attributes.map((a) => ({ value: a._id, label: a.name }))}
            />

            {!loadingAttrs && attributes.length === 0 && (
              <p className="text-[11px] sm:text-xs text-red-500 mt-1.5">
                No attributes yet. Pehle Product Attributes me attribute add karo.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5 sm:mt-6">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm bg-primary text-white hover:bg-primary-hover disabled:opacity-60 transition-colors"
          >
            {saving ? "Submitting..." : editing ? "Update" : "Submit"}
          </button>
        </div>
      </div>
    </>
  );
}
function FormSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // bahar click ya Escape par band
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

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
      >
        <span className={`truncate ${selected ? "text-[#263238]" : "text-gray-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <FaChevronDown
          className={`w-3 h-3 shrink-0 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-[60] max-h-44 sm:max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-xs sm:text-sm text-gray-400">
              No options
            </li>
          ) : (
            options.map((o) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`px-3 py-2 text-xs sm:text-sm cursor-pointer truncate transition-colors ${
                  o.value === value
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-[#263238] hover:bg-gray-50"
                }`}
              >
                {o.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}