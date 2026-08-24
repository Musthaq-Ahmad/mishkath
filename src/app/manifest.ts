import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mehfile Meem — Festival Management",
    short_name: "Mehfile Meem",
    description:
      "Festival management platform for groups, students, programs, judging and live results.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#1c1a17",
    theme_color: "#171310",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
