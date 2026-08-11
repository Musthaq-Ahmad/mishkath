import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { groupPlacements } from "@/lib/leaderboard";
import { getUpcomingPrograms } from "@/lib/schedule";
import type { EventPlacementRow, Group, GroupLeaderboardRow, Program } from "@/lib/types";
import { ChampionshipSidebar } from "./championship-sidebar";
import { ClockCard } from "./clock-card";
import { InfoCardsRow } from "./info-cards-row";
import { KioskStage, KioskToggleButton } from "./kiosk";
import { LeaderboardFooter } from "./leaderboard-footer";
import { PublishedResultsFeed } from "./published-results-feed";
import { ResultsQrCode } from "./results-qr-code";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const [
    { data: groupRows },
    { data: placementRows },
    { data: scheduledPrograms },
    { data: allPrograms },
    { data: groups },
  ] = await Promise.all([
    supabase.from("public_group_leaderboard").select("*").returns<GroupLeaderboardRow[]>(),
    supabase
      .from("public_event_top3")
      .select("*")
      .order("published_at", { ascending: false })
      .order("rank", { ascending: true })
      .returns<EventPlacementRow[]>(),
    supabase
      .from("programs")
      .select("*")
      .not("scheduled_start", "is", null)
      .order("scheduled_start", { ascending: true })
      .returns<Program[]>(),
    supabase.from("programs").select("published").returns<Pick<Program, "published">[]>(),
    supabase.from("groups").select("id, name").returns<Pick<Group, "id" | "name">[]>(),
  ]);

  const placements = groupPlacements(placementRows ?? []);
  const nextProgram = getUpcomingPrograms(scheduledPrograms ?? [])[0] ?? null;
  const totalProgramCount = allPrograms?.length ?? 0;
  const publishedProgramCount = (allPrograms ?? []).filter((p) => p.published).length;
  const groupNames: Record<string, string> = Object.fromEntries(
    (groups ?? []).map((g) => [g.id, g.name]),
  );

  return (
    <div className="relative min-h-screen overflow-y-auto bg-background p-3 text-foreground sm:p-4 md:h-screen md:overflow-hidden lg:p-6">
      <div className="relative mx-auto flex min-h-full w-full max-w-[1700px] flex-col gap-4 md:h-full md:min-h-0">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Image
              src="/mehfile-meem-logo-indigo.png"
              alt="Mehfile Meem — Meelad Fest 2K26"
              width={200}
              height={119}
              className="h-auto w-[160px] sm:w-[200px]"
              priority
            />
            <div className="hidden border-l border-border pl-3 sm:block">
              <p className="font-heading text-lg font-bold tracking-tight text-primary">
                Live Results
              </p>
              <p className="text-base text-muted-foreground">
                Festival management and results tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-base sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              <span className="font-semibold tracking-wide text-foreground uppercase">Live</span>
            </div>

            {totalProgramCount > 0 && (
              <>
                <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />
                <div className="hidden items-center gap-1.5 text-muted-foreground sm:flex">
                  <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                  <span className="font-heading font-semibold tabular-nums text-foreground">
                    {publishedProgramCount}/{totalProgramCount}
                  </span>
                </div>
              </>
            )}

            <span aria-hidden className="h-4 w-px bg-border" />
            <Link
              href="/leaderboard/results"
              className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
            >
              <span className="material-symbols-outlined text-[20px]">history</span>
              <span className="hidden font-medium sm:inline">All Results</span>
            </Link>

            <span aria-hidden className="h-4 w-px bg-border" />
            <KioskToggleButton />

            <span aria-hidden className="h-4 w-px bg-border" />
            <ClockCard />
            <div className="hidden sm:block">
              <ResultsQrCode />
            </div>
          </div>
        </header>

        <KioskStage
          initialHeroId={placements[0]?.program_id ?? null}
          podium={<PublishedResultsFeed initialPlacements={placements} groupNames={groupNames} />}
          sidebar={<ChampionshipSidebar initialGroupRows={groupRows ?? []} />}
          infoCards={<InfoCardsRow initialPlacements={placements} initialNextProgram={nextProgram} />}
          footer={<LeaderboardFooter initialPlacements={placements} groupNames={groupNames} />}
        />
      </div>
    </div>
  );
}
