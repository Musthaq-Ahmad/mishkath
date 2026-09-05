import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TENANT_WRITE_ROLES, requireTenantRole } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { cn } from "@/lib/utils";
import { RANK_LABEL } from "@/app/t/[slug]/leaderboard/labels";
import type { Division, GroupProgramResult, Program, ProgramResult } from "@/lib/types";
import { FestivalBrand, festivalBrand } from "@/components/brand/festival-brand";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ programId: string; participantId: string }>;
}): Promise<Metadata> {
  const { programId, participantId } = await params;
  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("name, program_type")
    .eq("id", programId)
    .maybeSingle<Pick<Program, "name" | "program_type">>();

  if (!program) return { title: "Certificate" };

  const isGroup = program.program_type === "group";
  const { data: result } = isGroup
    ? await supabase
        .from("public_group_program_results")
        .select("group_name")
        .eq("program_id", programId)
        .eq("participant_id", participantId)
        .maybeSingle<Pick<GroupProgramResult, "group_name">>()
    : await supabase
        .from("public_program_results")
        .select("student_name")
        .eq("program_id", programId)
        .eq("student_id", participantId)
        .maybeSingle<Pick<ProgramResult, "student_name">>();

  const name = isGroup
    ? (result as Pick<GroupProgramResult, "group_name"> | null)?.group_name
    : (result as Pick<ProgramResult, "student_name"> | null)?.student_name;

  return { title: name ? `Certificate — ${name} — ${program.name}` : `Certificate — ${program.name}` };
}

const RANK_BADGE: Record<number, string> = {
  1: "bg-gold text-[#251a00]",
  2: "bg-silver text-[#1b1c19]",
  3: "bg-bronze text-[#251a00]",
};

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ programId: string; participantId: string }>;
}) {
  const { slug, tenant } = await requireTenantRole(TENANT_WRITE_ROLES);
  const { programId, participantId } = await params;
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

  const { data: result } = isGroup
    ? await supabase
        .from("public_group_program_results")
        .select("*")
        .eq("program_id", programId)
        .eq("participant_id", participantId)
        .maybeSingle<GroupProgramResult>()
    : await supabase
        .from("public_program_results")
        .select("*")
        .eq("program_id", programId)
        .eq("student_id", participantId)
        .maybeSingle<ProgramResult>();

  if (!result) {
    notFound();
  }

  const { data: division } = await supabase
    .from("divisions")
    .select("name")
    .eq("id", program.category)
    .single<Pick<Division, "name">>();

  const name = isGroup
    ? (result as GroupProgramResult).group_name
    : (result as ProgramResult).student_name;
  const isTop3 = result.rank <= 3;
  const dateLabel = program.published_at
    ? new Date(program.published_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  const certNumber = `MM-${programId.slice(0, 4)}-${participantId.slice(0, 4)}`.toUpperCase();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground print:bg-white">
      <div className="mb-4 flex w-full max-w-4xl items-center justify-between print:hidden">
        <Link
          href={`/t/${slug}/leaderboard/program/${programId}`}
          className="inline-flex items-center gap-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-primary"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to results
        </Link>
        <PrintButton label="Print / Save as PDF" />
      </div>

      <div className="relative flex aspect-[1.414/1] w-full max-w-4xl flex-col overflow-hidden border-[10px] border-double border-gold bg-card shadow-sm [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:shadow-none">
        {/* Soft radial glow for depth, subtler than a flat fill */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--gold)_0%,_transparent_60%)] opacity-[0.06]"
        />

        {/* Inner hairline frame */}
        <div className="pointer-events-none absolute inset-3 border border-gold/40" />

        {/* Corner ornaments */}
        {[
          "top-3 left-3 border-t-2 border-l-2",
          "top-3 right-3 border-t-2 border-r-2",
          "bottom-3 left-3 border-b-2 border-l-2",
          "bottom-3 right-3 border-b-2 border-r-2",
        ].map((pos) => (
          <span key={pos} aria-hidden className={cn("pointer-events-none absolute size-8 border-gold", pos)} />
        ))}

        {/* Faint watermark seal */}
        <span
          aria-hidden
          className="material-symbols-outlined pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[26rem] text-gold opacity-[0.05]"
        >
          workspace_premium
        </span>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-between p-10 text-center sm:p-16">
          <div className="flex flex-col items-center gap-3">
            <FestivalBrand
              {...festivalBrand(tenant)}
              forceLight
              logoClassName="max-h-14 w-auto"
              nameClassName="text-2xl"
            />
            {isTop3 && (
              <span
                className={cn(
                  "flex size-16 items-center justify-center rounded-full font-heading text-2xl font-black tabular-nums shadow-sm ring-4 ring-gold/20 ring-offset-2 ring-offset-card",
                  RANK_BADGE[result.rank],
                )}
              >
                {result.rank}
              </span>
            )}
            <div className="flex flex-col items-center gap-1.5">
              <p className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {isTop3 ? "Certificate of Achievement" : "Certificate of Participation"}
              </p>
              <span aria-hidden className="h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <p className="text-sm tracking-wide text-muted-foreground uppercase">
              This certificate is proudly presented to
            </p>
            <p className="font-heading text-5xl font-bold text-foreground sm:text-6xl">{name}</p>
            <p className="max-w-xl text-base text-muted-foreground">
              {isTop3 ? (
                <>
                  for securing{" "}
                  <span className="font-semibold text-foreground">
                    {RANK_LABEL[result.rank] ?? `Rank ${result.rank}`}
                  </span>{" "}
                  in
                </>
              ) : (
                "for participating in"
              )}{" "}
              <span className="font-semibold text-foreground">{program.name}</span> —{" "}
              {division?.name ?? "—"}
            </p>
          </div>

          <div className="flex w-full items-end justify-between text-xs text-muted-foreground">
            <div className="flex flex-col items-center gap-1">
              <span className="w-32 border-t border-border pt-1">Festival Director</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span>{dateLabel}</span>
              <span className="tracking-wide">Cert. No. {certNumber}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="w-32 border-t border-border pt-1">Chief Judge</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
