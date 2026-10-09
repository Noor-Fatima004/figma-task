import { z } from "zod";

export type FieldErrors = Record<string, string>;

const isNum = (v: string) => v.trim() !== "" && !Number.isNaN(Number(v));

/* ───────── Step 1: Basic Info ───────── */
export const basicSchema = z.object({
  media: z.array(z.string()),
  category: z.string().min(1, "Please select a category"),
  translations: z.object({
    en: z.object({
      name: z
        .string()
        .trim()
        .min(1, "Product name (English) is required")
        .max(200, "Product name is too long (max 200 characters)"),
      description: z.string(),
    }),
  }),
  videoEmbedCode: z.string(),
});

/* ───────── Step 2: Advance Info ───────── */
export const advanceSchema = z
  .object({
    productType: z
      .string()
      .refine(
        (v) => v === "simple" || v === "variable",
        "Please select a product type"
      ),
    isActive: z.boolean(),
    isPoint: z.boolean(),
    isFeature: z.boolean(),
    unit: z.string().min(1, "Please select a unit"),
    brand: z.string(),
    weight: z
      .string()
      .refine(
        (v) => v.trim() === "" || (isNum(v) && Number(v) >= 0),
        "Weight must be a valid number"
      ),
    price: z
      .string()
      .refine((v) => isNum(v) && Number(v) >= 0, "Enter a valid price"),
    discountPrice: z
      .string()
      .refine(
        (v) => v.trim() === "" || (isNum(v) && Number(v) >= 0),
        "Enter a valid discount price"
      ),
    minOrder: z
      .string()
      .refine(
        (v) => isNum(v) && Number.isInteger(Number(v)) && Number(v) >= 1,
        "Minimum order must be at least 1"
      ),
    maxOrder: z
      .string()
      .refine(
        (v) => isNum(v) && Number.isInteger(Number(v)) && Number(v) >= 1,
        "Maximum order must be at least 1"
      ),
    sku: z.string(),
    attributes: z.array(z.string()),
    variations: z.record(z.string(), z.array(z.string())),
  })
  .superRefine((d, ctx) => {
    if (d.discountPrice.trim() && Number(d.discountPrice) > Number(d.price)) {
      ctx.addIssue({
        code: "custom",
        path: ["discountPrice"],
        message: "Discount price cannot be greater than price",
      });
    }
    if (Number(d.minOrder) > Number(d.maxOrder)) {
      ctx.addIssue({
        code: "custom",
        path: ["maxOrder"],
        message: "Maximum order cannot be less than minimum order",
      });
    }
    if (d.productType === "variable") {
      if (d.attributes.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["attributes"],
          message: "Add at least one attribute for a variable product",
        });
      } else if (
        d.attributes.some((id) => (d.variations[id] ?? []).length === 0)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["variations"],
          message: "Select at least one variation for every attribute",
        });
      }
    }
  });

/* ───────── Step 3: SEO ───────── */
export const seoSchema = z.object({
  seoMetaTags: z
    .string()
    .trim()
    .min(1, "Seo meta tags are required")
    .max(255, "Max 255 characters"),
  seoDescription: z
    .string()
    .trim()
    .min(1, "Seo description is required")
    .max(320, "Max 320 characters"),
});

