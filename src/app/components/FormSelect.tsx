"use client";

import { useEffect, useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa";

type FormSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  inline?: boolean;
  compact?: boolean;
};

export default function FormSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled = false,
  inline = false,
  compact = false,
}: FormSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={ref} className={compact ? "relative inline-block" : "relative"}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center justify-between gap-2 border border-border bg-surface text-left text-text focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 ${
          compact
            ? "min-w-[3.5rem] rounded-md px-2 py-1 text-xs sm:text-sm"
            : "w-full rounded-lg px-3 py-2 text-sm"
        }`}
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
              : `absolute left-0 top-full z-[60] mt-1 ${
                  compact ? "min-w-full" : "right-0"
                }`
          } max-h-44 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg sm:max-h-52`}
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted sm:text-sm">
              No options
            </li>
          ) : (
            options.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`cursor-pointer truncate px-3 py-2 text-xs transition-colors sm:text-sm ${
                  option.value === value
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-text hover:bg-surface-hover hover:text-text-hover"
                }`}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
