"use server";

import { revalidatePath } from "next/cache";
import { TENANT_WRITE_ROLES, requireTenantRole, tenantPath } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { ScoreSchema, type ScoreFormState } from "@/lib/validations/score";

export async function adminSubmitScore(
  programId: string,
  studentId: string,
  _state: ScoreFormState,
  formData: FormData,
): Promise<ScoreFormState> {
  const { slug } = await requireTenantRole(TENANT_WRITE_ROLES);

  const validatedFields = ScoreSchema.safeParse({
    total: formData.get("total"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("scores").upsert(
    {
      program_id: programId,
      student_id: studentId,
      total: validatedFields.data.total,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "program_id,student_id" },
  );

  if (error) {
    return { message: `Could not save score: ${error.message}` };
  }

  revalidatePath(tenantPath(slug, `/dashboard/programs/${programId}`));
  return { success: true };
}

export async function adminSubmitGroupScore(
  programId: string,
  groupId: string,
  participantId: string,
  _state: ScoreFormState,
  formData: FormData,
): Promise<ScoreFormState> {
  const { slug } = await requireTenantRole(TENANT_WRITE_ROLES);

  const validatedFields = ScoreSchema.safeParse({
    total: formData.get("total"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  // A group can field more than one team in the same program (see
  // supabase/migrations/20260829041027_group_multiple_teams.sql) — the score belongs
  // to the specific team entry (participant_id), not just the group.
  const { error } = await supabase.from("group_scores").upsert(
    {
      program_id: programId,
      group_id: groupId,
      participant_id: participantId,
      total: validatedFields.data.total,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "participant_id" },
  );

  if (error) {
    return { message: `Could not save score: ${error.message}` };
  }

  revalidatePath(tenantPath(slug, `/dashboard/programs/${programId}`));
  return { success: true };
}
