import type { Metadata, Viewport } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import "./globals.css";

const caprasimo = Caprasimo({
  variable: "--font-caprasimo",
  subsets: ["latin"],
  weight: "400",
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyTurn",
  description: "Whose turn is it, where did we go, and was it any good.",
  /* Installed-app niceties on iOS (#24). */
  appleWebApp: {
    capable: true,
    title: "MyTurn",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5ead8" },
    { media: "(prefers-color-scheme: dark)", color: "#241d18" },
  ],
};

/* Applies a manually chosen theme before first paint so the page never
   flashes the wrong ground. No stored choice = follow prefers-color-scheme. */
const themeInit = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${caprasimo.variable} ${figtree.variable} antialiased`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <div className="mx-auto w-full max-w-[390px] pb-[env(safe-area-inset-bottom)] pl-[max(22px,env(safe-area-inset-left))] pr-[max(22px,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)]">
          {children}
        </div>
      </body>
    </html>
  );
}
