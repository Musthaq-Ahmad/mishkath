"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { groupPlacements } from "@/lib/leaderboard";
import { getCurrentAndNextProgram, formatScheduleTime } from "@/lib/schedule";
import type { Division, EventPlacementRow, Program, ProgramPlacements } from "@/lib/types";
import { cn } from "@/lib/utils";
import { divisionLabel } from "@/lib/division-label";
import { useLanguage } from "./i18n";

async function fetchPlacements(): Promise<ProgramPlacements[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("public_event_top3")
    .select("*")
    .order("published_at", { ascending: false })
    .order("rank", { ascending: true })
    .returns<EventPlacementRow[]>();
  return groupPlacements(data ?? []);
}

async function fetchCurrentAndNextProgram(): Promise<{
  current: Program | null;
  next: Program | null;
}> {
  const supabase = createClient();
  const { data } = await supabase.from("programs").select("*").returns<Program[]>();
  return getCurrentAndNextProgram(data ?? []);
}

function formatCountdown(targetIso: string, nowMs: number): string | null {
  const diffMs = new Date(targetIso).getTime() - nowMs;
  if (diffMs <= 0) return null;
  const totalMinutes = Math.ceil(diffMs / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

const CARD_ACCENT = {
  gold: { bar: "bg-gold", chip: "bg-gold/15 text-gold" },
  primary: { bar: "bg-primary", chip: "bg-primary/15 text-primary" },
  warning: { bar: "bg-warning", chip: "bg-warning/15 text-warning" },
  neutral: { bar: "bg-border", chip: "bg-muted text-muted-foreground" },
} as const;

function InfoCard({
  icon,
  tone = "neutral",
  label,
  title,
  subtitle,
}: {
  icon: string;
  tone?: keyof typeof CARD_ACCENT;
  label: string;
  title: string;
  subtitle?: string;
}) {
  const accent = CARD_ACCENT[tone];
  return (
    <div className="relative flex items-center gap-2.5 px-4 py-2.5 sm:gap-3">
      <span aria-hidden className={cn("absolute inset-x-4 top-0 h-0.5 rounded-full", accent.bar)} />
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full sm:size-10",
          accent.chip,
        )}
      >
        <span className="material-symbols-outlined text-[18px] sm:text-[20px]">{icon}</span>
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate font-heading text-base font-bold text-foreground sm:text-lg">
          {title}
        </p>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

export function InfoCardsRow({
  initialPlacements,
  initialCurrentProgram,
  initialNextProgram,
  divisions,
}: {
  initialPlacements: ProgramPlacements[];
  initialCurrentProgram: Program | null;
  initialNextProgram: Program | null;
  divisions: Division[];
}) {
  const { t, lang, startsIn } = useLanguage();
  const divisionById = new Map(divisions.map((division) => [division.id, division]));
  const [placements, setPlacements] = useState(initialPlacements);
  const [currentProgram, setCurrentProgram] = useState(initialCurrentProgram);
  const [nextProgram, setNextProgram] = useState(initialNextProgram);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function refetchPlacements() {
      setPlacements(await fetchPlacements());
    }
    async function refetchCurrentAndNext() {
      const { current, next } = await fetchCurrentAndNextProgram();
      setCurrentProgram(current);
      setNextProgram(next);
    }

    const channel = supabase
      .channel("info-cards-row")
      .on("postgres_changes", { event: "*", schema: "public", table: "programs" }, () => {
        refetchPlacements();
        refetchCurrentAndNext();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, refetchPlacements)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_scores" }, refetchPlacements)
      .subscribe();

    const tickId = setInterval(() => setNow(Date.now()), 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(tickId);
    };
  }, []);

  // "Current Program" is now driven by live status ("running"), not by
  // which result was most recently published — a program can be running
  // for a while before its result is ever published. previous/announcement
  // shift down one slot accordingly (they were previously placements[1]/[2]
  // alongside a "current" that was really just the latest published result).
  const previous = placements[0] ?? null;
  const announcement = placements[1] ?? null;

  const countdown = nextProgram?.scheduled_start && now ? formatCountdown(nextProgram.scheduled_start, now) : null;

  return (
    <div className="card-elevated grid shrink-0 grid-cols-1 divide-y divide-border rounded-lg border border-border bg-card md:grid-cols-4 md:divide-x md:divide-y-0">
      <InfoCard
        icon="emoji_events"
        tone="gold"
        label={t("previousWinner")}
        title={previous ? previous.program_name : "—"}
        subtitle={previous?.places.find((p) => p.rank === 1)?.name}
      />
      <InfoCard
        icon="mic"
        tone="primary"
        label={t("currentProgram")}
        title={currentProgram ? currentProgram.name : "—"}
        subtitle={
          currentProgram ? divisionLabel(divisionById.get(currentProgram.category), lang) : undefined
        }
      />
      <InfoCard
        icon="menu_book"
        tone="warning"
        label={t("nextProgram")}
        title={nextProgram ? nextProgram.name : "—"}
        subtitle={
          nextProgram
            ? countdown
              ? startsIn(countdown)
              : formatScheduleTime(nextProgram.scheduled_start!)
            : t("notScheduled")
        }
      />
      <InfoCard
        icon="campaign"
        label={t("announcement")}
        title={announcement ? announcement.program_name : "—"}
        subtitle={announcement?.places.find((p) => p.rank === 1)?.name}
      />
    </div>
  );
}
