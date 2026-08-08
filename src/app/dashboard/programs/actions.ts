"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { codeForIndex } from "@/lib/codes";
import { ProgramSchema, type ProgramFormState } from "@/lib/validations/program";
import type { ProgramStatus, ProgramType } from "@/lib/types";

export async function createProgram(
  _state: ProgramFormState,
  formData: FormData,
): Promise<ProgramFormState> {
  await requireRole("admin");

  const validatedFields = ProgramSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    program_type: formData.get("program_type"),
    gender_category: formData.get("gender_category"),
    max_score: formData.get("max_score"),
    scheduled_start: formData.get("scheduled_start"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { scheduled_start, ...rest } = validatedFields.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("programs")
    .insert({ ...rest, scheduled_start: scheduled_start || null });

  if (error) {
    return { message: "Could not create program." };
  }

  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard");
  return undefined;
}

export async function updateProgram(
  id: string,
  _state: ProgramFormState,
  formData: FormData,
): Promise<ProgramFormState> {
  await requireRole("admin");

  const validatedFields = ProgramSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    program_type: formData.get("program_type"),
    gender_category: formData.get("gender_category"),
    max_score: formData.get("max_score"),
    scheduled_start: formData.get("scheduled_start"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { scheduled_start, ...rest } = validatedFields.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("programs")
    .update({ ...rest, scheduled_start: scheduled_start || null })
    .eq("id", id);

  if (error) {
    return { message: "Could not update program." };
  }

  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard");
  return undefined;
}

export async function deleteProgram(id: string) {
  await requireRole("admin");

  const supabase = await createClient();
  await supabase.from("programs").delete().eq("id", id);

  revalidatePath("/dashboard/programs");
}

export async function publishResults(programId: string): Promise<{ message?: string } | undefined> {
  await requireRole("admin");

  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("status")
    .eq("id", programId)
    .single<{ status: ProgramStatus }>();

  if (program?.status !== "completed") {
    return { message: "Evaluation must be marked Completed before publishing results." };
  }

  const { error } = await supabase
    .from("programs")
    .update({ published: true, published_at: new Date().toISOString() })
    .eq("id", programId);

  if (error) {
    return { message: error.message };
  }

  revalidatePath("/dashboard/results");
  revalidatePath("/leaderboard");
  return undefined;
}

export async function unpublishResults(programId: string): Promise<{ message?: string } | undefined> {
  await requireRole("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("programs")
    .update({ published: false })
    .eq("id", programId);

  if (error) {
    return { message: error.message };
  }

  revalidatePath("/dashboard/results");
  revalidatePath("/leaderboard");
  return undefined;
}

async function isJudgingLocked(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string,
) {
  const [{ count: scoreCount }, { count: groupScoreCount }] = await Promise.all([
    supabase.from("scores").select("*", { count: "exact", head: true }).eq("program_id", programId),
    supabase.from("group_scores").select("*", { count: "exact", head: true }).eq("program_id", programId),
  ]);
  return (scoreCount ?? 0) > 0 || (groupScoreCount ?? 0) > 0;
}

async function shuffleAndAssignCodes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string,
  programType: ProgramType,
) {
  const table = programType === "group" ? "program_group_participants" : "program_participants";
  const { data: rows } = await supabase.from(table).select("id").eq("program_id", programId);

  if (!rows || rows.length === 0) return;

  const shuffled = [...rows];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  await Promise.all(
    shuffled.map((row, index) =>
      supabase.from(table).update({ code: codeForIndex(index + 1) }).eq("id", row.id),
    ),
  );
}

export async function generateParticipantCodes(
  programId: string,
): Promise<{ message?: string } | undefined> {
  await requireRole("admin");
  const supabase = await createClient();

  if (await isJudgingLocked(supabase, programId)) {
    return { message: "Judging has begun — codes are locked and cannot be regenerated." };
  }

  const { data: program } = await supabase
    .from("programs")
    .select("program_type")
    .eq("id", programId)
    .single<{ program_type: ProgramType }>();

  if (!program) {
    return { message: "Program not found." };
  }

  await shuffleAndAssignCodes(supabase, programId, program.program_type);

  revalidatePath(`/dashboard/programs/${programId}`);
  return undefined;
}

export async function setProgramStatus(programId: string, status: ProgramStatus) {
  await requireRole("admin");
  const supabase = await createClient();

  if (status === "scheduled" && !(await isJudgingLocked(supabase, programId))) {
    const { data: program } = await supabase
      .from("programs")
      .select("program_type")
      .eq("id", programId)
      .single<{ program_type: ProgramType }>();

    if (program) {
      const table =
        program.program_type === "group" ? "program_group_participants" : "program_participants";
      const { count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("program_id", programId)
        .not("code", "is", null);

      if (!count) {
        await shuffleAndAssignCodes(supabase, programId, program.program_type);
      }
    }
  }

  await supabase.from("programs").update({ status }).eq("id", programId);

  revalidatePath(`/dashboard/programs/${programId}`);
  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard");
}

export async function addGroupParticipant(programId: string, groupId: string) {
  await requireRole("admin");

  const supabase = await createClient();
  await supabase
    .from("program_group_participants")
    .insert({ program_id: programId, group_id: groupId });

  revalidatePath(`/dashboard/programs/${programId}`);
}

export async function removeGroupParticipant(programId: string, groupId: string) {
  await requireRole("admin");

  const supabase = await createClient();
  await supabase
    .from("program_group_participants")
    .delete()
    .eq("program_id", programId)
    .eq("group_id", groupId);

  revalidatePath(`/dashboard/programs/${programId}`);
}

export async function addParticipant(programId: string, studentId: string) {
  await requireRole("admin");

  const supabase = await createClient();
  await supabase
    .from("program_participants")
    .insert({ program_id: programId, student_id: studentId });

  revalidatePath(`/dashboard/programs/${programId}`);
}

export async function removeParticipant(programId: string, studentId: string) {
  await requireRole("admin");

  const supabase = await createClient();
  await supabase
    .from("program_participants")
    .delete()
    .eq("program_id", programId)
    .eq("student_id", studentId);

  revalidatePath(`/dashboard/programs/${programId}`);
}
