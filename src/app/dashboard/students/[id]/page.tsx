import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlaceholderAvatar } from "@/components/gender-avatar";
import { STUDENT_CATEGORY_LABELS } from "@/lib/validations/student";
import type {
  Division,
  Group,
  Program,
  ProgramParticipant,
  Student,
} from "@/lib/types";
import { StudentProgramList } from "./student-program-list";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("name")
    .eq("id", id)
    .maybeSingle<Pick<Student, "name">>();

  return { title: data ? `${data.name} — Student` : "Student" };
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .maybeSingle<Student>();

  if (!student) {
    notFound();
  }

  const [
    { data: division },
    { data: group },
    { data: generalDivision },
    { data: participants },
  ] = await Promise.all([
    supabase
      .from("divisions")
      .select("name")
      .eq("id", student.division)
      .maybeSingle<Pick<Division, "name">>(),
    supabase
      .from("groups")
      .select("name")
      .eq("id", student.group_id)
      .maybeSingle<Pick<Group, "name">>(),
    supabase
      .from("divisions")
      .select("id")
      .eq("name", "General")
      .maybeSingle<Pick<Division, "id">>(),
    supabase
      .from("program_participants")
      .select("program_id")
      .eq("student_id", id)
      .returns<Pick<ProgramParticipant, "program_id">[]>(),
  ]);

  // A student can only enter individual programs in their own division —
  // except "General" division programs, which are open to every student
  // regardless of their own division (same relaxation as
  // src/app/dashboard/programs/[id]/page.tsx's isGeneralDivision).
  const eligibleCategoryIds = [...new Set([student.division, generalDivision?.id].filter(Boolean))];

  const { data: programs } = await supabase
    .from("programs")
    .select("*")
    .eq("program_type", "individual")
    .in("category", eligibleCategoryIds)
    .order("name")
    .returns<Program[]>();

  // Same eligibility rule as the program detail page's participant picker
  // (src/app/dashboard/programs/[id]/page.tsx matchesEligibility) — a
  // program open to "mixed" or matching this student's own category.
  const eligiblePrograms = (programs ?? []).filter(
    (p) => p.gender_category === "mixed" || p.gender_category === student.category,
  );
  const participantProgramIds = [...new Set((participants ?? []).map((p) => p.program_id))];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/students"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to Students
      </Link>

      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            {student.photo_url ? (
              <Image src={student.photo_url} alt="" fill sizes="64px" className="object-cover" />
            ) : (
              <PlaceholderAvatar
                category={student.category}
                isGroup={false}
                className="size-full p-3"
              />
            )}
          </div>
          <div>
            <CardTitle className="text-xl">{student.name}</CardTitle>
            <CardDescription>
              {division?.name ?? "—"} · {STUDENT_CATEGORY_LABELS[student.category]} ·{" "}
              {group?.name ?? "—"}
              {student.chest_number && <> · Chest #{student.chest_number}</>}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Programs</CardTitle>
          <CardDescription>
            Individual programs available for this student&apos;s division and category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentProgramList
            studentId={id}
            programs={eligiblePrograms}
            participantProgramIds={participantProgramIds}
          />
        </CardContent>
      </Card>
    </div>
  );
}
