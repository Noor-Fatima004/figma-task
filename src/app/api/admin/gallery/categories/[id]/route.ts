import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import GalleryCategory from "@/app/models/GalleryCategory";
import { safeDelete, usageError } from "@/lib/safeDelete";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
  }
  await connectDB();
  const { deleted, usage } = await safeDelete("gallery category", id, (session) =>
    GalleryCategory.findByIdAndDelete(id).session(session)
  );
  if (usage.length > 0) {
    return NextResponse.json(
      { error: usageError("gallery category", usage) },
      { status: 409 }
    );
  }
  if (!deleted) return NextResponse.json({ error: "Gallery category not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}