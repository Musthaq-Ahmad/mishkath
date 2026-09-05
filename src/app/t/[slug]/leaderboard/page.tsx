import { createClient } from "@/lib/supabase/server";
import { getPublicTenant } from "@/lib/tenant";
import { festivalBrand } from "@/components/brand/festival-brand";
import { groupPlacements } from "@/lib/leaderboard";
import { getCurrentAndNextProgram } from "@/lib/schedule";
import type { Division, EventPlacementRow, Group, GroupLeaderboardRow, Program } from "@/lib/types";
import { CelebrationLayout } from "./celebration-layout";
import { ChampionshipSidebar } from "./championship-sidebar";
import { InfoCardsRow } from "./info-cards-row";
import { LeaderboardHeader } from "./leaderboard-header";
import { PublishedResultsFeed } from "./published-results-feed";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const tenant = await getPublicTenant();
  const { slug } = tenant;
  const brand = festivalBrand(tenant);
  const supabase = await createClient();

  const [
    { data: groupRows },
    { data: placementRows },
    { data: scheduledPrograms },
    { data: allPrograms },
    { data: groups },
    { data: divisions },
  ] = await Promise.all([
    supabase.from("public_group_leaderboard").select("*").returns<GroupLeaderboardRow[]>(),
    supabase
      .from("public_event_top3")
      .select("*")
      .order("published_at", { ascending: false })
      .order("rank", { ascending: true })
      .returns<EventPlacementRow[]>(),
    // Unfiltered — "next" is driven by status='scheduled' below, not by
    // whether scheduled_start is set, so a program without a scheduled
    // time shouldn't be excluded outright (it just sorts last).
    supabase.from("programs").select("*").returns<Program[]>(),
    supabase.from("programs").select("published").returns<Pick<Program, "published">[]>(),
    supabase.from("groups").select("id, name").returns<Pick<Group, "id" | "name">[]>(),
    supabase.from("divisions").select("*").order("sort_order").returns<Division[]>(),
  ]);

  const divisionsList = divisions ?? [];

  const placements = groupPlacements(placementRows ?? []);
  const { current: currentProgram, next: nextProgram } = getCurrentAndNextProgram(
    scheduledPrograms ?? [],
  );
  const totalProgramCount = allPrograms?.length ?? 0;
  const publishedProgramCount = (allPrograms ?? []).filter((p) => p.published).length;
  const groupNames: Record<string, string> = Object.fromEntries(
    (groups ?? []).map((g) => [g.id, g.name]),
  );

  return (
    <div className="relative min-h-screen overflow-y-auto bg-background p-3 text-foreground sm:p-4 md:h-screen md:overflow-hidden lg:p-6">
      <div aria-hidden className="leaderboard-atmosphere" />
      <div className="relative mx-auto flex min-h-full w-full max-w-[1700px] flex-col gap-4 md:h-full md:min-h-0">
        <LeaderboardHeader
          tenantSlug={slug}
          brand={brand}
          totalProgramCount={totalProgramCount}
          publishedProgramCount={publishedProgramCount}
        />

        <CelebrationLayout
          initialHeroId={placements[0]?.program_id ?? null}
          podium={
            <PublishedResultsFeed
              initialPlacements={placements}
              groupNames={groupNames}
              divisions={divisionsList}
              brand={brand}
            />
          }
          sidebar={
            <div className="flex w-full flex-col gap-4 md:h-full md:min-h-0 md:overflow-y-auto">
              <ChampionshipSidebar initialGroupRows={groupRows ?? []} />
            </div>
          }
          infoCards={
            <InfoCardsRow
              initialPlacements={placements}
              initialCurrentProgram={currentProgram}
              initialNextProgram={nextProgram}
              divisions={divisionsList}
            />
          }
        />
      </div>
    </div>
  );
}
