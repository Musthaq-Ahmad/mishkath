"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { groupPlacements } from "@/lib/leaderboard";
import type { EventPlacementRow, ProgramPlacements } from "@/lib/types";
import { ML_DIVISION_LABELS, ML_MEDAL_LABEL, ML_RANK_LABEL } from "./malayalam";
import { cn } from "@/lib/utils";
import { groupRingColor } from "@/lib/group-color";

const PODIUM_STYLE: Record<
  number,
  {
    badge: string;
    border: string;
    archBg: string;
    ribbon: string;
    ribbonText: string;
    archHeight: string;
    archWidth: string;
    avatarSize: string;
    label: string;
  }
> = {
  1: {
    badge: "bg-gold text-[#251a00]",
    border: "border-gold/70",
    archBg: "bg-linear-to-b from-gold/35 via-gold/10 to-transparent",
    ribbon: "bg-gold",
    ribbonText: "text-[#251a00]",
    archHeight: "h-[clamp(110px,20vh,240px)]",
    archWidth: "w-[clamp(120px,17vw,220px)]",
    avatarSize: "size-[clamp(72px,12vh,144px)]",
    label: "FIRST PRIZE",
  },
  2: {
    badge: "bg-silver text-[#1b1c19]",
    border: "border-white/50",
    archBg: "bg-linear-to-b from-white/25 via-white/8 to-transparent",
    ribbon: "bg-silver",
    ribbonText: "text-[#1b1c19]",
    archHeight: "h-[clamp(86px,15vh,188px)]",
    archWidth: "w-[clamp(100px,14vw,180px)]",
    avatarSize: "size-[clamp(56px,9vh,108px)]",
    label: "SECOND PRIZE",
  },
  3: {
    badge: "bg-bronze text-[#251a00]",
    border: "border-bronze/60",
    archBg: "bg-linear-to-b from-bronze/30 via-bronze/10 to-transparent",
    ribbon: "bg-bronze",
    ribbonText: "text-[#251a00]",
    archHeight: "h-[clamp(72px,13vh,156px)]",
    archWidth: "w-[clamp(92px,12.5vw,156px)]",
    avatarSize: "size-[clamp(48px,7.5vh,88px)]",
    label: "THIRD PRIZE",
  },
};

