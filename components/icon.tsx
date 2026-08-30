import type { LucideIcon, LucideProps } from "lucide-react";

/* Every Lucide icon in the app renders through this wrapper so the Organic
   stroke treatment (2.75, round caps/joins) stays consistent. Pass the icon
   component itself: <Icon icon={Settings} size={22} />. */
export function Icon({
  icon: IconComponent,
  strokeWidth = 2.75,
  ...props
}: { icon: LucideIcon } & LucideProps) {
  return (
    <IconComponent
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}
