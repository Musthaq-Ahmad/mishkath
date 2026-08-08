import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { groupPlacements } from "@/lib/leaderboard";
import { getUpcomingPrograms } from "@/lib/schedule";
import type { EventPlacementRow, Group, GroupLeaderboardRow, Program } from "@/lib/types";
import { CalligraphyFlourish } from "./calligraphy-flourish";
import { CelebrationLayout } from "./celebration-layout";
import { ChampionshipSidebar } from "./championship-sidebar";
import { ClockCard } from "./clock-card";
import { InfoCardsRow } from "./info-cards-row";
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
    <div
      className="relative min-h-screen overflow-y-auto p-3 text-foreground sm:p-4 md:h-screen md:overflow-hidden lg:p-6"
      style={{
        background:
          "radial-gradient(ellipse 65% 50% at 50% -10%, rgba(192,38,211,0.5) 0%, transparent 65%), radial-gradient(ellipse 55% 45% at 100% 105%, color-mix(in srgb, var(--gold) 30%, transparent) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at -5% 100%, rgba(147,51,234,0.35) 0%, transparent 70%), linear-gradient(155deg, #3b0764 0%, #1a0a2e 45%, #4a044e 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(45deg, var(--gold) 1px, transparent 1px), linear-gradient(-45deg, var(--gold) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <CalligraphyFlourish className="animate-bg-drift pointer-events-none absolute -top-16 -left-20 size-[36rem] opacity-[0.1] blur-[1px] sm:size-[42rem]" />
      <CalligraphyFlourish className="animate-bg-spin-slow pointer-events-none absolute -right-24 -bottom-24 size-[30rem] opacity-[0.08] blur-[1px] sm:size-[36rem]" />
      <div className="relative mx-auto flex min-h-full w-full max-w-[1700px] flex-col gap-4 md:h-full md:min-h-0">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card ring-1 ring-border">
              <Image
                src="/mishkat-icon.png"
                alt=""
                width={40}
                height={40}
                className="size-9 object-cover"
              />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
                MISHKAT{" "}
                <span className="font-medium text-muted-foreground">Live Results</span>
              </h1>
              <p className="hidden text-base text-muted-foreground sm:block">
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
            <ClockCard />
            <div className="hidden sm:block">
              <ResultsQrCode />
            </div>
          </div>
        </header>

        <CelebrationLayout
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
