"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { allowVerifyAttempt, verifyMagicLink } from "@/lib/auth";

/* The actual redemption — POST-only via this action, so mail scanners
   and SafeLinks-style gateways that GET the emailed URL can no longer
   burn the one-time token (#47). */
export async function redeem(formData: FormData): Promise<void> {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowVerifyAttempt(ip)) {
    redirect("/login?expired=1");
  }

  const token = formData.get("token");
  const person =
    typeof token === "string" && token ? await verifyMagicLink(token) : null;
  redirect(person ? "/" : "/login?expired=1");
}
