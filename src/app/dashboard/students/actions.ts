"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { StudentSchema, type StudentFormState } from "@/lib/validations/student";

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

export async function deleteStudent(id: string) {
  await requireRole("admin");

  const supabase = await createClient();
  await supabase.from("students").delete().eq("id", id);

  revalidatePath("/dashboard/students");
}
