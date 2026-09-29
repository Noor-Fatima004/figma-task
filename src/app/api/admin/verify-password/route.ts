import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/app/models/User";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (current.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { adminPassword } = await req.json();
  if (typeof adminPassword !== "string" || !adminPassword.trim())
    return NextResponse.json({ error: "Enter your admin password" }, { status: 400 });

  await connectDB();
  const admin = await User.findById(current._id).select("+password");
  if (!admin?.password)
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });

  const verified = await bcrypt.compare(adminPassword, admin.password);
  if (!verified)
    return NextResponse.json({ error: "Incorrect admin password" }, { status: 401 });

  return NextResponse.json({ verified: true });
}