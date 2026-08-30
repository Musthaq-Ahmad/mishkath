import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { GENDER_CATEGORY_LABELS } from "@/lib/validations/program";
import type {
  Division,
  Group,
  Program,
  ProgramGroupParticipant,
  ProgramGroupParticipantMember,
  ProgramParticipant,
  Student,
} from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("programs")
    .select("name")
    .eq("id", id)
    .maybeSingle<Pick<Program, "name">>();

  return { title: data ? `Participant List — ${data.name}` : "Participant List" };
}

type IndividualRow = { chestNumber: string | null; name: string; group: string };
type GroupRow = { name: string };

export default async function ProgramRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;

  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("*")
    .eq("id", id)
    .single<Program>();

  if (!program) {
    notFound();
  }

  const [{ data: division }, { data: groups }] = await Promise.all([
    supabase
      .from("divisions")
      .select("name")
      .eq("id", program.category)
      .maybeSingle<Pick<Division, "name">>(),
    supabase.from("groups").select("id, name").returns<Pick<Group, "id" | "name">[]>(),
  ]);
  const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]));

  const isGroupProgram = program.program_type === "group";
  let individualRows: IndividualRow[] = [];
  let groupRows: GroupRow[] = [];

  if (isGroupProgram) {
    // A group program's roster is its list of participating teams, not a
    // per-member breakdown — one row per entry, named "<first member
    // alphabetically> & <party name>" (same convention as the program
    // detail page's entryLabel), not a group-name-plus-letter suffix.
    const [{ data: entries }, { data: members }] = await Promise.all([
      supabase
        .from("program_group_participants")
        .select("*")
        .eq("program_id", id)
        .returns<ProgramGroupParticipant[]>(),
      supabase
        .from("program_group_participant_members")
        .select("*")
        .eq("program_id", id)
        .returns<ProgramGroupParticipantMember[]>(),
    ]);

    const studentIds = [...new Set((members ?? []).map((m) => m.student_id))];
    const { data: memberStudents } = studentIds.length
      ? await supabase
          .from("students")
          .select("id, name")
          .in("id", studentIds)
          .returns<Pick<Student, "id" | "name">[]>()
      : { data: [] as Pick<Student, "id" | "name">[] };
    const memberStudentNameById = new Map((memberStudents ?? []).map((s) => [s.id, s.name]));

    const memberNamesByParticipant = new Map<string, string[]>();
    for (const member of members ?? []) {
      const studentName = memberStudentNameById.get(member.student_id);
      if (!studentName) continue;
      const names = memberNamesByParticipant.get(member.participant_id) ?? [];
      names.push(studentName);
      memberNamesByParticipant.set(member.participant_id, names);
    }

    groupRows = (entries ?? [])
      .map((entry) => {
        const groupName = groupNameById.get(entry.group_id) ?? "—";
        const memberNames = memberNamesByParticipant.get(entry.id) ?? [];
        const name = memberNames.length
          ? `${[...memberNames].sort((a, b) => a.localeCompare(b))[0]} & ${groupName}`
          : groupName;
        return { name };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } else {
    const { data: participants } = await supabase
      .from("program_participants")
      .select("*")
      .eq("program_id", id)
      .returns<ProgramParticipant[]>();

    const studentIds = [...new Set((participants ?? []).map((p) => p.student_id))];
    const { data: students } = studentIds.length
      ? await supabase
          .from("students")
          .select("id, name, chest_number, group_id")
          .in("id", studentIds)
          .returns<Pick<Student, "id" | "name" | "chest_number" | "group_id">[]>()
      : { data: [] as Pick<Student, "id" | "name" | "chest_number" | "group_id">[] };

    individualRows = (students ?? [])
      .map((student) => ({
        chestNumber: student.chest_number,
        name: student.name,
        group: groupNameById.get(student.group_id) ?? "—",
      }))
      .sort((a, b) => (a.chestNumber ?? "").localeCompare(b.chestNumber ?? "", undefined, { numeric: true }));
  }

  const rowCount = isGroupProgram ? groupRows.length : individualRows.length;

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-10 text-foreground [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:bg-white sm:px-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div className="flex w-full items-center justify-between print:hidden">
          <Link
            href={`/dashboard/programs/${id}`}
            className="inline-flex w-fit items-center gap-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Program
          </Link>
          <PrintButton label="Print Participant List" />
        </div>

        <div className="flex flex-col items-center gap-2 pb-2 text-center">
          <Image
            src="/mehfile-meem-logo-indigo.png"
            alt="Mehfile Meem — Meelad Fest 2K26"
            width={220}
            height={131}
            className="h-auto w-[150px]"
            priority
          />
          <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
            Participant List
          </p>
        </div>

        <div className="flex flex-col items-center gap-1 border-b border-foreground pb-6 text-center">
          <h1 className="font-heading text-3xl font-bold text-balance">{program.name}</h1>
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {division?.name ?? "—"} · {GENDER_CATEGORY_LABELS[program.gender_category]}
          </p>
        </div>

        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-foreground text-xs font-bold tracking-wide uppercase">
              {isGroupProgram ? (
                <th className="py-2">Team</th>
              ) : (
                <>
                  <th className="py-2">Chest No.</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Group</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {isGroupProgram
              ? groupRows.map((row, index) => (
                  <tr key={index} className="border-b border-border" style={{ breakInside: "avoid" }}>
                    <td className="py-3 font-medium">{row.name}</td>
                  </tr>
                ))
              : individualRows.map((row, index) => (
                  <tr key={index} className="border-b border-border" style={{ breakInside: "avoid" }}>
                    <td className="py-3 font-heading text-lg font-bold tabular-nums">
                      {row.chestNumber ?? "—"}
                    </td>
                    <td className="py-3 font-medium">{row.name}</td>
                    <td className="py-3 text-muted-foreground">{row.group}</td>
                  </tr>
                ))}
            {!rowCount && (
              <tr>
                <td colSpan={isGroupProgram ? 1 : 3} className="py-8 text-center text-muted-foreground">
                  No participants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <p className="text-xs text-muted-foreground print:hidden">
          {rowCount} {isGroupProgram ? "team" : "participant"}
          {rowCount === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}
