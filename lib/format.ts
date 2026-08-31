/* Date display, matching the prototype's fmt(): short "Aug 23", long
   "Sunday, Aug 23". Noon avoids timezone date-shifts on a date-only
   value. */

export function shortDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
