"use client";

import { useState } from "react";
import { ToggleCheckbox } from "./toggle-checkbox";
import { addParticipant, removeParticipant } from "../actions";
import type { Group, Student } from "@/lib/types";

export function GroupedParticipantSearch({
  students,
  groups,
  participantStudentIds,
  programId,
}: {
  students: Student[];
  groups: Group[];
  participantStudentIds: Set<string>;
  programId: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = students.filter((student) =>
    student.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const studentsByGroup = new Map<string, Student[]>();
  for (const student of filtered) {
    const list = studentsByGroup.get(student.group_id) ?? [];
    list.push(student);
    studentsByGroup.set(student.group_id, list);
  }

  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground">
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students by name..."
          className="w-full rounded-lg border border-border bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {sortedGroups.map((group) => {
          const groupStudents = studentsByGroup.get(group.id) ?? [];
          if (!groupStudents.length) return null;
          return (
            <div key={group.id} className="rounded-lg border border-border p-2.5">
              <p className="mb-2 text-xs font-medium text-muted-foreground">{group.name}</p>
              <div className="flex flex-col gap-1.5">
                {groupStudents.map((student) => {
                  const checked = participantStudentIds.has(student.id);
                  return (
                    <ToggleCheckbox
                      key={student.id}
                      checked={checked}
                      label={student.name}
                      action={
                        checked
                          ? removeParticipant.bind(null, programId, student.id)
                          : addParticipant.bind(null, programId, student.id)
                      }
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
        {!filtered.length && (
          <p className="text-sm text-muted-foreground">No matching students.</p>
        )}
      </div>
    </div>
  );
}
