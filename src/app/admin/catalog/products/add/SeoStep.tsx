"use client";

import type { FieldErrors } from "./schemas";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export type SeoData = {
  seoMetaTags: string;
  seoDescription: string;
};

export const emptySeo: SeoData = {
  seoMetaTags: "",
  seoDescription: "",
};

interface Props {
  data: SeoData;
  onChange: (data: SeoData) => void;
  onBack: () => void;
  onSave: () => void;
  saving?: boolean;
  saveError?: string;
  errors?: FieldErrors;
}

const inputCls =
  "mt-1 w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary";

export default function SeoStep({
  data,
  onChange,
  onBack,
  onSave,
  saving = false,
  saveError = "",
  errors = {},
}: Props) {
  const err = (k: string) =>
    errors[k] ? <p className="mt-1 text-xs text-red-500">{errors[k]}</p> : null;

  // Save dabane par mandatory fields check karo, toast dikhao, phir parent ko chalne do
  const handleSave = () => {
    const missing: string[] = [];
    if (!data.seoMetaTags.trim()) missing.push("Seo meta tags");
    if (!data.seoDescription.trim()) missing.push("Seo description");

    if (missing.length > 0) {
      toast.error(`Please fill required fields: ${missing.join(", ")}`);
    }

    // Parent ka Zod validation hamesha chalne do, taaki inline errors bhi dikhein
    onSave();
  };

  // Save poora hone par success toast: saving true -> false ho gayi aur koi error nahi
  const wasSaving = useRef(false);
  useEffect(() => {
    if (wasSaving.current && !saving && !saveError) {
      const hasErrors = Object.values(errors).some(Boolean);
      if (!hasErrors) toast.success("Saved successfully");
    }
    wasSaving.current = saving;
  }, [saving, saveError, errors]);

  // Save API fail ho to uska error toast me dikhao
  useEffect(() => {
    if (saveError) toast.error(saveError);
  }, [saveError]);

  return (
    <>
      <div className="rounded-md bg-white p-5 shadow">
        <h2 className="text-lg font-semibold text-gray-800">Seo</h2>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Seo Meta Tags
            </label>
            <input
              type="text"
              value={data.seoMetaTags}
              onChange={(e) =>
                onChange({ ...data, seoMetaTags: e.target.value })
              }
              placeholder="Seo meta tags"
              className={inputCls}
            />
            {err("seoMetaTags")}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              Seo Description
            </label>
            <input
              type="text"
              value={data.seoDescription}
              onChange={(e) =>
                onChange({ ...data, seoDescription: e.target.value })
              }
              placeholder="Seo Description"
              className={inputCls}
            />
            {err("seoDescription")}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="rounded bg-[#16264a] px-5 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-primary px-5 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </>
  );
}