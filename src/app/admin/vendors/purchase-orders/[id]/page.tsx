import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import PurchaseOrder from "@/app/models/PurchaseOrder";
import connectDB from "@/lib/mongodb";
import PurchaseOrderDetail from "./PurchaseOrderDetail";

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  if (!(await PurchaseOrder.exists({ _id: id, isDeleted: false }))) notFound();
  return <PurchaseOrderDetail id={id} />;
}
