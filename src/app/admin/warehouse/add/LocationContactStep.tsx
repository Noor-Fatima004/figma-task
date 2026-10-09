"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import FormSelect from "@/app/components/FormSelect";
import {
   locationSchema as locationContactSchema,
  type FieldErrors,
  type LocationContactData,
} from "./schemas";

// Leaflet sirf browser mein chalta hai, isliye ssr: false
const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-64 animate-pulse rounded-lg bg-background sm:h-80" />
  ),
});

const inputBase =
  "w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text outline-none focus:ring-2";
const inputOk = `${inputBase} border-border focus:ring-primary/30`;
const inputBad = `${inputBase} border-red-500 focus:ring-red-500/30`;
const labelCls = "mb-1 block text-xs font-medium text-text sm:text-sm";
const noOptions: string[] = [];

interface Props {
  data: LocationContactData;
  onChange: (data: LocationContactData) => void;
  onBack: () => void;
  onContinue: () => void;
  errors: FieldErrors;
}

export default function LocationContactStep({
  data,
  onChange,
  onBack,
  onContinue,
  errors,
}: Props) {
  const [countries, setCountries] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<{
    country: string;
    items: string[];
  } | null>(null);
  const [cityOptions, setCityOptions] = useState<{
    country: string;
    state: string;
    items: string[];
  } | null>(null);
  const [localErrors, setLocalErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const stateList =
    stateOptions?.country === data.country ? stateOptions.items : null;
  const states = stateList ?? noOptions;
  const statesLoading = Boolean(data.country) && stateList === null;
  const cities =
    cityOptions?.country === data.country && cityOptions.state === data.state
      ? cityOptions.items
      : [];

  // Local errors parent errors par priority rakhte hain
  const shown: FieldErrors = { ...errors, ...localErrors };

  /* ---------- Validation ---------- */

  const validateAll = (next: LocationContactData): FieldErrors => {
    const result: FieldErrors = {};
    const parsed = locationContactSchema.safeParse(next);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !result[key]) result[key] = issue.message;
      }
    }
    // Options par depend karne wali rules
    if (next.country && !statesLoading && states.length > 0 && !next.state) {
      result.state = "State / Province is required";
    }
    if (
      next.country &&
      !statesLoading &&
      (states.length === 0 || next.state) &&
      cities.length > 0 &&
      !next.city
    ) {
      result.city = "City is required";
    }
    return result;
  };

  const revalidateKeys = (next: LocationContactData, keys: string[]) => {
    const all = validateAll(next);
    setLocalErrors((current) => {
      const updated = { ...current };
      for (const key of keys) updated[key] = all[key] ?? "";
      return updated;
    });
  };

  const handleBlur = (key: string) => {
    setTouched((current) => new Set(current).add(key));
    revalidateKeys(data, [key]);
  };

  const update = (patch: Partial<LocationContactData>) => {
    const next = { ...data, ...patch } as LocationContactData;
    onChange(next);
    // Sirf wo fields dobara check karo jo touched hain ya jin mein error hai
    const keys = Object.keys(patch).filter(
      (key) => touched.has(key) || shown[key]
    );
    if (keys.length) revalidateKeys(next, keys);
  };

  const handleContinue = () => {
    const all = validateAll(data);
    const keys = Object.keys(all);
    setTouched(new Set(Object.keys(data)));

    if (keys.length > 0) {
      // Pehle sab purane errors saaf, phir naye set
      const cleared: FieldErrors = {};
      for (const key of Object.keys(data)) cleared[key] = "";
      setLocalErrors({ ...cleared, ...all });
      toast.error("Please fix the highlighted fields.");
      document
        .getElementById(`field-${keys[0]}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLocalErrors({});
    onContinue();
  };

  /* ---------- Data loading ---------- */

  useEffect(() => {
    let active = true;
    const loadCountries = async () => {
      try {
        const response = await fetch(
          "/api/warehouse/locations?level=countries",
          { cache: "force-cache" }
        );
        const body: unknown = await response.json();
        if (!response.ok || !isOptionsResponse(body)) {
          throw new Error(readLocationError(body, "Failed to load countries."));
        }
        if (active) setCountries(body.items);
      } catch (error) {
        console.error("Failed to load warehouse countries:", error);
        if (active) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load countries."
          );
        }
      }
    };
    void loadCountries();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!data.country) {
      return () => {
        active = false;
      };
    }

    const loadStates = async () => {
      try {
        const params = new URLSearchParams({
          level: "states",
          country: data.country,
        });
        const response = await fetch(`/api/warehouse/locations?${params}`, {
          cache: "force-cache",
        });
        const body: unknown = await response.json();
        if (!response.ok || !isOptionsResponse(body)) {
          throw new Error(readLocationError(body, "Failed to load states."));
        }
        if (active) {
          setStateOptions({ country: data.country, items: body.items });
        }
      } catch (error) {
        console.error("Failed to load warehouse states:", error);
        if (active) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load states."
          );
        }
      }
    };
    void loadStates();
    return () => {
      active = false;
    };
  }, [data.country]);

  useEffect(() => {
    let active = true;
    if (
      !data.country ||
      stateList === null ||
      (stateList.length > 0 && !data.state)
    ) {
      return () => {
        active = false;
      };
    }

    const loadCities = async () => {
      try {
        const params = new URLSearchParams({
          level: "cities",
          country: data.country,
          ...(data.state ? { state: data.state } : {}),
        });
        const response = await fetch(`/api/warehouse/locations?${params}`, {
          cache: "force-cache",
        });
        const body: unknown = await response.json();
        if (!response.ok || !isOptionsResponse(body)) {
          throw new Error(readLocationError(body, "Failed to load cities."));
        }
        if (active) {
          setCityOptions({
            country: data.country,
            state: data.state,
            items: body.items,
          });
        }
      } catch (error) {
        console.error("Failed to load warehouse cities:", error);
        if (active) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load cities."
          );
        }
      }
    };
    void loadCities();
    return () => {
      active = false;
    };
  }, [data.country, data.state, stateList]);

  /* ---------- Field renderers ---------- */

  const err = (key: string) =>
    shown[key] ? (
      <p role="alert" className="mt-1 text-xs text-red-500">
        {shown[key]}
      </p>
    ) : null;

  const textField = (
    key: Exclude<keyof LocationContactData, "country" | "state" | "city">,
    label: string,
    required = false,
    type = "text"
  ) => (
    <div key={key} id={`field-${key}`}>
      <label htmlFor={`input-${key}`} className={labelCls}>
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={`input-${key}`}
        type={type}
        step={type === "number" ? "any" : undefined}
        value={data[key] ?? ""}
        onChange={(event) => update({ [key]: event.target.value })}
        onBlur={() => handleBlur(key)}
        aria-invalid={Boolean(shown[key])}
        className={shown[key] ? inputBad : inputOk}
      />
      {err(key)}
    </div>
  );

  const selectField = (
    key: "country" | "state" | "city",
    label: string,
    options: string[],
    placeholder: string,
    disabled = false,
    required = false
  ) => (
    <div key={key} id={`field-${key}`}>
      <label className={labelCls}>
        {label}
        {required ? " *" : ""}
      </label>
      <FormSelect
        value={data[key]}
        disabled={disabled}
        onChange={(value) => {
          setTouched((current) => new Set(current).add(key));
          if (key === "country") {
            update({ country: value, state: "", city: "", area: "" });
            setLocalErrors((current) => ({
              ...current,
              country: value ? "" : "Country is required",
              state: "",
              city: "",
            }));
          } else if (key === "state") {
            update({ state: value, city: "", area: "" });
            setLocalErrors((current) => ({ ...current, state: "", city: "" }));
          } else {
            update({ city: value, area: "" });
            setLocalErrors((current) => ({ ...current, city: "" }));
          }
        }}
        placeholder={placeholder}
        options={[
          ...(data[key] && !options.includes(data[key])
            ? [{ value: data[key], label: data[key] }]
            : []),
          ...options.map((option) => ({ value: option, label: option })),
        ]}
      />
      {err(key)}
    </div>
  );

  return (
    <>
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-text sm:text-lg">
          Location &amp; Contact
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {selectField(
            "country",
            "Country",
            countries,
            "Select a country",
            false,
            true
          )}
          {selectField(
            "state",
            "State / Province",
            states,
            !data.country
              ? "Select a country first"
              : statesLoading
                ? "Loading states..."
                : "Select a state / province",
            !data.country || statesLoading
          )}
          {selectField(
            "city",
            "City",
            cities,
            !data.country
              ? "Select a country first"
              : statesLoading
                ? "Loading states..."
                : states.length > 0 && !data.state
                  ? "Select a state first"
                  : "Select a city",
            !data.country ||
              statesLoading ||
              (states.length > 0 && !data.state)
          )}
          {textField("area", "Area")}
          <div className="sm:col-span-2">
            {textField("address", "Address", true)}
          </div>
          {textField("postalCode", "Postal Code")}
        </div>

        {/* Map location: map se pick karo ya coordinates khud likho */}
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold text-text">Map location</h3>
          <LocationPicker
            latitude={data.latitude}
            longitude={data.longitude}
            onPick={(latitude, longitude) => {
              const next = { ...data, latitude, longitude };
              onChange(next);
              revalidateKeys(next, ["latitude", "longitude"]);
            }}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {textField("latitude", "Latitude", false, "number")}
            {textField("longitude", "Longitude", false, "number")}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {textField("contactPerson", "Contact Person", true)}
          {textField("phone", "Phone", true, "tel")}
          {textField("alternatePhone", "Alternate Phone", false, "tel")}
          {textField("email", "Email", true, "email")}
        </div>
      </section>

      <div className="mt-5 flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-lg border border-border px-5 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-hover sm:w-auto"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="w-full rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover sm:w-auto"
        >
          Continue
        </button>
      </div>
    </>
  );
}

function isOptionsResponse(value: unknown): value is { items: string[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    Array.isArray(value.items) &&
    value.items.every((item) => typeof item === "string")
  );
}

function readLocationError(value: unknown, fallback: string) {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}