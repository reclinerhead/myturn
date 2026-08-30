import { Coffee, Footprints } from "lucide-react";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";

/* Placeholder route: exercises the #15 groundwork (tokens, fonts, icon
   wrapper, motion, dark mode) until Home lands with #18. */
export default function Home() {
  return (
    <main className="mt-rise flex flex-1 flex-col items-center justify-center gap-[var(--space-4)] py-[var(--space-8)] text-center">
      <div
        className="flex size-24 items-center justify-center rounded-full bg-accent text-bg shadow-md"
        aria-hidden
      >
        <span className="font-heading text-[40px] leading-none">my</span>
      </div>
      <h1 className="text-[52px]">myturn</h1>
      <p className="text-muted max-w-[20ch] text-[18px] leading-[1.45]">
        Whose turn is it, where did we go, and was it any good.
      </p>
      <p className="flex items-center gap-[var(--space-2)] text-[16px]">
        <Icon icon={Coffee} size={24} className="text-accent-700" />
        <Icon icon={Footprints} size={24} className="text-accent-700" />
        <span className="text-muted">Screens on the way.</span>
      </p>
      <ThemeToggle />
    </main>
  );
}
