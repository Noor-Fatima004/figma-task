"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Prod = { _id: string; name: string; slug: string; stock: number };
type Img = { _id: string; url: string };

const toSlug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function StockBadge({ stock }: { stock: number }) {
  return stock > 0 ? (
    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
      {stock} in stock
    </span>
  ) : (
    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
      Out of stock
    </span>
  );
}

/* ───────── Product picker modal ───────── */
function ProductPickerModal({
  products,
  loading,
  initial,
  onClose,
  onDone,
}: {
  products: Prod[];
  loading: boolean;
  initial: string[];
  onClose: () => void;
  onDone: (ids: string[]) => void;
}) {
  const [temp, setTemp] = useState<string[]>(initial);
  const [search, setSearch] = useState("");
  const [onlyInStock, setOnlyInStock] = useState(true);

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        (!onlyInStock || p.stock > 0) &&
        (p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
    );
  }, [products, search, onlyInStock]);

  const toggle = (id: string) =>
    setTemp((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const allVisibleSelected = visible.length > 0 && visible.every((p) => temp.includes(p._id));

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      const hide = new Set(visible.map((p) => p._id));
      setTemp((s) => s.filter((id) => !hide.has(id)));
    } else {
      setTemp((s) => [...new Set([...s, ...visible.map((p) => p._id)])]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl bg-surface text-text"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">Select products</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-muted hover:text-text-hover"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or slug"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={toggleAllVisible}
              className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs hover:bg-surface-hover"
            >
              {allVisibleSelected ? "Unselect all" : "Select all"}
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
            />
            Only show products in stock
          </label>
        </div>

        <div className="flex-1 divide-y divide-border overflow-y-auto">
          {loading ? (
            <p className="p-5 text-sm text-muted">Loading...</p>
          ) : visible.length === 0 ? (
            <p className="p-5 text-sm text-muted">No products found.</p>
          ) : (
            visible.map((p) => (
              <label
                key={p._id}
                className="flex cursor-pointer items-center gap-3 px-5 py-2.5 text-sm hover:bg-surface-hover"
              >
                <input
                  type="checkbox"
                  checked={temp.includes(p._id)}
                  onChange={() => toggle(p._id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{p.name}</span>
                  {p.slug && <span className="block truncate text-xs text-muted">{p.slug}</span>}
                </span>
                <StockBadge stock={p.stock} />
              </label>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-sm text-muted">{temp.length} selected</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onDone(temp)}
              className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Gallery picker modal ───────── */
function GalleryPickerModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (img: Img) => void;
}) {
  const [images, setImages] = useState<Img[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/gallery/images", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const d = await r.json();
        const list = Array.isArray(d) ? d : d.items ?? d.images ?? [];
        setImages(list.filter((i: Img) => i?._id && i?.url));
      })
      .catch(() => toast.error("Could not load gallery images"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-surface text-text"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">Select image from gallery</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-muted hover:text-text-hover"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : images.length === 0 ? (
            <p className="text-sm text-muted">No images in the gallery yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {images.map((img) => (
                <button
                  type="button"
                  key={img._id}
                  onClick={() => onPick(img)}
                  className="aspect-square overflow-hidden rounded-lg border border-border hover:ring-2 hover:ring-primary"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────── Page ───────── */
export default function AddCollectionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<Img | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [products, setProducts] = useState<Prod[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/collections/products", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        setProducts(await r.json());
      })
      .catch(() => toast.error("Could not load products"))
      .finally(() => setProductsLoading(false));
  }, []);

  const selectedProducts = useMemo(
    () => selected.map((id) => products.find((p) => p._id === id)).filter(Boolean) as Prod[],
    [selected, products]
  );

  const removeProduct = (id: string) => setSelected((s) => s.filter((x) => x !== id));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) return toast.error("Collection name is required");

    setSaving(true);
    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: toSlug(slug),
          description,
          image: image?._id ?? null,
          products: selected,
          isActive,
          sortOrder,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Collection created");
      router.push("/admin/collections");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create collection");
    } finally {
      setSaving(false);
    }
  };

  const input =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <>
      <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        <h1 className="text-xl font-semibold">Add Collection</h1>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Name *</label>
            <input
              className={input}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(toSlug(e.target.value));
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Slug</label>
            <input
              className={input}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
              }}
              placeholder="auto from name"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            className={input}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* IMAGE */}
        <div>
          <label className="mb-1 block text-sm font-medium">Cover image</label>
          {image ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt=""
                className="h-24 w-24 rounded-lg border border-gray-200 object-cover"
              />
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setImagePickerOpen(true)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-red-600 hover:bg-gray-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setImagePickerOpen(true)}
              className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600 hover:bg-gray-50"
            >
              + Select image from gallery
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Sort order</label>
            <input
              type="number"
              className={input}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </div>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active (storefront par dikhe)
          </label>
        </div>

        {/* PRODUCTS */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium">Products ({selected.length} selected)</label>
            <button
              type="button"
              onClick={() => setProductPickerOpen(true)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              {selected.length ? "Edit products" : "+ Select products"}
            </button>
          </div>

          {selectedProducts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
              No products selected yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 p-3">
              {selectedProducts.map((p) => (
                <span
                  key={p._id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs"
                >
                  {p.name}
                  <span className={p.stock > 0 ? "text-green-700" : "text-red-600"}>
                    ({p.stock})
                  </span>
                  <button
                    type="button"
                    onClick={() => removeProduct(p._id)}
                    aria-label={`Remove ${p.name}`}
                    className="text-gray-500 hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Create collection"}
        </button>
      </form>

      {imagePickerOpen && (
        <GalleryPickerModal
          onClose={() => setImagePickerOpen(false)}
          onPick={(img) => {
            setImage(img);
            setImagePickerOpen(false);
          }}
        />
      )}

      {productPickerOpen && (
        <ProductPickerModal
          products={products}
          loading={productsLoading}
          initial={selected}
          onClose={() => setProductPickerOpen(false)}
          onDone={(ids) => {
            setSelected(ids);
            setProductPickerOpen(false);
          }}
        />
      )}
    </>
  );
}