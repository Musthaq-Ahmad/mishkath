"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { groupPlacements } from "@/lib/leaderboard";
import type { EventPlacementRow, ProgramPlacements } from "@/lib/types";
import { DIVISION_LABELS, MEDAL_LABEL, RANK_LABEL } from "./labels";
import { cn } from "@/lib/utils";
import { groupTextColor } from "@/lib/group-color";

const DOME_CLIP = "ellipse(62% 58% at 50% 42%)";

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
    chip: string;
    chipSize: string;
    border: string;
    photoHeight: string;
    nameSize: string;
    plaque: string;
    lift: string;
    medalColor: string;
    label: string;
  }
> = {
  1: {
    chip: "bg-gold text-[#251a00]",
    chipSize: "size-10 text-lg sm:size-12 sm:text-xl",
    border: "border-2 border-gold shadow-[0_0_36px_-8px_var(--gold)]",
    photoHeight: "clamp(200px,28vh,340px)",
    nameSize: "text-[clamp(1.5rem,3.6vh,2.6rem)]",
    plaque: "from-gold/20",
    lift: "sm:-translate-y-6",
    medalColor: "text-gold",
    label: "FIRST PRIZE",
  },
  2: {
    chip: "bg-silver text-[#1b1c19]",
    chipSize: "size-9 text-base sm:size-10 sm:text-lg",
    border: "border-2 border-silver/50",
    photoHeight: "clamp(168px,23vh,280px)",
    nameSize: "text-[clamp(1.25rem,2.9vh,1.95rem)]",
    plaque: "from-white/15",
    lift: "",
    medalColor: "text-silver",
    label: "SECOND PRIZE",
  },
  3: {
    chip: "bg-bronze text-[#251a00]",
    chipSize: "size-9 text-base sm:size-10 sm:text-lg",
    border: "border-2 border-bronze/50",
    photoHeight: "clamp(168px,23vh,280px)",
    nameSize: "text-[clamp(1.25rem,2.9vh,1.95rem)]",
    plaque: "from-bronze/20",
    lift: "",
    medalColor: "text-bronze",
    label: "THIRD PRIZE",
  },
};

