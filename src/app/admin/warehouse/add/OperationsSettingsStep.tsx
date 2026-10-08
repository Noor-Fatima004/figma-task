"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import FormSelect from "@/app/components/FormSelect";
import type { FieldErrors, OperationsSettingsData } from "./schemas";

const inputCls =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";
const labelCls = "mb-1 block text-xs font-medium text-text sm:text-sm";

type ManagerOption = { _id: string; name: string; email: string };

interface Props {
  data: OperationsSettingsData;
  onChange: (data: OperationsSettingsData) => void;
  onBack: () => void;
  onSave: () => void;
  errors: FieldErrors;
  saving: boolean;
}

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const HOURS_24_7 = "24/7";
const HOURS_CUSTOM = "custom";

const hoursPresets = [
  { value: "09:00 - 17:00", label: "Office (9 AM - 5 PM)" },
  { value: "08:00 - 16:00", label: "Early shift (8 AM - 4 PM)" },
  { value: "10:00 - 18:00", label: "Late shift (10 AM - 6 PM)" },
  { value: HOURS_24_7, label: "24/7 (Open all day)" },
  { value: HOURS_CUSTOM, label: "Custom" },
];

const isPresetValue = (value: string) =>
  hoursPresets.some((p) => p.value === value && p.value !== HOURS_CUSTOM);

const getInitialHoursMode = (operatingHours: string) => {
  if (!operatingHours) return "09:00 - 17:00";
  return isPresetValue(operatingHours) ? operatingHours : HOURS_CUSTOM;
};

