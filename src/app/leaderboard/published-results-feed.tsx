"use client";

import Image from "next/image";
import { memo, useEffect, useRef, useState } from "react";
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
    lip: string;
    frame: string;
    chip: string;
    photoSize: string;
    nameSize: string;
    medalColor: string;
    label: string;
  }
> = {
  1: {
    block:
      "bg-linear-to-b from-[#eccf85] via-gold to-[#a87c26] text-gold-foreground shadow-lg shadow-gold/25",
    blockHeight: "h-32",
    lip: "bg-linear-to-b from-[#f9ecc4] to-[#e3bd5e]",
    frame:
      "bg-linear-to-br from-[#f2d287] via-gold to-[#b98a2e] shadow-lg shadow-gold/40",
    chip: "bg-gold text-gold-foreground",
    photoSize: "size-28 sm:size-32",
    nameSize: "text-xl sm:text-2xl",
    medalColor: "text-gold",
    label: "1st Prize",
  },
  2: {
    block:
      "bg-linear-to-b from-[#eeece8] via-silver to-[#96948f] text-[#1b1c19] shadow-md shadow-black/25",
    blockHeight: "h-24",
    lip: "bg-linear-to-b from-[#f8f7f5] to-[#d4d2ce]",
    frame:
      "bg-linear-to-br from-[#e4e2de] via-silver to-[#a9a7a3] shadow-md shadow-black/20",
    chip: "bg-silver text-[#1b1c19]",
    photoSize: "size-24 sm:size-28",
    nameSize: "text-lg sm:text-xl",
    medalColor: "text-silver",
    label: "2nd Prize",
  },
  3: {
    block:
      "bg-linear-to-b from-[#e8cda7] via-bronze to-[#8f6c3f] text-[#251a00] shadow-md shadow-black/25",
    blockHeight: "h-20",
    lip: "bg-linear-to-b from-[#f3e3c9] to-[#d3af7d]",
    frame:
      "bg-linear-to-br from-[#dfc19a] via-bronze to-[#a37f4f] shadow-md shadow-black/20",
    chip: "bg-bronze text-[#251a00]",
    photoSize: "size-24 sm:size-28",
    nameSize: "text-lg sm:text-xl",
    medalColor: "text-bronze",
    label: "3rd Prize",
  },
};

// Animated poster-style backdrop behind the podium: the Mehfile Meem gold
// wordmark oversized and slightly tilted like a screen-printed poster, over
// a breathing gold wash and thin slow-rotating rays. Purely decorative
// (aria-hidden, pointer-events-none), theme-aware via var(--gold), and gated
// behind prefers-reduced-motion. Memoized with no props so the feed's
// realtime refetches and 15s rotation re-renders never re-render it — its
// DOM persists, so the animations run continuously instead of restarting.
// Sits at -z-10 inside the card's isolated stacking context: above bg-card,
// below all content.
const PodiumBackdrop = memo(function PodiumBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl"
    >
      <div
        className="animate-halo-pulse absolute top-[60%] left-1/2 size-[clamp(240px,48vh,560px)] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--gold) 15%, transparent) 0%, transparent 68%)",
        }}
      />
      <div
        className="animate-sunburst absolute top-[60%] left-1/2 size-[clamp(300px,62vh,700px)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06]"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, var(--gold) 0deg 4deg, transparent 4deg 22deg)",
          maskImage:
            "radial-gradient(circle, black 0%, black 45%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(circle, black 0%, black 45%, transparent 72%)",
        }}
      />
      <div className="animate-logo-breathe absolute top-[58%] left-1/2 aspect-[2011/1220] w-[clamp(320px,55vw,860px)] -translate-x-1/2 -translate-y-1/2 -rotate-6">
        <Image
          src="/mehfile-meem-logo-gold.png"
          alt=""
          fill
          sizes="860px"
          className="object-contain opacity-[0.06]"
        />
      </div>
    </div>
  );
});

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
    <div className="card-elevated relative isolate flex flex-col gap-6 rounded-xl border border-border bg-card p-6 md:h-full md:min-h-0 md:overflow-y-auto">
      <PodiumBackdrop />
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
                      {/* modern avatar stand: medal-gradient frame with a
                          floating rank chip pinned to the corner */}
                      <div className="relative">
                        <div
                          className={cn("rounded-2xl p-0.75", style?.frame)}
                        >
                          <div
                            className={cn(
                              "relative overflow-hidden rounded-xl bg-muted",
                              style?.photoSize,
                            )}
                          >
                            <PlaceAvatar
                              photoUrl={place.photoUrl}
                              isGroup={hero.program_type === "group"}
                              category={place.category}
                              imageSizes="160px"
                            />
                          </div>
                        </div>
                        <span
                          className={cn(
                            "absolute -right-2 -bottom-2 flex size-7 items-center justify-center rounded-full font-heading text-sm font-black shadow-md ring-2 ring-card",
                            style?.chip,
                          )}
                        >
                          {column.rank}
                        </span>
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

                {/* poster-style podium stand: a lighter perspective "top
                    face" lip over a metallic gradient front face with a
                    glossy sheen, an inset hairline, and a giant ghost
                    numeral anchored to the base */}
                <div className="w-full">
                  <div
                    aria-hidden
                    className={cn(
                      "h-2.5 w-full [clip-path:polygon(4%_0,96%_0,100%_100%,0_100%)]",
                      style?.lip,
                    )}
                  />
                  <div
                    className={cn(
                      "relative flex w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-b-md font-heading",
                      style?.block,
                      style?.blockHeight,
                    )}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-white/35 to-transparent"
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-b-md ring-1 ring-white/25 ring-inset"
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute -bottom-2 -left-1 font-black leading-none tracking-tighter opacity-15 select-none",
                        isChampion ? "text-8xl" : "text-7xl",
                      )}
                    >
                      {column.rank}
                    </span>
                    <span
                      className={cn(
                        "relative font-bold",
                        isChampion ? "text-4xl" : "text-3xl",
                      )}
                    >
                      {column.rank}
                    </span>
                    <span className="relative text-xs font-semibold tracking-widest uppercase opacity-80">
                      {tied
                        ? `${rankLabel(column.rank) ?? `Rank ${column.rank}`} · ${t("tie")}`
                        : rankLabel(column.rank)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
