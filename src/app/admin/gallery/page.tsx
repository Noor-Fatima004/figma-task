"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FaEye } from "react-icons/fa";
import AddImageModal from "../AddImageModal";
import { imgSrc } from "@/app/admin/GalleryPicker";

export type Category = { _id: string; name: string };
type Img = {
  _id: string;
  alt: string;
  url: string;
  width: number;
  height: number;
  category: string;
};

export default function GalleryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<Img[]>([]);
  const [active, setActive] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/admin/gallery/categories");
    return (await res.json()) as Category[];
  }, []);

  const loadImages = useCallback(async () => {
    const res = await fetch(`/api/admin/gallery/images?category=${active}`);
    return (await res.json()) as Img[];
  }, [active]);

  useEffect(() => {
    let cancelled = false;
    void loadCategories().then((items) => {
      if (!cancelled) setCategories(items);
    });
    return () => { cancelled = true; };
  }, [loadCategories]);

  useEffect(() => {
    let cancelled = false;
    void loadImages().then((items) => {
      if (!cancelled) {
        setImages(items);
        setSelected([]);
      }
    });
    return () => { cancelled = true; };
  }, [loadImages]);

  const allSelected = images.length > 0 && selected.length === images.length;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function deleteSelected() {
    if (!selected.length) return toast.error("Please select an image first");
    if (!confirm(`${selected.length} image Are You Sure you want to Delete?`)) return;
    try {
      const res = await fetch("/api/admin/gallery/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected }),
      });
      const data: {
        error?: string;
        deleted?: string[];
        skipped?: { id: string; reason: string }[];
      } = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete images");
      if (data.deleted?.length) {
        toast.success(`${data.deleted.length} image(s) deleted`);
      }
      if (data.skipped?.length) {
        toast.error(
          data.skipped
            .map(({ id, reason }) => `${id.slice(-6)}: ${reason}`)
            .join("; ")
        );
      }
      setImages(await loadImages());
      setSelected([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete images");
    }
  }

  async function deleteActiveCategory() {
    if (active === "all" || !confirm("Are You Sure you want to Delete this category?")) return;
    const res = await fetch(`/api/admin/gallery/categories/${active}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    setActive("all");
    setCategories(await loadCategories());
  }

  return (
    <div className="">
      <h1 className="text-2xl font-bold text-text pb-4 border-b border-border">Image Gallery</h1>

      {/* Categories */}
      <div className="flex flex-wrap gap-3 mt-6">
        <button
          onClick={() => setActive("all")}
          className={`px-4 py-2 rounded-md text-sm transition-colors ${active === "all" ? "bg-primary text-white" : "bg-background hover:bg-surface-hover hover:text-text-hover text-text"}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c._id}
            onClick={() => setActive(c._id)}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${active === c._id ? "bg-primary text-white" : "bg-background hover:bg-surface-hover hover:text-text-hover text-text"}`}
          >
            {c.name}
          </button>
        ))}
        {active !== "all" && (
          <button onClick={deleteActiveCategory} className="text-xs text-red-500 underline self-center">
            delete category
          </button>
        )}
      </div>

      {/* Card */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-4 md:p-6 mt-6">
        {/* Select all + buttons */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? [] : images.map((i) => i._id))}
            />
            Select All
            <span className="text-[11px] text-muted">({selected.length} Item Selected)</span>
          </label>

          <div className="flex gap-2">
            <button onClick={deleteSelected} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm">
              Delete
            </button>
            <button onClick={() => setModalOpen(true)} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md text-sm transition-colors">
              Add New
            </button>
          </div>
        </div>

        {/* Images */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
            {images.map((img) => (
                <div key={img._id} className="group relative aspect-square rounded-xl overflow-hidden bg-background">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.url || imgSrc(img._id)}
        alt={img.alt}
        className="w-full h-full object-cover transition duration-300 group-hover:blur-[3px] group-hover:scale-105"
      />

      <input
        type="checkbox"
        checked={selected.includes(img._id)}
        onChange={() => toggle(img._id)}
        className="absolute top-2 left-2 w-4 h-4 z-10"
      />

      {/* hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col items-center justify-center gap-2 pointer-events-none backdrop-blur-[1px]">
        <Link
          href={`/admin/gallery/${img._id}`}
          title="View more"
          className="pointer-events-auto w-11 h-11 rounded-full bg-surface text-text flex items-center justify-center shadow-lg shadow-black/20 hover:bg-primary hover:text-white transition"
        >
          <FaEye />
        </Link>

        <Link
          href={`/admin/gallery/${img._id}`}
          className="pointer-events-auto text-sm font-medium text-white underline underline-offset-2 decoration-white/80 hover:text-secondary transition-colors"
        >
          Read more
        </Link>
      </div>
            </div>
            ))}
        </div>

        {images.length === 0 && <p className="text-sm text-muted mt-6">No images found.</p>}
      </div>

      {modalOpen && (
        <AddImageModal
          categories={categories}
          onClose={() => setModalOpen(false)}
          onDone={async () => {
            setCategories(await loadCategories());
            setImages(await loadImages());
            setSelected([]);
          }}
        />
      )}
    </div>
  );
}