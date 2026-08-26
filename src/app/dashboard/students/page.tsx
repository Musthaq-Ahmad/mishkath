import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { Division, Group, Student } from "@/lib/types";
import { StudentForm } from "./student-form";
import { StudentImportDialog } from "./student-import-dialog";
import { StudentsTable } from "./students-table";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("admin");

  const { q } = await searchParams;
  const supabase = await createClient();

  const [{ data: groups }, { data: students }, { data: divisions }] = await Promise.all([
    supabase.from("groups").select("*").order("created_at").returns<Group[]>(),
    supabase.from("students").select("*").order("created_at").returns<Student[]>(),
    supabase.from("divisions").select("*").order("sort_order").returns<Division[]>(),
  ]);

  const groupsList = groups ?? [];
  const divisionsList = divisions ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <nav className="mb-1 flex items-center text-xs font-medium tracking-wide text-muted-foreground">
            <span>Management</span>
            <span className="mx-2">/</span>
            <span className="text-secondary-foreground">Students</span>
          </nav>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-primary">
            Students Directory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and monitor student enrollments and program participations.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Link
            href="/dashboard/students/badges"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">badge</span>
            Print Badges
          </Link>
          <StudentImportDialog />
          <StudentForm groups={groupsList} divisions={divisionsList} />
        </div>
      </div>

      <StudentsTable
        students={students ?? []}
        groups={groupsList}
        divisions={divisionsList}
        initialQuery={q ?? ""}
      />
    </div>
  );
}
