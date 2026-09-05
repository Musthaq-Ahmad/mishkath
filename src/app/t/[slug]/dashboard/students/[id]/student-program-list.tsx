"use client";

import { ToggleCheckbox } from "@/components/toggle-checkbox";
import { addParticipant, removeParticipant } from "@/app/t/[slug]/dashboard/programs/actions";
import { PROGRAM_STATUS_LABELS } from "@/lib/validations/program";
import type { Program } from "@/lib/types";

export function StudentProgramList({
  studentId,
  programs,
  participantProgramIds,
}: {
  studentId: string;
  programs: Program[];
  participantProgramIds: string[];
}) {
  const selected = new Set(participantProgramIds);

  if (!programs.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No individual programs available for this student&apos;s division/category.
      </p>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {programs.map((program) => {
        const checked = selected.has(program.id);
        return (
          <ToggleCheckbox
            key={program.id}
            checked={checked}
            label={`${program.name} — ${PROGRAM_STATUS_LABELS[program.status]}`}
            action={
              checked
                ? removeParticipant.bind(null, program.id, studentId)
                : addParticipant.bind(null, program.id, studentId)
            }
          />
        );
      })}
    </div>
  );
}
