"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { GroupSchema, type GroupFormState } from "@/lib/validations/group";

export async function createGroup(
  _state: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  await requireRole("admin");

  const validatedFields = GroupSchema.safeParse({
    name: formData.get("name"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("groups").insert(validatedFields.data);

  if (error) {
    return { message: "Could not create group." };
  }

  revalidatePath("/dashboard/groups");
  return undefined;
}

export async function updateGroup(
  id: string,
  _state: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  await requireRole("admin");

  const validatedFields = GroupSchema.safeParse({
    name: formData.get("name"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("groups")
    .update(validatedFields.data)
    .eq("id", id);

  if (error) {
    return { message: "Could not update group." };
  }

  revalidatePath("/dashboard/groups");
  return undefined;
}

export async function deleteGroup(id: string) {
  await requireRole("admin");

  const supabase = await createClient();
  await supabase.from("groups").delete().eq("id", id);

  revalidatePath("/dashboard/groups");
}
