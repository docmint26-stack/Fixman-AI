import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Puvexa AI",
    short_name: "Puvexa",
    description:
      "AI-powered troubleshooting with verified fixes and FIX token rewards.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0a13",
    theme_color: "#0a0a13",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}