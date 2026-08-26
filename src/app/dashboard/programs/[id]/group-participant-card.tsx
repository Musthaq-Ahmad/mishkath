"use client";

import { ToggleCheckbox } from "./toggle-checkbox";
import {
  addGroupParticipant,
  removeGroupParticipant,
  addGroupParticipantMember,
  removeGroupParticipantMember,
} from "../actions";
import type { Group, Student } from "@/lib/types";

export function GroupParticipantCard({
  programId,
  group,
  checked,
  students,
  selectedMemberIds,
}: {
  programId: string;
  group: Group;
  checked: boolean;
  students: Student[];
  selectedMemberIds: Set<string>;
}) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <ToggleCheckbox
        checked={checked}
        label={group.name}
        action={
          checked
            ? removeGroupParticipant.bind(null, programId, group.id)
            : addGroupParticipant.bind(null, programId, group.id)
        }
      />
      {checked && (
        <div className="mt-2 ml-4 flex flex-col gap-1.5 border-l border-border pl-3">
          <p className="text-xs font-medium text-muted-foreground">Members performing</p>
          {students.map((student) => {
            const memberChecked = selectedMemberIds.has(student.id);
            return (
              <ToggleCheckbox
                key={student.id}
                checked={memberChecked}
                label={student.name}
                action={
                  memberChecked
                    ? removeGroupParticipantMember.bind(null, programId, group.id, student.id)
                    : addGroupParticipantMember.bind(null, programId, group.id, student.id)
                }
              />
            );
          })}
          {!students.length && (
            <p className="text-xs text-muted-foreground">No eligible students in this group.</p>
          )}
        </div>
      )}
    </div>
  );
}
