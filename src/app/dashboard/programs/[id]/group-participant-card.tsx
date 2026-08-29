"use client";

import { useTransition } from "react";
import { ToggleCheckbox } from "@/components/toggle-checkbox";
import { DeleteButton } from "@/components/delete-button";
import { toastResult } from "@/lib/toast";
import {
  addGroupParticipant,
  removeGroupParticipant,
  addGroupParticipantMember,
  removeGroupParticipantMember,
} from "../actions";
import type { Group, Student } from "@/lib/types";

export type GroupEntryViewModel = {
  id: string;
  label: string;
  students: Student[];
  selectedMemberIds: string[];
};

// A group can field more than one team in the same program (see
// supabase/migrations/0029_group_multiple_teams.sql) — this renders every
// existing program_group_participants entry for the group as its own
// roster card, plus an "add team" action to create another. `entries` is
// fully pre-computed by the server component (label, eligible students,
// selected members) rather than passed as lookup functions — functions
// can't cross the server/client component boundary as props.
export function GroupParticipantCard({
  programId,
  group,
  entries,
}: {
  programId: string;
  group: Group;
  entries: GroupEntryViewModel[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{group.name}</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await addGroupParticipant(programId, group.id);
              toastResult(result ?? undefined, "Team added");
            });
          }}
          className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          {pending ? "Adding..." : "+ Add team"}
        </button>
      </div>

      {!entries.length && (
        <p className="text-xs text-muted-foreground">Not participating yet.</p>
      )}

      {entries.map((entry) => {
        const selectedMemberIds = new Set(entry.selectedMemberIds);
        return (
          <div key={entry.id} className="rounded-md bg-muted/40 p-2">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted-foreground">{entry.label}</p>
              <DeleteButton
                action={removeGroupParticipant.bind(null, programId, entry.id)}
                size="icon-sm"
                label="team"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </DeleteButton>
            </div>
            <div className="ml-1 flex flex-col gap-1.5 border-l border-border pl-3">
              <p className="text-xs font-medium text-muted-foreground">Members performing</p>
              {entry.students.map((student) => {
                const memberChecked = selectedMemberIds.has(student.id);
                return (
                  <ToggleCheckbox
                    key={student.id}
                    checked={memberChecked}
                    label={student.name}
                    action={
                      memberChecked
                        ? removeGroupParticipantMember.bind(null, programId, entry.id, student.id)
                        : addGroupParticipantMember.bind(
                            null,
                            programId,
                            group.id,
                            entry.id,
                            student.id,
                          )
                    }
                  />
                );
              })}
              {!entry.students.length && (
                <p className="text-xs text-muted-foreground">No eligible students available.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
