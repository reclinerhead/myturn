"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { redeem, type RedeemState } from "./actions";

/* One button, one POST. Navigation happens client-side after the
   action resolves so the next page starts at the top (#51). */
export function ConfirmForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<RedeemState, FormData>(
    redeem,
    { status: "idle" },
  );

  useEffect(() => {
    if (state.status === "ok") router.push("/");
    if (state.status === "failed") router.push("/login?expired=1");
  }, [state.status, router]);

  const busy = pending || state.status !== "idle";

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        disabled={busy}
        className="btn btn-primary btn-block min-h-[58px] text-[19px]"
      >
        {busy ? "Signing in…" : "Sign me in"}
      </button>
    </form>
  );
}
