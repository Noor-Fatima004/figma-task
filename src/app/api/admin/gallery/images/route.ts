import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import GalleryImage from "@/app/models/GalleryImage";
import GalleryCategory from "@/app/models/GalleryCategory";
import { createHash } from "node:crypto";
import { deleteImage, uploadImage, validateImageBuffer } from "@/lib/cloudinary";
import { checkUsage, inTransaction, usageError } from "@/lib/safeDelete";

export async function GET(req: Request) {
  await connectDB();
  const category = new URL(req.url).searchParams.get("category");
  const filter = category && category !== "all" ? { category } : {};
  const images = await GalleryImage.find(filter)
    .select("-data")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json(images);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const category = String(form.get("category") ?? "");
    const files = [
      ...form.getAll("files"),
      ...(form.get("file") ? [form.get("file")!] : []),
    ].filter((entry): entry is File => entry instanceof File);

    if (!mongoose.isValidObjectId(category)) {
      return NextResponse.json({ error: "A valid image category is required" }, { status: 400 });
    }
    if (files.length === 0 || files.length > 20) {
      return NextResponse.json(
        { error: "Upload between 1 and 20 images at a time" },
        { status: 400 }
      );
    }

    await connectDB();
    if (!(await GalleryCategory.exists({ _id: category }))) {
      return NextResponse.json({ error: "Gallery category not found" }, { status: 400 });
    }

    let prepared: { file: File; buffer: Buffer }[];
    try {
      prepared = await Promise.all(
        files.map(async (file) => {
          const buffer = Buffer.from(await file.arrayBuffer());
          validateImageBuffer(buffer, file.type, file.name);
          return { file, buffer };
        })
      );
      if (prepared.reduce((total, entry) => total + entry.buffer.length, 0) > 25 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Total upload size cannot exceed 25MB" },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid image upload" },
        { status: 400 }
      );
    }
    const uploaded: { _id: string; url: string; publicId: string }[] = [];
    const failures: { file: string; error: string }[] = [];

    for (const { file, buffer } of prepared) {
      let cloudImage: Awaited<ReturnType<typeof uploadImage>> | null = null;
      try {
        cloudImage = await uploadImage(file, "gallery");
        const image = await GalleryImage.create({
          category,
          name: file.name,
          alt: String(form.get("alt") || file.name),
          contentType: file.type,
          url: cloudImage.url,
          publicId: cloudImage.publicId,
          width: cloudImage.width || Number(form.get("width")) || 400,
          height: cloudImage.height || Number(form.get("height")) || 300,
          format: cloudImage.format,
          bytes: cloudImage.bytes,
          hash: createHash("sha256").update(buffer).digest("hex"),
        });
        uploaded.push({
          _id: image._id.toString(),
          url: image.url,
          publicId: image.publicId,
        });
      } catch (error) {
        console.error(`Gallery upload failed for "${file.name}":`, error);
        if (cloudImage) {
          try {
            await deleteImage(cloudImage.publicId);
          } catch (cleanupError) {
            console.error(
              `Failed to clean up Cloudinary upload "${cloudImage.publicId}":`,
              cleanupError
            );
          }
        }
        failures.push({
          file: file.name,
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }

    return NextResponse.json(
      { uploaded, failures },
      { status: failures.length > 0 ? 207 : 201 }
    );
  } catch (error) {
    console.error("POST gallery images failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload images" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  let body: { ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0 || body.ids.length > 100) {
    return NextResponse.json(
      { error: "Provide between 1 and 100 image IDs" },
      { status: 400 }
    );
  }
  const ids = [...new Set(body.ids.map(String))];
  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    return NextResponse.json({ error: "One or more image IDs are invalid" }, { status: 400 });
  }

  await connectDB();
  const deleted: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const id of ids) {
    try {
      const result = await inTransaction(async (session) => {
        const usage = await checkUsage("image", id, session);
        if (usage.length > 0) return { deleted: false, reason: usageError("image", usage) };

        const image = await GalleryImage.findById(id).session(session);
        if (!image) return { deleted: false, reason: "Image not found" };
        if (image.publicId) await deleteImage(image.publicId);
        await GalleryImage.deleteOne({ _id: id }).session(session);
        return { deleted: true };
      });

      if (result.deleted) deleted.push(id);
      else skipped.push({ id, reason: result.reason ?? "Image not found" });
    } catch (error) {
      console.error(`Bulk gallery image delete failed for "${id}":`, error);
      skipped.push({
        id,
        reason: error instanceof Error ? error.message : "Image delete failed",
      });
    }
  }

  return NextResponse.json({ deleted, skipped });
}