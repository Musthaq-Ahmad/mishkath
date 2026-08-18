import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { indexForCode } from "@/lib/codes";
import { GENDER_CATEGORY_LABELS } from "@/lib/validations/program";
import { STUDENT_DIVISION_LABELS } from "@/lib/validations/student";
import type { Program, ProgramGroupParticipant, ProgramParticipant } from "@/lib/types";

// One consolidated final marksheet per program — not a separate copy per
// judge. The judging panel shares this single sheet, noting their names/
// signatures at top/bottom, and agrees on one final score per participant
// (the same single number later transcribed into "Enter Scores"). Codes
// (not names) identify participants, matching the anonymization already in
// place for blind judging (see src/lib/codes.ts).
export default async function ProgramScoresheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;

  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("*")
    .eq("id", id)
    .single<Program>();

  if (!program) {
    notFound();
  }

  const { data: participants } =
    program.program_type === "group"
      ? await supabase
          .from("program_group_participants")
          .select("id, code")
          .eq("program_id", id)
          .returns<Pick<ProgramGroupParticipant, "id" | "code">[]>()
      : await supabase
          .from("program_participants")
          .select("id, code")
          .eq("program_id", id)
          .returns<Pick<ProgramParticipant, "id" | "code">[]>();

  const codes = (participants ?? [])
    .map((p) => p.code)
    .filter((code): code is string => Boolean(code))
    .sort((a, b) => indexForCode(a) - indexForCode(b));
  const missingCodeCount = (participants ?? []).length - codes.length;

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-10 text-foreground [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:bg-white sm:px-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div className="flex w-full items-center justify-between print:hidden">
          <Link
            href={`/dashboard/programs/${id}`}
            className="inline-flex w-fit items-center gap-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Program
          </Link>
          <PrintButton label="Print Judge Sheet" />
        </div>

        {missingCodeCount > 0 && (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning print:hidden">
            {missingCodeCount} participant{missingCodeCount === 1 ? "" : "s"} without a code yet
            — generate codes from the Codes tab first so every participant appears here.
          </p>
        )}

        <div className="flex flex-col items-center gap-2 pb-2 text-center">
          <Image
            src="/mehfile-meem-logo-indigo.png"
            alt="Mehfile Meem — Meelad Fest 2K26"
            width={220}
            height={131}
            className="h-auto w-[150px]"
            priority
          />
          <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
            Judge Scoresheet
          </p>
        </div>

        <div className="flex flex-col items-center gap-1 border-b border-foreground pb-6 text-center">
          <h1 className="font-heading text-3xl font-bold text-balance">{program.name}</h1>
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {STUDENT_DIVISION_LABELS[program.category]} ·{" "}
            {GENDER_CATEGORY_LABELS[program.gender_category]}
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <span className="font-semibold text-muted-foreground uppercase">
            Judges (name)
          </span>
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((n) => (
              <span key={n} className="flex items-center gap-2">
                <span className="text-muted-foreground">{n}.</span>
                <span className="inline-block flex-1 border-b border-foreground/40">&nbsp;</span>
              </span>
            ))}
          </div>
          <span>
            <span className="font-semibold text-muted-foreground">Max score:</span>{" "}
            {program.max_score}
          </span>
        </div>

        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-foreground text-xs font-bold tracking-wide uppercase">
              <th className="py-2">Code</th>
              <th className="py-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((code) => (
              <tr key={code} className="border-b border-border" style={{ breakInside: "avoid" }}>
                <td className="py-4 font-heading text-2xl font-bold tabular-nums">#{code}</td>
                <td className="py-4">
                  <div className="ml-auto h-10 w-32 rounded-md border border-foreground/40" />
                </td>
              </tr>
            ))}
            {!codes.length && (
              <tr>
                <td colSpan={2} className="py-8 text-center text-muted-foreground">
                  No participant codes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex flex-wrap gap-x-8 gap-y-3 text-xs text-muted-foreground">
          {[1, 2, 3].map((n) => (
            <span key={n}>
              Judge {n} signature:{" "}
              <span className="inline-block w-40 border-b border-foreground/40">&nbsp;</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
