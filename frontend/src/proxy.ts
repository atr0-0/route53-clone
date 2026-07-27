import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16 renamed the `middleware` file convention to `proxy` (see
// 04-architecture.md's naming note) — same job: a cheap, cookie-presence-only
// gate before a page renders. The backend independently verifies the JWT on
// every request; this is never the security boundary.
const SESSION_COOKIE_NAME = "session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (pathname === "/login") {
    if (hasSession) {
      const next = request.nextUrl.searchParams.get("next");
      return NextResponse.redirect(new URL(next || "/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const next = encodeURIComponent(pathname + search);
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
