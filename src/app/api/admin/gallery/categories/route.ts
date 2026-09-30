import { NextResponse } from "next/server";
import  connectDB  from "@/lib/mongodb";
import GalleryCategory from "@/app/models/GalleryCategory";

export async function GET() {
  await connectDB();
  const categories = await GalleryCategory.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  await connectDB();
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  try {
    const cat = await GalleryCategory.create({ name });
    return NextResponse.json(cat, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  }
}