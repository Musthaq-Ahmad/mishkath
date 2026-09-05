import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/components/brand/fiestify-logo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // `id` pins the app's identity independently of start_url, so changing
    // where it launches later does not register as a different installed app.
    id: "/",
    name: `${APP_NAME} — Festival Management`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    // /dashboard, not "/": it already resolves every state an installed app
    // can launch into — a member goes to their festival's dashboard, someone
    // with no festival lands on onboarding, and a signed-out user gets the
    // login page. "/" is the marketing page, which is none of those.
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0b0f19",
    theme_color: "#4f46e5",
    categories: ["productivity", "education", "events"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Separate maskable art: the "any" icons are a rounded tile, which
      // Android would round a second time and clip. The maskable variant is
      // full-bleed with the mark inside the safe circle.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Leaderboard", url: "/leaderboard", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Dashboard", url: "/dashboard", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
