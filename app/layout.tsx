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

/* Chrome iOS launched from Mail paints the page under its URL bar
   (~110px of header sit behind it — screenshots on #51). Viewport
   units cannot see that bar. The magic-link tab always hits
   /auth/verify first (or lands with history.length 1 on a redirect);
   we pad that tab until the user refreshes, which actually retunes
   Chrome. Installed PWA and ordinary tabs are untouched. */
const chromeInit = `(() => {
  try {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav && nav.type === "reload") sessionStorage.removeItem("mt-chrome-pad");
    else if (!standalone && (location.pathname.startsWith("/auth/verify") || (navigator.maxTouchPoints > 0 && history.length <= 1)))
      sessionStorage.setItem("mt-chrome-pad", "1");
    const on = !standalone && sessionStorage.getItem("mt-chrome-pad") === "1";
    document.documentElement.style.setProperty("--mt-chrome-pad", on ? "120px" : "0px");
  } catch (e) {}
})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${caprasimo.variable} ${figtree.variable} antialiased`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script dangerouslySetInnerHTML={{ __html: chromeInit }} />
        <div className="mx-auto w-full max-w-[390px] pb-[env(safe-area-inset-bottom)] pl-[max(22px,env(safe-area-inset-left))] pr-[max(22px,env(safe-area-inset-right))] pt-[max(env(safe-area-inset-top),var(--mt-chrome-pad,0px))]">
          {children}
        </div>
      </body>
    </html>
  );
}
