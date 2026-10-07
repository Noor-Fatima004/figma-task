"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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

type Product = {
  id: string;
  name: string;
  image?: string;
  category: string;
  type: string;
  price: number;
  discountPrice?: number | null;
  status: "Active" | "Inactive";
};

type ApiProduct = {
  _id: string;
  media: string[];
  category: string;
  name: string;
  productType: string;
  price: number;
  discountPrice: number | null;
  isActive: boolean;
};

type ProductsPageResponse = {
  items: unknown[];
  totalPages: number;
};

const LIMITS = [10, 25, 50, 100];

const columns = [
  { key: "id", label: "ID", sortable: true },
  { key: "name", label: "Name", sortable: true },
  { key: "image", label: "Product Image", sortable: false },
  { key: "category", label: "Category", sortable: true },
  { key: "type", label: "Type", sortable: true },
  { key: "price", label: "Price (INR)", sortable: true },
  { key: "discountPrice", label: "Discount Price (INR)", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "action", label: "Action", sortable: false },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readApiProduct(value: unknown): ApiProduct {
  if (!isRecord(value)) throw new Error("Invalid product returned by the API.");
  const translations = value.translations;
  const english = isRecord(translations) ? translations.en : undefined;

  if (
    typeof value._id !== "string" ||
    !Array.isArray(value.media) ||
    !value.media.every((media) => typeof media === "string") ||
    typeof value.category !== "string" ||
    !isRecord(english) ||
    typeof english.name !== "string" ||
    typeof value.productType !== "string" ||
    typeof value.price !== "number" ||
    (value.discountPrice !== null && typeof value.discountPrice !== "number") ||
    typeof value.isActive !== "boolean"
  ) {
    throw new Error("Invalid product data returned by the API.");
  }

  return {
    _id: value._id,
    media: value.media,
    category: value.category,
    name: english.name,
    productType: value.productType,
    price: value.price,
    discountPrice: value.discountPrice,
    isActive: value.isActive,
  };
}

function readProductsPage(value: unknown): ProductsPageResponse {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    typeof value.totalPages !== "number" ||
    !Number.isInteger(value.totalPages) ||
    value.totalPages < 1
  ) {
    throw new Error("Invalid products response from the API.");
  }

  return { items: value.items, totalPages: value.totalPages };
}

function getResponseMessage(value: unknown, fallback: string) {
  if (!isRecord(value)) return fallback;
  if (typeof value.message === "string") return value.message;
  if (typeof value.error === "string") return value.error;
  return fallback;
}

async function fetchProductsPage(page: number): Promise<ProductsPageResponse> {
  const params = new URLSearchParams({ page: String(page), limit: "100" });
  const response = await fetch(`/api/catalog/products?${params}`, {
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getResponseMessage(body, "Failed to load products."));
  }
  return readProductsPage(body);
}

async function fetchCategoryNames() {
  const response = await fetch("/api/admin/product-categories?all=1", {
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getResponseMessage(body, "Failed to load product categories."));
  }
  if (
    !Array.isArray(body) ||
    !body.every(
      (category) =>
        isRecord(category) &&
        typeof category._id === "string" &&
        typeof category.name === "string"
    )
  ) {
    throw new Error("Invalid product categories response from the API.");
  }

  const categoryNames = new Map<string, string>();
  for (const category of body) {
    if (
      !isRecord(category) ||
      typeof category._id !== "string" ||
      typeof category.name !== "string"
    ) {
      throw new Error("Invalid product categories response from the API.");
    }
    categoryNames.set(category._id, category.name);
  }

  return categoryNames;
}

function productImageSrc(media: string) {
  return /^(https?:)?\/|^data:/.test(media)
    ? media
    : `/api/gallery/image/${encodeURIComponent(media)}`;
}

