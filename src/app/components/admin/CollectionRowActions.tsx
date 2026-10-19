"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function CollectionRowActions({
  id,
  name,
  onDeleted,
}: {
  id: string;
  name: string;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    if (deleting || !confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/collections/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success("Collection deleted");
      onDeleted(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/admin/collections/${id}/edit`}
        className="rounded-md border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={remove}
        disabled={deleting}
        className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        {deleting ? "..." : "Delete"}
      </button>
    </div>
  );
}