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

// Below md the podium stacks in a single column — show the champion first
// (natural reading order), then reorder back to silver/gold/bronze
// left-to-right at md+, matching the md: breakpoint the champion's
// wider/lifted treatment also switches on below (keeping both changes in
// sync avoids an in-between width where cards sit in a row but without
// the lift, or vice versa).
const MOBILE_ORDER: Record<number, string> = {
  1: "order-1 md:order-2",
  2: "order-2 md:order-1",
  3: "order-3",
};

// Quiet, editorial podium treatment: each rank is its own "trophy case"
// card — a soft gradient-bordered frame (the `shell`, via padding so the
// gradient shows through as an even border ring) wrapping a fixed-dark
// `core` card (bg-sidebar, same always-dark panel used by
// ChampionshipSidebar regardless of page theme) with a giant ghost-outline
// numeral as the dominant graphic instead of a colored badge. Color is
// used sparingly — gold for the champion's frame/glow/numeral, a faint
// white wash for 2nd/3rd.
const PODIUM_STYLE: Record<
  number,
  {
    shell: string;
    glow: string;
    numeral: string;
    divider: string;
    ring: string;
    photoSize: string;
    nameSize: string;
  }
> = {
  1: {
    shell: "bg-linear-to-br from-gold/80 via-gold/25 to-transparent shadow-[0_30px_70px_-38px_var(--gold)]",
    glow: "radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--gold) 25%, transparent), transparent 55%)",
    numeral: "text-[clamp(3rem,15cqh,6.5rem)] text-gold",
    divider: "w-24 bg-gold/60",
    ring: "ring-2 ring-gold/50",
    photoSize: "size-[clamp(56px,14cqh,120px)]",
    nameSize: "text-[clamp(1.1rem,3.2cqh,1.875rem)]",
  },
  2: {
    shell: "bg-linear-to-br from-white/20 to-transparent shadow-[0_20px_50px_-32px_rgba(0,0,0,0.6)]",
    glow: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.07), transparent 45%)",
    numeral: "text-[clamp(2.25rem,11cqh,4.5rem)] text-white/15",
    divider: "w-14 bg-white/15",
    ring: "ring-1 ring-white/20",
    photoSize: "size-[clamp(48px,11cqh,96px)]",
    nameSize: "text-[clamp(0.9rem,2.6cqh,1.4rem)]",
  },
  3: {
    shell: "bg-linear-to-br from-white/20 to-transparent shadow-[0_20px_50px_-32px_rgba(0,0,0,0.6)]",
    glow: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.07), transparent 45%)",
    numeral: "text-[clamp(2.25rem,11cqh,4.5rem)] text-white/15",
    divider: "w-14 bg-white/15",
    ring: "ring-1 ring-white/20",
    photoSize: "size-[clamp(48px,11cqh,96px)]",
    nameSize: "text-[clamp(0.9rem,2.6cqh,1.4rem)]",
  },
};

// Small deterministic PRNG (not Math.random()) so the "random" scatter
// below renders identically on the server and on client hydration — using
// Math.random() directly would reseed differently in each environment and
// throw a hydration mismatch.
function createSeededRandom(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

// Colors already established elsewhere in the app (theme accent tokens +
// the same categorical palette used for group rings/badges), reused here
// rather than invented, so the scatter reads as "part of this app's
// theme" instead of random new colors.
const BACKDROP_LOGO_COLORS = [
  "var(--gold)",
  "var(--primary)",
  "var(--success)",
  "#f472b6",
  "#67e8f9",
  "#a78bfa",
  "#34d399",
  "#fb923c",
  "#60a5fa",
];

type BackdropLogoMark = {
  left: number;
  top: number;
  size: number;
  rotate: number;
  opacity: number;
  color: string;
};

const BACKDROP_LOGOS: BackdropLogoMark[] = (() => {
  const rand = createSeededRandom(42);
  const cols = 6;
  const rows = 4;
  const marks: BackdropLogoMark[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      marks.push({
        left: ((col + 0.5) / cols) * 100 + (rand() - 0.5) * 10,
        top: ((row + 0.5) / rows) * 100 + (rand() - 0.5) * 10,
        size: 48 + rand() * 44,
        rotate: (rand() - 0.5) * 30,
        opacity: 0.14 + rand() * 0.18,
        color: BACKDROP_LOGO_COLORS[Math.floor(rand() * BACKDROP_LOGO_COLORS.length)],
      });
    }
  }
  return marks;
})();

