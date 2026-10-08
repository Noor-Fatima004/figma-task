import { z } from "zod";

export type FieldErrors = Record<string, string>;

const numericString = (label: string, min?: number, max?: number) =>
  z.string().refine(
    (value) =>
      value.trim() === "" ||
      (!Number.isNaN(Number(value)) &&
        (min === undefined || Number(value) >= min) &&
        (max === undefined || Number(value) <= max)),
    `${label} must be a valid number`
  );

export const basicSchema = z.object({
  name: z.string().trim().min(1, "Warehouse name is required"),
  code: z
    .string()
    .trim()
    .min(1, "Warehouse code is required")
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, and hyphens only"),
  type: z.enum(
    ["main", "branch", "distribution", "returns", "third_party"],
    { message: "Please select a warehouse type" }
  ),
  isActive: z.boolean(),
  description: z.string(),
  image: z.string(),
});

export const locationSchema = z.object({
  country: z.string(),
  state: z.string(),
  city: z.string(),
  area: z.string(),
  address: z.string().trim().min(1, "Address is required"),
  postalCode: z.string(),
  latitude: numericString("Latitude", -90, 90),
  longitude: numericString("Longitude", -180, 180),
  contactPerson: z.string().trim().min(1, "Contact person is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  alternatePhone: z.string(),
  email: z.string().trim().email("Enter a valid email address"),
});

export const operationsSchema = z.object({
  capacity: numericString("Capacity", 0),
  capacityUnit: z.enum(["units", "sqft", "cbm"]),
  storageType: z.enum(["normal", "cold", "hazardous", "bonded"]),
  operatingHours: z.string(),
  workingDays: z.array(z.string()),
  isDefault: z.boolean(),
  allowNegativeStock: z.boolean(),
  priority: z.string().refine(
    (value) =>
      value.trim() !== "" &&
      !Number.isNaN(Number(value)) &&
      Number.isInteger(Number(value)) &&
      Number(value) >= 0,
    "Priority must be a non-negative whole number"
  ),
  serviceableAreas: z.string(),
  manager: z.string(),
  taxNumber: z.string(),
});

export const warehouseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  code: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[A-Za-z0-9-]+$/)
    .transform((value) => value.toUpperCase()),
  type: z.enum(["main", "branch", "distribution", "returns", "third_party"]),
  isActive: z.boolean().default(true),
  description: z.string().trim().max(5000).default(""),
  image: z.string().default(""),
  country: z.string().trim().max(100).default(""),
  state: z.string().trim().max(100).default(""),
  city: z.string().trim().max(100).default(""),
  area: z.string().trim().max(100).default(""),
  address: z.string().trim().min(1).max(500),
  postalCode: z.string().trim().max(40).default(""),
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
  contactPerson: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(50),
  alternatePhone: z.string().trim().max(50).default(""),
  email: z.string().trim().email().max(254),
  capacity: z.number().min(0).nullable().default(null),
  capacityUnit: z.enum(["units", "sqft", "cbm"]).default("units"),
  storageType: z.enum(["normal", "cold", "hazardous", "bonded"]).default("normal"),
  operatingHours: z.string().trim().max(100).default(""),
  workingDays: z.array(z.string().trim().min(1).max(20)).default([]),
  isDefault: z.boolean().default(false),
  allowNegativeStock: z.boolean().default(false),
  priority: z.number().int().min(0).default(0),
  serviceableAreas: z.array(z.string().trim().min(1).max(100)).default([]),
  manager: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid manager id")
    .nullable()
    .default(null),
  taxNumber: z.string().trim().max(100).default(""),
});

export type BasicInfoData = Omit<z.infer<typeof basicSchema>, "type"> & {
  type: "" | z.infer<typeof basicSchema>["type"];
};
export type LocationContactData = z.infer<typeof locationSchema>;
export type OperationsSettingsData = z.infer<typeof operationsSchema>;
export type WarehouseInput = z.output<typeof warehouseSchema>;

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
