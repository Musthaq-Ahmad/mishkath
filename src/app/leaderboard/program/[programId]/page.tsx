import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GroupProgramResult, Program, ProgramResult } from "@/lib/types";
import { groupRingColor } from "@/lib/group-color";
import { cn } from "@/lib/utils";
import { ML_DIVISION_LABELS } from "../../malayalam";

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
    <div className="flex min-h-screen flex-col bg-[#0a0e27] px-8 py-12 text-primary-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link
            href="/leaderboard"
            className="mb-2 inline-flex w-fit items-center gap-1 text-sm font-semibold tracking-wide text-primary-foreground/85 uppercase hover:text-gold"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            മൊത്തം പട്ടിക
          </Link>
          <h1 className="font-heading text-5xl font-bold tracking-tight">{program.name}</h1>
          <p className="text-lg text-primary-foreground/85">
            {ML_DIVISION_LABELS[program.category]}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white/6 ring-1 ring-gold/15">
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
                className={
                  "animate-fade-in-up flex items-center gap-6 border-t border-white/5 px-8 py-6 first:border-t-0" +
                  (result.rank === 1 ? " bg-gold/10" : "")
                }
              >
                <span
                  className={
                    "flex size-12 shrink-0 items-center justify-center rounded-full font-heading text-xl font-bold tabular-nums " +
                    (RANK_BADGE[result.rank] ?? "bg-white/10 text-primary-foreground/70")
                  }
                >
                  {result.rank}
                </span>
                <span
                  className={cn(
                    "relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-2",
                    groupRingColor(groupId),
                  )}
                >
                  {photoUrl ? (
                    <Image src={photoUrl} alt="" fill sizes="48px" className="object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[24px] text-primary-foreground/70">
                      {isGroup ? "groups" : "person"}
                    </span>
                  )}
                </span>
                <span className="font-heading text-2xl font-semibold">{name}</span>
              </div>
            );
          })}
          {!results?.length && (
            <div className="px-8 py-16 text-center text-lg text-primary-foreground/85">
              ഇതുവരെ ഫലങ്ങൾ പ്രസിദ്ധീകരിച്ചിട്ടില്ല.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
