"use client";

import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClockCard } from "./clock-card";
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
    <header className="card-elevated relative flex shrink-0 flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl border border-border bg-card px-4 py-3 sm:px-5">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-transparent via-gold to-transparent"
      />

      <div className="flex items-center gap-3">
        {/* theme-aware logo: indigo on light surfaces, gold on dark —
            the indigo mark loses all contrast against the dark card */}
        <Image
          src="/mehfile-meem-logo-indigo.png"
          alt="Mehfile Meem — Meelad Fest 2K26"
          width={200}
          height={119}
          className="h-auto w-40 sm:w-50 dark:hidden"
          priority
        />
        <Image
          src="/mehfile-meem-logo-gold.png"
          alt="Mehfile Meem — Meelad Fest 2K26"
          width={200}
          height={119}
          className="hidden h-auto w-40 sm:w-50 dark:block"
          priority
        />
        <div className="hidden border-l border-border pl-3 sm:block">
          <p className="font-heading text-lg font-bold tracking-tight text-primary">
            {t("liveResults")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-base sm:gap-3">
        <div className="flex items-center gap-3 rounded-full bg-gold/10 px-3 py-1.5">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-gold" />
            </span>
            <span className="font-semibold tracking-wide text-gold uppercase">{t("live")}</span>
          </div>

          {totalProgramCount > 0 && (
            <div className="hidden items-center gap-1.5 border-l border-gold/25 pl-3 text-muted-foreground sm:flex">
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
        </div>

        <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
          <ClockCard />
          <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />
          <div className="hidden sm:block">
            <ResultsQrCode />
          </div>
          <span aria-hidden className="h-4 w-px bg-border" />
          <ThemeToggle className="size-7 rounded-full hover:bg-muted" />
        </div>
      </div>
    </header>
  );
}
