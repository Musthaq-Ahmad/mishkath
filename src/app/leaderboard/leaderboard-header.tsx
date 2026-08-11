"use client";

import Image from "next/image";
import Link from "next/link";
import { ClockCard } from "./clock-card";
import { KioskToggleButton } from "./kiosk";
import { LanguageToggle } from "./language-toggle";
import { ResultsQrCode } from "./results-qr-code";
import { useLanguage } from "./i18n";

export function LeaderboardHeader({
  totalProgramCount,
  publishedProgramCount,
}: {
  totalProgramCount: number;
  publishedProgramCount: number;
}) {
  const { t } = useLanguage();

  return (
    <header className="card-elevated flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        <Image
          src="/mehfile-meem-logo-indigo.png"
          alt="Mehfile Meem — Meelad Fest 2K26"
          width={200}
          height={119}
          className="h-auto w-[160px] sm:w-[200px]"
          priority
        />
        <div className="hidden border-l border-border pl-3 sm:block">
          <p className="font-heading text-lg font-bold tracking-tight text-primary">
            {t("liveResults")}
          </p>
          <p className="text-base text-muted-foreground">{t("festivalTagline")}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-base sm:gap-3">
        <div className="flex items-center gap-3 rounded-full bg-destructive/10 px-3 py-1.5">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-destructive" />
            </span>
            <span className="font-semibold tracking-wide text-destructive uppercase">{t("live")}</span>
          </div>

          {totalProgramCount > 0 && (
            <div className="hidden items-center gap-1.5 border-l border-destructive/20 pl-3 text-muted-foreground sm:flex">
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              <span className="font-heading font-semibold tabular-nums text-foreground">
                {publishedProgramCount}/{totalProgramCount}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-full bg-muted p-1">
          <Link
            href="/leaderboard/results"
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-primary"
          >
            <span className="material-symbols-outlined text-[20px]">history</span>
            <span className="hidden font-medium sm:inline">{t("allResults")}</span>
          </Link>
          <LanguageToggle />
          <KioskToggleButton />
        </div>

        <div className="flex items-center gap-3 rounded-full border border-border px-3 py-1.5">
          <ClockCard />
          <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />
          <div className="hidden sm:block">
            <ResultsQrCode />
          </div>
        </div>
      </div>
    </header>
  );
}
