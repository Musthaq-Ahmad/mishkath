"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { groupPlacements } from "@/lib/leaderboard";
import type {
  EventPlacementRow,
  ProgramPlacements,
  StudentCategory,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { groupTextColor } from "@/lib/group-color";
import { PlaceholderAvatar } from "@/components/gender-avatar";
import { useLanguage } from "./i18n";

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
  category,
  imageSizes,
}: {
  photoUrl: string | null;
  isGroup: boolean;
  category: StudentCategory | null;
  imageSizes: string;
}) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt=""
        fill
        sizes={imageSizes}
        className="object-cover"
      />
    );
  }
  return (
    <PlaceholderAvatar
      category={category}
      isGroup={isGroup}
      className="size-full p-4"
    />
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

// Once the latest result has sat on screen for a full idle minute with
// nothing new published, start cycling through earlier results instead of
// leaving the podium frozen — but never land back on index 0 while
// rotating, since that's "the latest" and only a genuinely new result
// should bring it back.
const ROTATION_IDLE_MS = 60_000;
const ROTATION_INTERVAL_MS = 15_000;

function nextRotationIndex(current: number, total: number) {
  if (total <= 1) return 0;
  if (current <= 0) return 1;
  const next = current + 1;
  return next >= total ? 1 : next;
}

export function PublishedResultsFeed({
  initialPlacements,
  groupNames,
}: {
  initialPlacements: ProgramPlacements[];
  groupNames: Record<string, string>;
}) {
  const { t, divisionLabel, rankLabel } = useLanguage();
  const [placements, setPlacements] = useState(initialPlacements);
  const [displayIndex, setDisplayIndex] = useState(0);
  const heroIdRef = useRef(initialPlacements[0]?.program_id ?? null);
  const lastNewResultAtRef = useRef<number | null>(null);

  useEffect(() => {
    lastNewResultAtRef.current = Date.now();
    const supabase = createClient();

    async function refetch() {
      const next = await fetchPlacements();
      const newHeroId = next[0]?.program_id ?? null;
      if (newHeroId && newHeroId !== heroIdRef.current) {
        heroIdRef.current = newHeroId;
        lastNewResultAtRef.current = Date.now();
        setDisplayIndex(0);
      }
      setPlacements(next);
    }

    const channel = supabase
      .channel("published-results-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "programs" },
        refetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scores" },
        refetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_scores" },
        refetch,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setDisplayIndex((current) => {
        const lastNewResultAt = lastNewResultAtRef.current;
        if (
          lastNewResultAt == null ||
          Date.now() - lastNewResultAt < ROTATION_IDLE_MS
        )
          return 0;
        return nextRotationIndex(current, placements.length);
      });
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(id);
  }, [placements.length]);

  const hero = placements[displayIndex] ?? placements[0];
  const isLatest = displayIndex === 0;

  if (!hero) {
    return (
      <div className="card-elevated flex flex-1 items-center justify-center rounded-lg border border-border bg-card p-16 text-center">
        <p className="font-heading text-xl text-muted-foreground">
          {t("resultsWillAppear")}
        </p>
      </div>
    );
  }

  const podiumColumns = [2, 1, 3]
    .map((rank) => ({
      rank,
      items: hero.places.filter((place) => place.rank === rank),
    }))
    .filter((column) => column.items.length > 0);

  return (
    <div className="card-elevated flex flex-col gap-6 rounded-xl border border-border bg-card p-6 md:h-full md:min-h-0 md:overflow-y-auto">
      <div className="flex items-center justify-between gap-3">
        <div
          className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1",
            isLatest ? "bg-destructive/10" : "bg-muted",
          )}
        >
          {isLatest && (
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-destructive" />
            </span>
          )}
          <span
            className={cn(
              "text-xs font-bold tracking-wide uppercase",
              isLatest ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {isLatest ? t("justPublished") : t("previousResult")}
          </span>
        </div>
        <span className="material-symbols-outlined text-muted-foreground">
          campaign
        </span>
      </div>

      {/* Keying on program_id remounts this block whenever the podium swaps
          to a different result (new publish or rotation), replaying the
          fade/slide-in animation as a lightweight transition. */}
      <div
        key={hero.program_id}
        className="animate-fade-in-up flex flex-col gap-6"
      >
        <div>
          <p className="font-heading text-2xl font-bold text-foreground">
            {hero.program_name}
          </p>
          <p className="text-sm text-muted-foreground">
            {divisionLabel(hero.category)}
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-center gap-6 border-t border-border pt-6 sm:gap-8">
          {podiumColumns.map((column) => {
            const style = PODIUM_STYLE[column.rank];
            const isChampion = column.rank === 1;
            const tied = column.items.length > 1;
            return (
              <div
                key={column.rank}
                className={cn(
                  "flex flex-1 flex-col items-center basis-[180px]",
                  tied
                    ? "w-full max-w-[380px] gap-1.5"
                    : "w-full max-w-[240px] gap-3",
                  MOBILE_ORDER[column.rank],
                )}
              >
                {isChampion && (
                  <span aria-hidden className="text-gold">
                    <span className="material-symbols-outlined text-[28px]">
                      military_tech
                    </span>
                  </span>
                )}

                <div
                  className={cn(
                    "flex w-full items-end",
                    tied
                      ? "flex-row flex-wrap justify-center gap-x-3 gap-y-2"
                      : "flex-col items-center gap-4",
                  )}
                >
                  {column.items.map((place) => (
                    <div
                      key={place.id}
                      className={cn(
                        "flex flex-col items-center",
                        tied ? "gap-1" : "gap-3",
                      )}
                    >
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
                          category={place.category}
                          imageSizes="160px"
                        />
                      </div>
                      <div className="flex max-w-[9rem] flex-col items-center gap-0.5 text-center">
                        <p
                          className={cn(
                            "text-balance break-words font-heading font-bold text-foreground",
                            style?.nameSize,
                          )}
                        >
                          {place.name}
                        </p>
                        {hero.program_type === "individual" &&
                          groupNames[place.groupId] && (
                            <p
                              className={cn(
                                "text-balance break-words text-sm font-medium",
                                groupTextColor(place.groupId),
                              )}
                            >
                              {groupNames[place.groupId]}
                            </p>
                          )}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className={cn(
                    "flex w-full flex-col items-center justify-center gap-0.5 rounded-lg font-heading shadow-sm",
                    style?.block,
                    style?.blockHeight,
                  )}
                >
                  <span className="text-3xl font-bold">{column.rank}</span>
                  <span className="text-xs font-semibold tracking-wide uppercase opacity-80">
                    {tied
                      ? `${rankLabel(column.rank) ?? `Rank ${column.rank}`} · ${t("tie")}`
                      : rankLabel(column.rank)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
