import { NextResponse } from "next/server";
import  connectDB  from "@/lib/mongodb";
import GalleryImage from "@/app/models/GalleryImage";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  await connectDB();
  const img = await GalleryImage.findById(id).select("-data").lean();
  if (!img) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(img);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  await connectDB();
  const { width, height, alt, category } = await req.json();
  const update: Record<string, unknown> = {};
  if (width) update.width = Number(width);
  if (height) update.height = Number(height);
  if (alt !== undefined) update.alt = alt;
  if (category) update.category = category;
  const img = await GalleryImage.findByIdAndUpdate(id, update, { new: true }).select("-data");
  return NextResponse.json(img);
}

export async function DELETE(_: Request, { params }: Ctx) {
  const { id } = await params;
  await connectDB();
  await GalleryImage.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}