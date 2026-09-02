import { redirect } from "next/navigation";
import { getSessionPerson } from "@/lib/auth";
import { ConfirmForm } from "./confirm-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in · MyTurn" };

/* The emailed link lands here. Rendering NEVER touches the token —
   scanners and link-checking gateways GET this page harmlessly; only
   the button's POST redeems (#47). Token validity is judged at
   redemption, so this page looks identical for good and bad tokens. */
export default async function VerifyPage({
  searchParams,
}: PageProps<"/auth/verify">) {
  if (await getSessionPerson()) redirect("/");
  const { token } = await searchParams;
  if (typeof token !== "string" || !token) redirect("/login");

  return (
    /* Vertically centered on purpose (#51): Chrome iOS views launched
       from external apps (the Mail link!) start with an overstated
       viewport height and paint the top ~90px of the page underneath
       the URL bar until the first user interaction corrects the
       metrics. Centering keeps this one-button page clear of that zone
       in any viewport, honest or lying. */
    <main className="mt-rise flex flex-1 flex-col justify-center px-1 py-8 text-center">
      <div
        aria-hidden
        className="mx-auto mb-6 flex size-24 items-center justify-center rounded-full bg-accent text-bg shadow-md"
      >
        <span className="font-heading text-[40px] leading-none">my</span>
      </div>
      <h1 className="mb-3 text-[38px]">Almost in</h1>
      <p className="mb-8 text-[18px] leading-[1.5] text-text/72">
        One more tap and you&apos;re signed in for the year.
      </p>
      <ConfirmForm token={token} />
    </main>
  );
}
