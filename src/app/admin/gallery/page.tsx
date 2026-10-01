"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FaEye } from "react-icons/fa";
import AddImageModal from "../AddImageModal";

export type Category = { _id: string; name: string };
type Img = { _id: string; alt: string; width: number; height: number; category: string };

export default function GalleryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<Img[]>([]);
  const [active, setActive] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/admin/gallery/categories");
    setCategories(await res.json());
  }, []);

  const loadImages = useCallback(async () => {
    const res = await fetch(`/api/admin/gallery/images?category=${active}`);
    setImages(await res.json());
    setSelected([]);
  }, [active]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { loadImages(); }, [loadImages]);

  const allSelected = images.length > 0 && selected.length === images.length;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function deleteSelected() {
    if (!selected.length) return toast.error("Please select an image first");
    if (!confirm(`${selected.length} image Are You Sure you want to Delete?`)) return;
    await Promise.all(
      selected.map((id) => fetch(`/api/admin/gallery/images/${id}`, { method: "DELETE" }))
    );
    toast.success("Deleted Successfully!");
    loadImages();
  }

  async function deleteActiveCategory() {
    if (active === "all" || !confirm("Are You Sure you want to Delete this category?")) return;
    const res = await fetch(`/api/admin/gallery/categories/${active}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    setActive("all");
    loadCategories();
  }

  return (
    <div className="">
      <h1 className="text-2xl font-bold text-gray-900 pb-4 border-b border-gray-200">Image Gallery</h1>

      {/* Categories */}
      <div className="flex flex-wrap gap-3 mt-6">
        <button
          onClick={() => setActive("all")}
          className={`px-4 py-2 rounded-md text-sm ${active === "all" ? "bg-primary text-white" : "bg-gray-100 hover:bg-gray-200 text-text"}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c._id}
            onClick={() => setActive(c._id)}
            className={`px-4 py-2 rounded-md text-sm ${active === c._id ? "bg-primary text-white" : "bg-gray-100 hover:bg-gray-200 hover:text-green-700"}`}
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
      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mt-6">
        {/* Select all + buttons */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? [] : images.map((i) => i._id))}
            />
            Select All
            <span className="text-[11px] text-gray-500">({selected.length} Item Selected)</span>
          </label>

          <div className="flex gap-2">
            <button onClick={deleteSelected} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm">
              Delete
            </button>
            <button onClick={() => setModalOpen(true)} className="bg-primary hover:opacity-90 text-white px-4 py-2 rounded-md text-sm">
              Add New
            </button>
          </div>
        </div>

        {/* Images */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
            {images.map((img) => (
                <div key={img._id} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/gallery/image/${img._id}`}
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
          className="pointer-events-auto w-11 h-11 rounded-full bg-white text-gray-800 flex items-center justify-center shadow-lg shadow-black/20 hover:bg-primary hover:text-white transition"
        >
          <FaEye />
        </Link>

        <Link
          href={`/admin/gallery/${img._id}`}
          className="pointer-events-auto text-sm font-medium text-white underline underline-offset-2 decoration-white/80 hover:text-primary-foreground/80"
        >
          Read more
        </Link>
      </div>
            </div>
            ))}
        </div>

        {images.length === 0 && <p className="text-sm text-gray-500 mt-6">Koi image nahi hai.</p>}
      </div>

      {modalOpen && (
        <AddImageModal
          categories={categories}
          onClose={() => setModalOpen(false)}
          onDone={() => { loadCategories(); loadImages(); }}
        />
      )}
    </div>
  );
}