"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import {
  STUDENT_CATEGORIES,
  STUDENT_DIVISIONS,
  StudentSchema,
  type StudentFormState,
} from "@/lib/validations/student";
import type { StudentCategory, StudentDivision } from "@/lib/types";

function parseStudentForm(formData: FormData) {
  return StudentSchema.safeParse({
    name: formData.get("name"),
    group_id: formData.get("group_id"),
    division: formData.get("division"),
    class: formData.get("class"),
    category: formData.get("category"),
    guardian_name: formData.get("guardian_name"),
    admission_number: formData.get("admission_number"),
    date_of_birth: formData.get("date_of_birth"),
    phone_number: formData.get("phone_number"),
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
    guardian_name,
    admission_number,
    date_of_birth,
    phone_number,
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
    guardian_name: guardian_name || null,
    admission_number: admission_number || null,
    date_of_birth: date_of_birth || null,
    phone_number: phone_number || null,
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
    if (error.message.includes("students_admission_number_key")) {
      return { errors: { admission_number: ["This admission number is already in use."] } };
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
    guardian_name,
    admission_number,
    date_of_birth,
    phone_number,
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
      guardian_name: guardian_name || null,
      admission_number: admission_number || null,
      date_of_birth: date_of_birth || null,
      phone_number: phone_number || null,
      is_active,
      photo_url: photo_url || null,
    })
    .eq("id", id);

  if (error) {
    if (error.message.includes("students_admission_number_key")) {
      return { errors: { admission_number: ["This admission number is already in use."] } };
    }
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
  guardian_name?: string;
  admission_number?: string;
  date_of_birth?: string;
  phone_number?: string;
};

export type BulkImportResult = {
  inserted: number;
  errors: { row: number; message: string }[];
};

export async function bulkImportStudents(rows: BulkImportRow[]): Promise<BulkImportResult> {
  await requireRole("admin");

  const supabase = await createClient();
  const { data: groups } = await supabase.from("groups").select("id, name");
  const groupIdByName = new Map(
    (groups ?? []).map((g) => [g.name.trim().toLowerCase(), g.id as string]),
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

    const division = row.division.trim().toLowerCase();
    if (!STUDENT_DIVISIONS.includes(division as StudentDivision)) {
      errors.push({
        row: rowNumber,
        message: `Invalid division "${row.division}". Expected one of: ${STUDENT_DIVISIONS.join(", ")}.`,
      });
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
      division,
      class: row.class,
      category,
      guardian_name: row.guardian_name,
      admission_number: row.admission_number,
      date_of_birth: row.date_of_birth,
      phone_number: row.phone_number,
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
      guardian_name,
      admission_number,
      date_of_birth,
      phone_number,
    } = validatedFields.data;

    const { error } = await supabase.from("students").insert({
      name,
      group_id,
      division: validDivision,
      class: studentClass,
      category: validCategory,
      guardian_name: guardian_name || null,
      admission_number: admission_number || null,
      date_of_birth: date_of_birth || null,
      phone_number: phone_number || null,
      is_active: true,
    });

    if (error) {
      if (error.message.includes("block full")) {
        errors.push({
          row: rowNumber,
          message: "This group's chest-number block for this division is full.",
        });
      } else if (error.message.includes("students_admission_number_key")) {
        errors.push({ row: rowNumber, message: "Admission number already in use." });
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
