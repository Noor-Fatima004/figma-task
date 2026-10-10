const money = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function InvoiceSummaryCards({
  summary,
}: {
  summary: { count: number; revenue: number; paid: number; unpaid: number; overdue: number };
}) {
  const cards = [
    ["Total invoices", summary.count.toLocaleString()],
    ["Total revenue", money(summary.revenue)],
    ["Paid", money(summary.paid)],
    ["Unpaid / pending", money(summary.unpaid)],
    ["Overdue amount", money(summary.overdue)],
  ];
  return (
    <section aria-label="Invoice summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {cards.map(([label, value]) => (
        <article key={label} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs text-muted sm:text-sm">{label}</p>
          <p className="mt-2 truncate text-lg font-semibold text-text sm:text-xl">{value}</p>
        </article>
      ))}
    </section>
  );
}
