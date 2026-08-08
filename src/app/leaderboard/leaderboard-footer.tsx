"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { groupPlacements } from "@/lib/leaderboard";
import type { EventPlacementRow, ProgramPlacements } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DIVISION_LABELS } from "./labels";

const RANK_TEXT: Record<number, string> = {
  1: "text-gold",
  2: "text-silver",
  3: "text-bronze",
};

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

function ResultChip({
  program,
  groupNames,
}: {
  program: ProgramPlacements;
  groupNames: Record<string, string>;
}) {
  const places = [...program.places].sort((a, b) => a.rank - b.rank);
  return (
    <Link
      href={`/leaderboard/program/${program.program_id}`}
      className="flex shrink-0 items-center gap-5 px-8 text-foreground transition-colors hover:text-primary"
    >
      <span className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-muted-foreground">emoji_events</span>
        <span className="font-heading text-lg font-semibold whitespace-nowrap">
          {program.program_name}
        </span>
        <span className="text-base text-muted-foreground whitespace-nowrap">
          {DIVISION_LABELS[program.category]}
        </span>
      </span>
      {places.map((place) => (
        <span key={place.id} className="flex items-center gap-2 whitespace-nowrap">
          <span
            className={cn(
              "font-heading text-base font-bold tabular-nums",
              RANK_TEXT[place.rank] ?? "text-muted-foreground",
            )}
          >
            {place.rank}.
          </span>
          <span className="text-lg font-semibold">{place.name}</span>
          {program.program_type === "individual" && groupNames[place.groupId] && (
            <span className="text-base text-muted-foreground">
              ({groupNames[place.groupId]})
            </span>
          )}
        </span>
      ))}
    </Link>
  );
}

export function LeaderboardFooter({
  initialPlacements,
  groupNames,
}: {
  initialPlacements: ProgramPlacements[];
  groupNames: Record<string, string>;
}) {
  const [placements, setPlacements] = useState(initialPlacements);
  const history = placements.slice(1);

  useEffect(() => {
    const supabase = createClient();

    async function refetchPlacements() {
      setPlacements(await fetchPlacements());
    }

    const channel = supabase
      .channel("leaderboard-footer")
      .on("postgres_changes", { event: "*", schema: "public", table: "programs" }, refetchPlacements)
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, refetchPlacements)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_scores" }, refetchPlacements)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Scale the scroll duration to content length so it always reads at a
  // steady pace, whether there are 2 past results or 20.
  const marqueeDuration = Math.max(18, history.length * 6);

  return (
    <div className="hidden shrink-0 items-stretch overflow-hidden rounded-lg border border-border bg-card sm:flex">
      <div className="flex shrink-0 items-center gap-2.5 border-r border-border px-6 py-3.5">
        <span className="material-symbols-outlined text-[22px] text-muted-foreground">campaign</span>
        <span className="text-base font-semibold tracking-widest text-muted-foreground uppercase">
          Announcements
        </span>
      </div>
      <div className="min-w-0 flex-1 overflow-hidden py-3.5">
        {history.length > 0 ? (
          <div
            className="animate-marquee flex w-max items-center"
            style={{ animationDuration: `${marqueeDuration}s` }}
          >
            {[...history, ...history].map((program, i) => (
              <ResultChip
                key={`${program.program_id}-${i}`}
                program={program}
                groupNames={groupNames}
              />
            ))}
          </div>
        ) : (
          <span className="px-4 text-lg text-muted-foreground">
            No previous results yet.
          </span>
        )}
      </div>
    </div>
  );
}
