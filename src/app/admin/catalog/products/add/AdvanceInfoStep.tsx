"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FaTimes, FaChevronDown, FaTrash } from "react-icons/fa";

export type ProductType = "" | "simple" | "variable";

export type AdvanceInfoData = {
  productType: ProductType;
  isActive: boolean;
  isPoint: boolean;
  isFeature: boolean;
  unit: string;
  brand: string;
  weight: string;
  price: string;
  discountPrice: string;
  minOrder: string;
  maxOrder: string;
  sku: string;
  attributes: string[];
  variations: Record<string, string[]>;
};

export const emptyAdvanceInfo: AdvanceInfoData = {
  productType: "",
  isActive: true,
  isPoint: true,
  isFeature: true,
  unit: "",
  brand: "",
  weight: "",
  price: "",
  discountPrice: "",
  minOrder: "1",
  maxOrder: "5",
  sku: "",
  attributes: [],
  variations: {},
};

type Option = { _id: string; name: string };
type OptionsResponse = {
  items: Option[];
  totalPages: number;
};

type VariationOption = Option & {
  attribute?: unknown;
  attributeId?: unknown;
  attribute_id?: unknown;
};

function variationAttributeId(v: VariationOption): string {
  const raw = v.attribute ?? v.attributeId ?? v.attribute_id;
  if (typeof raw === "string") return raw;
  if (
    typeof raw === "object" &&
    raw !== null &&
    "_id" in raw &&
    typeof (raw as { _id: unknown })._id === "string"
  ) {
    return (raw as { _id: string })._id;
  }
  return "";
}

function useOptions<T extends Option = Option>(url: string, label = "options") {
  const [options, setOptions] = useState<T[]>([]);
  useEffect(() => {
    let alive = true;
    const loadOptions = async () => {
      try {
        const firstPage = await fetchOptionsPage(url, 1);
        const remainingPages = await Promise.all(
          Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
            fetchOptionsPage(url, index + 2)
          )
        );
        if (alive) {
          setOptions([
            ...firstPage.items,
            ...remainingPages.flatMap((page) => page.items),
          ] as T[]);
        }
      } catch (error) {
        console.error(`Failed to load product options from ${url}:`, error);
        if (alive) {
          toast.error(`Failed to load ${label}`);
          setOptions([]);
        }
      }
    };

    loadOptions();
    return () => {
      alive = false;
    };
  }, [url, label]);
  return options;
}

