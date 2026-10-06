import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import ProductAttribute from "@/app/models/ProductAttribute";
import { safeDelete, usageError } from "@/lib/safeDelete";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    await connectDB();
    const attr = await ProductAttribute.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    if (!attr) {
      return NextResponse.json({ error: "Attribute not found" }, { status: 404 });
    }

    return NextResponse.json({ _id: attr._id.toString(), name: attr.name });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === 11000) {
      return NextResponse.json({ error: "This attribute already exists" }, { status: 409 });
    }
    console.error("PUT product-attributes:", err);
    return NextResponse.json({ error: "Failed to update attribute" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();
    const { deleted, usage } = await safeDelete("attribute", id, (session) =>
      ProductAttribute.findByIdAndDelete(id).session(session)
    );
    if (usage.length > 0) {
      return NextResponse.json({ error: usageError("attribute", usage) }, { status: 409 });
    }
    if (!deleted) {
      return NextResponse.json({ error: "Attribute not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE product-attributes:", err);
    return NextResponse.json({ error: "Failed to delete attribute" }, { status: 500 });
  }
}