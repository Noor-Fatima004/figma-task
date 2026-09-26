// lib/auth.ts
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import User from "@/app/models/User";
import { verifyToken } from "@/lib/jwt";

export async function getCurrentUser() {
  // Next.js 15+: cookies() is async. On Next 14, drop the `await`.
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  await connectDB();
  const user = await User.findById(payload.userId);
  return user;
}