import { NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/app/models/User";
import { requireAdmin } from "@/lib/requireAdmin";

type Ctx = { params: Promise<{ id: string }> };

async function guard(id: string) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }
  return null;
}

// VIEW DETAILS
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const err = await guard(id);
  if (err) return err;

  await connectDB();
  const user = await User.findOne({ _id: id, role: "user" }).select("-password").lean();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ user: { ...user, _id: user._id.toString() } });
}

// EDIT
export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const err = await guard(id);
  if (err) return err;

  const { name, email, password } = await req.json();
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  await connectDB();

  const clash = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: id } });
  if (clash) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const update: Record<string, string> = { name: name.trim(), email: email.toLowerCase().trim() };
  if (password) {
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    update.password = await bcrypt.hash(password, 10);
  }

  const user = await User.findOneAndUpdate({ _id: id, role: "user" }, update, { new: true })
    .select("-password")
    .lean();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ user: { ...user, _id: user._id.toString() } });
}

// DELETE
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const err = await guard(id);
  if (err) return err;

  await connectDB();
  const deleted = await User.findOneAndDelete({ _id: id, role: "user" });
  if (!deleted) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}