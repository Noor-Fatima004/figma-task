"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import CollectionForm, { CollectionInitial } from "@/app/components/admin/CollectionForm";

export default function EditCollectionPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CollectionInitial | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/collections/${id}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const d = await r.json();
        setData(d.collection ?? d);
      })
      .catch(() => toast.error("Could not load collection"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="p-6 text-sm text-gray-500">Loading...</p>;
  if (!data) return <p className="p-6 text-sm text-red-600">Collection not found.</p>;

  // key = form ko data aane par fresh state ke saath mount karta hai
  return <CollectionForm key={data._id} initial={data} />;
}