import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import Vendor from "@/app/models/Vendor";
import connectDB from "@/lib/mongodb";
import VendorDetail from "./VendorDetail";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  if (!(await Vendor.exists({ _id: id, isDeleted: false }))) notFound();
  return <VendorDetail id={id} />;
}
