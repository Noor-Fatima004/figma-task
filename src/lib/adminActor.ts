import { cookies } from "next/headers";
import { Types } from "mongoose";
import { verifyToken } from "@/lib/jwt";

export async function getAdminActorId(): Promise<Types.ObjectId | null> {
  const token = (await cookies()).get("token")?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== "admin" || !Types.ObjectId.isValid(payload.userId)) {
    return null;
  }
  return new Types.ObjectId(payload.userId);
}
