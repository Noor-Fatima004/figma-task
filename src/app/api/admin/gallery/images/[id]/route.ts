import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import GalleryImage from "@/app/models/GalleryImage";
import { safeDelete, usageError } from "@/lib/safeDelete";

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
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid image id" }, { status: 400 });
  }
  await connectDB();
  const { deleted, usage } = await safeDelete("image", id, (session) =>
    GalleryImage.findByIdAndDelete(id).session(session)
  );
  if (usage.length > 0) {
    return NextResponse.json({ error: usageError("image", usage) }, { status: 409 });
  }
  if (!deleted) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}