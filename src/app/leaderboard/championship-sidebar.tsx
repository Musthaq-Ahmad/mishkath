"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GroupLeaderboardRow } from "@/lib/types";
import { cn } from "@/lib/utils";

async function fetchGroupRows(): Promise<GroupLeaderboardRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("public_group_leaderboard")
    .select("*")
    .returns<GroupLeaderboardRow[]>();
  return data ?? [];
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

  return (
    <aside className="card-elevated flex w-full flex-col gap-4 rounded-xl bg-sidebar p-4 text-sidebar-foreground sm:p-5 md:h-full md:min-h-0 md:overflow-hidden">
      <div className="flex shrink-0 items-center gap-2">
        <span className="material-symbols-outlined shrink-0 text-[20px] text-gold">emoji_events</span>
        <div>
          <h2 className="font-heading text-sm font-bold text-sidebar-foreground">Group Standings</h2>
          <p className="text-xs text-sidebar-foreground/60">Overall Festival Points</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:min-h-0 md:flex-1 md:overflow-y-auto">
        {rows.map((row, index) => (
          <div
            key={row.group_id}
            className="flex items-center justify-between gap-3 rounded-lg bg-sidebar-accent px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                  index === 0 ? "bg-gold text-gold-foreground" : "bg-white/10 text-sidebar-foreground",
                )}
              >
                {index + 1}
              </span>
              <span className="truncate text-sm font-semibold text-sidebar-foreground">
                {row.group_name}
              </span>
            </div>
            <span
              className={cn(
                "shrink-0 font-heading text-lg font-bold tabular-nums",
                index === 0 ? "text-gold" : "text-sidebar-foreground",
              )}
            >
              {row.points}
            </span>
          </div>
        ))}
        {!rows.length && (
          <p className="px-1 text-center text-sm text-sidebar-foreground/60">
            No results published yet.
          </p>
        )}
      </div>
    </aside>
  );
}
