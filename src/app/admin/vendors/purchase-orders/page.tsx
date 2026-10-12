import PurchaseOrderTable from "./PurchaseOrderTable";

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string }>;
}) {
  const params = await searchParams;
  return <PurchaseOrderTable vendorId={params.vendor ?? ""} />;
}
