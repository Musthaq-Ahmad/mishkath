import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { Group, GroupProgramResult, Program, ProgramResult } from "@/lib/types";
import { groupRingColor } from "@/lib/group-color";
import { cn } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";
import { PROGRAM_TYPE_LABELS } from "@/lib/validations/program";
import { DIVISION_LABELS, RANK_LABEL } from "../../labels";
import { PlaceholderAvatar } from "@/components/gender-avatar";

export const dynamic = "force-dynamic";

const RANK_BADGE: Record<number, string> = {
  1: "bg-gold text-[#251a00]",
  2: "bg-silver text-[#1b1c19]",
  3: "bg-bronze text-[#251a00]",
};

// This full per-program breakdown (and its printable sheet) is an admin
// tool, not part of the public leaderboard — the public views only ever
// need the top-3 placements already shown inline on /leaderboard and
// /leaderboard/results.
export default async function ProgramResultsPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  await requireRole("admin");
  const { programId } = await params;
  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("*")
    .eq("id", programId)
    .single<Program>();

  if (!program || !program.published) {
    notFound();
  }

  const isGroup = program.program_type === "group";

  const [{ data: results }, { data: groups }] = await Promise.all([
    isGroup
      ? supabase
          .from("public_group_program_results")
          .select("*")
          .eq("program_id", programId)
          .order("rank")
          .returns<GroupProgramResult[]>()
      : supabase
          .from("public_program_results")
          .select("*")
          .eq("program_id", programId)
          .order("rank")
          .returns<ProgramResult[]>(),
    supabase.from("groups").select("id, name").returns<Pick<Group, "id" | "name">[]>(),
  ]);

  const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const generatedOn = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="flex min-h-screen flex-col bg-background px-8 py-12 text-foreground print:bg-white">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10">
        <div className="flex w-full items-center justify-between print:hidden">
          <Link
            href="/leaderboard"
            className="inline-flex w-fit items-center gap-1 text-base font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            All Results
          </Link>
          <PrintButton label="Print Results Sheet" />
        </div>

        {/* On-screen view */}
        <div className="flex flex-col gap-10 print:hidden">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-6xl">{program.name}</h1>
            <p className="text-xl text-muted-foreground">
              {DIVISION_LABELS[program.category]} · {PROGRAM_TYPE_LABELS[program.program_type]}
            </p>
          </div>

          <div className="card-elevated overflow-hidden rounded-lg border border-border bg-card">
            {results?.map((result, index) => {
              const name = isGroup
                ? (result as GroupProgramResult).group_name
                : (result as ProgramResult).student_name;
              const key = isGroup
                ? (result as GroupProgramResult).group_id
                : (result as ProgramResult).student_id;
              const photoUrl = isGroup ? null : (result as ProgramResult).photo_url;
              const category = isGroup ? null : (result as ProgramResult).student_category;
              const groupId = isGroup
                ? (result as GroupProgramResult).group_id
                : (result as ProgramResult).group_id;
              return (
                <div
                  key={key}
                  style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
                  className={cn(
                    "animate-fade-in-up flex items-center gap-6 border-t border-border px-8 py-6 first:border-t-0",
                    result.rank === 1 && "bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-14 shrink-0 items-center justify-center rounded-full font-heading text-2xl font-bold tabular-nums",
                      RANK_BADGE[result.rank] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {result.rank}
                  </span>
                  <span
                    className={cn(
                      "relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-2",
                      groupRingColor(groupId),
                    )}
                  >
                    {photoUrl ? (
                      <Image src={photoUrl} alt="" fill sizes="56px" className="object-cover" />
                    ) : (
                      <PlaceholderAvatar category={category} isGroup={isGroup} className="size-full p-2" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-heading text-3xl font-semibold text-foreground">
                      {name}
                    </span>
                    {RANK_LABEL[result.rank] && (
                      <span className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                        {RANK_LABEL[result.rank]}
                      </span>
                    )}
                  </span>
                  <Link
                    href={`/leaderboard/program/${programId}/certificate/${key}`}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                    Certificate
                  </Link>
                </div>
              );
            })}
            {!results?.length && (
              <div className="px-8 py-16 text-center text-xl text-muted-foreground">
                No results published yet.
              </div>
            )}
          </div>
        </div>

        {/* Print-only document — a clean letterhead + table, independent of the on-screen layout */}
        <div className="hidden flex-col gap-8 [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:flex">
          <div className="flex flex-col items-center gap-2 pb-6 text-center">
            <Image
              src="/mehfile-meem-logo-indigo.png"
              alt="Mehfile Meem — Meelad Fest 2K26"
              width={220}
              height={131}
              className="h-auto w-[170px]"
              priority
            />
            <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
              Official Results
            </p>
            <h1 className="font-heading text-3xl font-bold">{program.name}</h1>
            <p className="text-sm text-muted-foreground">
              {DIVISION_LABELS[program.category]} · {PROGRAM_TYPE_LABELS[program.program_type]}
            </p>
            <span aria-hidden className="mt-2 h-1 w-24 rounded-full bg-gold" />
          </div>

          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-foreground text-xs font-bold tracking-wide uppercase">
                <th className="w-14 py-2 pr-2">Rank</th>
                <th className="py-2 pr-2">{isGroup ? "Group" : "Name"}</th>
                {!isGroup && <th className="py-2 pr-2">Group</th>}
                <th className="w-40 py-2 pl-2">Place</th>
              </tr>
            </thead>
            <tbody>
              {results?.map((result) => {
                const name = isGroup
                  ? (result as GroupProgramResult).group_name
                  : (result as ProgramResult).student_name;
                const key = isGroup
                  ? (result as GroupProgramResult).group_id
                  : (result as ProgramResult).student_id;
                const groupId = isGroup
                  ? (result as GroupProgramResult).group_id
                  : (result as ProgramResult).group_id;
                return (
                  <tr key={key} className="border-b border-border" style={{ breakInside: "avoid" }}>
                    <td className="py-2.5 pr-2">
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full font-heading text-sm font-bold tabular-nums",
                          RANK_BADGE[result.rank] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {result.rank}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 font-semibold">{name}</td>
                    {!isGroup && (
                      <td className="py-2.5 pr-2 text-muted-foreground">
                        {groupNameById.get(groupId) ?? "—"}
                      </td>
                    )}
                    <td className="py-2.5 pl-2 text-muted-foreground">
                      {RANK_LABEL[result.rank] ?? "—"}
                    </td>
                  </tr>
                );
              })}
              {!results?.length && (
                <tr>
                  <td colSpan={isGroup ? 3 : 4} className="py-10 text-center text-muted-foreground">
                    No results published yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>Mehfile Meem — Meelad Fest 2K26</span>
            <span>Printed on {generatedOn}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
