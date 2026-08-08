"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { groupPlacements } from "@/lib/leaderboard";
import { getUpcomingPrograms, formatScheduleTime } from "@/lib/schedule";
import type { EventPlacementRow, Program, ProgramPlacements } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DIVISION_LABELS } from "./labels";

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

async function fetchNextProgram(): Promise<Program | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("programs")
    .select("*")
    .not("scheduled_start", "is", null)
    .order("scheduled_start", { ascending: true })
    .returns<Program[]>();
  return getUpcomingPrograms(data ?? [])[0] ?? null;
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

function InfoCard({
  icon,
  accent,
  label,
  title,
  subtitle,
}: {
  icon: string;
  accent?: boolean;
  label: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:gap-3.5">
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full bg-muted sm:size-12",
          accent ? "text-primary" : "text-muted-foreground",
        )}
      >
        <span className="material-symbols-outlined text-[20px] sm:text-[24px]">{icon}</span>
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate font-heading text-lg font-bold text-foreground sm:text-xl">
          {title}
        </p>
        {subtitle && <p className="truncate text-base text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

export function InfoCardsRow({
  initialPlacements,
  initialNextProgram,
}: {
  initialPlacements: ProgramPlacements[];
  initialNextProgram: Program | null;
}) {
  const [placements, setPlacements] = useState(initialPlacements);
  const [nextProgram, setNextProgram] = useState(initialNextProgram);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function refetchPlacements() {
      setPlacements(await fetchPlacements());
    }
    async function refetchNext() {
      setNextProgram(await fetchNextProgram());
    }

    const channel = supabase
      .channel("info-cards-row")
      .on("postgres_changes", { event: "*", schema: "public", table: "programs" }, () => {
        refetchPlacements();
        refetchNext();
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

  const current = placements[0] ?? null;
  const previous = placements[1] ?? null;
  const announcement = placements[2] ?? null;

  const countdown = nextProgram?.scheduled_start && now ? formatCountdown(nextProgram.scheduled_start, now) : null;

  return (
    <div className="card-elevated grid shrink-0 grid-cols-1 divide-y divide-border rounded-lg border border-border bg-card md:grid-cols-4 md:divide-x md:divide-y-0">
      <InfoCard
        icon="emoji_events"
        label="Previous Winner"
        title={previous ? previous.program_name : "—"}
        subtitle={previous?.places.find((p) => p.rank === 1)?.name}
      />
      <InfoCard
        icon="mic"
        accent
        label="Current Program"
        title={current ? current.program_name : "—"}
        subtitle={current ? DIVISION_LABELS[current.category] : undefined}
      />
      <InfoCard
        icon="menu_book"
        label="Next Program"
        title={nextProgram ? nextProgram.name : "—"}
        subtitle={
          nextProgram
            ? countdown
              ? `Starts in ${countdown}`
              : formatScheduleTime(nextProgram.scheduled_start!)
            : "Not scheduled"
        }
      />
      <InfoCard
        icon="campaign"
        label="Announcement"
        title={announcement ? announcement.program_name : "—"}
        subtitle={announcement?.places.find((p) => p.rank === 1)?.name}
      />
    </div>
  );
}
