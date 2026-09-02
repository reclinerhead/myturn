"use server";

import { headers } from "next/headers";
import { allowVerifyAttempt, verifyMagicLink } from "@/lib/auth";

export type RedeemState = { status: "idle" | "ok" | "failed" };

/* The actual redemption — POST-only via this action, so mail scanners
   and SafeLinks-style gateways that GET the emailed URL can no longer
   burn the one-time token (#47). Returns a result instead of
   redirecting: the client form navigates with router.push, which
   scrolls to top reliably — a server-action redirect() leaves residual
   scroll and Home landed below the header (#51). */
export async function redeem(
  _prev: RedeemState,
  formData: FormData,
): Promise<RedeemState> {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowVerifyAttempt(ip)) {
    return { status: "failed" };
  }

  const token = formData.get("token");
  const person =
    typeof token === "string" && token ? await verifyMagicLink(token) : null;
  return { status: person ? "ok" : "failed" };
}
