import Image from "next/image";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Group, Student } from "@/lib/types";
import { STUDENT_CATEGORY_LABELS, STUDENT_DIVISION_LABELS } from "@/lib/validations/student";
import { StudentForm } from "./student-form";
import { deleteStudent } from "./actions";

export default async function StudentsPage() {
  await requireRole("admin");

  const supabase = await createClient();

  const { data: groups } = await supabase
    .from("groups")
    .select("*")
    .order("created_at")
    .returns<Group[]>();

  const { data: students } = await supabase
    .from("students")
    .select("*")
    .order("created_at")
    .returns<Student[]>();

  const groupsList = groups ?? [];
  const groupNameById = new Map(groupsList.map((group) => [group.id, group.name]));

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
        <StudentForm groups={groupsList} />
      </div>

      {/* Filters & stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="card-elevated flex flex-col gap-4 rounded-xl bg-card p-4 sm:flex-row sm:items-end lg:col-span-8">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Filter by Group
            </label>
            <select
              disabled
              className="h-9 w-full rounded-lg border-none bg-muted px-2.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-70"
              defaultValue=""
            >
              <option value="">All Groups</option>
              {groupsList.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Search
            </label>
            <div className="flex h-9 items-center gap-2 rounded-lg bg-muted px-2.5">
              <span className="material-symbols-outlined text-[18px] text-muted-foreground">
                search
              </span>
              <input
                disabled
                placeholder="Search students…"
                className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
              />
            </div>
          </div>
          <button
            type="button"
            disabled
            aria-label="Filter"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/40 text-secondary-foreground transition-colors hover:bg-secondary/60 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
          </button>
        </div>

        <div className="lg:col-span-4">
          <div className="card-elevated relative h-full overflow-hidden rounded-xl bg-primary p-4 text-primary-foreground">
            <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
              Total Students
            </p>
            <h3 className="mt-1 text-3xl font-bold">{students?.length ?? 0}</h3>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-8xl text-primary-foreground/10">
              groups
            </span>
          </div>
        </div>
      </div>

      {/* Data table */}
      <div className="card-elevated animate-fade-in-up overflow-hidden rounded-xl bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                <TableHead className="py-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                  Student
                </TableHead>
                <TableHead className="py-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                  Division
                </TableHead>
                <TableHead className="py-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                  Category
                </TableHead>
                <TableHead className="py-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                  Group
                </TableHead>
                <TableHead className="py-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                  Chest #
                </TableHead>
                <TableHead className="py-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                  Status
                </TableHead>
                <TableHead className="w-28 py-4 text-right text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students?.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold uppercase text-primary">
                        {student.photo_url ? (
                          <Image
                            src={student.photo_url}
                            alt=""
                            width={40}
                            height={40}
                            className="size-10 object-cover"
                          />
                        ) : (
                          student.name.charAt(0)
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-primary">{student.name}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-sm text-muted-foreground">
                    {STUDENT_DIVISION_LABELS[student.division]}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-muted-foreground">
                    {STUDENT_CATEGORY_LABELS[student.category]}
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-gold" />
                      <span className="text-sm font-medium text-muted-foreground">
                        {groupNameById.get(student.group_id) ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-sm font-semibold tabular-nums text-muted-foreground">
                    {student.chest_number ?? "—"}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="status" className="gap-1.5">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          student.is_active ? "bg-success" : "bg-muted-foreground",
                        )}
                      />
                      <span className={student.is_active ? "text-success" : "text-muted-foreground"}>
                        {student.is_active ? "Active" : "Inactive"}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex justify-end gap-1">
                      <StudentForm student={student} groups={groupsList} />
                      <DeleteButton
                        action={deleteStudent.bind(null, student.id)}
                        size="icon-sm"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </DeleteButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!students?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No students yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