export default function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof Product>("id");
  const [sortAsc, setSortAsc] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    setDeletingId(product.id);
    try {
      const response = await fetch(
        `/api/catalog/products/${encodeURIComponent(product.id)}`,
        { method: "DELETE" }
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getResponseMessage(body, "Failed to delete product."));
      }

      setProducts((currentProducts) =>
        currentProducts.filter((currentProduct) => currentProduct.id !== product.id)
      );
      toast.success("Product deleted successfully.");
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete product."
      );
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      const categoriesPromise = fetchCategoryNames().catch((error: unknown) => {
        if (active) {
          console.error("Failed to load product categories:", error);
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to load product categories."
          );
        }
        return new Map<string, string>();
      });

      try {
        const firstPage = await fetchProductsPage(1);
        const apiProducts = [...firstPage.items];
        for (let currentPage = 2; currentPage <= firstPage.totalPages; currentPage++) {
          const nextPage = await fetchProductsPage(currentPage);
          apiProducts.push(...nextPage.items);
        }

        const categoryNames = await categoriesPromise;
        const list = apiProducts.map((item) => {
          const product = readApiProduct(item);
          return {
            id: product._id,
            name: product.name,
            image: product.media[0]
              ? productImageSrc(product.media[0])
              : undefined,
            category: categoryNames.get(product.category) ?? product.category,
            type: product.productType,
            price: product.price,
            discountPrice: product.discountPrice,
            status: product.isActive ? "Active" : "Inactive",
          } satisfies Product;
        });

        if (active) setProducts(list);
      } catch (error) {
        if (active) {
          console.error("Failed to load products:", error);
          toast.error(
            error instanceof Error ? error.message : "Failed to load products."
          );
          setProducts([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? products.filter((product) =>
          [product.name, product.category, product.type, product.status].some(
            (value) => value.toLowerCase().includes(q)
          )
        )
      : [...products];

    list.sort((a, b) => {
      const x = a[sortKey] ?? "";
      const y = b[sortKey] ?? "";
      if (x < y) return sortAsc ? -1 : 1;
      if (x > y) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [products, search, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  const from = filtered.length === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, filtered.length);

  const handleSort = (key: string) => {
    const k = key as keyof Product;
    if (k === sortKey) setSortAsc((v) => !v);
    else {
      setSortKey(k);
      setSortAsc(true);
    }
  };

  const clearSearch = () => {
    setSearch("");
    setPage(1);
  };

  const SortIcon = ({ k }: { k: string }) =>
    sortKey !== k ? (
      <FaSort className="h-3 w-3 text-muted" />
    ) : sortAsc ? (
      <FaSortUp className="h-3 w-3 text-secondary" />
    ) : (
      <FaSortDown className="h-3 w-3 text-secondary" />
    );

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-border pb-3 sm:pb-4">
        <h1 className="text-lg font-semibold text-text sm:text-xl lg:text-2xl">
          Product List
        </h1>

        {/* + button: click par Add Product page khulta hai */}
        <Link
          href="/admin/catalog/products/add"
          title="Add Product"
          aria-label="Add Product"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow transition-colors hover:bg-primary-hover sm:h-9 sm:w-9"
        >
          <FaPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Link>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm sm:p-5">
        {/* Toolbar */}
        <div className="mb-4 flex items-center justify-between gap-2 text-xs text-text sm:gap-3 sm:text-sm">
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            Show
            <FormSelect
              compact
              value={String(pageSize)}
              onChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
              options={LIMITS.map((l) => ({ value: String(l), label: String(l) }))}
            />
            <span className="hidden sm:inline">entries</span>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
            <span className="shrink-0">Search:</span>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              onKeyDown={(e) => e.key === "Escape" && clearSearch()}
              placeholder="Search..."
              className="w-full min-w-0 rounded-md border border-border bg-background px-3 py-1 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary sm:w-56 sm:py-1.5 sm:text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="hidden shrink-0 items-center rounded-md border border-border px-2.5 py-1 text-xs text-text transition-colors hover:bg-surface-hover hover:text-text-hover min-[400px]:flex sm:px-3 sm:py-1.5 sm:text-sm"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border text-text">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    onClick={
                      column.sortable ? () => handleSort(column.key) : undefined
                    }
                    className={`px-3 py-2.5 font-semibold sm:px-4 sm:py-3 ${
                      column.sortable ? "cursor-pointer select-none" : ""
                    } ${column.key === "id" ? "w-16 sm:w-20" : ""} ${
                      column.key === "image" ? "w-24" : ""
                    } ${column.key === "action" ? "w-24 sm:w-28" : ""}`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {column.label}
                      {column.sortable && <SortIcon k={column.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-muted"
                  >
                    Loading products...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-muted"
                  >
                    No products found
                  </td>
                </tr>
              ) : (
                rows.map((product, i) => (
                  <tr key={product.id} className="group border-b border-border">
                    {/* Mongo _id lamba hota hai, isliye yahan serial number dikhate hain */}
                    <td className="bg-background px-3 py-2.5 transition-colors group-hover:bg-surface-hover sm:px-4 sm:py-3">
                      {(current - 1) * pageSize + i + 1}
                    </td>
                    <td className="break-words px-3 py-2.5 sm:px-4 sm:py-3">
                      {product.name}
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-9 w-9 rounded object-cover sm:h-10 sm:w-10"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded bg-background sm:h-10 sm:w-10" />
                      )}
                    </td>
                    <td className="break-words px-3 py-2.5 sm:px-4 sm:py-3">
                      {product.category}
                    </td>
                    <td className="px-3 py-2.5 capitalize sm:px-4 sm:py-3">
                      {product.type}
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                      {product.price}
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                      {product.discountPrice ?? "-"}
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium sm:text-xs ${
                          product.status === "Active"
                            ? "bg-green-50 text-green-600"
                            : "bg-red-50 text-red-500"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                      <div className="flex items-center gap-3 text-text">
                        <Link
                          href={`/admin/catalog/products/${product.id}/edit`}
                          title="Edit"
                          className="text-icon transition-colors hover:text-icon-hover"
                        >
                          <FaRegEdit className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => void deleteProduct(product)}
                          disabled={deletingId === product.id}
                          className="transition-colors hover:text-red-500 disabled:opacity-50"
                        >
                          {deletingId === product.id ? (
                            <span className="text-xs">Deleting...</span>
                          ) : (
                            <FaTrash className="h-3.5 w-3.5" />
                          )}
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
            Showing {from} to {to} of {filtered.length} entries
          </p>
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <button
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              className="rounded-md border border-primary-hover bg-primary px-2.5 py-1 text-white transition-colors hover:bg-primary-hover disabled:opacity-40 sm:px-3 sm:py-1.5"
            >
              Previous
            </button>
            <span className="px-2">
              {current} / {totalPages}
            </span>
            <button
              disabled={current >= totalPages}
              onClick={() => setPage(current + 1)}
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

/* ───────────────────────── Responsive custom select ───────────────────────── */

function FormSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled = false,
  inline = false, // true: list neeche content ko dhakel kar khulti hai (scroll area me clip nahi hoti)
  compact = false, // true: chhota trigger (Show entries wale dropdown ke liye)
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  inline?: boolean;
  compact?: boolean;
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
    <div ref={ref} className={compact ? "relative inline-block" : "relative"}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center justify-between gap-2 border border-border bg-surface text-text text-left focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 ${
          compact
            ? "rounded-md px-2 py-1 text-xs sm:text-sm min-w-[3.5rem]"
            : "w-full rounded-lg px-3 py-2 text-sm"
        }`}
      >
        <span className={`truncate ${selected ? "text-text" : "text-muted"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <FaChevronDown
          className={`w-3 h-3 shrink-0 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className={`${
            inline
              ? "mt-1"
              : `absolute top-full mt-1 z-[60] left-0 ${
                  compact ? "min-w-full" : "right-0"
                }`
          } max-h-44 sm:max-h-52 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg py-1`}
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-xs sm:text-sm text-muted">
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
                    : "text-text hover:bg-surface-hover hover:text-text-hover"
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