export default function OperationsSettingsStep({
  data,
  onChange,
  onBack,
  onSave,
  errors,
  saving,
}: Props) {
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [hoursMode, setHoursMode] = useState<string>(() =>
    getInitialHoursMode(data.operatingHours)
  );

  const is24x7 = hoursMode === HOURS_24_7;
  const isCustomHours = hoursMode === HOURS_CUSTOM;
  const [startTime = "", endTime = ""] = isCustomHours
    ? data.operatingHours.split(" - ")
    : [];

  // Edit mode: data baad mein load ho to dropdown sync rakho.
  // Custom mode mein skip karte hain taake typing ke dauran dropdown na badle.
  useEffect(() => {
    if (hoursMode === HOURS_CUSTOM) return;
    const value = data.operatingHours;
    if (!value) return;
    const next = isPresetValue(value) ? value : HOURS_CUSTOM;
    if (next !== hoursMode) setHoursMode(next);
  }, [data.operatingHours, hoursMode]);

  // 24/7 ho to backend ko hamesha saare 7 din hi jayein
  useEffect(() => {
    if (data.operatingHours === HOURS_24_7 && data.workingDays.length !== 7) {
      onChange({ ...data, workingDays: [...weekdays] });
    }
  }, [data, onChange]);

  const handleHoursModeChange = (value: string) => {
    setHoursMode(value);
    if (value === HOURS_24_7) {
      onChange({
        ...data,
        operatingHours: HOURS_24_7,
        workingDays: [...weekdays],
      });
    } else if (value === HOURS_CUSTOM) {
      onChange({ ...data, operatingHours: "" });
    } else {
      onChange({ ...data, operatingHours: value });
    }
  };

  const handleCustomTime = (start: string, end: string) => {
    onChange({
      ...data,
      operatingHours: start || end ? `${start} - ${end}` : "",
    });
  };

  useEffect(() => {
    let active = true;
    const loadManagers = async () => {
      try {
        const response = await fetch("/api/warehouse/managers", {
          cache: "no-store",
        });
        const body: unknown = await response.json();
        if (!response.ok) {
          const message =
            typeof body === "object" &&
            body !== null &&
            "error" in body &&
            typeof body.error === "string"
              ? body.error
              : "Failed to load managers.";
          throw new Error(message);
        }
        if (
          typeof body !== "object" ||
          body === null ||
          !("items" in body) ||
          !Array.isArray(body.items) ||
          !body.items.every(
            (item) =>
              typeof item === "object" &&
              item !== null &&
              "_id" in item &&
              typeof item._id === "string" &&
              "name" in item &&
              typeof item.name === "string" &&
              "email" in item &&
              typeof item.email === "string"
          )
        ) {
          throw new Error("Invalid managers response.");
        }
        if (active) setManagers(body.items);
      } catch (error) {
        console.error("Failed to load warehouse managers:", error);
        if (active) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load managers."
          );
        }
      }
    };
    void loadManagers();
    return () => {
      active = false;
    };
  }, []);

  const err = (key: string) =>
    errors[key] ? (
      <p className="mt-1 text-xs text-red-500">{errors[key]}</p>
    ) : null;

  return (
    <>
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-text sm:text-lg">
          Operations &amp; Settings
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Capacity</label>
            <input
              type="number"
              min="0"
              value={data.capacity}
              onChange={(event) =>
                onChange({ ...data, capacity: event.target.value })
              }
              className={inputCls}
            />
            {err("capacity")}
          </div>
          <div>
            <label className={labelCls}>Capacity Unit</label>
            <FormSelect
              value={data.capacityUnit}
              onChange={(value) =>
                onChange({
                  ...data,
                  capacityUnit: value as OperationsSettingsData["capacityUnit"],
                })
              }
              options={[
                { value: "units", label: "Units" },
                { value: "sqft", label: "Sq ft" },
                { value: "cbm", label: "CBM" },
              ]}
            />
          </div>
          <div>
            <label className={labelCls}>Storage Type</label>
            <FormSelect
              value={data.storageType}
              onChange={(value) =>
                onChange({
                  ...data,
                  storageType: value as OperationsSettingsData["storageType"],
                })
              }
              options={[
                { value: "normal", label: "Normal" },
                { value: "cold", label: "Cold" },
                { value: "hazardous", label: "Hazardous" },
                { value: "bonded", label: "Bonded" },
              ]}
            />
          </div>
          <div>
            <label className={labelCls}>Operating Hours</label>
            <FormSelect
              value={hoursMode}
              onChange={handleHoursModeChange}
              options={hoursPresets}
            />
            {isCustomHours && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) =>
                    handleCustomTime(event.target.value, endTime)
                  }
                  className={inputCls}
                />
                <span className="text-sm text-text">to</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) =>
                    handleCustomTime(startTime, event.target.value)
                  }
                  className={inputCls}
                />
              </div>
            )}
            {err("operatingHours")}
          </div>

          {/* 24/7 par Working Days UI hide hoti hai, lekin saare din data mein set rehte hain */}
          {!is24x7 && (
            <fieldset className="sm:col-span-2">
              <legend className={labelCls}>Working Days</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {weekdays.map((day) => (
                  <label
                    key={day}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm transition-colors ${
                      data.workingDays.includes(day)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface text-text hover:bg-surface-hover"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={data.workingDays.includes(day)}
                      onChange={(event) =>
                        onChange({
                          ...data,
                          workingDays: event.target.checked
                            ? [...data.workingDays, day]
                            : data.workingDays.filter((value) => value !== day),
                        })
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    {day}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div>
            <label className={labelCls}>Priority (lower is higher)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={data.priority}
              onChange={(event) =>
                onChange({ ...data, priority: event.target.value })
              }
              className={inputCls}
            />
            {err("priority")}
          </div>
          <div>
            <label className={labelCls}>Manager</label>
            <FormSelect
              value={data.manager}
              onChange={(value) => onChange({ ...data, manager: value })}
              placeholder="No manager"
              options={managers.map((manager) => ({
                value: manager._id,
                label: `${manager.name} (${manager.email})`,
              }))}
            />
            {err("manager")}
          </div>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm text-text">
            Default warehouse
            <input
              type="checkbox"
              checked={data.isDefault}
              onChange={(event) =>
                onChange({ ...data, isDefault: event.target.checked })
              }
              className="h-5 w-5 accent-primary"
            />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm text-text">
            Allow negative stock
            <input
              type="checkbox"
              checked={data.allowNegativeStock}
              onChange={(event) =>
                onChange({ ...data, allowNegativeStock: event.target.checked })
              }
              className="h-5 w-5 accent-primary"
            />
          </label>
          <div className="sm:col-span-2">
            <label className={labelCls}>
              Serviceable Areas (one per line)
            </label>
            <textarea
              rows={3}
              value={data.serviceableAreas}
              onChange={(event) =>
                onChange({ ...data, serviceableAreas: event.target.value })
              }
              className={inputCls}
            />
            {err("serviceableAreas")}
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Tax Number</label>
            <input
              value={data.taxNumber}
              onChange={(event) =>
                onChange({ ...data, taxNumber: event.target.value })
              }
              className={inputCls}
            />
            {err("taxNumber")}
          </div>
        </div>
      </section>
      <div className="mt-5 flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="w-full rounded-lg border border-border px-5 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-hover disabled:opacity-60 sm:w-auto"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="w-full rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60 sm:w-auto"
        >
          {saving ? "Saving..." : "Save Warehouse"}
        </button>
      </div>
    </>
  );
}
