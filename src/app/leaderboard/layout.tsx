import { Noto_Sans_Malayalam } from "next/font/google";

const notoMalayalam = Noto_Sans_Malayalam({
  subsets: ["malayalam", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ml-sans",
});

// The public leaderboard intentionally keeps its own "Islamic classic"
// palette (deep emerald + gold — MISHKAT's original branding, the mosque
// icon, "Niche of Light") rather than the app-wide modern indigo theme used
// by the dashboard/auth pages. Scoped here the same way the Malayalam font
// is scoped: local CSS-variable overrides on a wrapper div, so
// bg-primary/text-gold/etc. utilities everywhere in these components pick
// up this palette without touching globals.css or the rest of the app.
// This page's background is always dark (a public TV display, not
// user-themed), so these values are pinned, not toggled by light/dark mode.
export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      lang="ml"
      className={`${notoMalayalam.variable} font-sans`}
      style={
        {
          "--font-heading": "var(--font-ml-sans)",
          "--font-sans": "var(--font-ml-sans)",
          "--primary": "#0b5d4b",
          "--primary-foreground": "#f4fafd",
          "--primary-container": "#0d4437",
          "--gold": "#e9c266",
          "--gold-foreground": "#251a00",
          "--silver": "#c8c6c2",
          "--bronze": "#c8a97e",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
