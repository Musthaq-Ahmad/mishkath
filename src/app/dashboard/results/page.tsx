import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { publishResults, unpublishResults } from "@/app/dashboard/programs/actions";
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

      <div className="overflow-x-auto rounded-xl bg-card shadow-sm ring-1 ring-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-primary text-xs font-semibold tracking-wider text-primary-foreground uppercase">
              <th className="px-5 py-3">Program</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Scored</th>
              <th className="px-5 py-3">Evaluation</th>
              <th className="px-5 py-3">Published</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
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
                <tr key={program.id} className="border-b border-border last:border-none">
                  <td className="px-5 py-4">
                    <Link
                      href={`/leaderboard/program/${program.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {program.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {STUDENT_DIVISION_LABELS[program.category]}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold " +
                        (fullyScored
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      {fullyScored && (
                        <span className="material-symbols-outlined text-[14px]">
                          check_circle
                        </span>
                      )}
                      {scored}/{total}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold " +
                        (isCompleted
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      {PROGRAM_STATUS_LABELS[program.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {program.published ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                        Unpublished
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
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
                  </td>
                </tr>
              );
            })}
            {!programs?.length && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                  No programs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
