import Link from "next/link";
import { ROOMS } from "@/lib/rooms";

export default function RoomsPage() {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-[#1f1a17]">Shop by room</h1>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        {Object.entries(ROOMS).map(([key, r]) => (
          <Link
            key={key}
            href={`/rooms/${key}`}
            className="rounded-md border border-[#e9e4dd] bg-white p-6 text-center text-sm font-medium text-[#2b2420] transition-colors hover:border-[#a0643c] hover:text-[#a0643c]"
          >
            {r.title}
          </Link>
        ))}
      </div>
    </main>
  );
}