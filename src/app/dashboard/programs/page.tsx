import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import type { Division, Program, ProgramGroupParticipant, ProgramParticipant } from "@/lib/types";
import { findScheduleConflicts, formatScheduleTime, getCurrentAndNextProgram } from "@/lib/schedule";
import { ProgramForm } from "./program-form";
import { ProgramsTable } from "./programs-table";

export default async function ProgramsPage() {
  await requireRole("admin");

  const supabase = await createClient();
  const [{ data: programs }, { data: participants }, { data: groupParticipants }, { data: divisions }] =
    await Promise.all([
      supabase.from("programs").select("*").order("created_at").returns<Program[]>(),
      supabase
        .from("program_participants")
        .select("*")
        .returns<ProgramParticipant[]>(),
      // A group program's "participants" are its team entries, not rows in
      // program_participants (that table is individual-programs only) —
      // each program_group_participants row is one team.
      supabase
        .from("program_group_participants")
        .select("*")
        .returns<ProgramGroupParticipant[]>(),
      supabase.from("divisions").select("*").order("sort_order").returns<Division[]>(),
    ]);

  const divisionsList = divisions ?? [];

  const participantCountByProgram = new Map<string, number>();
  for (const p of participants ?? []) {
    participantCountByProgram.set(
      p.program_id,
      (participantCountByProgram.get(p.program_id) ?? 0) + 1,
    );
  }
  for (const p of groupParticipants ?? []) {
    participantCountByProgram.set(
      p.program_id,
      (participantCountByProgram.get(p.program_id) ?? 0) + 1,
    );
  }

  const totalPrograms = programs?.length ?? 0;
  const totalParticipants = (participants?.length ?? 0) + (groupParticipants?.length ?? 0);
  const completedPrograms = (programs ?? []).filter((p) => p.status === "completed").length;
  const conflictedProgramIds = [...findScheduleConflicts(programs ?? [])];
  const participantCounts = Object.fromEntries(participantCountByProgram);
  const divisionNameById = new Map(divisionsList.map((d) => [d.id, d.name]));
  // Full (unfiltered) programs list, not scheduledPrograms-style — a
  // program can be "running" without a scheduled_start at all.
  const { current: currentProgram, next: nextProgram } = getCurrentAndNextProgram(programs ?? []);

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
          divisions={divisionsList}
          trigger={
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create Program
            </span>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="card-elevated animate-fade-in-up border-l-4 border-l-success">
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-success uppercase">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                </span>
                Now Running
              </p>
              {currentProgram ? (
                <>
                  <p className="mt-1 text-lg font-bold text-primary">{currentProgram.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {divisionNameById.get(currentProgram.category) ?? "—"}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No program running</p>
              )}
            </div>
            <span className="material-symbols-outlined text-3xl text-success">play_circle</span>
          </CardContent>
        </Card>
        <Card className="card-elevated animate-fade-in-up border-l-4 border-l-gold">
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-gold uppercase">Up Next</p>
              {nextProgram ? (
                <>
                  <p className="mt-1 text-lg font-bold text-primary">{nextProgram.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {divisionNameById.get(nextProgram.category) ?? "—"}
                    {nextProgram.scheduled_start &&
                      ` · ${formatScheduleTime(nextProgram.scheduled_start)}`}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Nothing scheduled</p>
              )}
            </div>
            <span className="material-symbols-outlined text-3xl text-gold">schedule</span>
          </CardContent>
        </Card>
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

      <ProgramsTable
        programs={programs ?? []}
        divisions={divisionsList}
        participantCounts={participantCounts}
        conflictedProgramIds={conflictedProgramIds}
      />
    </div>
  );
}
