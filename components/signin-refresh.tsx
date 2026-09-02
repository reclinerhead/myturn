"use client";

import { useEffect } from "react";

/* One-time self-reload on the first page after sign-in (#51). The
   Chrome iOS window that Mail launches can overstate its viewport and
   paint the top ~90px of pages under the URL bar; per long empirical
   battle, a reload is the only reliable reset. The verify page sets
   the flag; we clear it BEFORE reloading so this can never loop. The
   extra load happens once per sign-in (~once a year per person) and
   is harmless on healthy browsers. */
export function SigninRefresh() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("mt-fresh-signin") === "1") {
        sessionStorage.removeItem("mt-fresh-signin");
        window.location.replace(window.location.href);
      }
    } catch {}
  }, []);
  return null;
}
