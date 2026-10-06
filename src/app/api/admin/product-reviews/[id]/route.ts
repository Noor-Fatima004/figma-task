import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
// ⚠️ Apni DB connect file ka import yahan lagao
import  connectDB  from "@/lib/mongodb";
import Review from "@/app/models/Review";

/** Admin review ko approve / pending kare */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body.status !== "approved" && body.status !== "pending") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    await connectDB();
    const updated = await Review.findByIdAndUpdate(
      id,
      { status: body.status },
      { new: true }
    ).lean();
    if (!updated) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (e) {
    console.error("PUT /api/admin/product-reviews/[id] failed:", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // admin auth check yahan karo (jaise PUT me hai)
  const { id } = await params;
  await connectDB();
  const deleted = await Review.findByIdAndDelete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
