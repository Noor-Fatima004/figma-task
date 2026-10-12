const money = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export type VendorSummary = {
  total: number;
  active: number;
  purchased: number;
  payable: number;
  pendingPurchaseOrders: number;
};

export default function VendorSummaryCards({ summary }: { summary: VendorSummary }) {
  const cards = [
    ["Total vendors", summary.total.toLocaleString()],
    ["Active vendors", summary.active.toLocaleString()],
    ["Total purchased", money(summary.purchased)],
    ["Total payable", money(summary.payable)],
    ["Pending purchase orders", summary.pendingPurchaseOrders.toLocaleString()],
  ];
  return (
    <section aria-label="Vendor summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {cards.map(([label, value]) => (
        <article key={label} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs text-muted sm:text-sm">{label}</p>
          <p className="mt-2 truncate text-lg font-semibold text-text sm:text-xl">{value}</p>
        </article>
      ))}
    </section>
  );
}
