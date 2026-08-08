"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GroupLeaderboardRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const RANK_TEXT: Record<number, string> = {
  1: "text-gold",
  2: "text-silver",
  3: "text-bronze",
};

export function GroupLeaderboardAside({
  initialRows,
}: {
  initialRows: GroupLeaderboardRow[];
}) {
  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    const supabase = createClient();

    async function refetch() {
      const { data } = await supabase
        .from("public_group_leaderboard")
        .select("*")
        .returns<GroupLeaderboardRow[]>();
      if (data) setRows(data);
    }

    const channel = supabase
      .channel("group-leaderboard-aside")
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "programs" }, refetch)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const maxPoints = Math.max(1, ...rows.map((row) => row.points));

  return (
    <aside className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-2xl bg-white/6 p-6 ring-1 ring-gold/15 backdrop-blur-md">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[28px] text-gold">emoji_events</span>
          <h2 className="font-heading text-xl font-bold">ഗ്രൂപ്പ് നിലവാരം</h2>
        </div>
        <span className="material-symbols-outlined text-[22px] text-gold/50">emoji_events</span>
      </div>
      <ol className="flex min-h-0 flex-col gap-2 overflow-y-auto">
        {rows.map((row, index) => (
          <li
            key={row.group_id}
            style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
            className={cn(
              "animate-fade-in-up relative flex items-center justify-between gap-4 overflow-hidden rounded-xl px-5 py-4 ring-1",
              index === 0 ? "bg-gold/20 ring-gold/50" : "ring-white/10 odd:bg-white/4",
            )}
          >
            {index > 0 && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 bg-linear-to-r from-gold/12 to-transparent"
                style={{ width: `${Math.max(6, (row.points / maxPoints) * 100)}%` }}
              />
            )}
            <div className="relative flex min-w-0 items-center gap-4">
              <span
                className={cn(
                  "w-8 shrink-0 font-heading text-2xl font-bold tabular-nums",
                  RANK_TEXT[index + 1] ?? "text-primary-foreground/80",
                )}
              >
                {index + 1}
              </span>
              <span className="truncate font-heading text-xl font-semibold">
                {row.group_name}
              </span>
            </div>
            <span className="relative flex shrink-0 items-center gap-1.5 font-heading text-xl font-bold tabular-nums text-gold">
              {index === 0 && (
                <span className="material-symbols-outlined text-[18px]">emoji_events</span>
              )}
              {row.points.toLocaleString()}
            </span>
          </li>
        ))}
        {!rows.length && (
          <li className="px-3 py-8 text-center text-primary-foreground/80">
            ഇതുവരെ ഫലങ്ങൾ പ്രസിദ്ധീകരിച്ചിട്ടില്ല.
          </li>
        )}
      </ol>
    </aside>
  );
}
