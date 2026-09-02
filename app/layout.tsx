import type { Metadata, Viewport } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import { DebugOverlay } from "@/components/debug-overlay";
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
  /* No viewport-fit=cover: an externally-launched Chrome iOS view
     (Mail magic links) overstates the viewport and paints the page
     under the URL bar (#51). Cover made that worse. Without it the
     installed PWA and healthy browsers inset from system chrome
     themselves; the shell's safe-area paddings are then no-ops. */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5ead8" },
    { media: "(prefers-color-scheme: dark)", color: "#241d18" },
  ],
};

/* Applies a manually chosen theme before first paint so the page never
   flashes the wrong ground. No stored choice = follow prefers-color-scheme. */
const themeInit = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

/* Chrome iOS launched from Mail sizes the webview as if the URL bar
   isn't there (innerHeight ≈ screen.height) and paints the top of the
   page underneath it. A JS reload does not retune that chrome — only
   pushing content down does. When the gap is tiny on a touch browser
   that isn't the installed PWA, pad by the observed bar height.
   Harmless no-op everywhere else; drops if Chrome later tells the truth. */
const chromeInit = `(() => {
  const apply = () => {
    try {
      const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
      const gap = screen.height - innerHeight;
      const pad = !standalone && navigator.maxTouchPoints > 0 && gap < 56 ? "92px" : "0px";
      document.documentElement.style.setProperty("--mt-chrome-pad", pad);
    } catch (e) {}
  };
  apply();
  addEventListener("resize", apply);
  visualViewport && visualViewport.addEventListener("resize", apply);
})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${caprasimo.variable} ${figtree.variable} antialiased`}
    >
      <body className="min-h-svh">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script dangerouslySetInnerHTML={{ __html: chromeInit }} />
        <div className="mx-auto flex min-h-svh w-full max-w-[390px] flex-col pb-[env(safe-area-inset-bottom)] pl-[max(22px,env(safe-area-inset-left))] pr-[max(22px,env(safe-area-inset-right))] pt-[max(env(safe-area-inset-top),var(--mt-chrome-pad,0px))]">
          {children}
        </div>
        <DebugOverlay />
      </body>
    </html>
  );
}
