import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";


function getUser(token?: string) {
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;
  const user = getUser(token);
  console.log("PROXY:", { pathname, hasToken: !!token, user });
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isHomePage = pathname === "/";

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isHomePage && !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/signup"],

};