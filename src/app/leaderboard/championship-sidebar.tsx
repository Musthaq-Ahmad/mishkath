"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GroupLeaderboardRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { groupRingColor } from "@/lib/group-color";

const SEGMENTS = 10;

async function fetchGroupRows(): Promise<GroupLeaderboardRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("public_group_leaderboard")
    .select("*")
    .returns<GroupLeaderboardRow[]>();
  return data ?? [];
}

function SegmentedBar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  const filled = Math.max(0, Math.min(SEGMENTS, Math.round((value / max) * SEGMENTS)));
  return (
    <div className="flex gap-1">
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <span
          key={i}
          className={cn("h-3 flex-1 rounded-sm", i < filled ? colorClass : "bg-muted")}
        />
      ))}
    </div>
  );
}

export function ChampionshipSidebar({
  initialGroupRows,
}: {
  initialGroupRows: GroupLeaderboardRow[];
}) {
  const [rows, setRows] = useState(initialGroupRows);

  useEffect(() => {
    const supabase = createClient();

    async function refetch() {
      setRows(await fetchGroupRows());
    }

    const channel = supabase
      .channel("championship-sidebar")
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_scores" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "programs" }, refetch)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const maxPoints = Math.max(1, ...rows.map((row) => row.points));

  return (
    <aside className="card-elevated flex w-full flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:p-5 md:h-full md:min-h-0 md:overflow-hidden">
      <div className="flex shrink-0 items-center gap-2">
        <span className="material-symbols-outlined shrink-0 text-[22px] text-muted-foreground">emoji_events</span>
        <h2 className="font-heading text-sm font-bold tracking-wide text-foreground uppercase">
          Overall Championship
        </h2>
      </div>

      <div className="flex flex-col gap-3 md:min-h-0 md:flex-1 md:overflow-y-auto">
        {rows.map((row, index) => {
          const ring = groupRingColor(row.group_id);
          const barColor = index === 0 ? "bg-gold" : "bg-primary";
          return (
            <div
              key={row.group_id}
              className={cn(
                "animate-fade-in-up flex flex-col gap-2.5 rounded-md border border-border bg-background p-4",
                index === 0 && "border-l-2 border-l-gold",
              )}
              style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-md bg-muted ring-2",
                      ring,
                    )}
                  >
                    <span className="material-symbols-outlined text-[21px]">shield</span>
                  </span>
                  <span className="truncate font-heading text-xl font-bold text-foreground">
                    {row.group_name}
                  </span>
                </div>
                <span
                  className={cn(
                    "shrink-0 font-heading text-3xl font-black tabular-nums",
                    index === 0 ? "text-gold" : "text-foreground",
                  )}
                >
                  {row.points}
                </span>
              </div>
              <SegmentedBar value={row.points} max={maxPoints} colorClass={barColor} />
            </div>
          );
        })}
        {!rows.length && (
          <p className="px-1 text-center text-lg text-muted-foreground">
            No results published yet.
          </p>
        )}
      </div>
    </aside>
  );
}
