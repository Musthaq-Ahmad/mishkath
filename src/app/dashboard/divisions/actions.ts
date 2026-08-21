"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { Division } from "@/lib/types";
import { DivisionSchema, type DivisionFormState } from "@/lib/validations/division";

function parseDivisionForm(formData: FormData) {
  return DivisionSchema.safeParse({
    name: formData.get("name"),
    name_ml: formData.get("name_ml"),
    base_chest_number: formData.get("base_chest_number"),
    is_active: formData.get("is_active"),
  });
}

export async function createDivision(
  _state: DivisionFormState,
  formData: FormData,
): Promise<DivisionFormState> {
  await requireRole("admin");

  const validatedFields = parseDivisionForm(formData);
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("divisions")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .returns<Pick<Division, "sort_order">[]>();
  const nextSortOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { error } = await supabase
    .from("divisions")
    .insert({ ...validatedFields.data, sort_order: nextSortOrder });

  if (error) {
    return { message: "Could not create division." };
  }

  revalidatePath("/dashboard/divisions");
  return undefined;
}

export async function updateDivision(
  id: string,
  _state: DivisionFormState,
  formData: FormData,
): Promise<DivisionFormState> {
  await requireRole("admin");

  const validatedFields = parseDivisionForm(formData);
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("divisions").update(validatedFields.data).eq("id", id);

  if (error) {
    return { message: "Could not update division." };
  }

  revalidatePath("/dashboard/divisions");
  revalidatePath("/leaderboard");
  return undefined;
}

export async function deleteDivision(id: string): Promise<{ error?: string } | undefined> {
  await requireRole("admin");

  const supabase = await createClient();
  const { error } = await supabase.from("divisions").delete().eq("id", id);

  if (error) {
    // Postgres foreign_key_violation — students or programs still reference
    // this division.
    if (error.code === "23503") {
      return { error: "This division is still assigned to students or programs — reassign or remove them first." };
    }
    return { error: "Could not delete division." };
  }

  revalidatePath("/dashboard/divisions");
  return undefined;
}

export async function moveDivision(
  id: string,
  direction: "up" | "down",
): Promise<{ error?: string } | undefined> {
  await requireRole("admin");

  const supabase = await createClient();
  const { data: divisions } = await supabase
    .from("divisions")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .returns<Pick<Division, "id" | "sort_order">[]>();

  const list = divisions ?? [];
  const index = list.findIndex((division) => division.id === id);
  const swapWithIndex = direction === "up" ? index - 1 : index + 1;

  if (index === -1 || swapWithIndex < 0 || swapWithIndex >= list.length) {
    return undefined;
  }

  const current = list[index];
  const swapWith = list[swapWithIndex];

  const [{ error: firstError }, { error: secondError }] = await Promise.all([
    supabase.from("divisions").update({ sort_order: swapWith.sort_order }).eq("id", current.id),
    supabase.from("divisions").update({ sort_order: current.sort_order }).eq("id", swapWith.id),
  ]);

  if (firstError || secondError) {
    return { error: "Could not reorder divisions." };
  }

  revalidatePath("/dashboard/divisions");
  revalidatePath("/leaderboard");
  return undefined;
}
