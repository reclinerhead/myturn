"use server";

import { redirect } from "next/navigation";
import { destroySession, requestMagicLink } from "@/lib/auth";

export type SendLinkState = { status: "idle" | "sent"; email: string };

/* Always reports "sent" — unknown emails and rate-limited sends look
   identical to real ones, so the form can't probe the allowlist. */
export async function sendMagicLink(
  _prev: SendLinkState,
  formData: FormData,
): Promise<SendLinkState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { status: "idle", email: "" };
  await requestMagicLink(email);
  return { status: "sent", email: email.toLowerCase() };
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