async function fetchOptionsPage(url: string, page: number) {
  const params = new URLSearchParams({ page: String(page), limit: "100" });
  const response = await fetch(`${url}?${params}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const result: unknown = await response.json();
  if (
    typeof result !== "object" ||
    result === null ||
    !("items" in result) ||
    !Array.isArray(result.items) ||
    !("totalPages" in result) ||
    typeof result.totalPages !== "number" ||
    !result.items.every(
      (item) =>
        typeof item?._id === "string" && typeof item?.name === "string"
    )
  ) {
    throw new Error("Invalid catalog options response");
  }

  return result as OptionsResponse;
}

/* ─────────────────────────────────────────────────────────────
   ✅ SKU AUTO-GENERATION
   Product name + brand se ek professional SKU banata hai.
   Format: BRAND-NAME-WORD1-WORD2-RANDOM4
   Example: NAL-OAK-DINING-CHAIR-4821
   ───────────────────────────────────────────────────────────── */
function generateSKU(productName: string, brandName?: string): string {
  // 1. Name ko clean karo
  const cleanName = productName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, "-");

  // 2. Pehle 3 words lo
  const words = cleanName.split("-").filter(Boolean);
  const namePart = words.slice(0, 3).join("-");

  // 3. Brand ka pehla word (3 letters)
  const brandPart = brandName
    ? brandName.trim().toUpperCase().split(/\s+/)[0].slice(0, 3)
    : "";

  // 4. Random 4-digit number (duplicate avoid karne ke liye)
  const randomNum = Math.floor(1000 + Math.random() * 9000);

  // 5. Combine karo
  return [brandPart, namePart, randomNum].filter(Boolean).join("-");
}

const inputCls =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";
const labelCls = "block text-xs sm:text-sm font-medium text-text";

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
      <span className="text-xs sm:text-sm text-text">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted/40"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

interface Props {
  data: AdvanceInfoData;
  onChange: (data: AdvanceInfoData) => void;
  onBack: () => void;
  onContinue: () => void;
  errors?: Record<string, string>;
  /** ✅ Product name (Basic Info se aata hai) — SKU auto-generate ke liye */
  productName?: string;
}

export default function AdvanceInfoStep({
  data,
  onChange,
  onBack,
  onContinue,
  errors = {},
  productName = "",
}: Props) {
  const err = (k: string) =>
    errors[k] ? <p className="mt-1 text-xs text-red-500">{errors[k]}</p> : null;

  const units = useOptions("/api/admin/product-units", "units");
  const brands = useOptions("/api/admin/product-brands", "brands");
  const attributes = useOptions("/api/admin/product-attributes", "attributes");
  const allVariations = useOptions<VariationOption>(
    "/api/admin/product-variations",
    "variations"
  );

  const [pickedAttr, setPickedAttr] = useState("");
  const [pickedVar, setPickedVar] = useState("");

  // ✅ Flag: user ne manually SKU edit kiya to auto-generate band
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);

  const set = <K extends keyof AdvanceInfoData>(
    key: K,
    value: AdvanceInfoData[K]
  ) => onChange({ ...data, [key]: value });

  const isVariable = data.productType === "variable";

  // ✅ AUTO SKU: product name ya brand change hone par SKU generate karo
  useEffect(() => {
    // User ne manually edit kiya hai to override mat karo
    if (skuManuallyEdited) return;
    // Product name nahi hai to kuch nahi kar sakte
    if (!productName.trim()) return;

    const brandName = data.brand
      ? brands.find((b) => b._id === data.brand)?.name
      : undefined;

    const newSKU = generateSKU(productName, brandName);
    if (newSKU !== data.sku) {
      set("sku", newSKU);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productName, data.brand, skuManuallyEdited, brands]);

  const attrName = (id: string) =>
    attributes.find((a) => a._id === id)?.name ?? id;
  const variationName = (id: string) =>
    allVariations.find((v) => v._id === id)?.name ?? id;
  const variationsOf = (attrId: string) =>
    allVariations.filter((v) => variationAttributeId(v) === attrId);

  const handleAttrPick = (id: string) => {
    setPickedAttr(id);
    setPickedVar("");
  };

  const addVariation = () => {
    if (!pickedAttr || !pickedVar) {
      toast.error("Select an attribute and a variation first");
      return;
    }
    const current = data.variations[pickedAttr] ?? [];
    if (current.includes(pickedVar)) {
      toast.error("This variation is already added");
      return;
    }
    onChange({
      ...data,
      attributes: data.attributes.includes(pickedAttr)
        ? data.attributes
        : [...data.attributes, pickedAttr],
      variations: { ...data.variations, [pickedAttr]: [...current, pickedVar] },
    });
    toast.success(`${variationName(pickedVar)} added`);
    setPickedVar("");
  };

  const removeAttribute = (id: string, silent = false) => {
    const rest = { ...data.variations };
    delete rest[id];
    onChange({
      ...data,
      attributes: data.attributes.filter((a) => a !== id),
      variations: rest,
    });
    if (!silent) toast.success(`${attrName(id)} removed`);
  };

  const removeVariation = (attrId: string, variationId: string) => {
    const next = (data.variations[attrId] ?? []).filter(
      (v) => v !== variationId
    );
    const removedName = variationName(variationId);
    if (next.length === 0) {
      removeAttribute(attrId, true);
    } else {
      set("variations", { ...data.variations, [attrId]: next });
    }
    toast.success(`${removedName} removed`);
  };

  const handleTypeChange = (value: ProductType) => {
    if (value !== "variable") {
      if (data.attributes.length > 0) {
        toast.info("Attributes and variations cleared");
      }
      setPickedAttr("");
      setPickedVar("");
    }
    onChange({
      ...data,
      productType: value,
      attributes: value === "variable" ? data.attributes : [],
      variations: value === "variable" ? data.variations : {},
    });
  };

  const handleContinue = () => {
    const missing: string[] = [];
    if (!data.productType) missing.push("Product type");
    if (!data.unit) missing.push("Unit");
    if (!data.price) missing.push("Price");
    if (isVariable && data.attributes.length === 0) {
      missing.push("At least one attribute with variation");
    }

    if (missing.length > 0) {
      toast.error(`Please fill required fields: ${missing.join(", ")}`);
    }

    onContinue();
  };

  return (
    <>
      <div className="rounded-md bg-surface p-4 shadow sm:p-5">
        <h2 className="text-base font-semibold text-text sm:text-lg">
          Advance Information
        </h2>

        <div className="mt-5 grid gap-x-6 gap-y-4 sm:mt-6 md:grid-cols-2">
          {/* Product type + Is Active */}
          <div>
            <label className={labelCls}>Product Type</label>
            <div className="mt-1">
              <FormSelect
                value={data.productType}
                onChange={(v) => handleTypeChange(v as ProductType)}
                placeholder="Select Product Type"
                options={[
                  { value: "simple", label: "Simple" },
                  { value: "variable", label: "Variable" },
                ]}
              />
            </div>
            {err("productType")}
          </div>
          <div className="md:pt-6">
            <Toggle
              label="Is Active?"
              checked={data.isActive}
              onChange={(v) => set("isActive", v)}
            />
          </div>

          {/* Is Point + Is Feature */}
          <Toggle
            label="Is Point"
            checked={data.isPoint}
            onChange={(v) => set("isPoint", v)}
          />
          <Toggle
            label="Is Feature"
            checked={data.isFeature}
            onChange={(v) => set("isFeature", v)}
          />

          {/* Units + Brands */}
          <div>
            <label className={labelCls}>Units</label>
            <div className="mt-1">
              <FormSelect
                value={data.unit}
                onChange={(v) => set("unit", v)}
                placeholder="Select Unit"
                options={units.map((u) => ({ value: u._id, label: u.name }))}
              />
            </div>
            {err("unit")}
          </div>
          <div>
            <label className={labelCls}>Brands</label>
            <div className="mt-1">
              <FormSelect
                value={data.brand}
                onChange={(v) => set("brand", v)}
                placeholder="Select Brand"
                options={[
                  { value: "", label: "None" },
                  ...brands.map((b) => ({ value: b._id, label: b.name })),
                ]}
              />
            </div>
          </div>

          {/* Weight + Price */}
          <div>
            <label className={labelCls}>Product Weight</label>
            <input
              type="number"
              min="0"
              value={data.weight}
              onChange={(e) => set("weight", e.target.value)}
              placeholder="Enter Weight"
              className={inputCls}
            />
            {err("weight")}
          </div>
          <div>
            <label className={labelCls}>Price</label>
            <input
              type="number"
              min="0"
              value={data.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="Enter Price"
              className={inputCls}
            />
            {err("price")}
          </div>

          {/* Discount + Min order */}
          <div>
            <label className={labelCls}>Discount Price</label>
            <input
              type="number"
              min="0"
              value={data.discountPrice}
              onChange={(e) => set("discountPrice", e.target.value)}
              placeholder="Enter Discount Price"
              className={inputCls}
            />
            {err("discountPrice")}
          </div>
          <div>
            <label className={labelCls}>Minimum Order</label>
            <input
              type="number"
              min="1"
              value={data.minOrder}
              onChange={(e) => set("minOrder", e.target.value)}
              className={inputCls}
            />
            {err("minOrder")}
          </div>

          {/* Max order + SKU (✅ UPDATED) */}
          <div>
            <label className={labelCls}>Maximum Order</label>
            <input
              type="number"
              min="1"
              value={data.maxOrder}
              onChange={(e) => set("maxOrder", e.target.value)}
              className={inputCls}
            />
            {err("maxOrder")}
          </div>

          {/* ✅ SKU — Auto-generated with Regenerate button */}
          <div>
            <label className={labelCls}>SKU</label>
            <div className="relative mt-1">
              <input
                type="text"
                value={data.sku}
                onChange={(e) => {
                  setSkuManuallyEdited(true);
                  set("sku", e.target.value);
                }}
                placeholder="Auto-generated from product name"
                className={`${inputCls} pr-24`}
              />
              <button
                type="button"
                onClick={() => {
                  setSkuManuallyEdited(false);
                  const brandName = data.brand
                    ? brands.find((b) => b._id === data.brand)?.name
                    : undefined;
                  if (productName.trim()) {
                    set("sku", generateSKU(productName, brandName));
                    toast.success("SKU regenerated");
                  } else {
                    toast.error("Product name is required first");
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-primary underline hover:text-primary-hover sm:text-xs"
              >
                Regenerate
              </button>
            </div>
            <p className="mt-1 text-[10px] text-muted">
              Auto-generated from product name. Edit to override.
            </p>
            {err("sku")}
          </div>

          {/* Attributes + Variations: sirf Variable product par */}
          {isVariable && (
            <div className="md:col-span-2">
              <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <div>
                  <label className={labelCls}>Attributes</label>
                  <div className="mt-1">
                    <FormSelect
                      value={pickedAttr}
                      onChange={handleAttrPick}
                      placeholder="Select Attribute"
                      options={attributes.map((a) => ({
                        value: a._id,
                        label: a.name,
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Variations</label>
                  <div className="mt-1">
                    <FormSelect
                      value={pickedVar}
                      onChange={setPickedVar}
                      disabled={!pickedAttr}
                      placeholder={
                        pickedAttr ? "Select Variation" : "Pehle attribute chuno"
                      }
                      options={variationsOf(pickedAttr)
                        .filter(
                          (v) =>
                            !(data.variations[pickedAttr] ?? []).includes(v._id)
                        )
                        .map((v) => ({ value: v._id, label: v.name }))}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addVariation}
                  disabled={!pickedAttr || !pickedVar}
                  className="w-full rounded-lg bg-[var(--theme-accent)] px-5 py-2 text-xs font-semibold text-white transition hover:brightness-95 disabled:opacity-50 sm:w-auto sm:text-sm"
                >
                  ADD
                </button>
              </div>

              {err("attributes")}
              {err("variations")}

              <div className="mt-5 space-y-3">
                {data.attributes.map((id) => {
                  const selected = data.variations[id] ?? [];
                  const name = attrName(id);
                  return (
                    <div
                      key={id}
                      className="grid grid-cols-[1fr_auto] items-start gap-3 sm:grid-cols-[10rem_1fr_auto]"
                    >
                      <span className="col-span-2 block truncate rounded-lg border border-border bg-background px-3 py-2 text-xs text-text sm:col-span-1 sm:text-sm">
                        {name}
                      </span>

                      <div className="flex min-h-[2.5rem] flex-wrap gap-2 rounded-lg border border-border bg-surface p-2">
                        {selected.map((vid) => (
                          <span
                            key={vid}
                            className="inline-flex items-center gap-1.5 rounded bg-primary px-2 py-1 text-xs font-medium text-white"
                          >
                            {variationName(vid)}
                            <button
                              type="button"
                              onClick={() => removeVariation(id, vid)}
                              aria-label={`Remove ${variationName(vid)}`}
                              className="opacity-80 hover:opacity-100"
                            >
                              <FaTimes className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAttribute(id)}
                        aria-label={`Remove ${name}`}
                        className="rounded-lg border border-border p-2.5 text-muted transition-colors hover:text-red-500"
                      >
                        <FaTrash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border bg-surface px-5 py-2 text-xs font-semibold text-text transition-colors hover:bg-surface-hover hover:text-text-hover"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Continue
        </button>
      </div>
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
  inline = false,
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