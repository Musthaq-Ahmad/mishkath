import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_DESCRIPTION, FiestifyLogo } from "@/components/brand/fiestify-logo";

export default function Home() {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
      <ThemeToggle className="absolute top-4 right-4 z-10" />

      {/* Ambient glow backdrop — same soft radial-blur language used on the
          login hero panel and the leaderboard podium, so the very first
          page already reads as part of the same visual system. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-gold/15 blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-gold/10 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-5">
          <span className="text-[11px] font-bold tracking-[0.3em] text-gold uppercase">
            Festival Management
          </span>

          <FiestifyLogo className="h-16 sm:h-20" />

          <span aria-hidden className="h-px w-16 bg-gold/50" />

          <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            {APP_DESCRIPTION}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            className="gap-2 rounded-full px-7 shadow-[0_20px_60px_-20px_var(--primary)]"
            render={<Link href="/leaderboard" />}
          >
            <span className="material-symbols-outlined text-[18px]">emoji_events</span>
            View Leaderboard
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 rounded-full px-7"
            render={<Link href="/login" />}
          >
            Sign in
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
