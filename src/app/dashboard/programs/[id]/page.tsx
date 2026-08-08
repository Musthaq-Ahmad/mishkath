import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  Group,
  GroupScoreRow,
  Program,
  ProgramGroupParticipant,
  ProgramParticipant,
  ScoreRow,
  Student,
} from "@/lib/types";
import { addGroupParticipant, removeGroupParticipant } from "../actions";
import { ToggleCheckbox } from "./toggle-checkbox";
import { ParticipantSearch } from "./participant-search";
import { CodesPanel } from "./codes-panel";
import { StatusControl } from "./status-control";
import { ScoreEntryPanel } from "./score-entry-panel";
import { ScoreCompletionBanner } from "./score-completion-banner";
import { GENDER_CATEGORY_LABELS, PROGRAM_TYPE_LABELS } from "@/lib/validations/program";
import { STUDENT_DIVISION_LABELS } from "@/lib/validations/student";

export default async function ProgramDetailPage({
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

  const [
    { data: students },
    { data: groups },
    { data: participants },
    { data: groupParticipants },
    { data: scores },
    { data: groupScores },
  ] = await Promise.all([
    supabase.from("students").select("*").order("name").returns<Student[]>(),
    supabase.from("groups").select("*").returns<Group[]>(),
    supabase
      .from("program_participants")
      .select("*")
      .eq("program_id", id)
      .returns<ProgramParticipant[]>(),
    supabase
      .from("program_group_participants")
      .select("*")
      .eq("program_id", id)
      .returns<ProgramGroupParticipant[]>(),
    supabase.from("scores").select("*").eq("program_id", id).returns<ScoreRow[]>(),
    supabase
      .from("group_scores")
      .select("*")
      .eq("program_id", id)
      .returns<GroupScoreRow[]>(),
  ]);

  const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const participantStudentIds = new Set(
    (participants ?? []).map((p) => p.student_id),
  );
  const groupParticipantIds = new Set(
    (groupParticipants ?? []).map((p) => p.group_id),
  );
  const locked = (scores?.length ?? 0) > 0 || (groupScores?.length ?? 0) > 0;

  const scoresByStudent: Record<string, ScoreRow> = {};
  for (const score of scores ?? []) {
    scoresByStudent[score.student_id] = score;
  }

  const groupScoresByGroup: Record<string, GroupScoreRow> = {};
  for (const score of groupScores ?? []) {
    groupScoresByGroup[score.group_id] = score;
  }

  const studentNameById = new Map((students ?? []).map((s) => [s.id, s.name]));

  const matchesEligibility = (student: Student) =>
    student.division === program.category &&
    (program.gender_category === "mixed" || student.category === program.gender_category);

  const eligibleStudents = (students ?? []).filter(
    (s) => matchesEligibility(s) || participantStudentIds.has(s.id),
  );

  const eligibleGroupIds = new Set(
    (students ?? []).filter(matchesEligibility).map((s) => s.group_id),
  );
  const eligibleGroups = (groups ?? []).filter(
    (g) => eligibleGroupIds.has(g.id) || groupParticipantIds.has(g.id),
  );

  const hasCodes =
    program.program_type === "group"
      ? (groupParticipants ?? []).some((p) => p.code)
      : (participants ?? []).some((p) => p.code);

  const totalParticipantCount =
    program.program_type === "group"
      ? (groupParticipants ?? []).length
      : (participants ?? []).length;
  const scoredParticipantCount =
    program.program_type === "group" ? (groupScores?.length ?? 0) : (scores?.length ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard/programs"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to Programs
      </Link>

      <Card className="card-elevated">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-row items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-primary">
              <span className="material-symbols-outlined text-[24px]">theater_comedy</span>
            </div>
            <div>
              <CardTitle className="text-xl">{program.name}</CardTitle>
              <CardDescription>
                Max score {program.max_score} ·{" "}
                {PROGRAM_TYPE_LABELS[program.program_type]} ·{" "}
                {STUDENT_DIVISION_LABELS[program.category]} ·{" "}
                {GENDER_CATEGORY_LABELS[program.gender_category]}
              </CardDescription>
            </div>
          </div>
          <StatusControl programId={id} status={program.status} />
        </CardHeader>
      </Card>

      <Tabs defaultValue="participants">
        <div className="overflow-x-auto">
          <TabsList className="h-auto gap-1 rounded-xl bg-muted p-1">
            <TabsTrigger value="participants" className="gap-1.5 rounded-lg py-2">
              <span className="material-symbols-outlined text-[18px]">groups</span>
              Participants
            </TabsTrigger>
            <TabsTrigger value="codes" className="gap-1.5 rounded-lg py-2">
              <span className="material-symbols-outlined text-[18px]">tag</span>
              Codes
            </TabsTrigger>
            <TabsTrigger value="scores" className="gap-1.5 rounded-lg py-2">
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              Enter Scores
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="participants" className="mt-4">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Participants</CardTitle>
              <CardDescription>
                {program.program_type === "group"
                  ? "Select which groups take part in this program."
                  : "Select which students take part in this program."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {program.program_type === "group" ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {eligibleGroups.map((group) => {
                    const checked = groupParticipantIds.has(group.id);
                    return (
                      <ToggleCheckbox
                        key={group.id}
                        checked={checked}
                        label={group.name}
                        action={
                          checked
                            ? removeGroupParticipant.bind(null, id, group.id)
                            : addGroupParticipant.bind(null, id, group.id)
                        }
                      />
                    );
                  })}
                  {!eligibleGroups.length && (
                    <p className="text-sm text-muted-foreground">
                      No eligible groups for this division/category.
                    </p>
                  )}
                </div>
              ) : (
                <ParticipantSearch
                  students={eligibleStudents}
                  groupNameById={groupNameById}
                  participantStudentIds={participantStudentIds}
                  programId={id}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="codes" className="mt-4">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Codes</CardTitle>
              <CardDescription>
                Anonymized codes shown alongside participants during judging.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <CodesPanel programId={id} hasCodes={hasCodes} locked={locked} />
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {program.program_type === "group"
                    ? (groupParticipants ?? []).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{groupNameById.get(p.group_id) ?? "—"}</TableCell>
                          <TableCell>
                            {p.code ?? (
                              <span className="text-muted-foreground">Not generated</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    : (participants ?? []).map((p) => {
                        const student = (students ?? []).find((s) => s.id === p.student_id);
                        return (
                          <TableRow key={p.id}>
                            <TableCell>{student?.name ?? "—"}</TableCell>
                            <TableCell>
                              {p.code ?? (
                                <span className="text-muted-foreground">Not generated</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  {program.program_type === "group"
                    ? !groupParticipants?.length && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">
                            No participants yet.
                          </TableCell>
                        </TableRow>
                      )
                    : !participants?.length && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">
                            No participants yet.
                          </TableCell>
                        </TableRow>
                      )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="scores" className="mt-4">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Enter Scores</CardTitle>
              <CardDescription>
                Judges score on paper during the event — enter each participant&apos;s
                final score here.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ScoreCompletionBanner
                programId={id}
                status={program.status}
                scoredCount={scoredParticipantCount}
                totalCount={totalParticipantCount}
              />
              {program.program_type === "group" ? (
                <ScoreEntryPanel
                  kind="group"
                  programId={id}
                  maxScore={program.max_score}
                  participants={(groupParticipants ?? []).map((p) => ({
                    id: p.group_id,
                    code: p.code,
                    name: groupNameById.get(p.group_id) ?? "—",
                  }))}
                  scoresByParticipant={groupScoresByGroup}
                />
              ) : (
                <ScoreEntryPanel
                  kind="student"
                  programId={id}
                  maxScore={program.max_score}
                  participants={(participants ?? []).map((p) => ({
                    id: p.student_id,
                    code: p.code,
                    name: studentNameById.get(p.student_id) ?? "—",
                  }))}
                  scoresByParticipant={scoresByStudent}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