// Podium backdrop: a soft breathing gold wash behind a scattered field of
// small logo marks, each recolored via a CSS mask (the logo PNG's alpha
// shape masking a solid-color div) so every mark can take a different
// theme color without needing separate colored image assets. Purely
// decorative (aria-hidden, pointer-events-none), gated behind
// prefers-reduced-motion for the glow animation. Memoized with no props so
// the feed's realtime refetches and 15s rotation re-renders never
// re-render it. Sits at -z-10 inside the card's isolated stacking context:
// above bg-card, below all content.
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
      {BACKDROP_LOGOS.map((mark, index) => (
        <span
          key={index}
          className="absolute aspect-[2011/1220]"
          style={{
            left: `${mark.left}%`,
            top: `${mark.top}%`,
            width: `${mark.size}px`,
            opacity: mark.opacity,
            backgroundColor: mark.color,
            transform: `translate(-50%, -50%) rotate(${mark.rotate}deg)`,
            maskImage: "url(/mehfile-meem-logo-white.png)",
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskImage: "url(/mehfile-meem-logo-white.png)",
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
          }}
        />
      ))}
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
    <div className="card-elevated relative isolate flex flex-col gap-[clamp(0.5rem,2vh,1.5rem)] rounded-xl border border-border bg-card p-[clamp(1rem,2.5vh,1.5rem)] md:h-full md:min-h-0 md:overflow-y-auto md:@container-size">
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
          fade/slide-in animation as a lightweight transition. pt- reserves
          clearance for the floating status badge above (which is
          absolutely positioned and out of flow), so on shorter viewports
          the centered title never renders underneath it. */}
      <div
        key={hero.program_id}
        className="animate-fade-in-up flex flex-1 flex-col justify-center gap-[clamp(1rem,2.5cqh,1.5rem)] pt-[clamp(2.75rem,7cqh,3.5rem)]"
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

        <div className="flex flex-wrap items-start justify-center gap-6 md:gap-10">
          {podiumColumns.map((column) => {
            const style = PODIUM_STYLE[column.rank];
            const isChampion = column.rank === 1;
            const tied = column.items.length > 1;
            return (
              <div
                key={column.rank}
                className={cn(
                  // Full-width basis below md forces each card onto its own
                  // line no matter the exact pixel arithmetic — a fixed
                  // 180px basis let two cards fit on the same cramped row
                  // together on narrow phones instead of stacking cleanly.
                  "flex basis-full flex-col md:basis-[180px]",
                  isChampion
                    ? "w-full max-w-[420px] flex-[1.6] md:-translate-y-[clamp(0px,2.5cqh,1.25rem)]"
                    : "w-full max-w-[240px] flex-1",
                  MOBILE_ORDER[column.rank],
                )}
              >
                {/* "trophy case" card: an outer gradient-bordered shell (the
                    gradient shows through as an even ring via the padding)
                    wrapping a fixed-dark inner core — same always-dark
                    panel treatment as ChampionshipSidebar, independent of
                    the page's light/dark theme. */}
                <div className={cn("w-full rounded-[2rem] p-1.5", style?.shell)}>
                  <div
                    className={cn(
                      "relative flex w-full flex-col items-center overflow-hidden rounded-[1.625rem] bg-sidebar px-4 text-center",
                      isChampion
                        ? "min-h-[180px] gap-[clamp(0.375rem,1.2cqh,0.75rem)] py-7 md:min-h-[clamp(200px,34cqh,360px)]"
                        : "min-h-[140px] gap-[clamp(0.3rem,1cqh,0.6rem)] py-5 md:min-h-[clamp(160px,28cqh,280px)]",
                    )}
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{ background: style?.glow }}
                    />

                    <div className="relative z-10 flex w-full flex-col items-center gap-[clamp(0.25rem,1cqh,0.5rem)]">
                      {isChampion && (
                        <span aria-hidden className="text-gold">
                          <span className="material-symbols-outlined text-[clamp(16px,3cqh,24px)]">
                            military_tech
                          </span>
                        </span>
                      )}

                      {/* micro-label caption + giant ghost numeral + hairline
                          divider — the numeral (not a colored badge) is the
                          dominant graphic per rank, matching the reference's
                          quiet, editorial treatment. */}
                      <p className="text-[clamp(0.6rem,1.3cqh,0.7rem)] font-bold tracking-[0.25em] text-gold uppercase">
                        {rankLabel(column.rank)}
                      </p>
                      <p
                        aria-hidden
                        className={cn(
                          "font-heading leading-none font-black tabular-nums select-none",
                          style?.numeral,
                        )}
                      >
                        {column.rank}
                      </p>
                      <span aria-hidden className={cn("h-px", style?.divider)} />

                      <div
                        className={cn(
                          "flex w-full items-start justify-center",
                          tied
                            ? "flex-row flex-wrap gap-x-4 gap-y-3"
                            : "flex-col items-center gap-2",
                        )}
                      >
                        {column.items.map((place) => (
                          <div key={place.id} className="flex flex-col items-center gap-2">
                            <div
                              className={cn(
                                "relative overflow-hidden rounded-full bg-white/10",
                                style?.photoSize,
                                style?.ring,
                              )}
                            >
                              <PlaceAvatar
                                photoUrl={place.photoUrl}
                                isGroup={hero.program_type === "group"}
                                category={place.category}
                                imageSizes="160px"
                              />
                            </div>
                            <div className="flex max-w-48 flex-col items-center gap-0.5 text-center">
                              <p
                                className={cn(
                                  "text-balance break-words font-heading font-bold text-sidebar-foreground",
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

                      {tied && (
                        <span className="text-[10px] font-semibold tracking-widest text-sidebar-foreground/60 uppercase">
                          {t("tie")}
                        </span>
                      )}
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
