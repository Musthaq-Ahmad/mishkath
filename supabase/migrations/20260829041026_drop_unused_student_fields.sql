-- guardian_name, admission_number, date_of_birth, phone_number were removed
-- from the student form/CSV import a while back, but the app code (Zod
-- schema, actions.ts) still submitted them on every save, sending an
-- explicit `null` for FormData.get() on a field the form no longer
-- renders. z.string().optional() accepts `undefined` but not `null`, so
-- every create/update failed client-side validation with "Invalid input"
-- on all four fields. The app-side reference has now been deleted
-- entirely (student-form.tsx never collected these, and nothing else
-- reads them) — drop the columns to match.
--
-- The partial unique index on admission_number
-- (students_admission_number_key, 20260808102512_students_programs_expansion.sql)
-- is dropped automatically along with its column.
--
-- Run this after 20260829041025_compress_chest_number_ranges.sql.

alter table public.students
  drop column if exists guardian_name,
  drop column if exists admission_number,
  drop column if exists date_of_birth,
  drop column if exists phone_number;
