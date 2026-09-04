import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionPerson } from "@/lib/auth";
import { QrCode } from "@/components/qr-code";

export const dynamic = "force-dynamic";

export const metadata = { title: "Share · MyTurn" };

/* Hand the site across the table (#62): a QR code for the site's front
   door — not a login link, nothing from the session in it. Same base
   URL the magic-link emails use (lib/auth), so previews point at the
   real site and local dev encodes localhost. */
export default async function SharePage() {
  if (!(await getSessionPerson())) redirect("/login");

  const url = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const host = new URL(url).host;

  return (
    <main className="mt-rise pb-[34px] pt-[2px]">
      <div className="-mx-1 flex items-center py-[2px]">
        <Link href="/" className="btn btn-ghost min-h-12 text-[17px]">
          ← Home
        </Link>
      </div>

      <h1 className="mb-1 text-[30px]">Share myturn</h1>
      <p className="mb-[18px] text-[16px] leading-[1.45] text-text/65">
        Point a phone camera at this. Tap the link that pops up.
      </p>

      {/* Fixed cream and fixed ink on purpose — neither token flips in
          dark mode, so the code stays dark-on-light and scannable. */}
      <div className="rounded-lg bg-person-ink p-4 text-neutral-900 shadow-md">
        <QrCode value={url} label={`QR code for ${host}`} />
      </div>

      <p className="mb-0 mt-5 text-center text-[15px] text-text/60">
        Or just type it in:
        <br />
        <span className="font-heading text-[22px] text-text">{host}</span>
      </p>
    </main>
  );
}
