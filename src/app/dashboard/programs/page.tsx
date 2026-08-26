import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import type { Division, Program, ProgramParticipant } from "@/lib/types";
import { findScheduleConflicts } from "@/lib/schedule";
import { ProgramForm } from "./program-form";
import { ProgramsTable } from "./programs-table";

export default async function ProgramsPage() {
  await requireRole("admin");

  const supabase = await createClient();
  const [{ data: programs }, { data: participants }, { data: divisions }] = await Promise.all([
    supabase.from("programs").select("*").order("created_at").returns<Program[]>(),
    supabase
      .from("program_participants")
      .select("*")
      .returns<ProgramParticipant[]>(),
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

  const totalPrograms = programs?.length ?? 0;
  const totalParticipants = participants?.length ?? 0;
  const completedPrograms = (programs ?? []).filter((p) => p.status === "completed").length;
  const conflictedProgramIds = [...findScheduleConflicts(programs ?? [])];
  const participantCounts = Object.fromEntries(participantCountByProgram);

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
