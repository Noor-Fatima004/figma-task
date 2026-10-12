"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { FaArrowLeft, FaPlus, FaTimes, FaTrash } from "react-icons/fa";

const types = ["manufacturer", "wholesaler", "distributor", "retailer", "dropshipper", "service_provider"] as const;
const statuses = ["active", "inactive", "pending", "blacklisted", "on_hold"] as const;
const paymentTermsOptions = ["cod", "advance", "net_7", "net_15", "net_30", "net_60"] as const;
const currencies = ["PKR", "USD", "EUR", "GBP", "AED", "CNY"];

type DocumentRow = { name: string; url: string; type: string; expiryDate: string };

type FormState = {
  // General
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  alternatePhone: string;
  website: string;
  logo: string;
  type: (typeof types)[number];
  status: (typeof statuses)[number];
  rating: string;
  tags: string;
  // Address
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  // Billing address
  sameBilling: boolean;
  bLine1: string;
  bLine2: string;
  bCity: string;
  bState: string;
  bPostalCode: string;
  bCountry: string;
  // Tax
  taxId: string;
  taxType: string;
  isTaxExempt: boolean;
  // Bank
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  swift: string;
  branch: string;
  // Purchasing
  paymentTerms: (typeof paymentTermsOptions)[number];
  currency: string;
  creditLimit: string;
  openingBalance: string;
  leadTimeDays: string;
  minimumOrderValue: string;
  minimumOrderQuantity: string;
  // Other
  notes: string;
  categories: string[];
  documents: DocumentRow[];
};

type TextKey =
  | "companyName" | "contactPerson" | "email" | "phone" | "alternatePhone" | "website" | "logo" | "tags"
  | "line1" | "line2" | "city" | "state" | "postalCode" | "country"
  | "bLine1" | "bLine2" | "bCity" | "bState" | "bPostalCode" | "bCountry"
  | "taxId" | "taxType"
  | "bankName" | "accountTitle" | "accountNumber" | "iban" | "swift" | "branch"
  | "creditLimit" | "openingBalance" | "leadTimeDays" | "minimumOrderValue" | "minimumOrderQuantity";

const emptyForm: FormState = {
  companyName: "", contactPerson: "", email: "", phone: "", alternatePhone: "", website: "", logo: "",
  type: "wholesaler", status: "active", rating: "", tags: "",
  line1: "", line2: "", city: "", state: "", postalCode: "", country: "Pakistan",
  sameBilling: true, bLine1: "", bLine2: "", bCity: "", bState: "", bPostalCode: "", bCountry: "Pakistan",
  taxId: "", taxType: "", isTaxExempt: false,
  bankName: "", accountTitle: "", accountNumber: "", iban: "", swift: "", branch: "",
  paymentTerms: "cod", currency: "PKR",
  creditLimit: "0", openingBalance: "0", leadTimeDays: "0", minimumOrderValue: "0", minimumOrderQuantity: "0",
  notes: "", categories: [], documents: [],
};

const emptyDocument: DocumentRow = { name: "", url: "", type: "other", expiryDate: "" };
const documentTypes = ["license", "contract", "tax_certificate", "bank_letter", "other"];

const numberString = (name: string, allowNegative = false) =>
  z.string().trim().refine(
    (value) => value === "" || (!Number.isNaN(Number(value)) && (allowNegative || Number(value) >= 0)),
    `${name} must be a valid ${allowNegative ? "number" : "number (0 or more)"}.`
  );
