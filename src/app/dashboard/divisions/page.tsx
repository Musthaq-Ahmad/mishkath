import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { Division, Program, Student } from "@/lib/types";
import { DivisionForm } from "./division-form";
import { DivisionsList } from "./divisions-list";

export default async function DivisionsPage() {
  await requireRole("admin");

  const supabase = await createClient();
  const [{ data: divisions }, { data: students }, { data: programs }] = await Promise.all([
    supabase.from("divisions").select("*").order("sort_order").returns<Division[]>(),
    supabase.from("students").select("id, division").returns<Pick<Student, "id" | "division">[]>(),
    supabase.from("programs").select("id, category").returns<Pick<Program, "id" | "category">[]>(),
  ]);

  const studentCountByDivision = new Map<string, number>();
  for (const student of students ?? []) {
    studentCountByDivision.set(
      student.division,
      (studentCountByDivision.get(student.division) ?? 0) + 1,
    );
  }
  const programCountByDivision = new Map<string, number>();
  for (const program of programs ?? []) {
    programCountByDivision.set(
      program.category,
      (programCountByDivision.get(program.category) ?? 0) + 1,
    );
  }

  const divisionsWithStats = (divisions ?? []).map((division) => ({
    ...division,
    studentCount: studentCountByDivision.get(division.id) ?? 0,
    programCount: programCountByDivision.get(division.id) ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <nav className="mb-1 flex items-center text-xs font-medium tracking-wide text-muted-foreground">
            <span>Management</span>
            <span className="mx-2">/</span>
            <span className="text-secondary-foreground">Divisions</span>
          </nav>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-primary">
            Divisions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the categories students and programs are grouped into.
          </p>
        </div>
        <DivisionForm />
      </div>

      <DivisionsList divisions={divisionsWithStats} />
    </div>
  );
}
