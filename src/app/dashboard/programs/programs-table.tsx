"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteButton } from "@/components/delete-button";
import type { Division, Program } from "@/lib/types";
import {
  GENDER_CATEGORIES,
  GENDER_CATEGORY_LABELS,
  PROGRAM_STATUSES,
  PROGRAM_STATUS_LABELS,
  PROGRAM_TYPES,
  PROGRAM_TYPE_LABELS,
} from "@/lib/validations/program";
import Image from "next/image";
import { formatScheduleTime } from "@/lib/schedule";
import { PrintButton } from "@/components/print-button";
import { ProgramForm } from "./program-form";
import { deleteProgram } from "./actions";

export function ProgramsTable({
  programs,
  divisions,
  participantCounts,
  conflictedProgramIds,
}: {
  programs: Program[];
  divisions: Division[];
  participantCounts: Record<string, number>;
  conflictedProgramIds: string[];
}) {
  const [divisionId, setDivisionId] = useState("");
  const [genderCategory, setGenderCategory] = useState("");
  const [programType, setProgramType] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");

  const divisionNameById = useMemo(
    () => new Map(divisions.map((d) => [d.id, d.name])),
    [divisions],
  );
  const conflictedSet = useMemo(() => new Set(conflictedProgramIds), [conflictedProgramIds]);

  const hasActiveFilters =
    divisionId !== "" || genderCategory !== "" || programType !== "" || status !== "" || query.trim() !== "";

  const filteredPrograms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return programs.filter((program) => {
      if (divisionId && program.category !== divisionId) return false;
      if (genderCategory && program.gender_category !== genderCategory) return false;
      if (programType && program.program_type !== programType) return false;
      if (status && program.status !== status) return false;
      if (normalizedQuery && !program.name.toLowerCase().includes(normalizedQuery)) return false;
      return true;
    });
  }, [programs, divisionId, genderCategory, programType, status, query]);

  function clearFilters() {
    setDivisionId("");
    setGenderCategory("");
    setProgramType("");
    setStatus("");
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-4">
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
          Program List
        </p>
      </div>

      {/* Filters */}
      <div className="card-elevated flex flex-col gap-4 rounded-xl bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end print:hidden">
        <div className="min-w-[9rem] flex-1">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Division
          </label>
          <select
            value={divisionId}
            onChange={(e) => setDivisionId(e.target.value)}
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
        <div className="min-w-[9rem] flex-1">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Gender
          </label>
          <select
            value={genderCategory}
            onChange={(e) => setGenderCategory(e.target.value)}
            className="h-9 w-full rounded-lg border-none bg-muted px-2.5 text-sm text-foreground"
          >
            <option value="">All</option>
            {GENDER_CATEGORIES.map((g) => (
              <option key={g} value={g}>
                {GENDER_CATEGORY_LABELS[g]}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[9rem] flex-1">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Type
          </label>
          <select
            value={programType}
            onChange={(e) => setProgramType(e.target.value)}
            className="h-9 w-full rounded-lg border-none bg-muted px-2.5 text-sm text-foreground"
          >
            <option value="">All Types</option>
            {PROGRAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROGRAM_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[9rem] flex-1">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 w-full rounded-lg border-none bg-muted px-2.5 text-sm text-foreground"
          >
            <option value="">All Statuses</option>
            {PROGRAM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROGRAM_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[10rem] flex-1">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Search
          </label>
          <div className="flex h-9 items-center gap-2 rounded-lg bg-muted px-2.5">
            <span className="material-symbols-outlined text-[18px] text-muted-foreground">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Program name…"
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

      <Card className="py-0">
        <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4 print:hidden">
          <CardTitle className="text-base">Live Schedule</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {hasActiveFilters ? (
                <>
                  {filteredPrograms.length} / {programs.length} programs
                </>
              ) : (
                <>{programs.length} programs</>
              )}
            </span>
            <PrintButton label="Download PDF" />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                <TableHead className="text-xs tracking-wider text-primary-foreground uppercase">
                  Program Name
                </TableHead>
                <TableHead className="text-xs tracking-wider text-primary-foreground uppercase">
                  Category
                </TableHead>
                <TableHead className="text-xs tracking-wider text-primary-foreground uppercase">
                  Scheduled
                </TableHead>
                <TableHead className="text-xs tracking-wider text-primary-foreground uppercase">
                  Participants
                </TableHead>
                <TableHead className="text-xs tracking-wider text-primary-foreground uppercase">
                  Status
                </TableHead>
                <TableHead className="w-32 text-right text-xs tracking-wider text-primary-foreground uppercase print:hidden">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrograms.map((program) => (
                <TableRow
                  key={program.id}
                  className="hover:bg-surface-container-low transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary">
                        <span className="material-symbols-outlined text-[20px]">theater_comedy</span>
                      </div>
                      <div>
                        <Link
                          href={`/dashboard/programs/${program.id}`}
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {program.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Max score {program.max_score}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      {divisionNameById.get(program.category) ?? "—"} ·{" "}
                      {GENDER_CATEGORY_LABELS[program.gender_category]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {program.scheduled_start ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground">
                          {formatScheduleTime(program.scheduled_start)}
                        </span>
                        {conflictedSet.has(program.id) && (
                          <span
                            className="material-symbols-outlined text-[16px] text-destructive"
                            title="Scheduling conflict: another program shares this exact start time"
                          >
                            warning
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{participantCounts[program.id] ?? 0}</TableCell>
                  <TableCell>
                    <span className="rounded-md bg-surface-container-low px-2 py-1 text-xs font-medium text-muted-foreground">
                      {PROGRAM_STATUS_LABELS[program.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right print:hidden">
                    <div className="flex justify-end gap-1">
                      <ProgramForm
                        program={program}
                        divisions={divisions}
                        trigger={
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        }
                      />
                      <DeleteButton action={deleteProgram.bind(null, program.id)} label="Program" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!filteredPrograms.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {programs.length ? "No programs match these filters." : "No programs yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
