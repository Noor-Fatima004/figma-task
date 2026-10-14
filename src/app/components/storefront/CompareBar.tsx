"use client";

import Image from "next/image";
import Link from "next/link";
import { FiX } from "react-icons/fi";
import { useCompare } from "@/app/components/storefront/compareStore";

export default function CompareBar() {
  const { items, count, remove, clear, max } = useCompare();
  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e6e0d8] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
        <p className="hidden shrink-0 text-xs text-[#6b625a] sm:block sm:text-sm">
          Compare ({count}/{max})
        </p>

        <ul className="flex min-w-0 flex-1 gap-2 overflow-x-auto sm:gap-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((p) => (
            <li key={p.id} className="relative shrink-0">
              <div className="relative h-12 w-12 overflow-hidden rounded-md border border-[#e6e0d8] bg-[#f1ebe3] sm:h-14 sm:w-14">
                {p.image && (
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    unoptimized
                    sizes="56px"
                    className="object-cover"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label={`Remove ${p.name} from compare`}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-[#2a231f] text-white shadow-sm hover:bg-[#8b5e3c]"
              >
                <FiX className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={clear}
            className="cursor-pointer text-xs text-[#6b625a] underline underline-offset-4 hover:text-[#2a231f] sm:text-sm"
          >
            Clear
          </button>
          <Link
            href="/compare"
            className="cursor-pointer rounded-full bg-[#8b5e3c] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#6f4a2e] sm:px-5 sm:py-2.5 sm:text-sm"
          >
            Compare now
          </Link>
        </div>
      </div>
    </div>
  );
}