import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteButton } from "@/components/delete-button";
import type { Program, ProgramParticipant } from "@/lib/types";
import { PROGRAM_STATUS_LABELS } from "@/lib/validations/program";
import { STUDENT_DIVISION_LABELS } from "@/lib/validations/student";
import { findScheduleConflicts, formatScheduleTime } from "@/lib/schedule";
import { ProgramForm } from "./program-form";
import { deleteProgram } from "./actions";

export default async function ProgramsPage() {
  await requireRole("admin");

  const supabase = await createClient();
  const [{ data: programs }, { data: participants }] = await Promise.all([
    supabase.from("programs").select("*").order("created_at").returns<Program[]>(),
    supabase
      .from("program_participants")
      .select("*")
      .returns<ProgramParticipant[]>(),
  ]);

  const participantCountByProgram = new Map<string, number>();
  for (const p of participants ?? []) {
    participantCountByProgram.set(
      p.program_id,
      (participantCountByProgram.get(p.program_id) ?? 0) + 1,
    );
  }

  const totalPrograms = programs?.length ?? 0;
  const totalParticipants = participants?.length ?? 0;
  const completedPrograms = (programs ?? []).filter((p) => p.status === "completed").length;
  const conflictedProgramIds = findScheduleConflicts(programs ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="mb-1 flex items-center text-xs font-medium tracking-wide text-muted-foreground">
            <span>Management</span>
            <span className="mx-2">/</span>
            <span className="text-secondary-foreground">Programs</span>
          </nav>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-primary">
            Festival Programs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and monitor current festival schedule and events.
          </p>
        </div>
        <ProgramForm
          trigger={
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create Program
            </span>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card
          className="card-elevated animate-fade-in-up"
          style={{ animationDelay: "0ms" }}
        >
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Total Programs
              </p>
              <span className="material-symbols-outlined text-gold">calendar_month</span>
            </div>
            <p className="text-3xl font-bold text-primary">{totalPrograms}</p>
          </CardContent>
        </Card>
        <Card
          className="card-elevated animate-fade-in-up"
          style={{ animationDelay: "40ms" }}
        >
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Total Participants
              </p>
              <span className="material-symbols-outlined text-gold">groups</span>
            </div>
            <p className="text-3xl font-bold text-primary">{totalParticipants}</p>
          </CardContent>
        </Card>
        <Card
          className="card-elevated animate-fade-in-up"
          style={{ animationDelay: "80ms" }}
        >
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Completed
              </p>
              <span className="material-symbols-outlined text-gold">check_circle</span>
            </div>
            <p className="text-3xl font-bold text-primary">{completedPrograms}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="py-0">
        <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
          <CardTitle className="text-base">Live Schedule</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                <TableHead className="text-xs tracking-wider text-primary-foreground uppercase">
                  Program Name
                </TableHead>
                <TableHead className="text-xs tracking-wider text-primary-foreground uppercase">
                  Category
                </TableHead>
                <TableHead className="text-xs tracking-wider text-primary-foreground uppercase">
                  Scheduled
                </TableHead>
                <TableHead className="text-xs tracking-wider text-primary-foreground uppercase">
                  Participants
                </TableHead>
                <TableHead className="text-xs tracking-wider text-primary-foreground uppercase">
                  Status
                </TableHead>
                <TableHead className="w-32 text-right text-xs tracking-wider text-primary-foreground uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs?.map((program) => (
                <TableRow
                  key={program.id}
                  className="hover:bg-surface-container-low transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary">
                        <span className="material-symbols-outlined text-[20px]">
                          theater_comedy
                        </span>
                      </div>
                      <div>
                        <Link
                          href={`/dashboard/programs/${program.id}`}
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {program.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Max score {program.max_score}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      {STUDENT_DIVISION_LABELS[program.category]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {program.scheduled_start ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground">
                          {formatScheduleTime(program.scheduled_start)}
                        </span>
                        {conflictedProgramIds.has(program.id) && (
                          <span
                            className="material-symbols-outlined text-[16px] text-destructive"
                            title="Scheduling conflict: another program shares this exact start time"
                          >
                            warning
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {participantCountByProgram.get(program.id) ?? 0}
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-surface-container-low px-2 py-1 text-xs font-medium text-muted-foreground">
                      {PROGRAM_STATUS_LABELS[program.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <ProgramForm
                        program={program}
                        trigger={
                          <span className="material-symbols-outlined text-[18px]">
                            edit
                          </span>
                        }
                      />
                      <DeleteButton action={deleteProgram.bind(null, program.id)} label="Program" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!programs?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No programs yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
