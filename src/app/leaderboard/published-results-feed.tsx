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
    blockHeight: "h-[clamp(44px,13cqh,130px)]",
    lip: "bg-linear-to-b from-[#f9ecc4] to-[#e3bd5e]",
    frame:
      "bg-linear-to-br from-[#f2d287] via-gold to-[#b98a2e] shadow-lg shadow-gold/40",
    chip: "bg-gold text-gold-foreground",
    photoSize: "size-[clamp(56px,15cqh,150px)]",
    nameSize: "text-[clamp(1rem,3cqh,1.75rem)]",
    medalColor: "text-gold",
    label: "1st Prize",
  },
  2: {
    block:
      "bg-linear-to-b from-[#eeece8] via-silver to-[#96948f] text-[#1b1c19] shadow-md shadow-black/25",
    blockHeight: "h-[clamp(36px,10.5cqh,100px)]",
    lip: "bg-linear-to-b from-[#f8f7f5] to-[#d4d2ce]",
    frame:
      "bg-linear-to-br from-[#e4e2de] via-silver to-[#a9a7a3] shadow-md shadow-black/20",
    chip: "bg-silver text-[#1b1c19]",
    photoSize: "size-[clamp(48px,13cqh,120px)]",
    nameSize: "text-[clamp(0.9rem,2.6cqh,1.4rem)]",
    medalColor: "text-silver",
    label: "2nd Prize",
  },
  3: {
    block:
      "bg-linear-to-b from-[#e8cda7] via-bronze to-[#8f6c3f] text-[#251a00] shadow-md shadow-black/25",
    blockHeight: "h-[clamp(28px,8.5cqh,84px)]",
    lip: "bg-linear-to-b from-[#f3e3c9] to-[#d3af7d]",
    frame:
      "bg-linear-to-br from-[#dfc19a] via-bronze to-[#a37f4f] shadow-md shadow-black/20",
    chip: "bg-bronze text-[#251a00]",
    photoSize: "size-[clamp(48px,13cqh,120px)]",
    nameSize: "text-[clamp(0.9rem,2.6cqh,1.4rem)]",
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
    // The card is a size container at md+ (it has a definite h-full there),
    // so the podium sizes below use cqh — a percentage of the card itself —
    // and always fit regardless of how much height the header/footer take.
    // Below md the card grows with content and cqh falls back to viewport
    // units, which is fine because the page scrolls there.
    <div className="card-elevated relative isolate flex flex-col gap-[clamp(0.5rem,2vh,1.5rem)] rounded-xl border border-border bg-card p-[clamp(1rem,2.5vh,1.5rem)] md:h-full md:min-h-0 md:overflow-hidden md:@container-size">
      <PodiumBackdrop />
      {/* floats over the card corner instead of taking a flex row, so its
          height never competes with the podium's budget */}
      <div className="absolute inset-x-[clamp(1rem,2.5vh,1.5rem)] top-[clamp(1rem,2.5vh,1.5rem)] z-10 flex items-center justify-between gap-3">
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
        className="animate-fade-in-up flex flex-1 flex-col justify-center gap-[clamp(0.5rem,2cqh,1.25rem)]"
      >
        {/* hero title: read from across the room — the program name is the
            headline of this screen, centered and oversized like an event
            poster, with the division as a gold ticket badge */}
        <div className="flex flex-col items-center gap-[clamp(0.25rem,1cqh,0.5rem)] text-center">
          <p className="bg-linear-to-b from-foreground to-foreground/60 bg-clip-text font-heading text-[clamp(1.25rem,5cqh,3rem)] leading-tight font-black tracking-tight text-balance text-transparent">
            {hero.program_name}
          </p>
          <p className="rounded-full border border-gold/30 bg-gold/10 px-4 py-0.5 text-[clamp(0.7rem,1.7cqh,0.875rem)] font-bold tracking-[0.25em] text-gold uppercase">
            {divisionLabel(hero.category)}
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-center gap-6 sm:gap-10">
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
                    : "w-full max-w-[240px] gap-[clamp(0.375rem,1.2cqh,0.75rem)]",
                  MOBILE_ORDER[column.rank],
                )}
              >
                {isChampion && (
                  <span aria-hidden className="text-gold">
                    <span className="material-symbols-outlined text-[clamp(18px,3.5cqh,28px)]">
                      military_tech
                    </span>
                  </span>
                )}

                <div
                  className={cn(
                    "flex w-full items-end",
                    tied
                      ? "flex-row flex-wrap justify-center gap-x-3 gap-y-2"
                      : "flex-col items-center gap-[clamp(0.5rem,1.5cqh,1rem)]",
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
                      <div className="flex max-w-48 flex-col items-center gap-0.5 text-center">
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
                                "text-[clamp(0.75rem,1.8cqh,0.875rem)] font-medium wrap-break-word text-balance",
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

                {/* poster-style 3D podium stand: the wrapper adds
                    perspective and tilts the whole box slightly forward;
                    the "top face" is a real plane rotated back in 3D space
                    (a sibling of the front face — it can't live inside it,
                    because overflow-hidden would flatten the 3D transform).
                    The front face keeps the metallic gradient, glossy
                    sheen, inset hairline, and base-anchored ghost numeral. */}
                <div className="w-full [perspective:900px]">
                  <div className="relative w-full [transform:rotateX(9deg)] [transform-style:preserve-3d]">
                    <div
                      aria-hidden
                      className={cn(
                        "absolute inset-x-0 -top-[clamp(12px,2.5cqh,24px)] h-[clamp(12px,2.5cqh,24px)] origin-bottom transform-[rotateX(62deg)]",
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
