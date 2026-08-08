"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GroupLeaderboardRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { groupBgColor, groupRingColor } from "@/lib/group-color";

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
          className={cn("h-3 flex-1 rounded-sm", i < filled ? colorClass : "bg-white/10")}
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
    <aside className="flex min-h-0 w-full flex-col gap-4 overflow-hidden rounded-2xl border border-gold/25 bg-primary-container/30 p-5 backdrop-blur-md">
      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <span className="flex size-11 items-center justify-center rounded-full bg-gold/15 ring-2 ring-gold/40">
          <span className="material-symbols-outlined text-[22px] text-gold">emoji_events</span>
        </span>
        <div className="flex items-center gap-1.5 text-gold">
          <span className="text-xs">✦</span>
          <h2 className="font-heading text-sm font-bold tracking-widest whitespace-nowrap uppercase">
            ഓവറോൾ ചാമ്പ്യൻഷിപ്പ്
          </h2>
          <span className="text-xs">✦</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {rows.map((row, index) => {
          const ring = groupRingColor(row.group_id);
          const barColor = index === 0 ? "bg-gold" : "bg-primary-foreground/60";
          return (
            <div
              key={row.group_id}
              className={cn(
                "animate-fade-in-up flex flex-col gap-2.5 rounded-xl bg-white/5 p-4 ring-1",
                index === 0 ? "ring-gold/40" : "ring-white/10",
              )}
              style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-md ring-2",
                      groupBgColor(row.group_id),
                      ring,
                    )}
                  >
                    <span className="material-symbols-outlined text-[19px]">shield</span>
                  </span>
                  <span
                    className={cn(
                      "truncate font-heading text-lg font-bold",
                      index === 0 && "text-gold",
                    )}
                  >
                    {row.group_name}
                  </span>
                </div>
                <span className="shrink-0 font-heading text-2xl font-black tabular-nums text-gold">
                  {row.points}
                </span>
              </div>
              <SegmentedBar value={row.points} max={maxPoints} colorClass={barColor} />
            </div>
          );
        })}
        {!rows.length && (
          <p className="px-1 text-center text-base text-primary-foreground/70">
            ഇതുവരെ ഫലങ്ങൾ പ്രസിദ്ധീകരിച്ചിട്ടില്ല.
          </p>
        )}
      </div>
    </aside>
  );
}
