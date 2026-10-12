import VendorTable from "./VendorTable";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  return <VendorTable initialCategory={params.category ?? ""} />;
}
