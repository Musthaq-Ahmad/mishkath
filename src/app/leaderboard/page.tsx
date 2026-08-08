import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { groupPlacements } from "@/lib/leaderboard";
import { getUpcomingPrograms } from "@/lib/schedule";
import type { EventPlacementRow, Group, GroupLeaderboardRow, Program } from "@/lib/types";
import { ChampionshipSidebar } from "./championship-sidebar";
import { ClockCard } from "./clock-card";
import { CornerOrnament } from "./corner-ornament";
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
    <div className="min-h-screen overflow-y-auto bg-[#0a0e27] p-2 sm:p-3 md:h-screen md:overflow-hidden xl:p-5">
      <div
        className="min-h-full rounded-2xl p-0.75 md:h-full md:rounded-[2rem]"
        style={{ background: "linear-gradient(135deg, var(--gold) 0%, transparent 35%, transparent 65%, var(--primary) 100%)" }}
      >
        <div className="relative flex min-h-full flex-col overflow-visible rounded-[calc(1rem-3px)] bg-[#0a0e27] px-3 py-3 font-bold text-primary-foreground sm:px-6 md:h-full md:overflow-hidden md:rounded-[calc(2rem-3px)] md:px-10 md:py-4">
          {/* Islamic geometric lattice motif — diagonal diamond grid, gold on emerald. */}
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(45deg, rgba(233,194,102,0.06) 1px, transparent 1px), linear-gradient(-45deg, rgba(233,194,102,0.06) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
          <div className="pointer-events-none absolute -top-32 -left-20 size-[28rem] rounded-full bg-primary/25 blur-[120px]" />
          <div className="pointer-events-none absolute -right-24 -bottom-32 size-[28rem] rounded-full bg-gold/15 blur-[120px]" />

          <CornerOrnament className="pointer-events-none absolute top-3 left-3 hidden size-24 md:block" />
          <CornerOrnament className="pointer-events-none absolute top-3 right-3 hidden size-24 -scale-x-100 md:block" />
          <CornerOrnament className="pointer-events-none absolute bottom-3 left-3 hidden size-24 -scale-y-100 md:block" />
          <CornerOrnament className="pointer-events-none absolute right-3 bottom-3 hidden size-24 -scale-x-100 -scale-y-100 md:block" />

          <div className="relative mx-auto flex w-full max-w-[1700px] flex-col gap-3 md:h-full md:min-h-0 md:gap-2">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-2 ring-gold/40">
                  <Image
                    src="/mishkat-icon.png"
                    alt=""
                    width={44}
                    height={44}
                    className="size-11 object-cover"
                  />
                </div>
                <div>
                  <h1 className="font-heading text-lg font-bold tracking-tight sm:text-2xl xl:text-3xl">
                    <span className="bg-linear-to-r from-gold to-primary bg-clip-text text-transparent">
                      മിഷ്കാത്ത്
                    </span>{" "}
                    തത്സമയ ഫലങ്ങൾ
                  </h1>
                  <p className="hidden items-center gap-2 text-base text-gold/80 sm:flex">
                    <span aria-hidden>✥</span>
                    മേള നടത്തിപ്പും മികവ് നിരീക്ഷണവും
                    <span aria-hidden>✥</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1 rounded-xl border border-gold/25 bg-white/5 px-4 py-1.5">
                  <div className="flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1 text-sm font-black tracking-wide text-white uppercase">
                    <span className="size-2 rounded-full bg-white" />
                    Live
                  </div>
                  <span className="text-xs font-bold tracking-widest text-success uppercase">
                    തത്സമയം
                  </span>
                </div>

                {totalProgramCount > 0 && (
                  <div className="hidden flex-col items-center gap-1 rounded-xl border border-gold/25 bg-white/5 px-4 py-1.5 sm:flex">
                    <span className="text-xs font-bold tracking-widest text-gold uppercase">
                      പരിപാടികൾ
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[22px] text-gold">
                        calendar_month
                      </span>
                      <span className="font-heading text-xl font-black tabular-nums">
                        {publishedProgramCount}/{totalProgramCount}
                      </span>
                    </div>
                  </div>
                )}

                <ClockCard />
                <div className="hidden sm:block">
                  <ResultsQrCode />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:min-h-0 md:flex-1 lg:grid-cols-[1fr_280px]">
              <PublishedResultsFeed initialPlacements={placements} groupNames={groupNames} />
              <ChampionshipSidebar initialGroupRows={groupRows ?? []} />
            </div>

            <InfoCardsRow initialPlacements={placements} initialNextProgram={nextProgram} />

            <LeaderboardFooter initialPlacements={placements} groupNames={groupNames} />
          </div>
        </div>
      </div>
    </div>
  );
}
