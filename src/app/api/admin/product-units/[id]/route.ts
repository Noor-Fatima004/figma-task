import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import ProductUnit from "@/app/models/ProductUnit";

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

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    await connectDB();
    const unit = await ProductUnit.findByIdAndUpdate(
      id,
      { name, status },
      { new: true, runValidators: true }
    );

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    return NextResponse.json({ _id: unit._id.toString(), name: unit.name, status: unit.status });
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: "This unit already exists" }, { status: 409 });
    }
    console.error("PUT product-units:", err);
    return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();
    const deleted = await ProductUnit.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE product-units:", err);
    return NextResponse.json({ error: "Failed to delete unit" }, { status: 500 });
  }
}