import { Libre_Caslon_Text, Montserrat } from "next/font/google";
import "./leaderboard-theme.css";
import { LanguageProvider } from "./i18n";

// Editorial serif + geometric sans pairing for the "ultra-premium festival"
// look, scoped to this route via the `.leaderboard-theme` class below —
// see leaderboard-theme.css for the full token override.
const libreCaslonText = Libre_Caslon_Text({
  variable: "--font-libre-caslon",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // `font-sans` re-declares font-family on this element so it actually
    // resolves the new --font-sans binding — custom property overrides
    // alone don't change an already-inherited font-family computed
    // upstream on <html>. `contents` keeps this div out of the layout box
    // tree so it doesn't disturb any page's own flex/grid structure.
    <div
      className={`${libreCaslonText.variable} ${montserrat.variable} leaderboard-theme contents font-sans`}
    >
      <LanguageProvider>{children}</LanguageProvider>
    </div>
  );
}
