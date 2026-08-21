import Image from "next/image";
import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { groupBgColor, groupTextColor } from "@/lib/group-color";
import { cn } from "@/lib/utils";
import type { Division, Group, Student } from "@/lib/types";

export default async function StudentBadgesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  await requireRole("admin");

  const { group: groupId } = await searchParams;
  const supabase = await createClient();

  const [{ data: groups }, { data: students }, { data: divisions }] = await Promise.all([
    supabase.from("groups").select("*").order("name").returns<Group[]>(),
    supabase
      .from("students")
      .select("*")
      .not("chest_number", "is", null)
      .order("chest_number")
      .returns<Student[]>(),
    supabase.from("divisions").select("*").returns<Division[]>(),
  ]);

  const groupsList = groups ?? [];
  const groupNameById = new Map(groupsList.map((g) => [g.id, g.name]));
  const divisionNameById = new Map((divisions ?? []).map((d) => [d.id, d.name]));
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
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-4">
          {visibleStudents.map((student) => (
            <div
              key={student.id}
              className="card-elevated relative flex aspect-[3/4] flex-col overflow-hidden rounded-2xl border border-border bg-card break-inside-avoid [-webkit-print-color-adjust:exact] [print-color-adjust:exact]"
            >
              <span className={cn("absolute inset-x-0 top-0 h-2", groupBgColor(student.group_id))} />

              <div className="flex flex-col items-center gap-1.5 px-4 pt-6 pb-3">
                <Image
                  src="/mehfile-meem-logo-indigo.png"
                  alt=""
                  width={140}
                  height={83}
                  className="h-7 w-auto opacity-90"
                />
                <p className="text-[9px] font-bold tracking-[0.25em] text-muted-foreground uppercase">
                  Meelad Fest 2K26
                </p>
              </div>

              <div className="flex flex-1 flex-col items-center justify-center gap-1 border-y border-border/60 bg-muted/40 px-4">
                <span className="font-heading text-6xl font-black text-primary tabular-nums">
                  {student.chest_number}
                </span>
                <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                  Chest No.
                </span>
              </div>

              <div className="flex flex-col items-center gap-1 px-3 py-3 text-center">
                <p className="w-full truncate text-base font-semibold text-foreground">
                  {student.name}
                </p>
                <p className="text-xs text-muted-foreground uppercase">
                  {divisionNameById.get(student.division) ?? "—"} ·{" "}
                  <span className={cn("font-semibold", groupTextColor(student.group_id))}>
                    {groupNameById.get(student.group_id) ?? "—"}
                  </span>
                </p>
              </div>
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
