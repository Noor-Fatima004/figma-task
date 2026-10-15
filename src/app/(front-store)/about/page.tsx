import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About us | Naltar",
  description: "Furniture, bedding and tech, chosen for the way you live and work.",
};

const VALUES = [
  {
    title: "Quality first",
    text: "Every piece is checked for materials, finish and durability before it reaches our catalog.",
  },
  {
    title: "Honest pricing",
    text: "Clear prices and real discounts. What you see on the product page is what you pay.",
  },
  {
    title: "Made for real homes",
    text: "From bedrooms to home offices, we pick products that fit everyday life, not just photos.",
  },
  {
    title: "Support that helps",
    text: "Questions about an order or a product? Our team replies quickly and follows through.",
  },
];

const STATS = [
  { value: "3", label: "Product ranges" },
  { value: "5", label: "Rooms to shop" },
  { value: "100%", label: "Checked before dispatch" },
  { value: "24h", label: "Support reply time" },
];

const RANGES = [
  {
    title: "Furniture",
    text: "Sofas, tables, beds and storage for every room, from living spaces to the garden.",
    href: "/shop",
  },
  {
    title: "Bedding",
    text: "Soft, long-lasting bedding that makes the bedroom feel calm and complete.",
    href: "/rooms/bedroom",
  },
  {
    title: "Laptops",
    text: "Reliable laptops for work and study, ready to pair with a proper home office.",
    href: "/rooms/office",
  },
];

export default function AboutPage() {
  return (
    <main className="bg-[#faf9f7] text-[#2b2420]">
      {/* HERO */}
      <section className="border-b border-[#e9e4dd] bg-[#f6f2ed]">
        <div className="mx-auto max-w-[1400px] px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#a0643c]">
            About Naltar
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-[#1f1a17] sm:text-5xl">
            Furniture, bedding and tech for the way you live
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-[#6b5d52] sm:text-lg">
            We bring together well-made pieces for your home and workspace, so
            furnishing a room feels simple instead of stressful.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/shop"
              className="rounded-md bg-[#1f1a17] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#a0643c]"
            >
              Shop now
            </Link>
            <Link
              href="/collections"
              className="rounded-md border border-[#e9e4dd] bg-white px-6 py-3 text-sm font-medium text-[#5b4a3f] transition-colors hover:border-[#a0643c] hover:text-[#a0643c]"
            >
              View collections
            </Link>
          </div>
        </div>
      </section>

      {/* STORY */}
      <section className="mx-auto grid max-w-[1400px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-20">
        <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-gradient-to-br from-[#e9e4dd] to-[#d9c8b8]">
          <span className="text-5xl font-semibold tracking-tight text-[#a0643c]/70">
            Naltar
          </span>
        </div>
        <div className="flex flex-col justify-center">
          <h2 className="text-2xl font-semibold text-[#1f1a17] sm:text-3xl">Our story</h2>
          <p className="mt-4 text-[#6b5d52]">
            Naltar started with a simple idea: a good home should not mean
            visiting ten different shops. We wanted one place where you can find
            a comfortable sofa, a good set of bedding and a dependable laptop,
            all chosen with the same care.
          </p>
          <p className="mt-4 text-[#6b5d52]">
            Today we work with trusted vendors and keep our catalog focused, so
            every product has earned its place. We would rather offer fewer,
            better things than a long list of average ones.
          </p>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-[#e9e4dd] bg-white">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-semibold text-[#a0643c]">{s.value}</p>
              <p className="mt-1 text-sm text-[#6b5d52]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT WE SELL */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <h2 className="text-center text-2xl font-semibold text-[#1f1a17] sm:text-3xl">
          What we offer
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {RANGES.map((r) => (
            <Link
              key={r.title}
              href={r.href}
              className="group rounded-md border border-[#e9e4dd] bg-white p-6 transition-colors hover:border-[#a0643c]"
            >
              <h3 className="text-lg font-medium text-[#2b2420] group-hover:text-[#a0643c]">
                {r.title}
              </h3>
              <p className="mt-2 text-sm text-[#6b5d52]">{r.text}</p>
              <span className="mt-4 inline-block text-sm text-[#a0643c]">Explore →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* VALUES */}
      <section className="border-t border-[#e9e4dd] bg-[#f6f2ed]">
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="text-center text-2xl font-semibold text-[#1f1a17] sm:text-3xl">
            What we stand for
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-md border border-[#e9e4dd] bg-white p-6">
                <div className="mb-3 h-1 w-8 rounded bg-[#a0643c]" />
                <h3 className="text-base font-medium text-[#2b2420]">{v.title}</h3>
                <p className="mt-2 text-sm text-[#6b5d52]">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-[#1f1a17] sm:text-3xl">
          Ready to find something for your home?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[#6b5d52]">
          Browse by room or explore our latest collections.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/rooms"
            className="rounded-md bg-[#1f1a17] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#a0643c]"
          >
            Shop by room
          </Link>
          <Link
            href="/help"
            className="rounded-md border border-[#e9e4dd] bg-white px-6 py-3 text-sm font-medium text-[#5b4a3f] transition-colors hover:border-[#a0643c] hover:text-[#a0643c]"
          >
            Contact support
          </Link>
        </div>
      </section>
    </main>
  );
}