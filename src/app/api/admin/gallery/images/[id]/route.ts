import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import GalleryImage from "@/app/models/GalleryImage";
import { deleteImage } from "@/lib/cloudinary";
import { checkUsage, inTransaction, usageError } from "@/lib/safeDelete";

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
  try {
    await connectDB();
    const result = await inTransaction(async (session) => {
      const usage = await checkUsage("image", id, session);
      if (usage.length > 0) return { usage, deleted: false };

      const image = await GalleryImage.findById(id).session(session);
      if (!image) return { usage: [], deleted: false };
      if (image.publicId) await deleteImage(image.publicId);
      await GalleryImage.deleteOne({ _id: id }).session(session);
      return { usage: [], deleted: true };
    });

    if (result.usage.length > 0) {
      return NextResponse.json(
        { error: usageError("image", result.usage) },
        { status: 409 }
      );
    }
    if (!result.deleted) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`DELETE gallery image "${id}" failed:`, error);
    return NextResponse.json(
      { error: "Image deletion failed; the database record was kept" },
      { status: 502 }
    );
  }
}