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
  title: "myturn",
  description: "Whose turn is it, where did we go, and was it any good.",
  /* Installed-app niceties on iOS (#24). */
  appleWebApp: {
    capable: true,
    title: "myturn",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  /* viewport-fit=cover lets the page draw behind the notch/home
     indicator; the shell pads back out with safe-area insets. */
  viewportFit: "cover",
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
      className={`${caprasimo.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-dvh">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col pb-[env(safe-area-inset-bottom)] pl-[max(22px,env(safe-area-inset-left))] pr-[max(22px,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)]">
          {children}
        </div>
      </body>
    </html>
  );
}
