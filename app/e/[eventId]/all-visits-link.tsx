"use client";

/* In-page jump to the inline place summary. preventDefault keeps the
   hash out of the URL — Next's router treats a hash change as a
   same-page navigation and resets the scroll, fighting the browser's
   anchor jump. Scrolling directly sidesteps the router entirely. */
export function AllVisitsLink({ placeName }: { placeName: string }) {
  return (
    <a
      href="#all-visits"
      className="mb-5 block text-[16px] font-semibold text-accent-700 no-underline"
      onClick={(e) => {
        e.preventDefault();
        document.getElementById("all-visits")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
      }}
    >
      All visits to {placeName} ↓
    </a>
  );
}