const optionalUrl = (name: string) =>
  z.string().trim().max(500).refine((value) => {
    if (value === "") return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, `${name} must be a valid URL (include https://).`);

const formSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required.").max(200),
  contactPerson: z.string().trim().max(120),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  phone: z.string().trim().min(1, "Phone number is required.").max(40),
  alternatePhone: z.string().trim().max(40),
  website: optionalUrl("Website"),
  logo: optionalUrl("Logo"),
  type: z.enum(types),
  status: z.enum(statuses),
  rating: z.string().refine((value) => value === "" || ["1", "2", "3", "4", "5"].includes(value), "Invalid rating."),
  tags: z.string().max(500),
  line1: z.string().trim().max(200),
  line2: z.string().trim().max(200),
  city: z.string().trim().max(100),
  state: z.string().trim().max(100),
  postalCode: z.string().trim().max(20),
  country: z.string().trim().max(100),
  sameBilling: z.boolean(),
  bLine1: z.string().trim().max(200),
  bLine2: z.string().trim().max(200),
  bCity: z.string().trim().max(100),
  bState: z.string().trim().max(100),
  bPostalCode: z.string().trim().max(20),
  bCountry: z.string().trim().max(100),
  taxId: z.string().trim().max(100),
  taxType: z.string().trim().max(100),
  isTaxExempt: z.boolean(),
  bankName: z.string().trim().max(150),
  accountTitle: z.string().trim().max(150),
  accountNumber: z.string().trim().max(60),
  iban: z.string().trim().max(60),
  swift: z.string().trim().max(30),
  branch: z.string().trim().max(150),
  paymentTerms: z.enum(paymentTermsOptions),
  currency: z.string().trim().min(3).max(3),
  creditLimit: numberString("Credit limit"),
  openingBalance: numberString("Opening balance", true),
  leadTimeDays: numberString("Lead time"),
  minimumOrderValue: numberString("Minimum order value"),
  minimumOrderQuantity: numberString("Minimum order quantity"),
  notes: z.string().max(5000),
  categories: z.array(z.string()),
  documents: z.array(
    z.object({
      name: z.string().trim().max(200),
      url: z.string().trim().max(1000),
      type: z.string().trim().max(50),
      expiryDate: z.string(),
    })
  ),
});

const label = (value: string) => value.replaceAll("_", " ");
const toNumber = (value: string) => (value.trim() === "" ? 0 : Number(value));
const inputClass =
  "mt-1 block w-full min-w-0 rounded-md border border-border bg-background px-3 py-2.5 text-base text-text outline-none focus:ring-2 focus:ring-primary sm:py-2 sm:text-sm";
const cardClass = "rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6";
const gridClass = "grid grid-cols-1 gap-3 sm:grid-cols-2";

function getError(body: unknown) {
  return typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
    ? body.error
    : "Could not create vendor.";
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className={cardClass}>
      <h2 className="font-semibold text-text">{title}</h2>
      {hint && <p className="mb-3 mt-0.5 text-xs text-muted">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </section>
  );
}

