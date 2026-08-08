-- Consolidates programs.category and programs.division into one field:
-- "category" now IS the division selector (senior/junior/sub_junior/general)
-- — there's no separate division concept for programs anymore. Any prior
-- free-text category value (e.g. "Hifz") is overwritten by the program's
-- division value, since going forward category always holds a division.
-- Run this after 0005_students_programs_expansion.sql.

update public.programs set category = division;

alter table public.programs alter column category set not null;
alter table public.programs drop constraint if exists programs_category_check;
alter table public.programs
  add constraint programs_category_check check (category in ('senior', 'junior', 'sub_junior', 'general'));

alter table public.programs drop constraint if exists programs_division_check;
alter table public.programs drop column if exists division;
