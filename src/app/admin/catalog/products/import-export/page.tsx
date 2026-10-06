"use client";

import { useState } from "react";
import { toast } from "sonner";

const IMPORT_API = "/api/admin/products/import";

export default function ImportExportPage() {
  const [csv, setCsv] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!csv.trim()) {
      setError("Please enter CSV code");
      toast.error("Please enter CSV code");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch(IMPORT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Import failed");

      const imported: number = data.imported ?? 0;
      const errors: { row: number; message: string }[] = data.errors ?? [];

      if (imported > 0) {
        toast.success(`${imported} products imported`);
        setCsv("");
      } else {
        toast.error("No products were imported");
      }
      // Row errors ho to pehle 3 toast ke description me dikhao
      if (errors.length > 0) {
        toast.error(`${errors.length} rows failed`, {
          description: errors
            .slice(0, 3)
            .map((e) => `Row ${e.row}: ${e.message}`)
            .join("\n"),
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-3 sm:pb-4">
        <h1 className="text-lg font-semibold text-text sm:text-xl lg:text-2xl">
          Import / Export
        </h1>
      </div>

      {/* Card */}
      <div className="rounded-md bg-surface p-4 shadow sm:p-5">
        <label className="block text-xs font-medium text-text sm:text-sm">
          Enter CSV Code
        </label>
        <textarea
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value);
            if (error) setError("");
          }}
          rows={6}
          placeholder="Please Enter CSV Code"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text outline-none focus:ring-2 focus:ring-primary/30 sm:text-sm"
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-[var(--theme-accent)] px-6 py-2 text-xs font-semibold text-white transition hover:brightness-95 disabled:opacity-60 sm:text-sm"
          >
            {saving ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}