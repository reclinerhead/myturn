import { NextResponse, type NextRequest } from "next/server";

/* Proxy cannot import lib/auth (it would drag better-sqlite3 into the
   proxy bundle) — keep in sync with SESSION_COOKIE there. */
const SESSION_COOKIE = "myturn_session";

/* Redirect convenience ONLY: checks cookie presence, not validity — the
   real session check is getSessionPerson() in the pages and actions
   (TechnicalGuide, Conventions). No DB access here. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const openPath = pathname === "/login" || pathname.startsWith("/auth");
  if (!openPath && !request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  /* Everything except Next internals and static files with extensions. */
  matcher: ["/((?!_next|.*\\..*).*)"],
};
