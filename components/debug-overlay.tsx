"use client";

import { useEffect, useState } from "react";

/* Temporary diagnostic for #51 (the external-launch viewport offset).
   Enable once by visiting any page with ?debug=1 (persists via
   localStorage across every page, including Mail-launched views, until
   ?debug=0). Shows the live scroll/viewport numbers so a screenshot
   from the affected device tells us whether the window is scrolled,
   the visual viewport is offset, or something moves after load.
   Remove after #51 is closed for good. */

type Snap = {
  scrollY: number;
  initialY: number;
  maxY: number;
  events: number;
  pageTop: number;
  offsetTop: number;
  vvHeight: number;
  innerH: number;
  docH: number;
};

export function DebugOverlay() {
  const [snap, setSnap] = useState<Snap | null>(null);

  useEffect(() => {
    let enabled = false;
    try {
      const param = new URLSearchParams(window.location.search).get("debug");
      if (param === "1") localStorage.setItem("mt-debug", "1");
      if (param === "0") localStorage.removeItem("mt-debug");
      enabled = localStorage.getItem("mt-debug") === "1";
    } catch {}
    if (!enabled) return;

    const initialY = Math.round(window.scrollY);
    let maxY = initialY;
    let events = 0;

    const read = () => {
      const vv = window.visualViewport;
      maxY = Math.max(maxY, Math.round(window.scrollY));
      setSnap({
        scrollY: Math.round(window.scrollY),
        initialY,
        maxY,
        events,
        pageTop: Math.round(vv?.pageTop ?? -1),
        offsetTop: Math.round(vv?.offsetTop ?? -1),
        vvHeight: Math.round(vv?.height ?? -1),
        innerH: window.innerHeight,
        docH: document.documentElement.scrollHeight,
      });
    };
    const onScroll = () => {
      events += 1;
      read();
    };
    read();
    const t = setInterval(read, 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.visualViewport?.addEventListener("scroll", onScroll);
    window.visualViewport?.addEventListener("resize", onScroll);
    return () => {
      clearInterval(t);
      window.removeEventListener("scroll", onScroll);
      window.visualViewport?.removeEventListener("scroll", onScroll);
      window.visualViewport?.removeEventListener("resize", onScroll);
    };
  }, []);

  if (!snap) return null;
  return (
    <div
      className="pointer-events-none fixed bottom-2 left-2 z-50 rounded-sm p-2 font-mono text-[11px] leading-[1.5]"
      style={{ background: "rgba(0,0,0,.75)", color: "#7fff7f" }}
    >
      <div>scrollY {snap.scrollY} (init {snap.initialY}, max {snap.maxY})</div>
      <div>scroll events {snap.events}</div>
      <div>vv pageTop {snap.pageTop} offsetTop {snap.offsetTop}</div>
      <div>vv h {snap.vvHeight} · innerH {snap.innerH} · doc {snap.docH}</div>
    </div>
  );
}
