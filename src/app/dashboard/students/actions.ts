"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { STUDENT_CATEGORIES, StudentSchema, type StudentFormState } from "@/lib/validations/student";
import type { StudentCategory } from "@/lib/types";

function parseStudentForm(formData: FormData) {
  return StudentSchema.safeParse({
    name: formData.get("name"),
    group_id: formData.get("group_id"),
    division: formData.get("division"),
    class: formData.get("class"),
    category: formData.get("category"),
    is_active: formData.get("is_active"),
    photo_url: formData.get("photo_url"),
  });
}

export async function createStudent(
  _state: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  await requireRole("admin");

  const validatedFields = parseStudentForm(formData);

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const {
    name,
    group_id,
    division,
    class: studentClass,
    category,
    is_active,
    photo_url,
  } = validatedFields.data;

  const supabase = await createClient();
  const { error } = await supabase.from("students").insert({
    name,
    group_id,
    division,
    class: studentClass,
    category,
    is_active,
    photo_url: photo_url || null,
    // chest_number is left unset — a database trigger auto-assigns it based
    // on division + group (see supabase/migrations/0003_student_chest_numbers.sql
    // and 0005_students_programs_expansion.sql).
  });

  if (error) {
    if (error.message.includes("block full")) {
      return {
        message: "This group's chest-number block for this division is full. Contact an administrator.",
      };
    }
    return { message: "Could not create student." };
  }

  revalidatePath("/dashboard/students");
  return undefined;
}

export async function updateStudent(
  id: string,
  _state: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  await requireRole("admin");

  const validatedFields = parseStudentForm(formData);

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const {
    name,
    group_id,
    division,
    class: studentClass,
    category,
    is_active,
    photo_url,
  } = validatedFields.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({
      name,
      group_id,
      division,
      class: studentClass,
      category,
      is_active,
      photo_url: photo_url || null,
    })
    .eq("id", id);

  if (error) {
    return { message: "Could not update student." };
  }

  revalidatePath("/dashboard/students");
  return undefined;
}

export async function deleteStudent(id: string): Promise<{ error?: string } | undefined> {
  await requireRole("admin");

  const supabase = await createClient();
  const { error } = await supabase.from("students").delete().eq("id", id);

  if (error) {
    return { error: "Could not delete student." };
  }

  revalidatePath("/dashboard/students");
  return undefined;
}

export async function setStudentCheckedIn(
  id: string,
  checkedIn: boolean,
): Promise<{ error?: string } | undefined> {
  await requireRole("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ checked_in: checkedIn, checked_in_at: checkedIn ? new Date().toISOString() : null })
    .eq("id", id);

  revalidatePath("/dashboard/students");
  revalidatePath("/dashboard");

  if (error) {
    return { error: "Could not update check-in status." };
  }
  return undefined;
}

export type BulkImportRow = {
  name: string;
  division: string;
  category: string;
  class: string;
  group_name: string;
};

export type BulkImportResult = {
  inserted: number;
  errors: { row: number; message: string }[];
};

export async function bulkImportStudents(rows: BulkImportRow[]): Promise<BulkImportResult> {
  await requireRole("admin");

  const supabase = await createClient();
  const [{ data: groups }, { data: divisions }] = await Promise.all([
    supabase.from("groups").select("id, name"),
    supabase.from("divisions").select("id, name, name_ml"),
  ]);
  const groupIdByName = new Map(
    (groups ?? []).map((g) => [g.name.trim().toLowerCase(), g.id as string]),
  );
  const divisionIdByName = new Map(
    (divisions ?? []).flatMap((d) => {
      const entries: [string, string][] = [[d.name.trim().toLowerCase(), d.id as string]];
      if (d.name_ml) entries.push([(d.name_ml as string).trim().toLowerCase(), d.id as string]);
      return entries;
    }),
  );

  const errors: BulkImportResult["errors"] = [];
  let inserted = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 1;
    const row = rows[i];

    const groupId = groupIdByName.get(row.group_name.trim().toLowerCase());
    if (!groupId) {
      errors.push({ row: rowNumber, message: `Unknown group "${row.group_name}".` });
      continue;
    }

    const divisionId = divisionIdByName.get(row.division.trim().toLowerCase());
    if (!divisionId) {
      errors.push({ row: rowNumber, message: `Unknown division "${row.division}".` });
      continue;
    }

    const category = row.category.trim().toLowerCase();
    if (!STUDENT_CATEGORIES.includes(category as StudentCategory)) {
      errors.push({
        row: rowNumber,
        message: `Invalid category "${row.category}". Expected one of: ${STUDENT_CATEGORIES.join(", ")}.`,
      });
      continue;
    }

    const validatedFields = StudentSchema.safeParse({
      name: row.name,
      group_id: groupId,
      division: divisionId,
      class: row.class,
      category,
      is_active: true,
    });

    if (!validatedFields.success) {
      const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
      errors.push({ row: rowNumber, message: firstError ?? "Invalid row." });
      continue;
    }

    const {
      name,
      group_id,
      division: validDivision,
      class: studentClass,
      category: validCategory,
    } = validatedFields.data;

    const { error } = await supabase.from("students").insert({
      name,
      group_id,
      division: validDivision,
      class: studentClass,
      category: validCategory,
      is_active: true,
    });

    if (error) {
      if (error.message.includes("block full")) {
        errors.push({
          row: rowNumber,
          message: "This group's chest-number block for this division is full.",
        });
      } else {
        errors.push({ row: rowNumber, message: "Could not create student." });
      }
      continue;
    }

    inserted++;
  }

  if (inserted > 0) {
    revalidatePath("/dashboard/students");
  }

  return { inserted, errors };
}
