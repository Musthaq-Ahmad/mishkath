import { LanguageProvider } from "./i18n";

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
