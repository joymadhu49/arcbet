/**
 * Gate admin-only surfaces at the edge.
 *
 * The client-side useIsAdmin hook is UX only — this is the security layer: any
 * request to /admin or /api/ai-market without a valid session cookie is rejected
 * before it reaches the page/handler.
 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isAdminAddress, verifySession } from "@/lib/auth";

export function middleware(req: NextRequest): NextResponse {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = verifySession(token);
  const ok = session !== null && isAdminAddress(session.addr);

  // API path: if unauthed, return 401 JSON instead of redirecting.
  if (req.nextUrl.pathname.startsWith("/api/ai-market")) {
    if (ok) return NextResponse.next();
    return NextResponse.json({ error: "admin sign-in required" }, { status: 401 });
  }

  // Page path: /admin/* — always let the page render (the sign-in UI lives there).
  // Middleware is still useful here because it prevents the server-rendered HTML
  // from leaking admin metrics for unauthenticated users.
  if (req.nextUrl.pathname === "/admin" || req.nextUrl.pathname.startsWith("/admin/")) {
    const res = NextResponse.next();
    res.headers.set("x-admin-authed", ok ? "1" : "0");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/ai-market/:path*"],
};
