"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import WarehouseForm, {
  emptyBasicInfo,
  emptyLocationContact,
  emptyOperationsSettings,
  type WarehouseFormData,
} from "@/app/admin/warehouse/add/WarehouseForm";
import { warehouseSchema } from "@/app/admin/warehouse/add/schemas";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseWarehouse(value: unknown): WarehouseFormData {
  if (!isRecord(value)) throw new Error("Invalid warehouse response.");

  const parsed = warehouseSchema.safeParse({
    ...value,
    manager: value.manager === "" ? null : value.manager,
  });
  if (!parsed.success) {
    throw new Error("Invalid warehouse data returned by the API.");
  }

  const warehouse = parsed.data;
  return {
    basic: {
      ...emptyBasicInfo,
      name: warehouse.name,
      code: warehouse.code,
      type: warehouse.type,
      isActive: warehouse.isActive,
      description: warehouse.description,
    },
    location: {
      ...emptyLocationContact,
      country: warehouse.country,
      state: warehouse.state,
      city: warehouse.city,
      area: warehouse.area,
      address: warehouse.address,
      postalCode: warehouse.postalCode,
      latitude: warehouse.latitude === null ? "" : String(warehouse.latitude),
      longitude:
        warehouse.longitude === null ? "" : String(warehouse.longitude),
      contactPerson: warehouse.contactPerson,
      phone: warehouse.phone,
      alternatePhone: warehouse.alternatePhone,
      email: warehouse.email,
    },
    operations: {
      ...emptyOperationsSettings,
      capacity: warehouse.capacity === null ? "" : String(warehouse.capacity),
      capacityUnit: warehouse.capacityUnit,
      storageType: warehouse.storageType,
      operatingHours: warehouse.operatingHours,
      workingDays: warehouse.workingDays,
      isDefault: warehouse.isDefault,
      allowNegativeStock: warehouse.allowNegativeStock,
      priority: String(warehouse.priority),
      serviceableAreas: warehouse.serviceableAreas.join("\n"),
      manager: warehouse.manager ?? "",
      taxNumber: warehouse.taxNumber,
    },
  };
}

export default function EditWarehousePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [initialWarehouse, setInitialWarehouse] =
    useState<WarehouseFormData | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const loadWarehouse = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch(
          `/api/warehouse/${encodeURIComponent(id)}`,
          { cache: "no-store" }
        );
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            isRecord(body) && typeof body.error === "string"
              ? body.error
              : "Failed to load warehouse.";
          throw new Error(message);
        }
        if (!isRecord(body) || !("warehouse" in body)) {
          throw new Error("Invalid warehouse response.");
        }
        const warehouse = parseWarehouse(body.warehouse);
        if (active) setInitialWarehouse(warehouse);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load warehouse for editing:", error);
        setLoadError(
          error instanceof Error ? error.message : "Failed to load warehouse."
        );
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadWarehouse();
    return () => {
      active = false;
    };
  }, [id, attempt]);

  if (loading) {
    return (
      <div className="p-4 md:p-8" aria-busy="true">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 h-72 animate-pulse rounded-md bg-gray-100" />
      </div>
    );
  }

  if (loadError || !initialWarehouse) {
    return (
      <div className="p-4 md:p-8" role="alert">
        <h1 className="text-2xl font-bold text-gray-800">
          Unable to edit warehouse
        </h1>
        <p className="mt-2 text-sm text-red-600">
          {loadError || "Warehouse data is unavailable."}
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setInitialWarehouse(null);
              setAttempt((current) => current + 1);
            }}
            className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/warehouse")}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
          >
            Back to warehouses
          </button>
        </div>
      </div>
    );
  }

  return (
    <WarehouseForm
      key={id}
      mode="edit"
      id={id}
      initialWarehouse={initialWarehouse}
    />
  );
}
