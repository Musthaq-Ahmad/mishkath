// The public leaderboard is a kiosk/TV display, pinned to the app's dark
// theme regardless of visitor preference (not user-themed like the rest of
// the app). It uses the same Inter font as the rest of the app — no
// separate font scoping needed now that this route's content is English.
export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div lang="en" className="dark">
      {children}
    </div>
  );
}
