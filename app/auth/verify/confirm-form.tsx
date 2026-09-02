"use client";

import { useActionState, useEffect } from "react";
import { redeem, type RedeemState } from "./actions";

/* One button, one POST. Navigation after redemption is a HARD page
   load on purpose (#51): both server-action redirect() and
   router.push left Home scrolled partway down on iOS/WebKit, hiding
   the header. A full load always starts at the top on every engine,
   and one real load at sign-in — roughly once a year per person — is
   free. Do not "optimize" this back to a client-side transition. */
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