const CONFETTI_COLORS = ["bg-gold", "bg-fuchsia-400", "bg-sky-400", "bg-violet-400", "bg-emerald-400"];
const CONFETTI_SHAPES = ["rounded-[2px] rotate-45", "rounded-full", "rounded-[1px]"];
const CONFETTI = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 53) % 100}%`,
  delay: `${(i % 10) * 0.4}s`,
  duration: `${4 + (i % 5) * 0.6}s`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  shape: CONFETTI_SHAPES[i % CONFETTI_SHAPES.length],
  size: i % 3 === 0 ? "size-2" : i % 3 === 1 ? "size-1.5" : "size-2.5 w-1",
}));

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {CONFETTI.map((piece, i) => (
        <span
          key={i}
          className={cn("animate-confetti-fall absolute top-0", piece.color, piece.shape, piece.size)}
          style={{ left: piece.left, animationDelay: piece.delay, animationDuration: piece.duration }}
        />
      ))}
    </div>
  );
}

function LaurelBranch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 60" className={className} aria-hidden fill="currentColor">
      <path d="M20 58 C 20 40 20 20 20 2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {[8, 18, 28, 38, 48].map((y) => (
        <ellipse key={y} cx={y % 16 === 8 ? 12 : 28} cy={y} rx="7" ry="3.5" transform={`rotate(${y % 16 === 8 ? -35 : 35} ${y % 16 === 8 ? 12 : 28} ${y})`} />
      ))}
    </svg>
  );
}

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
    <div className="relative flex flex-col items-center justify-center gap-8 md:h-full md:min-h-0 md:overflow-hidden">
      <Confetti />
      <div className="relative flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Just Published
          </span>
        </div>
        <Link
          href={`/leaderboard/program/${hero.program_id}`}
          className="font-heading text-[clamp(2.1rem,5.5vh,3.9rem)] font-extrabold tracking-tight text-foreground transition-colors hover:text-primary"
        >
          {hero.program_name}
        </Link>
        <div className="flex items-center gap-3 text-lg font-medium text-muted-foreground">
          <span aria-hidden className="h-px w-8 bg-border sm:w-12" />
          <span className="flex items-center gap-1.5 text-gold">
            <span className="material-symbols-outlined text-[18px]">emoji_events</span>
          </span>
          <span>{DIVISION_LABELS[hero.category]}</span>
          <span aria-hidden className="h-px w-8 bg-border sm:w-12" />
        </div>
      </div>

      <div
        className={cn(
          "grid w-full max-w-5xl grid-cols-1 items-end gap-8 sm:gap-10",
          podiumGridCols,
        )}
      >
        {podiumColumns.map((column) => {
          const style = PODIUM_STYLE[column.rank];
          const isChampion = column.rank === 1;
          return (
            <div
              key={column.rank}
              className={cn("flex flex-col items-center gap-4", MOBILE_ORDER[column.rank])}
            >
              {column.items.map((place) => (
                <div
                  key={place.id}
                  style={{ animationDelay: `${(3 - column.rank) * 90}ms` }}
                  className={cn(
                    "card-elevated animate-fade-in-up relative flex w-full flex-col items-center overflow-hidden rounded-2xl bg-card",
                    style?.border,
                    style?.lift,
                  )}
                >
                  {isChampion && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute top-0 left-1/2 z-0 size-56 -translate-x-1/2 -translate-y-1/3 rounded-full bg-gold/25 blur-3xl"
                    />
                  )}

                  <div className="relative z-10 flex w-full flex-col items-center">
                    <div
                      className="relative w-full overflow-hidden bg-muted"
                      style={{ height: style?.photoHeight, clipPath: DOME_CLIP }}
                    >
                      <PlaceAvatar
                        photoUrl={place.photoUrl}
                        isGroup={hero.program_type === "group"}
                        iconSize={isChampion ? "text-7xl" : "text-6xl"}
                        imageSizes={isChampion ? "340px" : "280px"}
                      />
                    </div>

                    {isChampion && (
                      <span
                        aria-hidden
                        className="absolute left-1/2 z-20 -translate-x-1/2 text-gold drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
                        style={{ top: `calc(${style?.photoHeight} - 30px)` }}
                      >
                        <span className="material-symbols-outlined text-[26px]">emoji_events</span>
                      </span>
                    )}

                    <span
                      className={cn(
                        "absolute left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-heading font-extrabold ring-4 ring-card",
                        style?.chip,
                        style?.chipSize,
                      )}
                      style={{ top: style?.photoHeight }}
                    >
                      {column.rank}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "relative z-10 flex w-full flex-col items-center gap-1.5 bg-linear-to-b to-card px-5 pt-8 pb-6 text-center",
                      style?.plaque,
                    )}
                  >
                    <p className={cn("truncate font-heading font-extrabold text-foreground", style?.nameSize)}>
                      {place.name}
                    </p>
                    {hero.program_type === "individual" && groupNames[place.groupId] && (
                      <p className={cn("truncate text-base font-medium sm:text-lg", groupTextColor(place.groupId))}>
                        {groupNames[place.groupId]}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      {isChampion && <LaurelBranch className={cn("size-5 scale-x-[-1]", style?.medalColor)} />}
                      <p className="flex items-center gap-1.5 text-sm font-semibold tracking-widest text-muted-foreground uppercase sm:text-base">
                        <span className={cn("material-symbols-outlined text-[16px]", style?.medalColor)}>
                          military_tech
                        </span>
                        {RANK_LABEL[column.rank] ?? style?.label}
                        {MEDAL_LABEL[column.rank] ? ` · ${MEDAL_LABEL[column.rank]}` : ""}
                      </p>
                      {isChampion && <LaurelBranch className={cn("size-5", style?.medalColor)} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
