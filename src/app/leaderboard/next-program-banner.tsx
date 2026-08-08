"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatScheduleTime, getUpcomingPrograms } from "@/lib/schedule";
import type { Program } from "@/lib/types";
import { ML_DIVISION_LABELS } from "./malayalam";

function formatCountdown(targetIso: string, nowMs: number): string | null {
  const diffMs = new Date(targetIso).getTime() - nowMs;
  if (diffMs <= 0) return null;

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

async function fetchNextProgram(): Promise<Program | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("programs")
    .select("*")
    .not("scheduled_start", "is", null)
    .order("scheduled_start", { ascending: true })
    .returns<Program[]>();

  const upcoming = getUpcomingPrograms(data ?? []);
  return upcoming[0] ?? null;
}

export function NextProgramBanner({ initialProgram }: { initialProgram: Program | null }) {
  const [program, setProgram] = useState(initialProgram);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function refetch() {
      setProgram(await fetchNextProgram());
    }

    const channel = supabase
      .channel("next-program-banner")
      .on("postgres_changes", { event: "*", schema: "public", table: "programs" }, refetch)
      .subscribe();

    const refetchId = setInterval(refetch, 60_000);
    const tickId = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refetchId);
      clearInterval(tickId);
    };
  }, []);

  if (!program || !program.scheduled_start) return null;

  const countdown = now ? formatCountdown(program.scheduled_start, now) : null;

  return (
    <div className="animate-fade-in-up flex flex-wrap items-center justify-center gap-3 rounded-full bg-white/8 px-6 py-3 text-center ring-1 ring-gold/25 backdrop-blur-md sm:justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gold uppercase">
        <span className="material-symbols-outlined text-[18px]">schedule</span>
        അടുത്തത്
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span className="font-heading text-lg font-semibold">{program.name}</span>
        <span className="text-sm text-primary-foreground/70">
          {ML_DIVISION_LABELS[program.category]}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-primary-foreground/80">
          {formatScheduleTime(program.scheduled_start)}
        </span>
        {countdown && (
          <span className="rounded-full bg-gold/15 px-2.5 py-0.5 font-heading text-sm font-bold tabular-nums text-gold">
            {countdown}
          </span>
        )}
      </div>
    </div>
  );
}
