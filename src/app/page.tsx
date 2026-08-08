import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-4xl font-semibold tracking-tight">
          MISHKAT
        </h1>
        <p className="max-w-md text-muted-foreground">
          Festival management platform for groups, students, programs, judging
          and live results.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button render={<Link href="/leaderboard" />}>View Leaderboard</Button>
        <Button variant="outline" render={<Link href="/login" />}>
          Sign in
        </Button>
      </div>
    </div>
  );
}
