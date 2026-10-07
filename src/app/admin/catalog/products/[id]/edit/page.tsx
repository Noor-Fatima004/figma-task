"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { FaCog, FaFileAlt, FaSearch } from "react-icons/fa";
import AdvanceInfoStep, {
  emptyAdvanceInfo,
  type AdvanceInfoData,
} from "@/app/admin/catalog/products/add/AdvanceInfoStep";
import BasicInfoStep, {
  emptyBasicInfo,
  type BasicInfoData,
} from "@/app/admin/catalog/products/add/Basicinfostep";
import SeoStep, {
  emptySeo,
  type SeoData,
} from "@/app/admin/catalog/products/add/SeoStep";
import {
  advanceSchema,
  basicSchema,
  seoSchema,
  validate,
  type FieldErrors,
} from "@/app/admin/catalog/products/add/schemas";

const steps = [
  { key: "basic", label: "Basic Info", icon: FaFileAlt },
  { key: "advance", label: "Advance Info", icon: FaCog },
  { key: "seo", label: "SEO", icon: FaSearch },
] as const;

type StepKey = (typeof steps)[number]["key"];
const order: StepKey[] = ["basic", "advance", "seo"];

type EditProduct = {
  media: string[];
  category: string;
  translations: { en: { name: string; description: string } };
  videoEmbedCode: string;
  productType: "simple" | "variable";
  isActive: boolean;
  isPoint: boolean;
  isFeature: boolean;
  unit: string;
  brand: string | null;
  weight: number | null;
  price: number;
  discountPrice: number | null;
  stock: number;
  minOrder: number;
  maxOrder: number;
  sku: string;
  attributes: { attribute: string; variations: string[] }[];
  seoMetaTags: string;
  seoDescription: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseProduct(value: unknown): EditProduct {
  if (!isRecord(value)) throw new Error("Invalid product response.");
  const translations = value.translations;
  const english =
    isRecord(translations) && isRecord(translations.en)
      ? translations.en
      : null;
  const attributes = value.attributes;

  if (
    !Array.isArray(value.media) ||
    !value.media.every((item) => typeof item === "string") ||
    typeof value.category !== "string" ||
    !english ||
    typeof english.name !== "string" ||
    typeof english.description !== "string" ||
    typeof value.videoEmbedCode !== "string" ||
    (value.productType !== "simple" && value.productType !== "variable") ||
    typeof value.isActive !== "boolean" ||
    typeof value.isPoint !== "boolean" ||
    typeof value.isFeature !== "boolean" ||
    typeof value.unit !== "string" ||
    (value.brand !== null && typeof value.brand !== "string") ||
    (value.weight !== null && typeof value.weight !== "number") ||
    typeof value.price !== "number" ||
    (value.discountPrice !== null && typeof value.discountPrice !== "number") ||
    (value.stock !== undefined &&
      (typeof value.stock !== "number" ||
        !Number.isSafeInteger(value.stock) ||
        value.stock < 0)) ||
    typeof value.minOrder !== "number" ||
    typeof value.maxOrder !== "number" ||
    typeof value.sku !== "string" ||
    !Array.isArray(attributes) ||
    !attributes.every(
      (attribute) =>
        isRecord(attribute) &&
        typeof attribute.attribute === "string" &&
        Array.isArray(attribute.variations) &&
        attribute.variations.every(
          (variation) => typeof variation === "string"
        )
    ) ||
    typeof value.seoMetaTags !== "string" ||
    typeof value.seoDescription !== "string"
  ) {
    throw new Error("Invalid product data returned by the API.");
  }

  return {
    media: value.media,
    category: value.category,
    translations: {
      en: { name: english.name, description: english.description },
    },
    videoEmbedCode: value.videoEmbedCode,
    productType: value.productType,
    isActive: value.isActive,
    isPoint: value.isPoint,
    isFeature: value.isFeature,
    unit: value.unit,
    brand: value.brand,
    weight: value.weight,
    price: value.price,
    discountPrice: value.discountPrice,
    stock: typeof value.stock === "number" ? value.stock : 0,
    minOrder: value.minOrder,
    maxOrder: value.maxOrder,
    sku: value.sku,
    attributes: attributes.map((attribute) => ({
      attribute: String(attribute.attribute),
      variations: attribute.variations.map(String),
    })),
    seoMetaTags: value.seoMetaTags,
    seoDescription: value.seoDescription,
  };
}

function getPayload(
  basic: BasicInfoData,
  advance: AdvanceInfoData,
  seo: SeoData
) {
  return {
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
}

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [step, setStep] = useState<StepKey>("basic");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [basic, setBasic] = useState<BasicInfoData>(emptyBasicInfo);
  const [advance, setAdvance] = useState<AdvanceInfoData>(emptyAdvanceInfo);
  const [seo, setSeo] = useState<SeoData>(emptySeo);

  useEffect(() => {
    let active = true;

    const loadProduct = async () => {
      try {
        const response = await fetch(
          `/api/catalog/products/${encodeURIComponent(id)}`,
          { cache: "no-store" }
        );
        const body: unknown = await response.json();
        if (!response.ok) {
          const message =
            isRecord(body) && typeof body.error === "string"
              ? body.error
              : "Failed to load product.";
          throw new Error(message);
        }
        if (!isRecord(body) || !("product" in body)) {
          throw new Error("Invalid product response.");
        }
        const product = parseProduct(body.product);
        if (!active) return;

        setBasic({
          ...emptyBasicInfo,
          media: product.media,
          category: product.category,
          translations: { en: product.translations.en },
          videoEmbedCode: product.videoEmbedCode,
        });
        setAdvance({
          ...emptyAdvanceInfo,
          productType: product.productType,
          isActive: product.isActive,
          isPoint: product.isPoint,
          isFeature: product.isFeature,
          unit: product.unit,
          brand: product.brand ?? "",
          weight: product.weight === null ? "" : String(product.weight),
          price: String(product.price),
          discountPrice:
            product.discountPrice === null
              ? ""
              : String(product.discountPrice),
          stock: String(product.stock),
          minOrder: String(product.minOrder),
          maxOrder: String(product.maxOrder),
          sku: product.sku,
          attributes: product.attributes.map((item) => item.attribute),
          variations: Object.fromEntries(
            product.attributes.map((item) => [
              item.attribute,
              item.variations,
            ])
          ),
        });
        setSeo({
          seoMetaTags: product.seoMetaTags,
          seoDescription: product.seoDescription,
        });
      } catch (error) {
        if (!active) return;
        console.error("Failed to load product for editing:", error);
        setLoadError(
          error instanceof Error ? error.message : "Failed to load product."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProduct();
    return () => {
      active = false;
    };
  }, [id]);

  const check = (key: StepKey) => {
    if (key === "basic") return validate(basicSchema, basic);
    if (key === "advance") return validate(advanceSchema, advance);
    return validate(seoSchema, seo);
  };

  const goTo = (target: StepKey): boolean => {
    const targetIndex = order.indexOf(target);
    for (let index = 0; index < targetIndex; index += 1) {
      const result = check(order[index]);
      if (!result.ok) {
        setErrors(result.errors);
        setStep(order[index]);
        return false;
      }
    }
    setErrors({});
    setSaveError("");
    setStep(target);
    return true;
  };

  const handleSave = async () => {
    if (!goTo("seo")) return;
    const seoResult = check("seo");
    if (!seoResult.ok) {
      setErrors(seoResult.errors);
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch(
        `/api/catalog/products/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(getPayload(basic, advance, seo)),
        }
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          isRecord(body) && typeof body.error === "string"
            ? body.error
            : "Failed to update product.";
        throw new Error(message);
      }
      toast.success("Product updated successfully.");
      router.push("/admin/catalog/products");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update product.";
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8" aria-busy="true">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 h-72 animate-pulse rounded-md bg-gray-100" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4 md:p-8" role="alert">
        <h1 className="text-2xl font-bold text-gray-800">Unable to edit product</h1>
        <p className="mt-2 text-sm text-red-600">{loadError}</p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/catalog/products")}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
          >
            Back to products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="border-b border-gray-200 pb-4 text-2xl font-bold text-gray-800">
        Edit Product
      </h1>

      <div className="my-5 flex flex-wrap justify-center gap-3 text-xs sm:gap-4">
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