const CONFETTI_COLORS = ["bg-gold/70", "bg-silver/60", "bg-white/60"];
const CONFETTI = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 61) % 100}%`,
  delay: `${(i % 8) * 0.5}s`,
  duration: `${3.4 + (i % 5) * 0.5}s`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: i % 3 === 0 ? "size-2" : "size-1.5",
}));

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {CONFETTI.map((piece, i) => (
        <span
          key={i}
          className={cn("animate-confetti-fall absolute top-0 rounded-sm", piece.color, piece.size)}
          style={{ left: piece.left, animationDelay: piece.delay, animationDuration: piece.duration }}
        />
      ))}
    </div>
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
    <span className={cn("material-symbols-outlined text-primary-foreground/70", iconSize)}>
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
      <div className="flex flex-1 items-center justify-center rounded-2xl bg-white/5 p-16 text-center ring-1 ring-white/10">
        <p className="font-heading text-2xl text-primary-foreground/80">
          ഫലങ്ങൾ പ്രസിദ്ധീകരിച്ചാൽ ഇവിടെ കാണാം.
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
    <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden">
      <div className="relative w-full min-h-0 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-10 mx-auto h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        <Confetti />

        <div className="relative mb-1 flex items-center justify-center gap-3">
          <span className="size-3 animate-pulse rounded-full bg-gold" />
          <span className="text-[clamp(0.8rem,1.6vh,1.05rem)] font-bold tracking-[0.3em] text-gold uppercase">
            ഇപ്പോൾ പ്രസിദ്ധീകരിച്ചു
          </span>
        </div>
        <Link
          href={`/leaderboard/program/${hero.program_id}`}
          className="relative mb-2 block text-center font-heading font-black tracking-tight text-[clamp(2.1rem,5.8vh,4.2rem)] text-transparent bg-clip-text bg-linear-to-b from-white to-white/70 hover:from-gold hover:to-gold"
        >
          {hero.program_name}
          <span className="mt-1 block text-[clamp(1.1rem,2.4vh,1.6rem)] font-bold text-primary-foreground/85">
            {ML_DIVISION_LABELS[hero.category]}
          </span>
        </Link>

        <div className={cn("relative mx-auto grid max-w-4xl grid-cols-1 items-end gap-4 sm:gap-6", podiumGridCols)}>
          {podiumColumns.map((column) => {
            const style = PODIUM_STYLE[column.rank];
            const isChampion = column.rank === 1;
            const riseDelay = (3 - column.rank) * 220;
            return (
              <div key={column.rank} className="flex flex-col items-center">
                {column.items.map((place) => (
                  <div key={place.id} className="flex flex-col items-center">
                    {/* rank badge, sits atop the arch's peak */}
                    <span
                      style={{ animationDelay: `${riseDelay + 200}ms` }}
                      className={cn(
                        "animate-avatar-pop relative z-10 -mb-5 flex size-[clamp(32px,5vh,52px)] items-center justify-center rounded-full ring-4 ring-primary",
                        style?.badge,
                      )}
                    >
                      <span className="font-heading text-[clamp(1rem,2.4vh,1.5rem)] font-black">
                        {column.rank}
                      </span>
                    </span>

                    {/* mihrab niche */}
                    <div
                      style={{ animationDelay: `${riseDelay}ms` }}
                      className={cn(
                        "animate-podium-rise relative flex items-start justify-center overflow-hidden rounded-t-full border-2",
                        style?.archWidth,
                        style?.archHeight,
                        style?.archBg,
                        style?.border,
                      )}
                    >
                      {isChampion && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute top-1/3 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/40 blur-2xl"
                        />
                      )}
                      <span
                        style={{ animationDelay: `${riseDelay + 250}ms` }}
                        className={cn(
                          "animate-avatar-pop relative mt-3 flex shrink-0 items-center justify-center rounded-full bg-white/10 ring-4",
                          style?.avatarSize,
                          isChampion && "animate-pulse-glow",
                          groupRingColor(place.groupId),
                        )}
                      >
                        <PlaceAvatar
                          photoUrl={place.photoUrl}
                          isGroup={hero.program_type === "group"}
                          iconSize={isChampion ? "text-[clamp(32px,5.5vh,56px)]" : "text-[clamp(22px,3.8vh,36px)]"}
                          imageSizes={isChampion ? "144px" : "108px"}
                        />
                      </span>
                    </div>

                    {/* name plaque */}
                    <div
                      style={{ animationDelay: `${riseDelay + 320}ms` }}
                      className={cn(
                        "animate-fade-in-up -mt-2 w-full min-w-0 rounded-lg border bg-primary/90 px-2.5 py-1.5 text-center",
                        style?.border,
                      )}
                    >
                      <p
                        className={cn(
                          "truncate font-heading font-black",
                          isChampion
                            ? "text-[clamp(1.3rem,3vh,1.9rem)]"
                            : "text-[clamp(1.05rem,2.3vh,1.5rem)]",
                        )}
                      >
                        {place.name}
                      </p>
                      {hero.program_type === "individual" && groupNames[place.groupId] && (
                        <p className="truncate text-[clamp(0.7rem,1.4vh,0.9rem)] font-semibold text-primary-foreground/60">
                          {groupNames[place.groupId]}
                        </p>
                      )}
                    </div>

                    {/* prize ribbon */}
                    <div
                      style={{ animationDelay: `${riseDelay + 380}ms` }}
                      className={cn(
                        "animate-fade-in-up mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-center text-[clamp(0.65rem,1.4vh,0.9rem)] font-black tracking-widest uppercase",
                        style?.ribbon,
                        style?.ribbonText,
                      )}
                    >
                      <span aria-hidden>✥</span>
                      <span className="truncate">
                        {ML_RANK_LABEL[column.rank] ?? style?.label}
                        {ML_MEDAL_LABEL[column.rank] ? ` • ${ML_MEDAL_LABEL[column.rank]}` : ""}
                      </span>
                      <span aria-hidden>✥</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
