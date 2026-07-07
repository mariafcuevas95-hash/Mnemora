import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mnemora",
    short_name: "Mnemora",
    description: "El tutor con memoria que estudia contigo",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F7F4EF",
    theme_color: "#1B3F2F",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["education", "productivity"],
    lang: "es",
  };
}
