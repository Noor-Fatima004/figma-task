import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

export async function requireAdmin(): Promise<boolean> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return false;

  const decoded = verifyToken(token);
  return decoded?.role === "admin";
}