function Field({ label: text, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block min-w-0 text-sm text-muted ${className}`}>
      {text}
      {children}
    </label>
  );
}

type VendorAddFormProps = {
  /** When set, the form loads this vendor and saves with PUT (edit mode). */
  vendorId?: string;
  /** When set, the form renders as a popup modal and this closes it. */
  onClose?: () => void;
  /** Called after a successful save (modal mode). */
  onSaved?: () => void;
};

export default function VendorAddForm({ vendorId, onClose, onSaved }: VendorAddFormProps = {}) {
  const router = useRouter();
  const isEdit = Boolean(vendorId);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadingVendor, setLoadingVendor] = useState(Boolean(vendorId));
  const [loadFailed, setLoadFailed] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/product-categories?all=1", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load product categories.");
        const body: unknown = await response.json();
        const parsed = z.array(z.object({ _id: z.string(), name: z.string() })).safeParse(body);
        if (!parsed.success) throw new Error("Invalid categories response.");
        if (active) setCategoryOptions(parsed.data);
      })
      .catch((cause) => toast.error(cause instanceof Error ? cause.message : "Could not load categories."));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!vendorId) return;
    let active = true;
    void fetch(`/api/admin/vendors/${vendorId}`, { cache: "no-store" })
      .then(async (response) => {
        const body: unknown = await response.json();
        if (!response.ok || typeof body !== "object" || body === null || !("data" in body)) {
          throw new Error(getError(body));
        }
        if (!active) return;
        const details = (body as { data: { vendor: Record<string, unknown> } }).data.vendor;
        const obj = (value: unknown): Record<string, unknown> =>
          typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
        const str = (value: unknown) => (value === null || value === undefined ? "" : String(value));
        const address = obj(details.address);
        const billing = obj(details.billingAddress);
        const tax = obj(details.taxInfo);
        const bank = obj(details.bankDetails);
        const hasBilling = Object.values(billing).some((value) => str(value) !== "");
        setForm({
          companyName: str(details.companyName),
          contactPerson: str(details.contactPerson),
          email: str(details.email),
          phone: str(details.phone),
          alternatePhone: str(details.alternatePhone),
          website: str(details.website),
          logo: str(details.logo),
          type: types.find((value) => value === details.type) ?? "wholesaler",
          status: statuses.find((value) => value === details.status) ?? "active",
          rating: str(details.rating),
          tags: Array.isArray(details.tags) ? details.tags.map(str).join(", ") : "",
          line1: str(address.line1),
          line2: str(address.line2),
          city: str(address.city),
          state: str(address.state),
          postalCode: str(address.postalCode),
          country: str(address.country),
          sameBilling: !hasBilling,
          bLine1: str(billing.line1),
          bLine2: str(billing.line2),
          bCity: str(billing.city),
          bState: str(billing.state),
          bPostalCode: str(billing.postalCode),
          bCountry: str(billing.country),
          taxId: str(tax.taxId),
          taxType: str(tax.taxType),
          isTaxExempt: Boolean(tax.isTaxExempt),
          bankName: str(bank.bankName),
          accountTitle: str(bank.accountTitle),
          accountNumber: str(bank.accountNumber),
          iban: str(bank.iban),
          swift: str(bank.swift),
          branch: str(bank.branch),
          paymentTerms: paymentTermsOptions.find((value) => value === details.paymentTerms) ?? "cod",
          currency: str(details.currency) || "PKR",
          creditLimit: str(details.creditLimit ?? 0),
          openingBalance: str(details.openingBalance ?? 0),
          leadTimeDays: str(details.leadTimeDays ?? 0),
          minimumOrderValue: str(details.minimumOrderValue ?? 0),
          minimumOrderQuantity: str(details.minimumOrderQuantity ?? 0),
          notes: str(details.notes),
          categories: Array.isArray(details.categories)
            ? details.categories.map((item) => (obj(item)._id !== undefined ? str(obj(item)._id) : str(item)))
            : [],
          documents: Array.isArray(details.documents)
            ? details.documents.map((item) => {
                const row = obj(item);
                return {
                  name: str(row.name),
                  url: str(row.url),
                  type: str(row.type) || "other",
                  expiryDate: str(row.expiryDate).slice(0, 10),
                };
              })
            : [],
        });
      })
      .catch((cause) => {
        if (!active) return;
        setLoadFailed(true);
        toast.error(cause instanceof Error ? cause.message : "Could not load vendor.");
      })
      .finally(() => {
        if (active) setLoadingVendor(false);
      });
    return () => {
      active = false;
    };
  }, [vendorId]);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const text = (
    key: TextKey,
    labelText: string,
    options: { required?: boolean; type?: string; span?: boolean; maxLength?: number; inputMode?: "decimal" | "numeric"; placeholder?: string } = {}
  ) => (
    <Field label={labelText} className={options.span ? "sm:col-span-2" : ""}>
      <input
        required={options.required}
        type={options.type ?? "text"}
        maxLength={options.maxLength}
        inputMode={options.inputMode}
        placeholder={options.placeholder}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        className={inputClass}
      />
    </Field>
  );

  const toggleCategory = (id: string) =>
    set(
      "categories",
      form.categories.includes(id) ? form.categories.filter((value) => value !== id) : [...form.categories, id]
    );

  const updateDocument = (index: number, patch: Partial<DocumentRow>) =>
    set("documents", form.documents.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the vendor details.");
      return;
    }
    const v = parsed.data;

    const documents = v.documents.filter((row) => row.name || row.url || row.expiryDate);
    if (documents.some((row) => !row.name || !row.url)) {
      toast.error("Each document needs both a name and a URL.");
      return;
    }
    if (documents.some((row) => !optionalUrl("Document").safeParse(row.url).success)) {
      toast.error("Document URL must be a valid URL (include https://).");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(isEdit ? `/api/admin/vendors/${vendorId}` : "/api/admin/vendors", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: v.companyName,
          contactPerson: v.contactPerson,
          email: v.email,
          phone: v.phone,
          alternatePhone: v.alternatePhone,
          website: v.website,
          logo: v.logo,
          type: v.type,
          // CHANGED: status ko edit (PUT) me nahi bhejte, API ka schema isay allow nahi karta.
          // Status badalne ke liye table ka Activate/Disable use hota hai (PATCH).
          ...(!isEdit ? { status: v.status } : {}),
          rating: v.rating === "" ? null : Number(v.rating),
          tags: v.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          address: {
            line1: v.line1, line2: v.line2, city: v.city, state: v.state, postalCode: v.postalCode, country: v.country,
          },
          billingAddress: v.sameBilling
            ? null
            : {
                line1: v.bLine1, line2: v.bLine2, city: v.bCity, state: v.bState,
                postalCode: v.bPostalCode, country: v.bCountry,
              },
          taxInfo: { taxId: v.taxId, taxType: v.taxType, isTaxExempt: v.isTaxExempt },
          // Bank details are hidden from reads (select: false), so in edit mode only send them when filled in.
          ...(!isEdit || [v.bankName, v.accountTitle, v.accountNumber, v.iban, v.swift, v.branch].some(Boolean)
            ? {
                bankDetails: {
                  bankName: v.bankName, accountTitle: v.accountTitle, accountNumber: v.accountNumber,
                  iban: v.iban, swift: v.swift, branch: v.branch,
                },
              }
            : {}),
          paymentTerms: v.paymentTerms,
          currency: v.currency.toUpperCase(),
          creditLimit: toNumber(v.creditLimit),
          openingBalance: toNumber(v.openingBalance),
          leadTimeDays: toNumber(v.leadTimeDays),
          minimumOrderValue: toNumber(v.minimumOrderValue),
          minimumOrderQuantity: toNumber(v.minimumOrderQuantity),
          notes: v.notes,
          categories: v.categories,
          // CHANGED: documents bhi sirf naye vendor (POST) par bhejte hain, edit (PUT) me nahi.
          ...(!isEdit
            ? {
                documents: documents.map((row) => ({
                  name: row.name,
                  url: row.url,
                  type: row.type || "other",
                  expiryDate: row.expiryDate || null,
                })),
              }
            : {}),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(getError(body));
      toast.success(isEdit ? "Vendor updated." : "Vendor created.");
      if (onSaved) {
        onSaved();
      } else {
        router.push("/admin/vendors");
        router.refresh();
      }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not create vendor.");
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3 sm:pb-4">
        <div className="min-w-0">
          <h1 id="vendor-form-title" className="text-lg font-semibold text-text sm:text-2xl">
            {isEdit ? "Edit Vendor" : "Add Vendor"}
          </h1>
          <p className="mt-1 text-xs text-muted sm:text-sm">Enter the supplier&apos;s contact and purchasing details.</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={() => {
              if (!saving) onClose();
            }}
            aria-label="Close vendor form"
            className="rounded p-2 text-muted hover:bg-background"
          >
            <FaTimes />
          </button>
        ) : (
          <Link
            href="/admin/vendors"
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-text hover:bg-background"
          >
            <FaArrowLeft className="h-3 w-3" /> Back to vendors
          </Link>
        )}
      </div>

      <form onSubmit={submit} className="space-y-5">
        <Section title="General information">
          <div className={gridClass}>
            {text("companyName", "Company name *", { required: true, maxLength: 200, span: true })}
            <Field label="Vendor type">
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value as FormState["type"])}
                className={`${inputClass} cursor-pointer truncate capitalize`}
              >
                {types.map((value) => (
                  <option key={value} value={value}>{label(value)}</option>
                ))}
              </select>
            </Field>
            {/* CHANGED: edit mode me Status dropdown disabled, kyunke wo edit se save nahi hota */}
            <Field label={isEdit ? "Status (change from the vendors table)" : "Status"}>
              <select
                value={form.status}
                disabled={isEdit}
                onChange={(e) => set("status", e.target.value as FormState["status"])}
                className={`${inputClass} cursor-pointer truncate capitalize disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {statuses.map((value) => (
                  <option key={value} value={value}>{label(value)}</option>
                ))}
              </select>
            </Field>
            {text("contactPerson", "Contact person", { maxLength: 120 })}
            {text("email", "Email *", { required: true, type: "email", maxLength: 254 })}
            {text("phone", "Phone *", { required: true, type: "tel", maxLength: 40 })}
            {text("alternatePhone", "Alternate phone", { type: "tel", maxLength: 40 })}
            {text("website", "Website", { type: "url", maxLength: 500, placeholder: "https://" })}
            {text("logo", "Logo URL", { type: "url", maxLength: 500, placeholder: "https://" })}
            <Field label="Rating">
              <select
                value={form.rating}
                onChange={(e) => set("rating", e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">Not rated</option>
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>{value} star{value > 1 ? "s" : ""}</option>
                ))}
              </select>
            </Field>
            {text("tags", "Tags (comma separated)", { maxLength: 500, placeholder: "e.g. electronics, bulk, local" })}
          </div>
        </Section>

        <Section title="Address">
          <div className={gridClass}>
            {text("line1", "Address line 1", { span: true, maxLength: 200 })}
            {text("line2", "Address line 2", { span: true, maxLength: 200 })}
            {text("city", "City", { maxLength: 100 })}
            {text("state", "State / province", { maxLength: 100 })}
            {text("postalCode", "Postal code", { maxLength: 20 })}
            {text("country", "Country", { maxLength: 100 })}
          </div>
        </Section>

        <Section title="Billing address">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={form.sameBilling}
              onChange={(e) => set("sameBilling", e.target.checked)}
            />
            Same as address above
          </label>
          {!form.sameBilling && (
            <div className={`${gridClass} mt-3`}>
              {text("bLine1", "Address line 1", { span: true, maxLength: 200 })}
              {text("bLine2", "Address line 2", { span: true, maxLength: 200 })}
              {text("bCity", "City", { maxLength: 100 })}
              {text("bState", "State / province", { maxLength: 100 })}
              {text("bPostalCode", "Postal code", { maxLength: 20 })}
              {text("bCountry", "Country", { maxLength: 100 })}
            </div>
          )}
        </Section>

        <Section title="Tax information">
          <div className={gridClass}>
            {text("taxId", "Tax ID (NTN / STRN / VAT)", { maxLength: 100 })}
            {text("taxType", "Tax type", { maxLength: 100 })}
            <label className="flex items-center gap-2 text-sm text-text sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isTaxExempt}
                onChange={(e) => set("isTaxExempt", e.target.checked)}
              />
              Tax exempt
            </label>
          </div>
        </Section>

        <Section
          title="Bank details"
          hint={
            isEdit
              ? "Existing bank details are hidden. Fill these in only if you want to replace them."
              : "Stored securely and hidden from normal vendor queries."
          }
        >
          <div className={gridClass}>
            {text("bankName", "Bank name", { maxLength: 150 })}
            {text("accountTitle", "Account title", { maxLength: 150 })}
            {text("accountNumber", "Account number", { maxLength: 60 })}
            {text("iban", "IBAN", { maxLength: 60 })}
            {text("swift", "SWIFT / BIC", { maxLength: 30 })}
            {text("branch", "Branch", { maxLength: 150 })}
          </div>
        </Section>

        <Section title="Purchasing terms">
          <div className={gridClass}>
            <Field label="Payment terms">
              <select
                value={form.paymentTerms}
                onChange={(e) => set("paymentTerms", e.target.value as FormState["paymentTerms"])}
                className={`${inputClass} cursor-pointer truncate capitalize`}
              >
                {paymentTermsOptions.map((value) => (
                  <option key={value} value={value}>{label(value)}</option>
                ))}
              </select>
            </Field>
            <Field label="Currency">
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                {currencies.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </Field>
            {text("creditLimit", "Credit limit", { inputMode: "decimal" })}
            {text("openingBalance", "Opening balance", { inputMode: "decimal" })}
            {text("leadTimeDays", "Lead time (days)", { inputMode: "numeric" })}
            {text("minimumOrderValue", "Minimum order value", { inputMode: "decimal" })}
            {text("minimumOrderQuantity", "Minimum order quantity", { inputMode: "numeric" })}
          </div>
        </Section>

        <Section title="Supplied categories">
          {categoryOptions.length === 0 ? (
            <p className="text-sm text-muted">No product categories available.</p>
          ) : (
            <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {categoryOptions.map((entry) => (
                <label key={entry._id} className="flex min-w-0 items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    className="shrink-0"
                    checked={form.categories.includes(entry._id)}
                    onChange={() => toggleCategory(entry._id)}
                  />
                  <span className="truncate">{entry.name}</span>
                </label>
              ))}
            </div>
          )}
        </Section>

        {/* CHANGED: Documents section sirf Add mode me dikhta hai (edit se documents save nahi hote) */}
        {!isEdit && (
          <Section title="Documents" hint="Optional. Add links to licenses, contracts or certificates.">
            <div className="space-y-3">
              {form.documents.map((row, index) => (
                <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
                  <Field label="Document name">
                    <input
                      value={row.name}
                      maxLength={200}
                      onChange={(e) => updateDocument(index, { name: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Type">
                    <select
                      value={row.type}
                      onChange={(e) => updateDocument(index, { type: e.target.value })}
                      className={`${inputClass} cursor-pointer capitalize`}
                    >
                      {documentTypes.map((value) => (
                        <option key={value} value={value}>{label(value)}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="URL" className="sm:col-span-2">
                    <input
                      type="url"
                      value={row.url}
                      maxLength={1000}
                      placeholder="https://"
                      onChange={(e) => updateDocument(index, { url: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Expiry date">
                    <input
                      type="date"
                      value={row.expiryDate}
                      onChange={(e) => updateDocument(index, { expiryDate: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => set("documents", form.documents.filter((_, i) => i !== index))}
                      className="inline-flex items-center gap-2 rounded-md border border-rose-200 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                    >
                      <FaTrash className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set("documents", [...form.documents, { ...emptyDocument }])}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-text hover:bg-background"
              >
                <FaPlus className="h-3 w-3" /> Add document
              </button>
            </div>
          </Section>
        )}

        <Section title="Notes">
          <textarea
            rows={4}
            maxLength={5000}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className={inputClass.replace("mt-1 ", "")}
            aria-label="Notes"
          />
        </Section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onClose ? (
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="w-full rounded-md border border-border px-4 py-2.5 text-center text-sm text-text hover:bg-background disabled:opacity-50 sm:w-auto sm:py-2"
            >
              Cancel
            </button>
          ) : (
            <Link
              href="/admin/vendors"
              className="w-full rounded-md border border-border px-4 py-2.5 text-center text-sm text-text hover:bg-background sm:w-auto sm:py-2"
            >
              Cancel
            </Link>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 sm:w-auto sm:py-2"
          >
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create vendor"}
          </button>
        </div>
      </form>
    </div>
  );

  const body = loadingVendor ? (
    <p className="p-6 text-sm text-muted">Loading vendor...</p>
  ) : loadFailed ? (
    <div className="space-y-3 p-6 text-sm text-text">
      <p>Could not load this vendor.</p>
      <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2">
        Close
      </button>
    </div>
  ) : (
    content
  );

  if (!onClose) return body;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-0 sm:p-4 lg:pl-[17rem]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-form-title"
        className="min-h-full w-full max-w-4xl bg-background p-4 shadow-xl sm:min-h-0 sm:rounded-xl sm:p-6"
      >
        {body}
      </div>
    </div>
  );
}