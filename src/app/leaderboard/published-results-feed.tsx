"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { groupPlacements } from "@/lib/leaderboard";
import type { EventPlacementRow, ProgramPlacements } from "@/lib/types";
import { DIVISION_LABELS } from "./labels";
import { cn } from "@/lib/utils";
import { groupTextColor } from "@/lib/group-color";

// On mobile the podium stacks in a single column — show the champion
// first (natural reading order), then reorder back to silver/gold/bronze
// left-to-right once there's room to sit side by side.
const MOBILE_ORDER: Record<number, string> = {
  1: "order-1 sm:order-2",
  2: "order-2 sm:order-1",
  3: "order-3",
};

const PODIUM_STYLE: Record<
  number,
  {
    block: string;
    blockHeight: string;
    photoSize: string;
    nameSize: string;
    medalColor: string;
    label: string;
  }
> = {
  1: {
    block: "bg-gold text-gold-foreground",
    blockHeight: "h-28",
    photoSize: "size-28 sm:size-32",
    nameSize: "text-xl sm:text-2xl",
    medalColor: "text-gold",
    label: "1st Prize",
  },
  2: {
    block: "bg-silver text-[#1b1c19]",
    blockHeight: "h-20",
    photoSize: "size-24 sm:size-28",
    nameSize: "text-lg sm:text-xl",
    medalColor: "text-silver",
    label: "2nd Prize",
  },
  3: {
    block: "bg-bronze text-[#251a00]",
    blockHeight: "h-16",
    photoSize: "size-24 sm:size-28",
    nameSize: "text-lg sm:text-xl",
    medalColor: "text-bronze",
    label: "3rd Prize",
  },
};

function PlaceAvatar({
  photoUrl,
  isGroup,
  iconSize,
  imageSizes,
}: {
  photoUrl: string | null;
  isGroup: boolean;
  iconSize: string;
  imageSizes: string;
}) {
  if (photoUrl) {
    return <Image src={photoUrl} alt="" fill sizes={imageSizes} className="object-cover" />;
  }
  return (
    <span className={cn("material-symbols-outlined text-muted-foreground", iconSize)}>
      {isGroup ? "groups" : "person"}
    </span>
  );
}

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

export function PublishedResultsFeed({
  initialPlacements,
  groupNames,
}: {
  initialPlacements: ProgramPlacements[];
  groupNames: Record<string, string>;
}) {
  const [placements, setPlacements] = useState(initialPlacements);

  useEffect(() => {
    const supabase = createClient();

    async function refetch() {
      setPlacements(await fetchPlacements());
    }

    const channel = supabase
      .channel("published-results-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "programs" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_scores" }, refetch)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const hero = placements[0];

  if (!hero) {
    return (
      <div className="card-elevated flex flex-1 items-center justify-center rounded-lg border border-border bg-card p-16 text-center">
        <p className="font-heading text-xl text-muted-foreground">
          Results will appear here once published.
        </p>
      </div>
    );
  }

  const podiumColumns = [2, 1, 3]
    .map((rank) => ({ rank, items: hero.places.filter((place) => place.rank === rank) }))
    .filter((column) => column.items.length > 0);
  const podiumGridCols =
    podiumColumns.length === 1 ? "sm:grid-cols-1" : podiumColumns.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";

  return (
    <div className="card-elevated flex flex-col gap-6 rounded-xl border border-border bg-card p-6 md:h-full md:min-h-0 md:overflow-y-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-destructive" />
          </span>
          <span className="text-xs font-bold tracking-wide text-destructive uppercase">
            Just Published
          </span>
        </div>
        <span className="material-symbols-outlined text-muted-foreground">campaign</span>
      </div>

      <div>
        <p className="font-heading text-2xl font-bold text-foreground">{hero.program_name}</p>
        <p className="text-sm text-muted-foreground">{DIVISION_LABELS[hero.category]}</p>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 items-end gap-6 border-t border-border pt-6 sm:gap-8",
          podiumGridCols,
        )}
      >
        {podiumColumns.map((column) => {
          const style = PODIUM_STYLE[column.rank];
          const isChampion = column.rank === 1;
          const tied = column.items.length > 1;
          return (
            <div
              key={column.rank}
              className={cn("flex w-full flex-col items-center gap-3", MOBILE_ORDER[column.rank])}
            >
              {isChampion && (
                <span aria-hidden className="text-gold">
                  <span className="material-symbols-outlined text-[28px]">military_tech</span>
                </span>
              )}

              <div className="flex flex-wrap items-start justify-center gap-4">
                {column.items.map((place) => (
                  <div key={place.id} className="flex flex-col items-center gap-3">
                    <div
                      className={cn(
                        "relative overflow-hidden rounded-xl bg-muted",
                        style?.photoSize,
                        isChampion && "ring-4 ring-gold",
                      )}
                    >
                      <PlaceAvatar
                        photoUrl={place.photoUrl}
                        isGroup={hero.program_type === "group"}
                        iconSize={isChampion ? "text-5xl" : "text-4xl"}
                        imageSizes="160px"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-0.5 text-center">
                      <p className={cn("truncate font-heading font-bold text-foreground", style?.nameSize)}>
                        {place.name}
                      </p>
                      {hero.program_type === "individual" && groupNames[place.groupId] && (
                        <p className={cn("truncate text-sm font-medium", groupTextColor(place.groupId))}>
                          {groupNames[place.groupId]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-0.5 rounded-lg font-heading text-3xl font-bold",
                  style?.block,
                  style?.blockHeight,
                )}
              >
                {column.rank}
                {tied && (
                  <span className="text-xs font-semibold tracking-wide uppercase opacity-80">Tie</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
