import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import ProductBrand from "@/app/models/ProductBrand";
import { uniqueBrandSlug } from "@/lib/brandSlug";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const status = body.status === "inactive" ? "inactive" : "active";
    const image = mongoose.isValidObjectId(body.image) ? body.image : null;

    if (!name) {
      return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
    }

    await connectDB();
    const existing = await ProductBrand.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // slug sirf tab badalta hai jab naam badla ho
    const slug =
      existing.name === name ? existing.slug : await uniqueBrandSlug(name, id);

    existing.name = name;
    existing.slug = slug;
    existing.status = status;
    existing.image = image;
    await existing.save();

    return NextResponse.json({
      _id: existing._id.toString(),
      name: existing.name,
      slug: existing.slug,
      status: existing.status,
      image: existing.image ? existing.image.toString() : "",
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: "This brand already exists" }, { status: 409 });
    }
    console.error("PUT product-brands:", err);
    return NextResponse.json({ error: "Failed to update brand" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();
    const deleted = await ProductBrand.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE product-brands:", err);
    return NextResponse.json({ error: "Failed to delete brand" }, { status: 500 });
  }
}