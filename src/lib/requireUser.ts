import { cookies } from "next/headers";
import { verifyToken, type TokenPayload } from "@/lib/jwt";

export async function requireUser(): Promise<TokenPayload | null> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  return decoded;
}