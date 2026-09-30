import { NextResponse } from "next/server";
import  connectDB  from "@/lib/mongodb";
import GalleryImage from "@/app/models/GalleryImage";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();

  const current = await GalleryImage.findById(id).select("name");
  if (!current) return NextResponse.json([]);

  // same name wali baaki saari images (current ko chhod ke)
  const variants = await GalleryImage.find({ name: current.name, _id: { $ne: id } })
    .select("-data")
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json(variants);
}