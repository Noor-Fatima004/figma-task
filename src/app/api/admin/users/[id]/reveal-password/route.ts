import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/app/models/User";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { adminPassword } = await req.json();

  // 1. Logged-in user (cookie se)
  const current = await getCurrentUser();
  if (!current)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (current.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!adminPassword)
    return NextResponse.json({ error: "Enter your admin password" }, { status: 400 });

  await connectDB();

  // 2. Admin ka password DB se (select: false ho sakta hai, isliye +password)
  const admin = await User.findById(current._id).select("+password");
  if (!admin?.password)
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });

  const ok = await bcrypt.compare(adminPassword, admin.password);
  if (!ok)
    return NextResponse.json({ error: "Incorrect admin password" }, { status: 401 });

  // 3. Target user ka hash
  const user = await User.findById(id).select("+password");
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ passwordHash: user.password });
}