import Link from "next/link";
import { Settings } from "lucide-react";
import { logout } from "@/app/login/actions";
import { AvatarUpload } from "@/components/avatar-upload";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";

/* The header's 48px settings pill (spec, Screen 3). A native <details>
   disclosure — no client JS beyond the toggle and the photo picker.
   Photo is own-photo-only (#35): tap your face to change your photo.
   Share (#62) opens the QR page — a page, not a dialog, because a
   scannable code needs more than this 192px menu. */
export function SettingsMenu({
  me,
}: {
  me: {
    id: string;
    name: string;
    monogram: string;
    color: string;
    photoUrl: string | null;
  };
}) {
  return (
    <details className="relative flex-none">
      <summary
        aria-label="Settings"
        className="btn btn-secondary size-12 cursor-pointer list-none [&::-webkit-details-marker]:hidden"
      >
        <Icon icon={Settings} size={22} />
      </summary>
      <div className="absolute right-0 top-[54px] z-10 w-48 rounded-md bg-surface p-[var(--space-2)] shadow-md">
        <div className="flex items-center justify-between gap-2 py-1 pl-3 pr-1">
          <span className="text-[15px]">Theme</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between gap-2 py-1 pl-3 pr-1">
          <span className="text-[15px]">Photo</span>
          <AvatarUpload person={me} size={34} />
        </div>
        <Link
          href="/share"
          className="btn w-full justify-start text-[15px] text-text no-underline"
        >
          Share myturn
        </Link>
        <form action={logout}>
          <button type="submit" className="btn w-full justify-start text-[15px]">
            Log out
          </button>
        </form>
      </div>
    </details>
  );
}
