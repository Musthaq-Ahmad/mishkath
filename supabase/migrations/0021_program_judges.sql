-- Free-text judge names per program — NOT a return to judge user
-- accounts/logins (that judge_id/judge_assignments/profiles-role system was
-- intentionally removed in 0007_remove_judges.sql, since scoring is a
-- single admin-transcribed value per participant). This just lets an admin
-- record who's on a program's judging panel so their names can be printed
-- on the scoresheet instead of left blank for handwriting.
-- Run this after 0020_single_score.sql.

create table public.program_judges (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create index program_judges_program_id_idx on public.program_judges (program_id, created_at);

alter table public.program_judges enable row level security;

create policy "program_judges_select_public" on public.program_judges
  for select using (true);
create policy "program_judges_write_admin" on public.program_judges for all
  using (public.is_admin()) with check (public.is_admin());
