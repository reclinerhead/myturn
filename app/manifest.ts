import type { MetadataRoute } from "next";

/* Home-screen install (#24): standalone display so the app opens
   without browser chrome. Colors are the Organic light ground — the
   splash and title bar match the cream page. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyTurn",
    short_name: "MyTurn",
    description: "Whose turn is it, where did we go, and was it any good.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5ead8",
    theme_color: "#f5ead8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
