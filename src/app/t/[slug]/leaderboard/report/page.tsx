import Link from "next/link";
import type { Metadata } from "next";
import { TENANT_WRITE_ROLES, requireTenantRole } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { groupPlacements } from "@/lib/leaderboard";
import { PrintButton } from "@/components/print-button";
import { cn } from "@/lib/utils";
import { RANK_LABEL } from "../labels";
import type { Division, EventPlacementRow, Group, GroupLeaderboardRow } from "@/lib/types";
import { FestivalBrand, festivalBrand } from "@/components/brand/festival-brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Full Festival Report",
};

const RANK_BADGE: Record<number, string> = {
  1: "bg-gold text-[#251a00]",
  2: "bg-silver text-[#1b1c19]",
  3: "bg-bronze text-[#251a00]",
};

function RankChip({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        "flex size-7 items-center justify-center rounded-full font-heading text-xs font-bold tabular-nums",
        RANK_BADGE[rank] ?? "bg-muted text-muted-foreground",
      )}
    >
      {rank}
    </span>
  );
}

// A single, admin-only, print-first document — the complete festival
// record in one place, unlike the per-program results sheet.
export default async function FestivalReportPage() {
  const { slug, tenant } = await requireTenantRole(TENANT_WRITE_ROLES);

  const supabase = await createClient();
  const [{ data: groupRows }, { data: placementRows }, { data: groups }, { data: divisions }] =
    await Promise.all([
      supabase
        .from("public_group_leaderboard")
        .select("*")
        .order("points", { ascending: false })
        .returns<GroupLeaderboardRow[]>(),
      supabase
        .from("public_event_top3")
        .select("*")
        .order("published_at", { ascending: true })
        .order("rank", { ascending: true })
        .returns<EventPlacementRow[]>(),
      supabase.from("groups").select("id, name").returns<Pick<Group, "id" | "name">[]>(),
      supabase.from("divisions").select("*").returns<Division[]>(),
    ]);

  const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const divisionNameById = new Map((divisions ?? []).map((d) => [d.id, d.name]));
  const programs = groupPlacements(placementRows ?? []);
  const generatedOn = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-10 text-foreground [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:bg-white sm:px-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex w-full items-center justify-between print:hidden">
          <Link
            href={`/t/${slug}/dashboard/results`}
            className="inline-flex w-fit items-center gap-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Results
          </Link>
          <PrintButton label="Print Full Report" />
        </div>

        <div className="flex flex-col items-center gap-2 pb-6 text-center">
          <FestivalBrand
              {...festivalBrand(tenant)}
              forceLight
              logoClassName="max-h-16 w-auto"
              nameClassName="text-2xl"
            />
          <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
            Official Festival Report
          </p>
          <p className="text-sm text-muted-foreground">
            {programs.length} program{programs.length === 1 ? "" : "s"} published
          </p>
          <span aria-hidden className="mt-2 h-1 w-24 rounded-full bg-gold" />
        </div>

        {/* Final Group Standings */}
        <section className="flex flex-col gap-3" style={{ breakInside: "avoid" }}>
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
            <span aria-hidden className="h-4 w-1 rounded-full bg-primary" />
            Final Group Standings
          </h2>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-foreground text-xs font-bold tracking-wide uppercase">
                <th className="w-14 py-2 pr-2">Rank</th>
                <th className="py-2 pr-2">Group</th>
                <th className="w-24 py-2 pl-2 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {(groupRows ?? []).map((row, index) => (
                <tr
                  key={row.group_id}
                  className={cn("border-b border-border", index === 0 && "bg-muted/40")}
                >
                  <td className="py-2 pr-2">
                    <RankChip rank={index + 1} />
                  </td>
                  <td className="py-2 pr-2 font-semibold">{row.group_name}</td>
                  <td className="py-2 pl-2 text-right font-heading font-bold tabular-nums">
                    {row.points}
                  </td>
                </tr>
              ))}
              {!groupRows?.length && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted-foreground">
                    No results published yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* All Program Results */}
        <section className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
            <span aria-hidden className="h-4 w-1 rounded-full bg-primary" />
            All Program Results
          </h2>
          {programs.map((program) => (
            <div key={program.program_id} className="flex flex-col gap-2" style={{ breakInside: "avoid" }}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-foreground pb-1">
                <h3 className="font-heading text-base font-bold">{program.program_name}</h3>
                <span className="text-xs text-muted-foreground uppercase">
                  {divisionNameById.get(program.category) ?? "—"} ·{" "}
                  {program.program_type === "group" ? "Group" : "Individual"}
                </span>
              </div>
              <table className="w-full border-collapse text-left text-sm">
                <tbody>
                  {[...program.places]
                    .sort((a, b) => a.rank - b.rank)
                    .map((place) => (
                      <tr key={place.id} className="border-b border-border">
                        <td className="w-10 py-1.5 pr-2">
                          <RankChip rank={place.rank} />
                        </td>
                        <td className="py-1.5 pr-2 font-semibold">{place.name}</td>
                        {program.program_type === "individual" && (
                          <td className="py-1.5 pr-2 text-muted-foreground">
                            {groupNameById.get(place.groupId) ?? "—"}
                          </td>
                        )}
                        <td className="py-1.5 pl-2 text-right text-muted-foreground">
                          {RANK_LABEL[place.rank] ?? "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
          {!programs.length && (
            <p className="text-center text-muted-foreground">No results published yet.</p>
          )}
        </section>

        <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span>{tenant.name}</span>
          <span>Printed on {generatedOn}</span>
        </div>
      </div>
    </div>
  );
}
