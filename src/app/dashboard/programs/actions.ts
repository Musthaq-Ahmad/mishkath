"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { codeForIndex, indexForCode } from "@/lib/codes";
import { notifyWhatsAppGroup } from "@/lib/whatsapp";
import { ProgramSchema, type ProgramFormState } from "@/lib/validations/program";
import type { Division, EventPlacementRow, ProgramStatus, ProgramType } from "@/lib/types";

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

export async function deleteProgram(id: string): Promise<{ error?: string } | undefined> {
  await requireRole("admin");

  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("published")
    .eq("id", id)
    .single<{ published: boolean }>();

  if (program?.published) {
    return { error: "Unpublish this program's results before deleting it." };
  }

  const { error } = await supabase.from("programs").delete().eq("id", id);

  if (error) {
    return { error: "Could not delete program." };
  }

  revalidatePath("/dashboard/programs");
  return undefined;
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

  await announceResultsOnWhatsApp(supabase, programId);

  revalidatePath("/dashboard/results");
  revalidatePath("/leaderboard");
  return undefined;
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"] as const;

async function announceResultsOnWhatsApp(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string,
) {
  const { data: placements } = await supabase
    .from("public_event_top3")
    .select("*")
    .eq("program_id", programId)
    .order("rank", { ascending: true })
    .returns<EventPlacementRow[]>();

  if (!placements?.length) return;

  const { program_name, category } = placements[0];
  const { data: division } = await supabase
    .from("divisions")
    .select("name")
    .eq("id", category)
    .single<Pick<Division, "name">>();
  const lines = placements.map(
    (row) => `${RANK_MEDALS[row.rank - 1] ?? `${row.rank}.`} ${row.place_name}`,
  );
  const text = [
    `📢 Results Published: ${program_name} (${division?.name ?? "—"})`,
    ...lines,
  ].join("\n");

  await notifyWhatsAppGroup(text);
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

export async function markMementoGiven(programId: string): Promise<{ message?: string } | undefined> {
  await requireRole("admin");

  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("published")
    .eq("id", programId)
    .single<{ published: boolean }>();

  if (!program?.published) {
    return { message: "Results must be published before the memento can be marked as given." };
  }

  const { error } = await supabase
    .from("programs")
    .update({ memento_given: true, memento_given_at: new Date().toISOString() })
    .eq("id", programId);

  if (error) {
    return { message: error.message };
  }

  revalidatePath("/dashboard/results");
  return undefined;
}

export async function unmarkMementoGiven(programId: string): Promise<{ message?: string } | undefined> {
  await requireRole("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("programs")
    .update({ memento_given: false, memento_given_at: null })
    .eq("id", programId);

  if (error) {
    return { message: error.message };
  }

  revalidatePath("/dashboard/results");
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

// Assigns codes only to participants who don't have one yet, continuing
// the letter sequence after the highest code already in use. Safe to run
// even once judging has started, since it never touches an existing
// participant's code — unlike a full reshuffle, which would invalidate
// codes judges have already scored against.
async function assignMissingCodes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string,
  programType: ProgramType,
) {
  const table = programType === "group" ? "program_group_participants" : "program_participants";
  const { data: rows } = await supabase
    .from(table)
    .select("id, code")
    .eq("program_id", programId);

  const missing = (rows ?? []).filter((row) => !row.code);
  if (missing.length === 0) return;

  const usedIndices = (rows ?? [])
    .filter((row) => row.code)
    .map((row) => indexForCode(row.code as string));
  let nextIndex = usedIndices.length ? Math.max(...usedIndices) + 1 : 1;

  await Promise.all(
    missing.map((row) =>
      supabase.from(table).update({ code: codeForIndex(nextIndex++) }).eq("id", row.id),
    ),
  );
}

export async function generateParticipantCodes(
  programId: string,
): Promise<{ message?: string } | undefined> {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("program_type")
    .eq("id", programId)
    .single<{ program_type: ProgramType }>();

  if (!program) {
    return { message: "Program not found." };
  }

  if (await isJudgingLocked(supabase, programId)) {
    // Judging has already started — a full reshuffle would invalidate
    // codes already scored against, so only newly added participants
    // (who have no code yet) get one.
    await assignMissingCodes(supabase, programId, program.program_type);
    revalidatePath(`/dashboard/programs/${programId}`);
    return undefined;
  }

  await shuffleAndAssignCodes(supabase, programId, program.program_type);

  revalidatePath(`/dashboard/programs/${programId}`);
  return undefined;
}

export async function setProgramStatus(
  programId: string,
  status: ProgramStatus,
): Promise<{ error?: string } | undefined> {
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

  const { error } = await supabase.from("programs").update({ status }).eq("id", programId);

  revalidatePath(`/dashboard/programs/${programId}`);
  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard");

  if (error) {
    return { error: "Could not update program status." };
  }
  return undefined;
}

// Always inserts a new team entry — a group can have any number of teams
// in the same program (see supabase/migrations/0029_group_multiple_teams.sql),
// so this is "add another team," not a toggle.
export async function addGroupParticipant(
  programId: string,
  groupId: string,
): Promise<{ error?: string } | undefined> {
  await requireRole("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("program_group_participants")
    .insert({ program_id: programId, group_id: groupId });

  if (error) {
    return { error: "Could not add group." };
  }

  revalidatePath(`/dashboard/programs/${programId}`);
  return undefined;
}

// A group can now field more than one team in the same program (see
// supabase/migrations/0029_group_multiple_teams.sql), so a team entry can
// only be removed by its own id — deleting by (program_id, group_id) would
// remove every one of that group's teams at once.
export async function removeGroupParticipant(
  programId: string,
  participantId: string,
): Promise<{ error?: string } | undefined> {
  await requireRole("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("program_group_participants")
    .delete()
    .eq("id", participantId)
    .eq("program_id", programId);

  if (error) {
    return { error: "Could not remove team." };
  }

  revalidatePath(`/dashboard/programs/${programId}`);
  return undefined;
}

export async function addGroupParticipantMember(
  programId: string,
  groupId: string,
  participantId: string,
  studentId: string,
): Promise<{ error?: string } | undefined> {
  await requireRole("admin");

  const supabase = await createClient();
  const { error } = await supabase.from("program_group_participant_members").insert({
    program_id: programId,
    group_id: groupId,
    participant_id: participantId,
    student_id: studentId,
  });

  if (error) {
    return { error: "Could not add participant." };
  }

  revalidatePath(`/dashboard/programs/${programId}`);
  return undefined;
}

export async function removeGroupParticipantMember(
  programId: string,
  participantId: string,
  studentId: string,
): Promise<{ error?: string } | undefined> {
  await requireRole("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("program_group_participant_members")
    .delete()
    .eq("participant_id", participantId)
    .eq("student_id", studentId);

  if (error) {
    return { error: "Could not remove participant." };
  }

  revalidatePath(`/dashboard/programs/${programId}`);
  return undefined;
}

export async function addParticipant(
  programId: string,
  studentId: string,
): Promise<{ error?: string } | undefined> {
  await requireRole("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("program_participants")
    .insert({ program_id: programId, student_id: studentId });

  if (error) {
    return { error: "Could not add student." };
  }

  revalidatePath(`/dashboard/programs/${programId}`);
  revalidatePath(`/dashboard/students/${studentId}`);
  return undefined;
}

export async function removeParticipant(
  programId: string,
  studentId: string,
): Promise<{ error?: string } | undefined> {
  await requireRole("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("program_participants")
    .delete()
    .eq("program_id", programId)
    .eq("student_id", studentId);

  if (error) {
    return { error: "Could not remove student." };
  }

  revalidatePath(`/dashboard/programs/${programId}`);
  revalidatePath(`/dashboard/students/${studentId}`);
  return undefined;
}

export async function addProgramJudge(
  programId: string,
  name: string,
): Promise<{ error?: string } | undefined> {
  await requireRole("admin");

  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Enter a name." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("program_judges")
    .insert({ program_id: programId, name: trimmed });

  if (error) {
    return { error: "Could not add judge." };
  }

  revalidatePath(`/dashboard/programs/${programId}`);
  revalidatePath(`/dashboard/programs/${programId}/scoresheet`);
  return undefined;
}

export async function removeProgramJudge(
  programId: string,
  judgeId: string,
): Promise<{ error?: string } | undefined> {
  await requireRole("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("program_judges")
    .delete()
    .eq("id", judgeId)
    .eq("program_id", programId);

  if (error) {
    return { error: "Could not remove judge." };
  }

  revalidatePath(`/dashboard/programs/${programId}`);
  revalidatePath(`/dashboard/programs/${programId}/scoresheet`);
  return undefined;
}