/** Zod errors ko { "field.path": "message" } me badalta hai */
export function validate(
  schema: z.ZodType,
  data: unknown
): { ok: boolean; errors: FieldErrors } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, errors: {} };

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join(".");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/* ───────── SERVER: poora product payload (API route me use hota hai) ─────────
   Frontend ki validation par bharosa nahi karte, isliye POST /api/catalog/products
   par dobara check hota hai. Payload wahi hai jo AddProductPage bhejta hai
   (numbers already Number me, attributes = [{ attribute, variations[] }]). */

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const productSchema = z
  .object({
    /* Basic */
    media: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
    category: objectId,
    translations: z.object({
      en: z.object({
        name: z
          .string()
          .trim()
          .min(1, "Product name (English) is required")
          .max(200, "Product name is too long (max 200 characters)"),
        description: z.string().max(20000).default(""),
      }),
    }),
    videoEmbedCode: z.string().max(2000).default(""),

    /* Advance */
    productType: z.enum(["simple", "variable"], {
      message: "Please select a product type",
    }),
    isActive: z.boolean(),
    isPoint: z.boolean(),
    isFeature: z.boolean(),
    unit: objectId,
    brand: objectId.nullable(),
    weight: z.number().min(0, "Weight must be a valid number").nullable(),
    price: z
      .number({ message: "Enter a valid price" })
      .min(0, "Enter a valid price"),
    discountPrice: z
      .number()
      .min(0, "Enter a valid discount price")
      .nullable(),
    minOrder: z.number().int().min(1, "Minimum order must be at least 1"),
    maxOrder: z.number().int().min(1, "Maximum order must be at least 1"),
    sku: z.string().trim().max(100).default(""),
    attributes: z
      .array(
        z.object({
          attribute: objectId,
          variations: z.array(objectId),
        })
      )
      .default([]),

    /* SEO */
    seoMetaTags: z
      .string()
      .trim()
      .min(1, "Seo meta tags are required")
      .max(255, "Max 255 characters"),
    seoDescription: z
      .string()
      .trim()
      .min(1, "Seo description is required")
      .max(320, "Max 320 characters"),
  })
  .superRefine((d, ctx) => {
    if (d.discountPrice !== null && d.discountPrice > d.price) {
      ctx.addIssue({
        code: "custom",
        path: ["discountPrice"],
        message: "Discount price cannot be greater than price",
      });
    }
    if (d.minOrder > d.maxOrder) {
      ctx.addIssue({
        code: "custom",
        path: ["maxOrder"],
        message: "Maximum order cannot be less than minimum order",
      });
    }
    if (d.productType === "variable") {
      if (d.attributes.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["attributes"],
          message: "Add at least one attribute for a variable product",
        });
      } else if (d.attributes.some((a) => a.variations.length === 0)) {
        ctx.addIssue({
          code: "custom",
          path: ["attributes"],
          message: "Select at least one variation for every attribute",
        });
      }
    }
  })
  .transform((d) => {
    // Simple product me attributes nahi hote; variable me duplicates hata do
    const seen = new Set<string>();
    const attributes =
      d.productType === "variable"
        ? d.attributes
            .filter((a) => !seen.has(a.attribute) && !!seen.add(a.attribute))
            .map((a) => ({
              attribute: a.attribute,
              variations: [...new Set(a.variations)],
            }))
        : [];
    return { ...d, media: [...new Set(d.media)], attributes };
  });
  const phoneField = (label: string, required: boolean) =>
  z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (!value) {
        if (required) {
          ctx.addIssue({ code: "custom", message: `${label} is required` });
        }
        return;
      }
      const digits = value.replace(/\D/g, "");
      if (
        !/^[+\d\s().-]+$/.test(value) ||
        digits.length < 7 ||
        digits.length > 15
      ) {
        ctx.addIssue({
          code: "custom",
          message: `Enter a valid ${label.toLowerCase()} (7 to 15 digits)`,
        });
      }
    });

const coordinateField = (label: string, min: number, max: number) =>
  z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .superRefine((value, ctx) => {
      if (value === "" || value === null || value === undefined) return;
      const n = Number(value);
      if (!Number.isFinite(n) || n < min || n > max) {
        ctx.addIssue({
          code: "custom",
          message: `${label} must be between ${min} and ${max}`,
        });
      }
    });

export const locationContactSchema = z
  .object({
    country: z.string().trim().min(1, "Country is required"),
    state: z.string().trim().max(100, "Max 100 characters"),
    city: z.string().trim().max(100, "Max 100 characters"),
    area: z.string().trim().max(100, "Max 100 characters"),
    address: z
      .string()
      .trim()
      .min(1, "Address is required")
      .min(5, "Address must be at least 5 characters")
      .max(200, "Address must be at most 200 characters"),
    postalCode: z
      .string()
      .trim()
      .max(12, "Postal code must be at most 12 characters")
      .regex(/^[A-Za-z0-9\s-]*$/, "Only letters, numbers, spaces and - allowed"),
    latitude: coordinateField("Latitude", -90, 90),
    longitude: coordinateField("Longitude", -180, 180),
    contactPerson: z
      .string()
      .trim()
      .min(1, "Contact person is required")
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be at most 100 characters"),
    phone: phoneField("Phone", true),
    alternatePhone: phoneField("Alternate phone", false),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Enter a valid email address")
      .max(254, "Email is too long"),
  })
  .superRefine((value, ctx) => {
    const hasLat = value.latitude !== "" && value.latitude != null;
    const hasLng = value.longitude !== "" && value.longitude != null;
    if (hasLat && !hasLng) {
      ctx.addIssue({
        code: "custom",
        path: ["longitude"],
        message: "Longitude is required when latitude is set",
      });
    }
    if (hasLng && !hasLat) {
      ctx.addIssue({
        code: "custom",
        path: ["latitude"],
        message: "Latitude is required when longitude is set",
      });
    }
  });

export type ProductInput = z.output<typeof productSchema>;