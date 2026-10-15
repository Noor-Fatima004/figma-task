"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Row = { _id: string; name: string; slug: string; productCount: number; isActive: boolean };

export default function CollectionsListPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/admin/collections", { cache: "no-store" })
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Collections</h1>
        <Link href="/admin/collections/add" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
          Add Collection
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Products</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r._id}>
                <td className="px-4 py-2 font-medium">{r.name}</td>
                <td className="px-4 py-2">{r.slug}</td>
                <td className="px-4 py-2">{r.productCount}</td>
                <td className="px-4 py-2">{r.isActive ? "Active" : "Hidden"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No collections yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}