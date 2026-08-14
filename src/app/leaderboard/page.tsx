import { createClient } from "@/lib/supabase/server";
import { groupPlacements } from "@/lib/leaderboard";
import { getUpcomingPrograms } from "@/lib/schedule";
import type { EventPlacementRow, Group, GroupLeaderboardRow, Program } from "@/lib/types";
import { CelebrationLayout } from "./celebration-layout";
import { ChampionshipSidebar } from "./championship-sidebar";
import { InfoCardsRow } from "./info-cards-row";
import { LeaderboardHeader } from "./leaderboard-header";
import { PublishedResultsFeed } from "./published-results-feed";

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
        <LeaderboardHeader
          totalProgramCount={totalProgramCount}
          publishedProgramCount={publishedProgramCount}
        />

        <CelebrationLayout
          initialHeroId={placements[0]?.program_id ?? null}
          podium={<PublishedResultsFeed initialPlacements={placements} groupNames={groupNames} />}
          sidebar={
            <div className="flex w-full flex-col gap-4 md:h-full md:min-h-0 md:overflow-y-auto">
              <ChampionshipSidebar initialGroupRows={groupRows ?? []} />
            </div>
          }
          infoCards={<InfoCardsRow initialPlacements={placements} initialNextProgram={nextProgram} />}
        />
      </div>
    </div>
  );
}
