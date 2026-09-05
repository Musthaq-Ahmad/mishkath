"use client";

import Link from "next/link";
import Image from "next/image";
import { FestivalBrand, type FestivalBrandData } from "@/components/brand/festival-brand";
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
  tenantSlug,
  brand,
}: {
  students: Student[];
  groups: Group[];
  divisions: Division[];
  initialQuery?: string;
  tenantSlug: string;
  brand: FestivalBrandData;
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

  // Same "one section per division, name-sorted" grouping as the CSV
  // export below, but rendered inline for the print-only report instead
  // of split into separate downloads.
  const groupedByDivisionForPrint = useMemo(() => {
    const sortedDivisions = [...divisions].sort((a, b) => a.sort_order - b.sort_order);
    const knownDivisionIds = new Set(sortedDivisions.map((d) => d.id));
    const sections = [
      ...sortedDivisions.map((d) => ({ id: d.id as string | null, label: d.name })),
      { id: null as string | null, label: "Unassigned" },
    ];
    return sections
      .map((section) => ({
        ...section,
        students: filteredStudents
          .filter((s) =>
            section.id === null ? !knownDivisionIds.has(s.division) : s.division === section.id,
          )
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((section) => section.students.length > 0);
  }, [divisions, filteredStudents]);

  function clearFilters() {
    setGroupId("");
    setDivision("");
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Suppresses the browser's own auto-inserted print header/footer
          (URL, page title, date) — Chrome only prints those into the page
          margin, so a zero margin leaves no room for them. Padding on the
          letterhead/body below compensates for the lost page margin. */}
      <style>{`
        @page {
          margin: 0;
        }
      `}</style>

      {/* Print-only letterhead — shown only when printing/saving as PDF */}
      <div className="hidden flex-col items-center gap-2 px-10 pt-10 pb-4 text-center print:flex">
        <FestivalBrand
          {...brand}
          forceLight
          logoClassName="max-h-16 w-auto"
          nameClassName="text-2xl"
        />
        <h1 className="font-heading text-2xl font-bold">Students List</h1>
      </div>

      {/* Print-only body — grouped by division, shown only when printing/
          saving as PDF. The interactive table below is print:hidden. */}
      <div className="hidden flex-col gap-6 px-10 pb-10 print:flex">
        {groupedByDivisionForPrint.map((section) => (
          <div
            key={section.id ?? "unassigned"}
            className="flex flex-col gap-1.5"
            style={{ breakInside: "avoid" }}
          >
            <h2 className="border-b-2 border-foreground pb-1 text-sm font-bold tracking-wide uppercase">
              {section.label}{" "}
              <span className="font-normal text-muted-foreground">
                ({section.students.length})
              </span>
            </h2>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-bold tracking-wide uppercase">
                  <th className="py-1 pr-2">Name</th>
                  <th className="py-1 pr-2">Category</th>
                  <th className="py-1 pr-2">Group</th>
                  <th className="py-1 pr-2">Chest #</th>
                </tr>
              </thead>
              <tbody>
                {section.students.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-border"
                    style={{ breakInside: "avoid" }}
                  >
                    <td className="py-1.5 pr-2 font-medium">{student.name}</td>
                    <td className="py-1.5 pr-2 text-muted-foreground">
                      {STUDENT_CATEGORY_LABELS[student.category]}
                    </td>
                    <td className="py-1.5 pr-2 text-muted-foreground">
                      {groupNameById.get(student.group_id) ?? "—"}
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums text-muted-foreground">
                      {student.chest_number ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {!groupedByDivisionForPrint.length && (
          <p className="text-center text-muted-foreground">
            {students.length ? "No students match these filters." : "No students yet."}
          </p>
        )}
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
          onClick={() => {
            // A separate CSV file per division (in division sort order),
            // instead of one file with division sections — easier to hand
            // a single division's list to whoever's running that stage.
            const sortedDivisions = [...divisions].sort((a, b) => a.sort_order - b.sort_order);
            const knownDivisionIds = new Set(sortedDivisions.map((d) => d.id));
            const sections = [
              ...sortedDivisions.map((d) => ({ label: d.name, id: d.id })),
              { label: "Unassigned", id: null as string | null },
            ];

            for (const section of sections) {
              const sectionStudents = filteredStudents
                .filter((s) =>
                  section.id === null ? !knownDivisionIds.has(s.division) : s.division === section.id,
                )
                .sort((a, b) => a.name.localeCompare(b.name));
              if (!sectionStudents.length) continue;

              const slug = section.label
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

              downloadCsv(
                `students-${slug}.csv`,
                toCsv(
                  ["Name", "Category", "Group", "Chest Number"],
                  sectionStudents.map((s) => [
                    s.name,
                    STUDENT_CATEGORY_LABELS[s.category],
                    groupNameById.get(s.group_id) ?? "",
                    s.chest_number ?? "",
                  ]),
                ),
              );
            }
          }}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Export {hasActiveFilters ? "filtered" : "all"} to CSV (by division)
        </button>
        <PrintButton label="Download PDF" />
      </div>

      {/* Data table — replaced for print by the grouped-by-division report above */}
      <div className="card-elevated animate-fade-in-up overflow-hidden rounded-xl bg-card print:hidden">
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
                        <Link
                          href={`/t/${tenantSlug}/dashboard/students/${student.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {student.name}
                        </Link>
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
