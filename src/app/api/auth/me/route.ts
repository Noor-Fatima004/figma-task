import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value; // <-- apni cookie ka naam yahan

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id?: string;
      name?: string;
      email?: string;
    };
    return NextResponse.json({
      user: {
        name: decoded.name ?? "User",
        email: decoded.email ?? "",
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}