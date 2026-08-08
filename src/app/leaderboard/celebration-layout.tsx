"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { groupPlacements } from "@/lib/leaderboard";
import type { EventPlacementRow, ProgramPlacements } from "@/lib/types";
import { cn } from "@/lib/utils";

const CELEBRATION_MS = 15_000;

async function fetchLatestHeroId(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("public_event_top3")
    .select("*")
    .order("published_at", { ascending: false })
    .order("rank", { ascending: true })
    .returns<EventPlacementRow[]>();
  const placements: ProgramPlacements[] = groupPlacements(data ?? []);
  return placements[0]?.program_id ?? null;
}

// When a new result is published, the podium takes over the layout
// full-screen for CELEBRATION_MS, then the sidebar/info-cards/footer
// smoothly slide back in and the podium settles into its normal spot.
// Detecting "new" is scoped to this component (its own light realtime
// subscription just for the hero program id) so it doesn't need to
// restructure the data-fetching already owned by the podium/sidebar/
// info-cards/footer components — this only controls layout, not data.
export function CelebrationLayout({
  initialHeroId,
  podium,
  sidebar,
  infoCards,
  footer,
}: {
  initialHeroId: string | null;
  podium: ReactNode;
  sidebar: ReactNode;
  infoCards: ReactNode;
  footer: ReactNode;
}) {
  const [celebrating, setCelebrating] = useState(false);
  const heroIdRef = useRef(initialHeroId);

  useEffect(() => {
    const supabase = createClient();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function checkForNewResult() {
      const newHeroId = await fetchLatestHeroId();
      if (newHeroId && newHeroId !== heroIdRef.current) {
        heroIdRef.current = newHeroId;
        setCelebrating(true);
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => setCelebrating(false), CELEBRATION_MS);
      }
    }

    const channel = supabase
      .channel("podium-celebration")
      .on("postgres_changes", { event: "*", schema: "public", table: "programs" }, checkForNewResult)
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, checkForNewResult)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_scores" }, checkForNewResult)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const revealClass = celebrating
    ? "opacity-0 transition-opacity duration-200"
    : "opacity-100 transition-opacity delay-300 duration-500";

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-1 gap-4 transition-[grid-template-columns] duration-700 ease-in-out md:min-h-0 md:flex-1",
          celebrating ? "lg:grid-cols-[1fr_0fr]" : "lg:grid-cols-[1fr_280px]",
        )}
      >
        <div
          className={cn(
            "md:h-full md:min-h-0 transition-transform duration-700 ease-in-out",
            celebrating && "lg:scale-[1.03]",
          )}
        >
          {podium}
        </div>
        <div className={cn("md:h-full md:min-h-0 min-w-0 overflow-hidden", revealClass)}>{sidebar}</div>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-700 ease-in-out",
          celebrating ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className={revealClass}>{infoCards}</div>
        </div>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-700 ease-in-out",
          celebrating ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className={revealClass}>{footer}</div>
        </div>
      </div>
    </>
  );
}
