"use client";

import Image from "next/image";
import Link from "next/link";
import { groupTextColor } from "@/lib/group-color";
import { cn } from "@/lib/utils";
import type { Division, ProgramPlacements } from "@/lib/types";
import { divisionLabel } from "@/lib/division-label";
import { PlaceholderAvatar } from "@/components/gender-avatar";
import { useLanguage } from "../i18n";

// Same restrained accent used on the podium's PODIUM_STYLE (gold ring for
// 1st, plain border ring otherwise) — copied rather than imported so this
// page's styling can't accidentally regress the podium file. The rank
// badge itself stays neutral/glassy (no solid color fill), matching the
// "final table" rows in the reference design.
const RANK_RING: Record<number, string> = {
  1: "ring-2 ring-gold/50",
  2: "ring-1 ring-border",
  3: "ring-1 ring-border",
};

export function AllResultsView({
  placements,
  groupNames,
  divisions,
}: {
  placements: ProgramPlacements[];
  groupNames: Record<string, string>;
  divisions: Division[];
}) {
  const { t, lang, rankLabel } = useLanguage();
  const divisionById = new Map(divisions.map((division) => [division.id, division]));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <Link
        href="/leaderboard"
        className="inline-flex w-fit items-center gap-1 text-base font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-primary"
      >
        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        {t("backToLive")}
      </Link>

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
              className="card-elevated animate-fade-in-up flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">
                  {program.program_name}
                </h2>
                <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-bold tracking-widest text-gold uppercase">
                  {divisionLabel(divisionById.get(program.category), lang)}
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
                {places.map((place) => {
                  const ring = RANK_RING[place.rank];
                  return (
                    <div key={place.id} className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <span
                          className={cn(
                            "relative flex size-9 items-center justify-center overflow-hidden rounded-full bg-muted",
                            ring,
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
                        {ring && (
                          <span className="absolute -right-1 -bottom-1 flex size-[18px] items-center justify-center rounded-full bg-muted text-[10px] font-black text-muted-foreground ring-2 ring-card">
                            {place.rank}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground">{place.name}</p>
                        <p className="truncate text-xs text-muted-foreground uppercase tracking-wide">
                          {rankLabel(place.rank)}
                          {program.program_type === "individual" && groupNames[place.groupId] ? (
                            <>
                              {" · "}
                              <span className={groupTextColor(place.groupId)}>
                                {groupNames[place.groupId]}
                              </span>
                            </>
                          ) : (
                            ""
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {!placements.length && (
          <div className="card-elevated rounded-xl border border-border bg-card p-16 text-center text-muted-foreground">
            {t("noResultsPublished")}
          </div>
        )}
      </div>
    </div>
  );
}
