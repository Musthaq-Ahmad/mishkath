import "./leaderboard-theme.css";
import { LanguageProvider } from "./i18n";

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="leaderboard-theme contents">
      <LanguageProvider>{children}</LanguageProvider>
    </div>
  );
}
