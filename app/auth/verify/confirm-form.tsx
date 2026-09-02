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
    if (state.status === "ok") {
      /* Ask the landing page to reload itself once (#51): the
         externally-launched Chrome iOS window can keep painting pages
         under the URL bar even after this tap, and a reload is the one
         thing proven to reset its metrics. */
      try {
        sessionStorage.setItem("mt-fresh-signin", "1");
      } catch {}
      window.location.assign("/");
    }
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
