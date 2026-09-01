import { Settings } from "lucide-react";
import { logout } from "@/app/login/actions";
import { AvatarUpload } from "@/components/avatar-upload";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";

/* The header's 48px settings pill (spec, Screen 3). A native <details>
   disclosure — no client JS beyond the toggle and photo pickers. Photos
   moved here from the Home crew strip (removed in review, #23): tap a
   face to change that person's photo. */
export function SettingsMenu({
  people,
}: {
  people: {
    id: string;
    name: string;
    monogram: string;
    color: string;
    photoUrl: string | null;
  }[];
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
          <span className="text-[15px]">Photos</span>
          <div className="flex gap-[6px]">
            {people.map((person) => (
              <AvatarUpload key={person.id} person={person} size={34} />
            ))}
          </div>
        </div>
        <form action={logout}>
          <button type="submit" className="btn w-full justify-start text-[15px]">
            Log out
          </button>
        </form>
      </div>
    </details>
  );
}
