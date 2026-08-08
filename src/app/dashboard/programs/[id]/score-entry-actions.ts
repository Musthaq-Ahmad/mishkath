"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { ScoreSchema, type ScoreFormState } from "@/lib/validations/score";

export async function adminSubmitScore(
  programId: string,
  studentId: string,
  _state: ScoreFormState,
  formData: FormData,
): Promise<ScoreFormState> {
  await requireRole("admin");

  const validatedFields = ScoreSchema.safeParse({
    presentation: formData.get("presentation"),
    content: formData.get("content"),
    overall: formData.get("overall"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("scores").upsert(
    {
      program_id: programId,
      student_id: studentId,
      presentation: validatedFields.data.presentation,
      content: validatedFields.data.content,
      overall: validatedFields.data.overall,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "program_id,student_id" },
  );

  if (error) {
    return { message: "Could not save score." };
  }

  revalidatePath(`/dashboard/programs/${programId}`);
  return { success: true };
}

export async function adminSubmitGroupScore(
  programId: string,
  groupId: string,
  _state: ScoreFormState,
  formData: FormData,
): Promise<ScoreFormState> {
  await requireRole("admin");

  const validatedFields = ScoreSchema.safeParse({
    presentation: formData.get("presentation"),
    content: formData.get("content"),
    overall: formData.get("overall"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("group_scores").upsert(
    {
      program_id: programId,
      group_id: groupId,
      presentation: validatedFields.data.presentation,
      content: validatedFields.data.content,
      overall: validatedFields.data.overall,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "program_id,group_id" },
  );

  if (error) {
    return { message: "Could not save score." };
  }

  revalidatePath(`/dashboard/programs/${programId}`);
  return { success: true };
}
