import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import ProductVariation from "@/app/models/ProductVariation";
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
    const attributeId = String(body.attribute ?? "");

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(attributeId)) {
      return NextResponse.json({ error: "Please select an attribute" }, { status: 400 });
    }

    await connectDB();
    const attr = await ProductAttribute.findById(attributeId).lean<{ name: string }>();
    if (!attr) {
      return NextResponse.json({ error: "Attribute not found" }, { status: 400 });
    }

    const v = await ProductVariation.findByIdAndUpdate(
      id,
      { name, attribute: attributeId },
      { returnDocument: "after", runValidators: true }
    );
    if (!v) {
      return NextResponse.json({ error: "Variation not found" }, { status: 404 });
    }

    return NextResponse.json({
      _id: v._id.toString(),
      name: v.name,
      attribute: attributeId,
      attributeName: attr.name,
    });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === 11000
    ) {
      return NextResponse.json(
        { error: "This variation already exists for the selected attribute" },
        { status: 409 }
      );
    }
    console.error("PUT product-variations:", err);
    return NextResponse.json({ error: "Failed to update variation" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();
    const { deleted, usage } = await safeDelete("variation", id, (session) =>
      ProductVariation.findByIdAndDelete(id).session(session)
    );
    if (usage.length > 0) {
      return NextResponse.json({ error: usageError("variation", usage) }, { status: 409 });
    }
    if (!deleted) {
      return NextResponse.json({ error: "Variation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE product-variations:", err);
    return NextResponse.json({ error: "Failed to delete variation" }, { status: 500 });
  }
}
