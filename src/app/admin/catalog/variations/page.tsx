"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FaPlus,
  FaRegEdit,
  FaTrash,
  FaSort,
  FaSortUp,
  FaSortDown,
} from "react-icons/fa";
type Variation = {
  _id: string;
  name: string;
  attribute: string;
  attributeName: string;
};
type AttributeOption = { _id: string; name: string };
type SortKey = "createdAt" | "name" | "attribute";
type ModalState = null | { mode: "add" } | { mode: "edit"; variation: Variation };
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative flex items-center justify-between pb-4 border-b border-gray-200">
        <h1 className="text-xl sm:text-2xl font-semibold text-[#263238]">
          Product Variations
        </h1>
        <div className="relative">
          <button
            onClick={() => setModal({ mode: "add" })}
            title="Add variation"
            className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow transition-colors"
          >
            <FaPlus className="w-4 h-4" />
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 text-sm text-[#263238]">
          <label className="flex items-center gap-2">
            Show
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="border border-gray-200 rounded-md px-2 py-1 bg-white"
            >
              {LIMITS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            entries
          </label>

          <div className="flex items-center gap-2">
  <span>Search:</span>

  {/* items-stretch: Clear button input ki exact height le leta hai */}
  <div className="flex items-stretch gap-3">
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      onKeyDown={(e) => e.key === "Escape" && clearSearch()}
      className="border border-gray-200 rounded-md px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
    />

    {search && (
      <button
        type="button"
        onClick={clearSearch}
        className="flex items-center px-3 rounded-md text-sm border border-gray-200 text-[#263238] hover:bg-gray-50 transition-colors"
      >
        Clear
      </button>
    )}
  </div>
</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] table-fixed text-sm text-left">
            <thead>
              <tr className="text-[#263238] border-b border-gray-200 text-left">
                <th className="px-4 py-3 font-semibold text-left">ID</th>
                <th
                  className="px-4 py-3 font-semibold text-left cursor-pointer select-none"
                  onClick={() => toggleSort("name")}
                >
                  <span className="inline-flex items-center gap-2">
                    Name <SortIcon k="name" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 font-semibold text-left cursor-pointer select-none"
                  onClick={() => toggleSort("attribute")}
                >
                  <span className="inline-flex items-center gap-2">
                    Attribute <SortIcon k="attribute" />
                  </span>
                </th>
                <th className="px-4 py-3 font-semibold text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#717171]">
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#717171]">
                    No variations found
                  </td>
                </tr>
              ) : (
                items.map((v, i) => (
                  <tr key={v._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 bg-gray-50">
                      {(page - 1) * limit + i + 1}
                    </td>
                    <td className="px-4 py-3 truncate">{v.name}</td>
                    <td className="px-4 py-3 truncate">{v.attributeName || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-[#263238]">
                        <button
                          onClick={() => setModal({ mode: "edit", variation: v })}
                          title="Edit"
                          className="text-[#3F7A60] hover:text-[#285943] transition-colors"
                        >
                          <FaRegEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(v)}
                          title="Delete"
                          className="hover:text-red-500"
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 text-sm text-[#717171]">
          <p>
            Showing {from} to {to} of {total} entries
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-md text-white bg-primary border border-primary-hover disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-md text-white bg-primary border border-primary-hover disabled:opacity-40 transition-colors"
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
        className="absolute right-0 top-full mt-3 z-50 w-[calc(100vw-2rem)] sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45" />

        <h2 className="text-lg font-semibold text-[#263238] mb-4">
          {editing ? "Edit Variation" : "Add Variation"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#263238] mb-1">
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
            <label className="block text-sm font-medium text-[#263238] mb-1">
              Attribute
            </label>
            <select
              value={attribute}
              onChange={(e) => setAttribute(e.target.value)}
              disabled={loadingAttrs}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
            >
              <option value="">
                {loadingAttrs ? "Loading attributes..." : "Select Attribute"}
              </option>
              {attributes.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>

            {!loadingAttrs && attributes.length === 0 && (
              <p className="text-xs text-red-500 mt-1.5">
                No attributes yet. Pehle Product Attributes me attribute add karo.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm bg-primary text-white hover:bg-primary-hover disabled:opacity-60 transition-colors"
          >
            {saving ? "Submitting..." : editing ? "Update" : "Submit"}
          </button>
        </div>
      </div>
    </>
  );
}