"use client";

import { useActionState, useState } from "react";
import { Mail } from "lucide-react";
import { Icon } from "@/components/icon";
import { sendMagicLink, type SendLinkState } from "./actions";

/* Screens 1 and 2 of the spec in one client flow: the form submits a
   server action; success swaps to Check-your-email in place (no URL
   change — the address never goes into a query string). */
export function LoginFlow({ expired }: { expired: boolean }) {
  const [state, formAction, pending] = useActionState<SendLinkState, FormData>(
    sendMagicLink,
    { status: "idle", email: "" },
  );
  const [dismissed, setDismissed] = useState(false);
  const showCheck = state.status === "sent" && !dismissed;

  if (showCheck) {
    return (
      <main className="mt-rise flex flex-1 flex-col px-1 pb-[34px] pt-7 text-center">
        <div className="mx-auto mb-6 mt-[52px] flex size-[104px] items-center justify-center rounded-full bg-accent-200 text-accent-700">
          <span className="mt-wiggle">
            <Icon icon={Mail} size={50} />
          </span>
        </div>
        <h1 className="mb-3 text-[38px]">Check your email</h1>
        <p className="mb-2 text-[18px] leading-[1.5]">
          We sent a link to <strong>{state.email}</strong>. Tap it on this
          phone and you&apos;re in.
        </p>
        <p className="text-[15px] leading-[1.5] text-text/60">
          If it&apos;s not there in a minute, check the spam folder. It
          happens to the best of us, Mom.
        </p>
        <button
          type="button"
          className="btn btn-ghost btn-block mt-auto min-h-[46px] text-[16px]"
          onClick={() => setDismissed(true)}
        >
          Use a different email
        </button>
      </main>
    );
  }

  return (
    <main className="mt-rise flex flex-1 flex-col px-1 pb-[34px] pt-7">
      <div
        aria-hidden
        className="mb-[26px] mt-[18px] flex size-24 items-center justify-center rounded-full bg-accent text-bg shadow-md"
      >
        <span className="font-heading text-[40px] leading-none">my</span>
      </div>
      <h1 className="mb-[6px] text-[52px] leading-[.95]">myturn</h1>
      <p className="mb-[30px] max-w-[20ch] text-[18px] leading-[1.45] text-text/72">
        Whose turn is it, where did we go, and was it any good.
      </p>
      {expired && (
        <p className="mb-3 text-[15px] leading-[1.5] text-accent-700">
          That link had expired — enter your email and we&apos;ll send a
          fresh one.
        </p>
      )}
      <form
        action={formAction}
        onSubmit={() => setDismissed(false)}
        className="flex flex-1 flex-col"
      >
        <div className="field mb-[6px]">
          <label htmlFor="email" className="text-[14px]">
            Your email
          </label>
          <input
            id="email"
            name="email"
            className="input min-h-[54px] rounded-full px-[18px] py-3 text-[17px]"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@family.com"
            required
          />
        </div>
        <p className="mx-[2px] mb-[22px] mt-[10px] text-[15px] leading-[1.5] text-text/62">
          No password. We email you a link, you tap it, you&apos;re in for a
          year. That&apos;s the whole security system.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary btn-block mt-auto min-h-[58px] text-[19px]"
        >
          {pending ? "Sending…" : "Email me a link"}
        </button>
      </form>
    </main>
  );
}
