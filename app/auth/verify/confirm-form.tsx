"use client";

import { useActionState, useEffect } from "react";
import { redeem, type RedeemState } from "./actions";

/* One button, one POST. After redemption, a hard load of Home. */
export function ConfirmForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<RedeemState, FormData>(
    redeem,
    { status: "idle" },
  );

  useEffect(() => {
    if (state.status === "ok") window.location.assign("/");
    if (state.status === "failed") window.location.assign("/login?expired=1");
  }, [state.status]);

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
