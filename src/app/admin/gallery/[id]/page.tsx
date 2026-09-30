"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { FaArrowLeft, FaCopy } from "react-icons/fa";

type Category = { _id: string; name: string };
type Img = { _id: string; alt: string; width: number; height: number; category: string };

// box ke andar ratio ke hisaab se fit karta hai
const fit = (w: number, h: number, maxW = 360, maxH = 220) => {
  const s = Math.min(maxW / w, maxH / h);
  return { width: w * s, height: h * s };
};

/* ---------- Image card (sab images ke liye same) ---------- */
function ImageCard({
  v,
  categories,
  onDeleted,
}: {
  v: Img;
  categories: Category[];
  onDeleted: (id: string) => void;
}) {
  const [data, setData] = useState<Img>(v);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [saving, setSaving] = useState(false);
  const size = fit(data.width || 1, data.height || 1);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/gallery/images/${v._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        width: data.width,
        height: data.height,
        alt: data.alt,
        category: data.category,
      }),
    });
    setSaving(false);
    res.ok ? toast.success("Updated") : toast.error("Update failed");
  }

  async function remove() {
    if (!confirm("Ye image delete karni hai?")) return;
    await fetch(`/api/admin/gallery/images/${v._id}`, { method: "DELETE" });
    toast.success("Deleted");
    onDeleted(v._id);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 grid gap-6 md:grid-cols-2">
      <div className="bg-gray-50 rounded-lg flex items-center justify-center p-4 min-h-56">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/gallery/image/${v._id}`}
          alt={data.alt}
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          style={{ width: size.width, height: size.height, objectFit: "cover" }}
          className="rounded-lg"
        />
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div>
          <h3 className="text-lg text-[#4CAF4F]">
            {data.width} × {data.height}px
          </h3>
          <p className="text-xs text-gray-500">
            Actual Size ( {natural.w}*{natural.h} )
          </p>
        </div>

        <div>
          <label className="text-sm font-semibold">Image ID</label>
          <div className="flex items-center gap-2 border bg-white rounded px-3 py-2 text-sm mt-1">
            <code className="truncate flex-1">{v._id}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(v._id);
                toast.success("ID copied");
              }}
            >
              <FaCopy />
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold">Image Tag</label>
          <select
            value={data.category}
            onChange={(e) => setData({ ...data, category: e.target.value })}
            className="border rounded-lg px-3 py-2 w-full text-sm mt-1 bg-white"
          >
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-sm font-semibold">Height</label>
            <input
              type="number"
              value={data.height}
              onChange={(e) => setData({ ...data, height: +e.target.value })}
              className="border rounded-lg px-3 py-2 w-full text-sm mt-1"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-semibold">Width</label>
            <input
              type="number"
              value={data.width}
              onChange={(e) => setData({ ...data, width: +e.target.value })}
              className="border rounded-lg px-3 py-2 w-full text-sm mt-1"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold">Alt text</label>
          <input
            value={data.alt}
            onChange={(e) => setData({ ...data, alt: e.target.value })}
            className="border rounded-lg px-3 py-2 w-full text-sm mt-1"
          />
        </div>

        <div className="flex justify-between pt-1">
          <button onClick={remove} className="bg-red-500 text-white px-4 py-2 rounded-md text-sm">
            Delete
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="bg-[#4CAF4F] text-white px-5 py-2 rounded-md text-sm disabled:opacity-60"
          >
            {saving ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function ImageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [items, setItems] = useState<Img[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    (async () => {
      const [a, b, c] = await Promise.all([
        fetch(`/api/admin/gallery/images/${id}`),
        fetch("/api/admin/gallery/categories"),
        fetch(`/api/admin/gallery/images/${id}/variants`),
      ]);
      if (!a.ok) return toast.error("Image nahi mili");

      const current: Img = await a.json();
      const others: Img[] = c.ok ? await c.json() : [];

      setItems([current, ...others]); // jis par click kiya wo pehle, phir same name wali
      setCategories(await b.json());
    })();
  }, [id]);

  function handleDeleted(deletedId: string) {
    if (deletedId === id) return router.push("/admin/gallery");
    setItems((prev) => prev.filter((x) => x._id !== deletedId));
  }

  if (items.length === 0) return <div className="p-8 text-sm text-gray-500">Loading...</div>;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Image Detail</h1>
        <Link href="/admin/gallery" className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#4CAF4F]">
          <FaArrowLeft /> Back
        </Link>
      </div>

      {items.map((v) => (
        <ImageCard key={v._id} v={v} categories={categories} onDeleted={handleDeleted} />
      ))}
    </div>
  );
}