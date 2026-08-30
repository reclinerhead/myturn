"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Icon } from "@/components/icon";

/* The effective theme lives outside React (a data-theme attribute set before
   hydration, plus the OS preference), so it is read through
   useSyncExternalStore rather than effect-synced state. */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  listeners.add(onChange);
  return () => {
    media.removeEventListener("change", onChange);
    listeners.delete(onChange);
  };
}

function getSnapshot(): "light" | "dark" {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getServerSnapshot(): "light" | "dark" {
  return "light";
}

/* Manual override on top of prefers-color-scheme. Until the settings screen
   exists (#18), this is the only place to flip it. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    for (const notify of listeners) notify();
  }

  return (
    <button
      type="button"
      className="btn btn-secondary btn-icon size-12"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      <Icon icon={theme === "dark" ? Sun : Moon} size={22} />
    </button>
  );
}
