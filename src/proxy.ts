import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";


function getUser(token?: string) {
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null; // invalid/expired token shouldn't crash the middleware
  }
}

export function middleware(req: NextRequest) {
  

  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;
  const user = getUser(token);
  console.log("MIDDLEWARE:", { pathname, hasToken: !!token, user });
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isHomePage = pathname === "/";

  // Already logged in? Don't let them see login/signup again.
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Not logged in? Can't access the home page.
  if (isHomePage && !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/signup"],
  runtime: "nodejs",
};