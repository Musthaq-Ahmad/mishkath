"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { groupPlacements } from "@/lib/leaderboard";
import { getUpcomingPrograms, formatScheduleTime } from "@/lib/schedule";
import type { EventPlacementRow, Program, ProgramPlacements } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ML_DIVISION_LABELS } from "./malayalam";

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
  if (totalMinutes < 60) return `${totalMinutes} മിനിറ്റിൽ`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}മ ${minutes}മി`;
}

function InfoCard({
  icon,
  iconColor,
  borderColor,
  labelColor,
  label,
  title,
  subtitle,
}: {
  icon: string;
  iconColor: string;
  borderColor: string;
  labelColor: string;
  label: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      className={cn(
        "animate-fade-in-up flex items-start gap-3.5 rounded-xl border bg-white/5 p-4",
        borderColor,
      )}
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-full ring-2",
          iconColor,
        )}
      >
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-xs font-bold tracking-widest uppercase",
            labelColor,
          )}
        >
          {label}
        </p>
        <p className="truncate font-heading text-lg font-bold sm:text-xl">{title}</p>
        {subtitle && (
          <p className="truncate text-sm text-primary-foreground/60">{subtitle}</p>
        )}
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
    <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
      <InfoCard
        icon="emoji_events"
        iconColor="bg-success/15 ring-success/40 text-success"
        borderColor="border-success/25"
        labelColor="text-success"
        label="മുൻ വിജയി"
        title={previous ? previous.program_name : "—"}
        subtitle={previous?.places.find((p) => p.rank === 1)?.name}
      />
      <InfoCard
        icon="mic"
        iconColor="bg-gold/15 ring-gold/40 text-gold"
        borderColor="border-gold/30"
        labelColor="text-gold"
        label="നിലവിലെ ഇനം"
        title={current ? current.program_name : "—"}
        subtitle={current ? ML_DIVISION_LABELS[current.category] : undefined}
      />
      <InfoCard
        icon="menu_book"
        iconColor="bg-sky-500/20 ring-sky-400/50 text-sky-300"
        borderColor="border-sky-400/25"
        labelColor="text-sky-300"
        label="അടുത്ത ഇനം"
        title={nextProgram ? nextProgram.name : "—"}
        subtitle={
          nextProgram
            ? countdown
              ? `${countdown} ആരംഭിക്കും`
              : formatScheduleTime(nextProgram.scheduled_start!)
            : "ഷെഡ്യൂൾ ചെയ്തിട്ടില്ല"
        }
      />
      <InfoCard
        icon="campaign"
        iconColor="bg-destructive/20 ring-destructive/50 text-destructive"
        borderColor="border-destructive/25"
        labelColor="text-destructive"
        label="അറിയിപ്പ്"
        title={announcement ? announcement.program_name : "—"}
        subtitle={announcement?.places.find((p) => p.rank === 1)?.name}
      />
    </div>
  );
}
