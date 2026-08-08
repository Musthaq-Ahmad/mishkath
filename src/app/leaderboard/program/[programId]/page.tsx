import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GroupProgramResult, Program, ProgramResult } from "@/lib/types";
import { groupRingColor } from "@/lib/group-color";
import { cn } from "@/lib/utils";
import { DIVISION_LABELS } from "../../labels";

export const dynamic = "force-dynamic";

const RANK_BADGE: Record<number, string> = {
  1: "bg-gold text-[#251a00]",
  2: "bg-silver text-[#1b1c19]",
  3: "bg-bronze text-[#251a00]",
};

export default async function ProgramResultsPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
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

  const { data: results } = isGroup
    ? await supabase
        .from("public_group_program_results")
        .select("*")
        .eq("program_id", programId)
        .order("rank")
        .returns<GroupProgramResult[]>()
    : await supabase
        .from("public_program_results")
        .select("*")
        .eq("program_id", programId)
        .order("rank")
        .returns<ProgramResult[]>();

  return (
    <div className="flex min-h-screen flex-col bg-background px-8 py-12 text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link
            href="/leaderboard"
            className="mb-2 inline-flex w-fit items-center gap-1 text-base font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            All Results
          </Link>
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-6xl">{program.name}</h1>
          <p className="text-xl text-muted-foreground">
            {DIVISION_LABELS[program.category]}
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
                    <span className="material-symbols-outlined text-[26px] text-muted-foreground">
                      {isGroup ? "groups" : "person"}
                    </span>
                  )}
                </span>
                <span className="font-heading text-3xl font-semibold text-foreground">{name}</span>
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
    </div>
  );
}
