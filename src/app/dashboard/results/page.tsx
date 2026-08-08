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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PROGRAM_STATUS_LABELS } from "@/lib/validations/program";
import { STUDENT_DIVISION_LABELS } from "@/lib/validations/student";
import { PublishToggle } from "./publish-toggle";
import type {
  GroupScoreRow,
  Program,
  ProgramGroupParticipant,
  ProgramParticipant,
  ScoreRow,
} from "@/lib/types";

export default async function ResultsPage() {
  await verifySession();

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-primary">Results</h1>
          <p className="text-sm text-muted-foreground">
            Publish a program&apos;s results to make them visible on the public leaderboard.
            Publishing unlocks once evaluation is marked Completed.
          </p>
        </div>
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-[18px]">emoji_events</span>
          View public leaderboard
        </Link>
      </div>

      <div className="card-elevated overflow-hidden rounded-xl bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
              <TableHead className="py-3 text-xs font-semibold tracking-wider text-primary-foreground uppercase">
                Program
              </TableHead>
              <TableHead className="py-3 text-xs font-semibold tracking-wider text-primary-foreground uppercase">
                Category
              </TableHead>
              <TableHead className="py-3 text-xs font-semibold tracking-wider text-primary-foreground uppercase">
                Scored
              </TableHead>
              <TableHead className="py-3 text-xs font-semibold tracking-wider text-primary-foreground uppercase">
                Evaluation
              </TableHead>
              <TableHead className="py-3 text-xs font-semibold tracking-wider text-primary-foreground uppercase">
                Published
              </TableHead>
              <TableHead className="py-3 text-right text-xs font-semibold tracking-wider text-primary-foreground uppercase">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs?.map((program) => {
              const isCompleted = program.status === "completed";
              const isGroup = program.program_type === "group";
              const total = isGroup
                ? (groupParticipantCounts.get(program.id) ?? 0)
                : (participantCounts.get(program.id) ?? 0);
              const scored = isGroup
                ? (groupScoreCounts.get(program.id) ?? 0)
                : (scoreCounts.get(program.id) ?? 0);
              const fullyScored = total > 0 && scored === total;
              return (
                <TableRow key={program.id}>
                  <TableCell className="py-4">
                    <Link
                      href={`/leaderboard/program/${program.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {program.name}
                    </Link>
                  </TableCell>
                  <TableCell className="py-4 text-muted-foreground">
                    {STUDENT_DIVISION_LABELS[program.category]}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="status" className="gap-1">
                      {fullyScored && (
                        <span className="material-symbols-outlined text-[14px] text-success">
                          check_circle
                        </span>
                      )}
                      <span className={cn(fullyScored ? "text-success" : "text-muted-foreground")}>
                        {scored}/{total}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="status">
                      <span className={isCompleted ? "text-success" : "text-muted-foreground"}>
                        {PROGRAM_STATUS_LABELS[program.status]}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="status" className="gap-1">
                      {program.published && (
                        <span className="material-symbols-outlined text-[14px] text-success">
                          check_circle
                        </span>
                      )}
                      <span className={program.published ? "text-success" : "text-muted-foreground"}>
                        {program.published ? "Published" : "Unpublished"}
                      </span>
                    </Badge>
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
            {!programs?.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No programs yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
