"use client";

import { useEffect, useRef, useState } from "react";
import { FaPlus, FaTimes, FaChevronDown } from "react-icons/fa";
import GalleryPicker, { imgSrc } from "@/app/admin/GalleryPicker";
import { toast } from "sonner";

export const LANGUAGES = [{ code: "en", label: "English" }] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

export type Translation = { name: string; description: string };

export type BasicInfoData = {
  media: string[]; // gallery image ids (purane URLs bhi chalenge)
  category: string; // category _id
  translations: Record<string, Translation>;
  videoEmbedCode: string;
};

export const emptyBasicInfo: BasicInfoData = {
  media: [],
  category: "",
  translations: Object.fromEntries(
    LANGUAGES.map((l) => [l.code, { name: "", description: "" }])
  ),
  videoEmbedCode: "",
};

type Category = { _id: string; name: string };

// gallery id ho to API url banao, pehle se URL ho to waisa hi rehne do
const mediaSrc = (m: string) =>
  /^(https?:)?\/|^data:/.test(m) ? m : imgSrc(m);

interface Props {
  data: BasicInfoData;
  onChange: (data: BasicInfoData) => void;
  onContinue: () => void;
  /** Zod validation ke errors, key jaise "category", "translations.en.name" */
  errors?: Record<string, string>;
  /** Ab zaroorat nahi: Add Media ab andar se GalleryPicker kholta hai */
  onAddMedia?: () => void;
}

export default function BasicInfoStep({
  data,
  onChange,
  onContinue,
  errors = {},
}: Props) {
  const lang: LangCode = "en";
  const [categories, setCategories] = useState<Category[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const err = (k: string) =>
    errors[k] ? <p className="mt-1 text-xs text-red-500">{errors[k]}</p> : null;

  // Categories API se load
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/product-categories?all=1", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load categories (${response.status})`);
        }
        const categories: unknown = await response.json();
        if (
          !Array.isArray(categories) ||
          !categories.every(
            (category) =>
              typeof category?._id === "string" &&
              typeof category?.name === "string"
          )
        ) {
          throw new Error("Invalid categories response");
        }
        return categories as Category[];
      })
      .then((list) => {
        if (!alive) return;
        setCategories(list);
      })
      .catch((error: unknown) => {
        console.error("Failed to load product categories:", error);
        toast.error(
        error instanceof Error ? error.message : "Failed to load categories"
      );
      if (alive) setCategories([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const current = data.translations[lang];
  const langLabel = LANGUAGES.find((l) => l.code === lang)?.label;

  const setTranslation = (patch: Partial<Translation>) =>
    onChange({
      ...data,
      translations: {
        ...data.translations,
        [lang]: { ...current, ...patch },
      },
    });

  const addMedia = (id: string) => {
    if (data.media.includes(id)) {
      toast.error("This image is already added");
    } else {
      onChange({ ...data, media: [...data.media, id] });
      toast.success("Media added");
    }
    setShowPicker(false);
  };

  const removeMedia = (m: string) => {
    onChange({ ...data, media: data.media.filter((x) => x !== m) });
    toast.success("Media removed");
  };
  const handleContinue = () => {
  const missing: string[] = [];
  if (!data.category) missing.push("Category");
  if (!current.name.trim()) missing.push("Product name");

  if (missing.length > 0) {
    toast.error(`Please fill required fields`);
  }

  // Parent ka Zod validation hamesha chalne do, taaki inline errors bhi dikhein
  onContinue();
};
  return (
    <>
      <div className="rounded-md bg-white p-5 shadow">
        <h2 className="text-lg font-semibold text-gray-800">
          General Information
        </h2>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {/* LEFT: media */}
          <div>
            <div className="border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="rounded bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition-colors"
              >
                Add Media
              </button>
            </div>

            {data.media.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-200 pt-4 sm:grid-cols-4">
                {data.media.map((m) => (
                  <div
                    key={m}
                    className="group relative aspect-square overflow-hidden rounded border border-gray-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaSrc(m)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeMedia(m)}
                      className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-1 text-white group-hover:block"
                      aria-label="Remove"
                    >
                      <FaTimes className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="flex aspect-square items-center justify-center rounded border border-dashed border-gray-300 text-gray-400 hover:text-gray-600"
                >
                  <FaPlus />
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: category + name/description */}
          <div className="min-w-0">
            <label className="block text-xs text-gray-700">Categories</label>
            <div className="mt-1">
            <FormSelect
              value={data.category}
              onChange={(v) => onChange({ ...data, category: v })}
              placeholder="Select one"
              options={categories.map((c) => ({ value: c._id, label: c.name }))}
            />
          </div>
            {err("category")}

            <div className="mt-6 border border-gray-200 p-3">
              <label className="block text-xs text-gray-700">
                Product Name ( {langLabel} )
              </label>
              <input
                type="text"
                value={current.name}
                onChange={(e) => setTranslation({ name: e.target.value })}
                placeholder="Product Name"
                className="mt-1 w-full rounded border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm outline-none focus:border-primary"
              />
              {err("translations.en.name")}

              <label className="mt-3 block text-xs text-gray-700">
                Description ( {langLabel} )
              </label>
              <textarea
                value={current.description}
                onChange={(e) =>
                  setTranslation({ description: e.target.value })
                }
                placeholder="Description"
                rows={6}
                className="mt-1 w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <label className="mt-4 block text-xs text-gray-700">
              Video Embed Code
            </label>
            <input
              type="text"
              value={data.videoEmbedCode}
              onChange={(e) =>
                onChange({ ...data, videoEmbedCode: e.target.value })
              }
              className="mt-1 w-full rounded border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={handleContinue}
          className="rounded bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition-colors"
        >
          Continue
        </button>
      </div>

      {showPicker && (
        <GalleryPicker
          selectedId=""
          onClose={() => setShowPicker(false)}
          onSelect={addMedia}
        />
      )}
    </>
  );
}
/* ───────────────────────── Responsive custom select ───────────────────────── */

function FormSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled = false,
  inline = false, // true: list hamesha neeche content ko dhakel kar khulti hai
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  inline?: boolean;
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

  // value "" ka matlab "kuch select nahi": placeholder dikhao
  const selected = value ? options.find((o) => o.value === value) : undefined;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 sm:text-sm"
      >
        <span className={`truncate ${selected ? "text-text" : "text-muted"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <FaChevronDown
          className={`h-3 w-3 shrink-0 text-muted transition-transform ${
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
              : "absolute left-0 right-0 top-full z-[60] mt-1"
          } max-h-44 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg sm:max-h-52`}
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted sm:text-sm">
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
                className={`cursor-pointer truncate px-3 py-2 text-xs transition-colors sm:text-sm ${
                  o.value === value
                    ? "bg-primary/10 font-medium text-primary"
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