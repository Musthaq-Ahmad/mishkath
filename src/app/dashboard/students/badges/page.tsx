import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { STUDENT_DIVISION_LABELS } from "@/lib/validations/student";
import type { Group, Student } from "@/lib/types";

export default async function StudentBadgesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  await requireRole("admin");

  const { group: groupId } = await searchParams;
  const supabase = await createClient();

  const [{ data: groups }, { data: students }] = await Promise.all([
    supabase.from("groups").select("*").order("name").returns<Group[]>(),
    supabase
      .from("students")
      .select("*")
      .not("chest_number", "is", null)
      .order("chest_number")
      .returns<Student[]>(),
  ]);

  const groupsList = groups ?? [];
  const groupNameById = new Map(groupsList.map((g) => [g.id, g.name]));
  const visibleStudents = groupId
    ? (students ?? []).filter((s) => s.group_id === groupId)
    : students ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <Link
            href="/dashboard/students"
            className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Students
          </Link>
          <h1 className="font-heading text-2xl font-semibold text-primary">Chest Number Badges</h1>
          <p className="text-sm text-muted-foreground">
            {visibleStudents.length} badge{visibleStudents.length === 1 ? "" : "s"} ready to print.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/students/badges"
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              !groupId
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            All Groups
          </Link>
          {groupsList.map((group) => (
            <Link
              key={group.id}
              href={`/dashboard/students/badges?group=${group.id}`}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                groupId === group.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {group.name}
            </Link>
          ))}
          <PrintButton label="Print Badges" />
        </div>
      </div>

      {visibleStudents.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3 print:gap-3">
          {visibleStudents.map((student) => (
            <div
              key={student.id}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-card p-4 text-center break-inside-avoid"
            >
              <p className="font-heading text-4xl font-black text-primary tabular-nums">
                {student.chest_number}
              </p>
              <p className="truncate text-base font-semibold text-foreground">{student.name}</p>
              <p className="text-xs text-muted-foreground uppercase">
                {STUDENT_DIVISION_LABELS[student.division]} ·{" "}
                {groupNameById.get(student.group_id) ?? "—"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-elevated rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          No chest numbers assigned yet.
        </div>
      )}
    </div>
  );
}
