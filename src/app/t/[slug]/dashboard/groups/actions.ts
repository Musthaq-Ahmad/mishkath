"use server";

import { revalidatePath } from "next/cache";
import { TENANT_WRITE_ROLES, requireTenantRole, tenantPath } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { GroupSchema, type GroupFormState } from "@/lib/validations/group";

export async function createGroup(
  _state: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const { slug } = await requireTenantRole(TENANT_WRITE_ROLES);

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

  revalidatePath(tenantPath(slug, "/dashboard/groups"));
  return undefined;
}

export async function updateGroup(
  id: string,
  _state: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const { slug } = await requireTenantRole(TENANT_WRITE_ROLES);

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

  revalidatePath(tenantPath(slug, "/dashboard/groups"));
  return undefined;
}

export async function deleteGroup(id: string): Promise<{ error?: string } | undefined> {
  const { slug } = await requireTenantRole(TENANT_WRITE_ROLES);

  const supabase = await createClient();
  const { error } = await supabase.from("groups").delete().eq("id", id);

  if (error) {
    return { error: "Could not delete group." };
  }

  revalidatePath(tenantPath(slug, "/dashboard/groups"));
  return undefined;
}
