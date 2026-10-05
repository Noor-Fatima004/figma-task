"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Category } from "@/app/admin/gallery/page";

interface Props {
  categories: Category[];
  onClose: () => void;
  onDone: () => void;
}

export default function AddImageModal({ categories, onClose, onDone }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [tag, setTag] = useState("");
  const [w, setW] = useState(400);
  const [h, setH] = useState(300);
  const [loading, setLoading] = useState(false);

  function pickFile(f: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Image select karo");
    if (!tag.trim()) return toast.error("Tag / category likho");

    setLoading(true);
    try {
      // existing category ya nayi bana do
      let cat = categories.find((c) => c.name.toLowerCase() === tag.trim().toLowerCase());
      if (!cat) {
        const res = await fetch("/api/admin/gallery/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: tag }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        cat = data;
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", cat!._id);
      fd.append("width", String(w));
      fd.append("height", String(h));

      const res = await fetch("/api/admin/gallery/images", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Image uploaded");
      onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface text-text rounded-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add New Image</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-muted hover:text-text-hover">×</button>
        </div>

        <div>
          <label className="text-sm font-medium">Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm mt-1"
          />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" className="mt-3 h-40 w-full object-cover rounded-lg" />
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Tag / Category</label>
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="e.g. banners"
            className="border border-border bg-surface text-text rounded-lg px-3 py-2 w-full text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c._id}
                  onClick={() => setTag(c.name)}
                  className={`px-2 py-1 rounded text-xs ${
                    tag.toLowerCase() === c.name.toLowerCase() ? "bg-primary text-white" : "bg-background text-text hover:bg-surface-hover hover:text-text-hover"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium">Width (px)</label>
            <input type="number" value={w} onChange={(e) => setW(+e.target.value)} className="border border-border bg-surface text-text rounded-lg px-3 py-2 w-full text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium">Height (px)</label>
            <input type="number" value={h} onChange={(e) => setH(+e.target.value)} className="border border-border bg-surface text-text rounded-lg px-3 py-2 w-full text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm bg-background text-text border border-border hover:bg-surface-hover hover:text-text-hover">
            Close
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-md text-sm bg-primary text-white hover:bg-primary-hover disabled:opacity-60 transition-colors">
            {loading ? "Uploading..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}