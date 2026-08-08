-- Adds a schedule time to programs so the dashboard can show the current
-- and next program. Run this after 0003_student_chest_numbers.sql.

alter table public.programs
  add column if not exists scheduled_start timestamptz;
