"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FaTimes } from "react-icons/fa";
import AddImageModal from "@/app/admin/AddImageModal";

export type GalleryCategory = { _id: string; name: string };
export type GalleryImage = { _id: string; alt: string };
export const imgSrc = (id: string) => `/api/gallery/image/${id}`;

export default function GalleryPicker({
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

  // upload se pehle gallery me jo image ids thi
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
    } catch {
      /* snapshot na bane to bhi upload khul jayega */
    }
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
        onSelect(fresh[0]._id); // nayi image select + picker band
        return;
      }
    } catch {
      /* neeche fallback chalega */
    }

    // nayi image nahi mili to bas list refresh kar do
    loadImages();
  };

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/gallery/categories", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setCategories(data);
    } catch {
      /* ignore */
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

  // Portal: sirf content area me (sidebar aur topbar ke upar nahi)
  return createPortal(
    <div
      className="fixed top-16 right-0 bottom-0 left-0 lg:left-64 z-[60] bg-black/40 flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface text-text rounded-xl shadow-2xl border border-border w-full max-w-5xl max-h-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* top bar */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border shrink-0">
          <h3 className="text-sm sm:text-base font-semibold text-text truncate">
            Select image from gallery
          </h3>
          <button
            onClick={onClose}
            title="Close"
            className="w-8 h-8 shrink-0 rounded-md flex items-center justify-center text-muted hover:bg-surface-hover hover:text-text-hover transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* category chips */}
        <div className="px-4 sm:px-5 pt-4 flex flex-wrap gap-2 max-h-28 overflow-y-auto shrink-0">
          <button
            onClick={() => setActive("all")}
            className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm ${
              active === "all"
                ? "bg-primary text-white"
                : "bg-background hover:bg-surface-hover hover:text-text-hover text-text"
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
                  : "bg-background hover:bg-surface-hover hover:text-text-hover text-text"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* toolbar */}
        <div className="px-4 sm:px-5 py-3 flex flex-wrap justify-end gap-2 shrink-0">
          <button
            onClick={openUpload}
            className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm border border-border text-primary hover:border-primary-hover hover:bg-primary hover:text-white transition-colors"
          >
            Upload from device
          </button>
          <button
            onClick={loadImages}
            className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm bg-primary text-white"
          >
            Refresh
          </button>
        </div>

        {/* image grid (scrollable) */}
        <div className="px-4 sm:px-5 pb-4 overflow-y-auto flex-1 min-h-[120px]">
          {loading ? (
            <p className="text-sm text-muted py-8 text-center">Loading...</p>
          ) : images.length === 0 ? (
            <p className="text-sm text-muted py-8 text-center">No images found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {images.map((img) => (
                <button
                  key={img._id}
                  type="button"
                  onClick={() => setPicked(img._id)}
                  onDoubleClick={() => onSelect(img._id)}
                  className={`aspect-square rounded-lg overflow-hidden bg-background border-2 transition ${
                    picked === img._id
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-border-hover"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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

        {/* footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-4 sm:px-5 py-3 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm border border-border text-text hover:bg-surface-hover hover:text-text-hover transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!picked}
            onClick={() => onSelect(picked)}
            className="px-4 py-2 rounded-lg text-sm bg-primary text-white disabled:opacity-50"
          >
            Select Image
          </button>
        </div>
      </div>

      {/* Device se upload: existing AddImageModal */}
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