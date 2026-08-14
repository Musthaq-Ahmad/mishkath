"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GroupLeaderboardRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "./i18n";

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
  const { t } = useLanguage();
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
    <aside className="card-elevated flex w-full shrink-0 flex-col gap-4 rounded-xl bg-sidebar p-4 text-sidebar-foreground sm:p-5">
      <div className="flex shrink-0 items-center gap-2">
        <span className="material-symbols-outlined shrink-0 text-[20px] text-gold">emoji_events</span>
        <div>
          <h2 className="font-heading text-sm font-bold text-sidebar-foreground">
            {t("groupStandings")}
          </h2>
          <p className="text-xs text-sidebar-foreground/60">{t("overallFestivalPoints")}</p>
        </div>
        {rows.length > 1 && (rows[0].points ?? 0) > (rows[1].points ?? 0) && (
          <span className="ml-auto shrink-0 rounded-full bg-gold/15 px-2.5 py-1 font-heading text-xs font-bold text-gold tabular-nums">
            +{(rows[0].points ?? 0) - (rows[1].points ?? 0)}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((row, index) => {
          const maxPoints = Math.max(...rows.map((r) => r.points ?? 0), 1);
          const isLeader = index === 0;
          return (
            <div
              key={row.group_id}
              className={cn(
                "flex flex-col gap-2.5 rounded-xl px-4 py-3.5",
                isLeader
                  ? "bg-linear-to-br from-[#f2d287] via-gold to-[#b98a2e] text-gold-foreground shadow-lg shadow-gold/25"
                  : "bg-white/[0.03] ring-1 ring-white/5",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                      isLeader
                        ? "bg-gold-foreground/15 text-gold-foreground"
                        : "bg-white/[0.035] text-sidebar-foreground ring-1 ring-white/10",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "truncate font-semibold",
                      isLeader
                        ? "text-base text-gold-foreground"
                        : "text-sm text-sidebar-foreground",
                    )}
                  >
                    {row.group_name}
                  </span>
                </div>
                <span
                  className={cn(
                    "shrink-0 font-heading font-bold tabular-nums",
                    isLeader
                      ? "text-3xl text-gold-foreground"
                      : "text-xl text-sidebar-foreground",
                  )}
                >
                  {row.points}
                </span>
              </div>
              {/* points relative to the leader, so the gap is readable
                  at a glance on a TV screen */}
              <div
                className={cn(
                  "h-1.5 overflow-hidden rounded-full",
                  isLeader ? "bg-gold-foreground/20" : "bg-white/[0.07]",
                )}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-700",
                    isLeader ? "bg-gold-foreground/70" : "bg-sidebar-foreground/40",
                  )}
                  style={{
                    width: `${Math.round(((row.points ?? 0) / maxPoints) * 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
        {!rows.length && (
          <p className="px-1 text-center text-sm text-sidebar-foreground/60">
            {t("noResultsPublished")}
          </p>
        )}
      </div>
    </aside>
  );
}
