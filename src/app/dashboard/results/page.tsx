import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { publishResults, unpublishResults } from "@/app/dashboard/programs/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { STUDENT_DIVISIONS, STUDENT_DIVISION_LABELS } from "@/lib/validations/student";
import { PublishToggle } from "./publish-toggle";
import { ResultsExportButton } from "./results-export-button";
import type {
  GroupScoreRow,
  Program,
  ProgramGroupParticipant,
  ProgramParticipant,
  ScoreRow,
  StudentDivision,
} from "@/lib/types";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ division?: string }>;
}) {
  await verifySession();

  const { division: divisionParam } = await searchParams;
  const activeDivision =
    divisionParam && STUDENT_DIVISIONS.includes(divisionParam as StudentDivision)
      ? (divisionParam as StudentDivision)
      : null;

  const supabase = await createClient();
  const [
    { data: programs },
    { data: participants },
    { data: groupParticipants },
    { data: scores },
    { data: groupScores },
  ] = await Promise.all([
    supabase.from("programs").select("*").order("name").returns<Program[]>(),
    supabase
      .from("program_participants")
      .select("program_id")
      .returns<Pick<ProgramParticipant, "program_id">[]>(),
    supabase
      .from("program_group_participants")
      .select("program_id")
      .returns<Pick<ProgramGroupParticipant, "program_id">[]>(),
    supabase.from("scores").select("program_id").returns<Pick<ScoreRow, "program_id">[]>(),
    supabase
      .from("group_scores")
      .select("program_id")
      .returns<Pick<GroupScoreRow, "program_id">[]>(),
  ]);

  const countBy = (rows: { program_id: string }[] | null) => {
    const map = new Map<string, number>();
    for (const row of rows ?? []) {
      map.set(row.program_id, (map.get(row.program_id) ?? 0) + 1);
    }
    return map;
  };

  const participantCounts = countBy(participants);
  const groupParticipantCounts = countBy(groupParticipants);
  const scoreCounts = countBy(scores);
  const groupScoreCounts = countBy(groupScores);

  const pendingEvaluations = (programs ?? []).filter((p) => p.status !== "completed").length;
  const readyToPublish = (programs ?? []).filter(
    (p) => p.status === "completed" && !p.published,
  ).length;

  const visiblePrograms = activeDivision
    ? (programs ?? []).filter((p) => p.category === activeDivision)
    : programs ?? [];

  const exportRows = visiblePrograms.map((program) => {
    const isGroup = program.program_type === "group";
    const total = isGroup
      ? (groupParticipantCounts.get(program.id) ?? 0)
      : (participantCounts.get(program.id) ?? 0);
    const scored = isGroup
      ? (groupScoreCounts.get(program.id) ?? 0)
      : (scoreCounts.get(program.id) ?? 0);
    return {
      name: program.name,
      category: STUDENT_DIVISION_LABELS[program.category],
      scored,
      total,
      evaluationStatus: program.status === "completed" ? "Complete" : "In Progress",
      publishedStatus: program.published ? "Published" : "Draft",
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-primary">
            Programs &amp; Results
          </h1>
          <p className="text-sm text-muted-foreground">
            Publish a program&apos;s results to make them visible on the public leaderboard.
            Publishing unlocks once evaluation is marked Completed.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ResultsExportButton rows={exportRows} />
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-[18px]">emoji_events</span>
            View public leaderboard
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-stretch gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
          <span className="material-symbols-outlined text-[18px] text-muted-foreground">
            filter_list
          </span>
          <Link
            href="/dashboard/results"
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              !activeDivision
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            All Categories
          </Link>
          {STUDENT_DIVISIONS.map((division) => (
            <Link
              key={division}
              href={`/dashboard/results?division=${division}`}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                activeDivision === division
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {STUDENT_DIVISION_LABELS[division]}
            </Link>
          ))}
        </div>
        <div className="card-elevated flex flex-col justify-center rounded-xl border border-border bg-card px-5 py-3">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Pending Evaluations
          </span>
          <span className="font-heading text-2xl font-bold text-destructive">
            {pendingEvaluations} <span className="text-sm font-medium">Programs</span>
          </span>
        </div>
        <div className="card-elevated flex flex-col justify-center rounded-xl border border-border bg-card px-5 py-3">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Ready to Publish
          </span>
          <span className="font-heading text-2xl font-bold text-primary">
            {readyToPublish} <span className="text-sm font-medium">Programs</span>
          </span>
        </div>
      </div>

      <div className="card-elevated overflow-hidden rounded-xl bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Program Name
              </TableHead>
              <TableHead className="py-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Category
              </TableHead>
              <TableHead className="py-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Scored Count
              </TableHead>
              <TableHead className="py-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Evaluation Status
              </TableHead>
              <TableHead className="py-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Published Status
              </TableHead>
              <TableHead className="py-3 text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiblePrograms.map((program) => {
              const isCompleted = program.status === "completed";
              const isGroup = program.program_type === "group";
              const total = isGroup
                ? (groupParticipantCounts.get(program.id) ?? 0)
                : (participantCounts.get(program.id) ?? 0);
              const scored = isGroup
                ? (groupScoreCounts.get(program.id) ?? 0)
                : (scoreCounts.get(program.id) ?? 0);
              const fullyScored = total > 0 && scored === total;
              const scoredPct = total > 0 ? Math.round((scored / total) * 100) : 0;
              return (
                <TableRow key={program.id}>
                  <TableCell className="py-4">
                    {program.published ? (
                      <Link
                        href={`/leaderboard/program/${program.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {program.name}
                      </Link>
                    ) : (
                      <span
                        className="font-medium text-foreground"
                        title="Not published yet — publish to view the public results page"
                      >
                        {program.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-4 text-muted-foreground">
                    {STUDENT_DIVISION_LABELS[program.category]}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            fullyScored ? "bg-success" : "bg-primary",
                          )}
                          style={{ width: `${scoredPct}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {scored}/{total}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                        isCompleted
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-warning/30 bg-warning/10 text-warning",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          isCompleted ? "bg-success" : "bg-warning",
                        )}
                      />
                      {isCompleted ? "Complete" : "In Progress"}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                        program.published
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-surface-container text-muted-foreground",
                      )}
                    >
                      {program.published ? "Published" : "Draft"}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    {isCompleted || program.published ? (
                      <PublishToggle
                        published={program.published}
                        onPublish={publishResults.bind(null, program.id)}
                        onUnpublish={unpublishResults.bind(null, program.id)}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Awaiting completion
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {!visiblePrograms.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No programs match this filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
