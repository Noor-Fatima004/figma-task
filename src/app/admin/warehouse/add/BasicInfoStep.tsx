"use client";

import FormSelect from "@/app/components/FormSelect";
import type { BasicInfoData, FieldErrors } from "./schemas";

const inputCls =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";
const labelCls = "mb-1 block text-xs font-medium text-text sm:text-sm";

interface Props {
  data: BasicInfoData;
  onChange: (data: BasicInfoData) => void;
  onContinue: () => void;
  errors: FieldErrors;
}

export default function BasicInfoStep({
  data,
  onChange,
  onContinue,
  errors,
}: Props) {
  const err = (key: string) =>
    errors[key] ? (
      <p className="mt-1 text-xs text-red-500">{errors[key]}</p>
    ) : null;

  return (
    <>
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-text sm:text-lg">
          Basic Info
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Warehouse Name *</label>
            <input
              value={data.name}
              onChange={(event) =>
                onChange({ ...data, name: event.target.value })
              }
              className={inputCls}
              autoComplete="organization"
            />
            {err("name")}
          </div>
          <div>
            <label className={labelCls}>Warehouse Code *</label>
            <input
              value={data.code}
              onChange={(event) =>
                onChange({ ...data, code: event.target.value.toUpperCase() })
              }
              placeholder="WH-001"
              className={inputCls}
            />
            {err("code")}
          </div>
          <div>
            <label className={labelCls}>Type *</label>
            <FormSelect
              value={data.type}
              onChange={(value) =>
              onChange({ ...data, type: value as BasicInfoData["type"] })
            }
              placeholder="Select type"
              options={[
                { value: "main", label: "Main" },
                { value: "branch", label: "Branch" },
                { value: "distribution", label: "Distribution" },
                { value: "returns", label: "Returns" },
                { value: "third_party", label: "Third party" },
              ]}
            />
            {err("type")}
          </div>
          <label className="flex min-h-11 items-center gap-3 self-end text-sm text-text">
            <input
              type="checkbox"
              checked={data.isActive}
              onChange={(event) =>
                onChange({ ...data, isActive: event.target.checked })
              }
              className="h-4 w-4 accent-primary"
            />
            Active
          </label>
          <div className="sm:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea
              rows={4}
              value={data.description}
              onChange={(event) =>
                onChange({ ...data, description: event.target.value })
              }
              className={inputCls}
            />
            {err("description")}
          </div>
        </div>
      </section>
      <div className="mt-5 flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover sm:w-auto"
        >
          Continue
        </button>
      </div>
    </>
  );
}