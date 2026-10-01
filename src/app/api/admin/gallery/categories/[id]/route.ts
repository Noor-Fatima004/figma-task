import { NextResponse } from "next/server";
import  connectDB  from "@/lib/mongodb";
import GalleryCategory from "@/app/models/GalleryCategory";
import GalleryImage from "@/app/models/GalleryImage";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const count = await GalleryImage.countDocuments({ category: id });
  if (count > 0)
    return NextResponse.json({ error: "Please delete the images in this category first." }, { status: 400 });
  await GalleryCategory.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}