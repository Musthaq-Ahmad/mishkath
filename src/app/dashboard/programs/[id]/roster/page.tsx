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

type Row = { chestNumber: string | null; name: string; group: string };

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

  let rows: Row[];

  if (program.program_type === "group") {
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

    // A group can field more than one team in the same program (see
    // supabase/migrations/0029_group_multiple_teams.sql), so a group with
    // 2+ teams gets "A"/"B" suffixes — same labeling as the program detail
    // page's participants/codes/history tabs.
    const entriesByGroup = new Map<string, ProgramGroupParticipant[]>();
    for (const entry of entries ?? []) {
      const list = entriesByGroup.get(entry.group_id) ?? [];
      list.push(entry);
      entriesByGroup.set(entry.group_id, list);
    }
    for (const list of entriesByGroup.values()) {
      list.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    }
    const entryLabelById = new Map(
      (entries ?? []).map((entry) => {
        const groupName = groupNameById.get(entry.group_id) ?? "—";
        const siblings = entriesByGroup.get(entry.group_id) ?? [entry];
        const label =
          siblings.length <= 1
            ? groupName
            : `${groupName} ${String.fromCharCode(65 + siblings.findIndex((e) => e.id === entry.id))}`;
        return [entry.id, label];
      }),
    );

    const studentIds = [...new Set((members ?? []).map((m) => m.student_id))];
    const { data: students } = studentIds.length
      ? await supabase
          .from("students")
          .select("id, name, chest_number")
          .in("id", studentIds)
          .returns<Pick<Student, "id" | "name" | "chest_number">[]>()
      : { data: [] as Pick<Student, "id" | "name" | "chest_number">[] };
    const studentById = new Map((students ?? []).map((s) => [s.id, s]));

    rows = (members ?? []).map((member) => {
      const student = studentById.get(member.student_id);
      return {
        chestNumber: student?.chest_number ?? null,
        name: student?.name ?? "—",
        group: entryLabelById.get(member.participant_id) ?? "—",
      };
    });
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

    rows = (students ?? []).map((student) => ({
      chestNumber: student.chest_number,
      name: student.name,
      group: groupNameById.get(student.group_id) ?? "—",
    }));
  }

  rows.sort((a, b) =>
    (a.chestNumber ?? "").localeCompare(b.chestNumber ?? "", undefined, { numeric: true }),
  );

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
              <th className="py-2">Chest No.</th>
              <th className="py-2">Name</th>
              <th className="py-2">Group</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-border" style={{ breakInside: "avoid" }}>
                <td className="py-3 font-heading text-lg font-bold tabular-nums">
                  {row.chestNumber ?? "—"}
                </td>
                <td className="py-3 font-medium">{row.name}</td>
                <td className="py-3 text-muted-foreground">{row.group}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-muted-foreground">
                  No participants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <p className="text-xs text-muted-foreground print:hidden">
          {rows.length} participant{rows.length === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}
