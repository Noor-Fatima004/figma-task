"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FaCog, FaFileAlt, FaMapMarkerAlt } from "react-icons/fa";
import BasicInfoStep from "./BasicInfoStep";
import LocationContactStep from "./LocationContactStep";
import OperationsSettingsStep from "./OperationsSettingsStep";
import {
  basicSchema,
  locationSchema,
  operationsSchema,
  validate,
  type BasicInfoData,
  type FieldErrors,
  type LocationContactData,
  type OperationsSettingsData,
} from "./schemas";

export const emptyBasicInfo: BasicInfoData = {
  name: "",
  code: "",
  type: "",
  isActive: true,
  description: "",
  image: "",
};

export const emptyLocationContact: LocationContactData = {
  country: "",
  state: "",
  city: "",
  area: "",
  address: "",
  postalCode: "",
  latitude: "",
  longitude: "",
  contactPerson: "",
  phone: "",
  alternatePhone: "",
  email: "",
};

export const emptyOperationsSettings: OperationsSettingsData = {
  capacity: "",
  capacityUnit: "units",
  storageType: "normal",
  operatingHours: "",
  workingDays: [],
  isDefault: false,
  allowNegativeStock: false,
  priority: "0",
  serviceableAreas: "",
  manager: "",
  taxNumber: "",
};

export type WarehouseFormData = {
  basic: BasicInfoData;
  location: LocationContactData;
  operations: OperationsSettingsData;
};

type Props = {
  mode: "add" | "edit";
  id?: string;
  initialWarehouse?: WarehouseFormData;
};

const steps = [
  { key: "basic", label: "Basic Info", short: "Basic", icon: FaFileAlt },
  {
    key: "location",
    label: "Location & Contact",
    short: "Location",
    icon: FaMapMarkerAlt,
  },
  {
    key: "operations",
    label: "Operations & Settings",
    short: "Operations",
    icon: FaCog,
  },
] as const;

type StepKey = (typeof steps)[number]["key"];
const order: StepKey[] = ["basic", "location", "operations"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getPayload({
  basic,
  location,
  operations,
}: WarehouseFormData) {
  return {
    ...basic,
    ...location,
    capacity: operations.capacity.trim() ? Number(operations.capacity) : null,
    capacityUnit: operations.capacityUnit,
    storageType: operations.storageType,
    operatingHours: operations.operatingHours,
    workingDays: operations.workingDays,
    isDefault: operations.isDefault,
    allowNegativeStock: operations.allowNegativeStock,
    priority: Number(operations.priority),
    serviceableAreas: operations.serviceableAreas
      .split(/\r?\n/)
      .map((area) => area.trim())
      .filter(Boolean),
    manager: operations.manager || null,
    taxNumber: operations.taxNumber,
    latitude: location.latitude.trim() ? Number(location.latitude) : null,
    longitude: location.longitude.trim() ? Number(location.longitude) : null,
  };
}

export default function WarehouseForm({
  mode,
  id,
  initialWarehouse,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<StepKey>("basic");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [basic, setBasic] = useState<BasicInfoData>(
    initialWarehouse?.basic ?? emptyBasicInfo
  );
  const [location, setLocation] = useState<LocationContactData>(
    initialWarehouse?.location ?? emptyLocationContact
  );
  const [operations, setOperations] = useState<OperationsSettingsData>(
    initialWarehouse?.operations ?? emptyOperationsSettings
  );

  const check = (key: StepKey) => {
    if (key === "basic") return validate(basicSchema, basic);
    if (key === "location") return validate(locationSchema, location);
    return validate(operationsSchema, operations);
  };

  const goTo = (target: StepKey) => {
    const targetIndex = order.indexOf(target);
    for (let index = 0; index < targetIndex; index += 1) {
      const result = check(order[index]);
      if (!result.ok) {
        setErrors(result.errors);
        setStep(order[index]);
        return;
      }
    }
    setErrors({});
    setStep(target);
  };

  const handleSave = async () => {
    for (const key of order) {
      const result = check(key);
      if (!result.ok) {
        setErrors(result.errors);
        setStep(key);
        return;
      }
    }
    if (mode === "edit" && !id) {
      toast.error("Cannot update warehouse without an id.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        mode === "add"
          ? "/api/warehouse"
          : `/api/warehouse/${encodeURIComponent(id ?? "")}`,
        {
          method: mode === "add" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...getPayload({ basic, location, operations }) }),
        }
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          isRecord(body) && typeof body.error === "string"
            ? body.error
            : `Failed to ${mode === "add" ? "create" : "update"} warehouse.`;
        throw new Error(message);
      }

      toast.success(
        mode === "add"
          ? "Warehouse created successfully."
          : "Warehouse updated successfully."
      );
      router.push("/admin/warehouse");
    } catch (error) {
      console.error(`Failed to ${mode} warehouse:`, error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${mode} warehouse.`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:space-y-6 md:p-8">
      <h1 className="border-b border-border pb-4 text-xl font-semibold text-text sm:text-2xl">
        {mode === "add" ? "Add Warehouse" : "Edit Warehouse"}
      </h1>

      {/* Steps: mobile = 3 equal columns (icon + short name), sm+ = inline with full name */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface p-1 sm:flex sm:justify-center sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0">
        {steps.map(({ key, label, short, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => goTo(key)}
            disabled={saving}
            className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] leading-tight transition-colors sm:flex-row sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm ${
              step === key
                ? "bg-primary font-medium text-white"
                : "text-text hover:bg-surface-hover"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-full truncate sm:hidden">{short}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {step === "basic" && (
        <BasicInfoStep
          data={basic}
          onChange={setBasic}
          errors={errors}
          onContinue={() => goTo("location")}
        />
      )}
      {step === "location" && (
        <LocationContactStep
          data={location}
          onChange={setLocation}
          errors={errors}
          onBack={() => goTo("basic")}
          onContinue={() => goTo("operations")}
        />
      )}
      {step === "operations" && (
        <OperationsSettingsStep
          data={operations}
          onChange={setOperations}
          errors={errors}
          saving={saving}
          onBack={() => goTo("location")}
          onSave={handleSave}
        />
      )}
    </div>
  );
}