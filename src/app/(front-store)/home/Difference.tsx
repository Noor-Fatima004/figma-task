// Rakho: src/app/components/storefront/Difference.tsx
// Use: <Difference /> (home page par Journal ke neeche)

// ---- Data ----
const points = [
  {
    no: "01",
    title: "Considered Materials",
    text: "Natural materials and carefully selected finishes chosen for their character and lasting quality.",
  },
  {
    no: "02",
    title: "Crafted to Last",
    text: "Thoughtful construction and enduring forms designed to live with you for years.",
  },
  {
    no: "03",
    title: "Delivered with Care",
    text: "Specialist delivery and considered handling from our door to yours.",
  },
  {
    no: "04",
    title: "Here When You Need Us",
    text: "Personal support before, during and after your purchase.",
  },
];

export default function Difference() {
  return (
    <section className="border-t border-[#e6e0d8] bg-[#fdfcfa] py-12 sm:py-16 lg:py-24 2xl:py-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 2xl:max-w-[1680px] 2xl:px-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 2xl:gap-24">
          {/* LEFT: heading */}
          <div>
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.25em] text-[#6b625a] sm:text-[11px]">
              The difference
            </p>
            <h2 className="max-w-[14ch] text-[28px] font-medium leading-tight text-[#2a231f] sm:max-w-md sm:text-4xl lg:text-5xl 2xl:max-w-xl 2xl:text-6xl">
              Considered from our workshop to your home.
            </h2>
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-[#4d453f] sm:text-sm 2xl:max-w-md 2xl:text-base">
              From carefully selected materials to thoughtful delivery, every part of the
              experience is designed around quality.
            </p>
          </div>

          {/* RIGHT: numbered points */}
          <ol>
            {points.map((p, i) => (
              <li
                key={p.no}
                className={`grid grid-cols-[2rem_1fr] gap-x-2 py-5 sm:grid-cols-[3rem_1fr] sm:py-6 lg:py-7 ${
                  i !== points.length - 1 ? "border-b border-[#e6dcd2]" : ""
                } ${i === 0 ? "pt-0 lg:pt-0" : ""}`}
              >
                <span className="pt-1 text-[10px] tracking-[0.15em] text-[#8b5e3c]">{p.no}</span>
                <div>
                  <h3 className="text-sm font-medium text-[#2a231f] sm:text-[15px] 2xl:text-base">
                    {p.title}
                  </h3>
                  <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[#4d453f] sm:text-sm 2xl:text-[15px]">
                    {p.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}