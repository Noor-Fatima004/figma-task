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
    if (d.productType === "variable" && d.attributes.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["attributes"],
        message: "Add at least one attribute for a variable product",
      });
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