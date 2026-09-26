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
    // Trying to access protected pages without login
    if (isHomePage || isAdminRoute) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  // Logged in as normal user, but trying to access admin routes
  if (isAdminRoute && user.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Logged in as admin, but trying to access the normal home page
  if (isHomePage && user.role === "admin") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // Already logged in? Don't let them see login/signup again.
  if (isAuthPage) {
    return NextResponse.redirect(
      new URL(user.role === "admin" ? "/admin" : "/", req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/signup", "/admin/:path*"],
};