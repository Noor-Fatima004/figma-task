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

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isHomePage = pathname === "/";
  const isAdminRoute = pathname.startsWith("/admin");

  if (!user) {
    if (isHomePage || isAdminRoute) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  if (isAdminRoute && user.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isHomePage && user.role === "admin") {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  if (isAuthPage) {
    return NextResponse.redirect(
      new URL(user.role === "admin" ? "/admin/dashboard" : "/", req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/signup", "/admin/:path*"],
};