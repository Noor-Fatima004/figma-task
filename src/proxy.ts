import { NextResponse, type NextRequest } from "next/server";

// Ye pages bina login/guest ke bhi khule rehte hain
const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"];

const isAuthPage = (p: string) => AUTH_PAGES.some((a) => p === a || p.startsWith(`${a}/`));
const isAdminPath = (p: string) => p === "/admin" || p.startsWith("/admin/");

// Cookie ka naam guess karne ke bajaye apne hi /api/auth/me se pooch lete hain
async function getSession(req: NextRequest): Promise<{ ok: boolean; role?: string }> {
  try {
    const res = await fetch(new URL("/api/auth/me", req.url), {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false };
    const data = await res.json().catch(() => null);
    return { ok: true, role: data?.user?.role ?? data?.role };
  } catch {
    return { ok: false };
  }
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasGuest = req.cookies.get("guest")?.value === "1";

  const toLogin = () => {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(url);
  };

  const to = (path: string) => {
    const url = req.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    return NextResponse.redirect(url);
  };

  // 1) /login, /signup...: logged-in user ko yahan nahi rukna, guest/visitor ko ruk sakta hai
  if (isAuthPage(pathname)) {
    const session = await getSession(req);
    if (session.ok) return to(session.role === "admin" ? "/admin/dashboard" : "/home");
    return NextResponse.next();
  }

  // 2) /admin/*: sirf admin. Guest cookie yahan kaam nahi karti
  if (isAdminPath(pathname)) {
    const session = await getSession(req);
    if (!session.ok) return toLogin();
    if (session.role && session.role !== "admin") return to("/home");
    return NextResponse.next();
  }

  // 3) baaki sab pages: guest mode ya login zaroori
  if (hasGuest) return NextResponse.next();
  const session = await getSession(req);
  if (session.ok) return NextResponse.next();

  return toLogin();
}

export const config = {
  // API routes, Next ki internal files aur static files (.png, .css, ...) ko chhor do
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};