"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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
import { downloadCsv, toCsv } from "@/lib/csv";
import { PrintButton } from "@/components/print-button";
import type { Division, Group, Student } from "@/lib/types";
import { STUDENT_CATEGORY_LABELS } from "@/lib/validations/student";
import { CheckInToggle } from "./check-in-toggle";
import { StudentForm } from "./student-form";
import { deleteStudent } from "./actions";

export function StudentsTable({
  students,
  groups,
  divisions,
  initialQuery = "",
}: {
  students: Student[];
  groups: Group[];
  divisions: Division[];
  initialQuery?: string;
}) {
  const [groupId, setGroupId] = useState("");
  const [division, setDivision] = useState("");
  const [query, setQuery] = useState(initialQuery);

  const groupNameById = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name])),
    [groups],
  );
  const divisionNameById = useMemo(
    () => new Map(divisions.map((division) => [division.id, division.name])),
    [divisions],
  );

  const hasActiveFilters = groupId !== "" || division !== "" || query.trim() !== "";

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return students.filter((student) => {
      if (groupId && student.group_id !== groupId) return false;
      if (division && student.division !== division) return false;
      if (normalizedQuery) {
        const haystack = [
          student.name,
          student.chest_number ?? "",
          groupNameById.get(student.group_id) ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [students, groupId, division, query, groupNameById]);

  function clearFilters() {
    setGroupId("");
    setDivision("");
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Print-only letterhead — shown only when printing/saving as PDF */}
      <div className="hidden flex-col items-center gap-2 pb-4 text-center print:flex">
        <Image
          src="/mehfile-meem-logo-indigo.png"
          alt="Mehfile Meem — Meelad Fest 2K26"
          width={220}
          height={131}
          className="h-auto w-[170px]"
        />
        <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
          Students Directory
        </p>
      </div>

      {/* Filters & stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 print:hidden">
        <div className="card-elevated flex flex-col gap-4 rounded-xl bg-card p-4 sm:flex-row sm:items-end lg:col-span-8">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Filter by Group
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="h-9 w-full rounded-lg border-none bg-muted px-2.5 text-sm text-foreground"
            >
              <option value="">All Groups</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Filter by Division
            </label>
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="h-9 w-full rounded-lg border-none bg-muted px-2.5 text-sm text-foreground"
            >
              <option value="">All Divisions</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, chest # or group…"
                className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            aria-label="Clear filters"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/40 text-secondary-foreground transition-colors hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">filter_alt_off</span>
          </button>
        </div>

        <div className="lg:col-span-4">
          <div className="card-elevated relative h-full overflow-hidden rounded-xl bg-primary p-4 text-primary-foreground">
            <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
              {hasActiveFilters ? "Matching Students" : "Total Students"}
            </p>
            <h3 className="mt-1 text-3xl font-bold">
              {filteredStudents.length}
              {hasActiveFilters && (
                <span className="text-lg font-medium opacity-70"> / {students.length}</span>
              )}
            </h3>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-8xl text-primary-foreground/10">
              groups
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 print:hidden">
        <button
          type="button"
          onClick={() =>
            downloadCsv(
              "students.csv",
              toCsv(
                [
                  "Name",
                  "Division",
                  "Category",
                  "Group",
                  "Chest Number",
                  "Status",
                  "Checked In",
                ],
                filteredStudents.map((s) => [
                  s.name,
                  divisionNameById.get(s.division) ?? "",
                  STUDENT_CATEGORY_LABELS[s.category],
                  groupNameById.get(s.group_id) ?? "",
                  s.chest_number ?? "",
                  s.is_active ? "Active" : "Inactive",
                  s.checked_in ? "Yes" : "No",
                ]),
              ),
            )
          }
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Export {hasActiveFilters ? "filtered" : "all"} to CSV
        </button>
        <PrintButton label="Download PDF" />
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
                <TableHead className="py-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground print:hidden">
                  Checked In
                </TableHead>
                <TableHead className="w-28 py-4 text-right text-xs font-semibold uppercase tracking-wider text-primary-foreground print:hidden">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
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
                    {divisionNameById.get(student.division) ?? "—"}
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
                  <TableCell className="py-3 print:hidden">
                    <CheckInToggle studentId={student.id} checkedIn={student.checked_in} />
                  </TableCell>
                  <TableCell className="py-3 print:hidden">
                    <div className="flex justify-end gap-1">
                      <StudentForm student={student} groups={groups} divisions={divisions} />
                      <DeleteButton
                        action={deleteStudent.bind(null, student.id)}
                        size="icon-sm"
                        label="Student"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </DeleteButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!filteredStudents.length && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {students.length ? "No students match these filters." : "No students yet."}
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
