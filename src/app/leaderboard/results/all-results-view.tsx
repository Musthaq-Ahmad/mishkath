"use client";

import Image from "next/image";
import Link from "next/link";
import { groupRingColor } from "@/lib/group-color";
import { cn } from "@/lib/utils";
import type { ProgramPlacements } from "@/lib/types";
import { PlaceholderAvatar } from "@/components/gender-avatar";
import { LanguageToggle } from "../language-toggle";
import { useLanguage } from "../i18n";

const RANK_BADGE: Record<number, string> = {
  1: "bg-gold text-[#251a00]",
  2: "bg-silver text-[#1b1c19]",
  3: "bg-bronze text-[#251a00]",
};

export function AllResultsView({
  placements,
  groupNames,
}: {
  placements: ProgramPlacements[];
  groupNames: Record<string, string>;
}) {
  const { t, divisionLabel, rankLabel } = useLanguage();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <Link
          href="/leaderboard"
          className="inline-flex w-fit items-center gap-1 text-base font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-primary"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          {t("backToLive")}
        </Link>
        <LanguageToggle />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          {t("allResults")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {placements.length} {t("programsPublishedSoFar")}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {placements.map((program, index) => {
          const places = [...program.places].sort((a, b) => a.rank - b.rank);
          return (
            <div
              key={program.program_id}
              style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
              className="card-elevated animate-fade-in-up flex flex-col gap-4 rounded-lg border border-border bg-card p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">
                  {program.program_name}
                </h2>
                <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
                  {divisionLabel(program.category)}
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
                {places.map((place) => (
                  <div key={place.id} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold tabular-nums",
                        RANK_BADGE[place.rank] ?? "bg-muted text-muted-foreground",
                      )}
                    >
                      {place.rank}
                    </span>
                    <span
                      className={cn(
                        "relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-2",
                        groupRingColor(place.groupId),
                      )}
                    >
                      {place.photoUrl ? (
                        <Image src={place.photoUrl} alt="" fill sizes="36px" className="object-cover" />
                      ) : (
                        <PlaceholderAvatar
                          category={place.category}
                          isGroup={program.program_type === "group"}
                          className="size-full p-1.5"
                        />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-foreground">{place.name}</p>
                      <p className="truncate text-xs text-muted-foreground uppercase tracking-wide">
                        {rankLabel(place.rank)}
                        {program.program_type === "individual" && groupNames[place.groupId]
                          ? ` · ${groupNames[place.groupId]}`
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {!placements.length && (
          <div className="card-elevated rounded-lg border border-border bg-card p-16 text-center text-muted-foreground">
            {t("noResultsPublished")}
          </div>
        )}
      </div>
    </div>
  );
}
