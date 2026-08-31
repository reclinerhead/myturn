import { NextResponse, type NextRequest } from "next/server";
import { allowVerifyAttempt, verifyMagicLink } from "@/lib/auth";

export const dynamic = "force-dynamic";

/* The emailed link lands here. Success → Home with a fresh year-long
   session; anything else → Login with the expired note. */
export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowVerifyAttempt(ip)) {
    return NextResponse.redirect(new URL("/login?expired=1", request.url));
  }

  const token = request.nextUrl.searchParams.get("token");
  const person = token ? await verifyMagicLink(token) : null;
  return NextResponse.redirect(
    new URL(person ? "/" : "/login?expired=1", request.url),
  );
}
