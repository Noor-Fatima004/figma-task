"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FaFileAlt, FaCog, FaSearch } from "react-icons/fa";
import AdvanceInfoStep, {
  emptyAdvanceInfo,
  type AdvanceInfoData,
} from "./AdvanceInfoStep";
import BasicInfoStep, {
  emptyBasicInfo,
  type BasicInfoData,
} from "./Basicinfostep";
import SeoStep, { emptySeo, type SeoData } from "./SeoStep";
import {
  basicSchema,
  advanceSchema,
  seoSchema,
  validate,
  type FieldErrors,
} from "./schemas";

const steps = [
  { key: "basic", label: "Basic Info", icon: FaFileAlt },
  { key: "advance", label: "Advance Info", icon: FaCog },
  { key: "seo", label: "SEO", icon: FaSearch },
] as const;

type StepKey = (typeof steps)[number]["key"];
const order: StepKey[] = ["basic", "advance", "seo"];

export default function AddProductPage() {
  const router = useRouter();
  const [step, setStep] = useState<StepKey>("basic");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Teeno steps ka data yahin jama hota hai, last step par save hota hai
  const [basic, setBasic] = useState<BasicInfoData>(emptyBasicInfo);
  const [advance, setAdvance] = useState<AdvanceInfoData>(emptyAdvanceInfo);
  const [seo, setSeo] = useState<SeoData>(emptySeo);

  const check = (key: StepKey) => {
    if (key === "basic") return validate(basicSchema, basic);
    if (key === "advance") return validate(advanceSchema, advance);
    return validate(seoSchema, seo);
  };

  /**
   * Target step par jane se pehle us se pehle ke saare steps validate hote hain.
   * Koi step invalid ho to wahin rok diya jata hai aur errors dikhte hain.
   * Peeche (Back) jana hamesha allowed hai.
   */
  const goTo = (target: StepKey): boolean => {
    const targetIdx = order.indexOf(target);
    for (let i = 0; i < targetIdx; i++) {
      const result = check(order[i]);
      if (!result.ok) {
        setErrors(result.errors);
        setStep(order[i]);
        return false;
      }
    }
    setErrors({});
    setSaveError("");
    setStep(target);
    return true;
  };

  const handleSave = async () => {
    // Pehle basic + advance check, phir seo
    if (!goTo("seo")) return;
    const seoResult = check("seo");
    if (!seoResult.ok) {
      setErrors(seoResult.errors);
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        media: basic.media,
        category: basic.category,
        translations: { en: basic.translations.en },
        videoEmbedCode: basic.videoEmbedCode,

        productType: advance.productType,
        isActive: advance.isActive,
        isPoint: advance.isPoint,
        isFeature: advance.isFeature,
        unit: advance.unit,
        brand: advance.brand || null,
        weight: advance.weight ? Number(advance.weight) : null,
        price: Number(advance.price),
        discountPrice: advance.discountPrice
          ? Number(advance.discountPrice)
          : null,
        stock: Number(advance.stock),
        minOrder: Number(advance.minOrder),
        maxOrder: Number(advance.maxOrder),
        sku: advance.sku.trim(),
        attributes: advance.attributes.map((attribute) => ({
          attribute,
          variations: advance.variations[attribute] ?? [],
        })),

        seoMetaTags: seo.seoMetaTags.trim(),
        seoDescription: seo.seoDescription.trim(),
      };

      const res = await fetch("/api/catalog/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to save product.");
      }

      router.push("/admin/catalog/products");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Something went wrong.";
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="border-b border-gray-200 pb-4 text-2xl font-bold text-gray-800">
        Add Product
      </h1>

      {/* Step tabs */}
      <div className="my-5 flex justify-center gap-4 text-xs">
        {steps.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => goTo(key)}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 transition-colors ${
              step === key
                ? "bg-primary font-medium text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {step === "basic" && (
        <BasicInfoStep
          data={basic}
          onChange={setBasic}
          errors={errors}
          onContinue={() => goTo("advance")}
          onAddMedia={() => {
            // TODO: Gallery picker yahan kholna hai
          }}
        />
      )}

      {step === "advance" && (
        <AdvanceInfoStep
          data={advance}
          onChange={setAdvance}
          errors={errors}
          onBack={() => goTo("basic")}
          onContinue={() => goTo("seo")}
        />
      )}

      {step === "seo" && (
        <SeoStep
          data={seo}
          onChange={setSeo}
          errors={errors}
          saving={saving}
          saveError={saveError}
          onBack={() => goTo("advance")}
          onSave={handleSave}
        />
      )}
    </div>
  );
}