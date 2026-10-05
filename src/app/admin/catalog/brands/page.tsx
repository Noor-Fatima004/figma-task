"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  FaPlus,
  FaRegEdit,
  FaTrash,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaTimes,
} from "react-icons/fa";
import AddImageModal from "@/app/admin/AddImageModal";

type Brand = {
  _id: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  image: string; // gallery image id ("" = no image)
};
type GalleryCategory = { _id: string; name: string };
type GalleryImage = { _id: string; alt: string };
type SortKey = "createdAt" | "name" | "slug" | "status";
type ModalState = null | { mode: "add" } | { mode: "edit"; brand: Brand };

const LIMITS = [10, 25, 50, 100];
const API = "/api/admin/product-brands";
const imgSrc = (id: string) => `/api/gallery/image/${id}`;

export default function ProductBrandsPage() {
  const [items, setItems] = useState<Brand[]>([]);
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
      toast.error(e.message || "Failed to load brands");
    } finally {
      setLoading(false);
    }
  }, [debounced, page, limit, sort, order]);

  useEffect(() => {
    load();
  }, [load]);
  const clearSearch = () => {
  setSearch("");
  setDebounced(""); // turant reset, 300ms wait nahi
  setPage(1);
};
  const toggleSort = (key: SortKey) => {
    if (sort === key) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setOrder("asc");
    }
  };

  const handleDelete = async (b: Brand) => {
    if (!confirm(`Delete brand "${b.name}"?`)) return;
    try {
      const res = await fetch(`${API}/${b._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Brand deleted");
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
          Product Brands
        </h1>

        <div className="relative">
          <button
            onClick={() => setModal({ mode: "add" })}
            title="Add brand"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow transition-colors"
          >
            <FaPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {modal && (
            <BrandModal
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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs sm:text-sm text-left">
            <thead>
              <tr className="text-[#263238] border-b border-gray-200">
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold w-16 sm:w-20">ID</th>
                <th
                  className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold cursor-pointer select-none"
                  onClick={() => toggleSort("name")}
                >
                  <span className="inline-flex items-center gap-2">
                    Name <SortIcon k="name" />
                  </span>
                </th>
                <th
                  className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold cursor-pointer select-none"
                  onClick={() => toggleSort("slug")}
                >
                  <span className="inline-flex items-center gap-2">
                    Slug <SortIcon k="slug" />
                  </span>
                </th>
                <th
                  className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold cursor-pointer select-none"
                  onClick={() => toggleSort("status")}
                >
                  <span className="inline-flex items-center gap-2">
                    Status <SortIcon k="status" />
                  </span>
                </th>
                <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold w-20 sm:w-28">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#717171]">
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#717171]">
                    No brands found
                  </td>
                </tr>
              ) : (
                items.map((b, i) => (
                  <tr key={b._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50">
                      {(page - 1) * limit + i + 1}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {b.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imgSrc(b.image)}
                            alt={b.name}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded object-cover shrink-0 bg-gray-100"
                          />
                        )}
                        <span className="break-words">{b.name}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 break-words">{b.slug}</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-medium ${
                          b.status === "active"
                            ? "bg-green-50 text-green-600"
                            : "bg-red-50 text-red-500"
                        }`}
                      >
                        {b.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                      <div className="flex items-center gap-3 text-[#263238]">
                        <button
                          onClick={() => setModal({ mode: "edit", brand: b })}
                          title="Edit"
                          className="text-[#3F7A60] hover:text-[#285943] transition-colors"
                        >
                          <FaRegEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b)}
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

/* ───────────────────────── Add / Edit brand popup ───────────────────────── */

function BrandModal({
  state,
  onClose,
  onSaved,
}: {
  state: Exclude<ModalState, null>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = state.mode === "edit";
  const [name, setName] = useState(editing ? state.brand.name : "");
  const [status, setStatus] = useState<"active" | "inactive">(
    editing ? state.brand.status : "active"
  );
  const [image, setImage] = useState(editing ? state.brand.image : "");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Brand name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(editing ? `${API}/${state.brand._id}` : API, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status, image }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      toast.success(editing ? "Brand updated" : "Brand added");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* transparent backdrop: click outside to close */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute right-0 top-full mt-3 z-50 w-[calc(100vw-2rem)] sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 p-4 sm:p-6 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45" />
        <h2 className="text-base sm:text-lg font-semibold text-[#263238] mb-4">
          {editing ? "Edit Brand" : "Add Brand"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-[#263238] mb-1">
              Brand Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="e.g. Nike, KIA"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-[#263238] mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {/* Brand media */}
          <div>
            {image ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc(image)}
                  alt="Brand"
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover border border-gray-200 bg-gray-100"
                />
                <div className="flex flex-col items-start gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    className="text-xs sm:text-sm text-primary underline"
                  >
                    Change image
                  </button>
                  <button
                    type="button"
                    onClick={() => setImage("")}
                    className="text-xs sm:text-sm text-red-500 underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm bg-primary hover:bg-primary-hover text-white transition-colors"
                >
                  Upload Brand Media
                </button>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Select image file from gallery.
                </p>
              </>
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
      {showPicker && (
        <GalleryPicker
          selectedId={image}
          onClose={() => setShowPicker(false)}
          onSelect={(id) => {
            setImage(id);
            setShowPicker(false);
          }}
        />
      )}
    </>
  );
}
/* ───────────────────────── Gallery image picker ───────────────────────── */
function GalleryPicker({
  selectedId,
  onSelect,
  onClose,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [active, setActive] = useState("all");
  const [picked, setPicked] = useState(selectedId);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const knownIds = useRef<Set<string>>(new Set());
  const openUpload = async () => {
    try {
      const res = await fetch("/api/admin/gallery/images?category=all", {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        knownIds.current = new Set((data as GalleryImage[]).map((i) => i._id));
      }
    } catch {}
    setShowUpload(true);
  };
  const handleUploaded = async () => {
    setShowUpload(false);
    loadCategories();
    try {
      const res = await fetch("/api/admin/gallery/images?category=all", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      const fresh = (data as GalleryImage[]).filter(
        (i) => !knownIds.current.has(i._id)
      );
      if (fresh.length > 0) {
        onSelect(fresh[0]._id);
        return;
      }
    } catch {
    }
    loadImages();
  };
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/gallery/categories", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setCategories(data);
    } catch {
    }
  }, []);

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/gallery/images?category=${active}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load images");
      setImages(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);
  return createPortal(
    <div
      className="fixed top-16 right-0 bottom-0 left-0 lg:left-64 z-[60] bg-black/40 flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-primary w-full max-w-5xl max-h-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* top bar */}
        <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-3 border-b border-gray-100 shrink-0">
          <h3 className="text-sm sm:text-base font-semibold text-[#263238] truncate">
            Select image from gallery
          </h3>
          <button
            onClick={onClose}
            title="Close"
            className="w-8 h-8 shrink-0 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100"
          >
            <FaTimes />
          </button>
        </div>

        <div className="px-3 sm:px-5 pt-3 sm:pt-4 flex flex-wrap gap-2 max-h-28 overflow-y-auto shrink-0">
          <button
            onClick={() => setActive("all")}
            className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm ${
              active === "all"
                ? "bg-primary text-white"
                : "bg-gray-100 hover:bg-gray-200 text-[#263238]"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              onClick={() => setActive(c._id)}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm ${
                active === c._id
                  ? "bg-primary text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-[#263238]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        {/* toolbar */}
        <div className="px-3 sm:px-5 py-3 flex flex-wrap justify-end gap-2 shrink-0">
          <button
            onClick={openUpload}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm border border-primary text-primary hover:bg-primary hover:text-white transition-colors"
          >
            Upload from device
          </button>
          <button
            onClick={loadImages}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm bg-primary hover:bg-primary-hover text-white transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="px-3 sm:px-5 pb-4 overflow-y-auto flex-1 min-h-[120px]">
          {loading ? (
            <p className="text-xs sm:text-sm text-gray-500 py-8 text-center">Loading...</p>
          ) : images.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-500 py-8 text-center">No images found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {images.map((img) => (
                <button
                  key={img._id}
                  type="button"
                  onClick={() => setPicked(img._id)}
                  onDoubleClick={() => onSelect(img._id)}
                  className={`aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 transition ${
                    picked === img._id
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <img
                    src={imgSrc(img._id)}
                    alt={img.alt}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-3 sm:px-5 py-3 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!picked}
            onClick={() => onSelect(picked)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm bg-primary hover:bg-primary-hover text-white disabled:opacity-50 transition-colors"
          >
            Select Image
          </button>
        </div>
      </div>
      {showUpload && (
        <div className="relative z-[70]" onClick={(e) => e.stopPropagation()}>
          <AddImageModal
            categories={categories}
            onClose={() => setShowUpload(false)}
            onDone={handleUploaded}
          />
        </div>
      )}
    </div>,
    document.body
  );
}