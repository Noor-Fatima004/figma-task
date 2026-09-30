import { NextResponse } from "next/server";
import  connectDB  from "@/lib/mongodb";
import GalleryImage from "@/app/models/GalleryImage";
import { createHash } from "crypto";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function GET(req: Request) {
  await connectDB();
  const category = new URL(req.url).searchParams.get("category");
  const filter = category && category !== "all" ? { category } : {};
  const images = await GalleryImage.find(filter).select("-data").sort({ createdAt: -1 }).lean();
  return NextResponse.json(images);
}

export async function POST(req: Request) {
  await connectDB();
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const category = form.get("category") as string;

  if (!file || !category) return NextResponse.json({ error: "File & category required" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Max 5MB" }, { status: 400 });
  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buffer).digest("hex");

  const img = await GalleryImage.create({
    category,
    name: file.name,
    alt: (form.get("alt") as string) || file.name,
    contentType: file.type,
    data: buffer,
    hash,
    width: Number(form.get("width")) || 400,
    height: Number(form.get("height")) || 300,
  });

  return NextResponse.json({ _id: img._id, width: img.width, height: img.height }, { status: 201 });
}