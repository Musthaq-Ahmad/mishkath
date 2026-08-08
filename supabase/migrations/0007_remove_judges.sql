-- Removes the judge-account concept entirely. Scoring is now manual
-- single-entry: one final score row per participant per program, entered
-- directly by an admin (transcribed from paper). Existing judge auth
-- accounts/profiles are left untouched — this only removes the app's use
-- of them for scoring, and drops the assignment/attribution plumbing.
-- Run this after 0006_program_category_is_division.sql.

-- ============================================================
-- scores: drop judge_id, one row per (program, student)
-- ============================================================

drop policy if exists "scores_select_own_or_admin" on public.scores;
drop policy if exists "scores_insert_own_assigned" on public.scores;
drop policy if exists "scores_update_own_assigned" on public.scores;
drop policy if exists "scores_delete_admin" on public.scores;

alter table public.scores drop constraint if exists scores_program_id_student_id_judge_id_key;
alter table public.scores drop column if exists judge_id;

-- If duplicate (program_id, student_id) rows exist from prior multi-judge
-- data, keep only the most recently updated one before adding the new
-- single-row-per-student constraint.
delete from public.scores s
using public.scores newer
where s.program_id = newer.program_id
  and s.student_id = newer.student_id
  and s.updated_at < newer.updated_at;

alter table public.scores
  add constraint scores_program_id_student_id_key unique (program_id, student_id);

create policy "scores_select_admin" on public.scores
  for select using (public.is_admin());
create policy "scores_write_admin" on public.scores for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- group_scores: drop judge_id, one row per (program, group)
-- ============================================================

drop policy if exists "group_scores_select_own_or_admin" on public.group_scores;
drop policy if exists "group_scores_insert_own_assigned" on public.group_scores;
drop policy if exists "group_scores_update_own_assigned" on public.group_scores;
drop policy if exists "group_scores_delete_admin" on public.group_scores;

alter table public.group_scores drop constraint if exists group_scores_program_id_group_id_judge_id_key;
alter table public.group_scores drop column if exists judge_id;

delete from public.group_scores s
using public.group_scores newer
where s.program_id = newer.program_id
  and s.group_id = newer.group_id
  and s.updated_at < newer.updated_at;

alter table public.group_scores
  add constraint group_scores_program_id_group_id_key unique (program_id, group_id);

create policy "group_scores_select_admin" on public.group_scores
  for select using (public.is_admin());
create policy "group_scores_write_admin" on public.group_scores for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Drop judge_assignments entirely — no more judge-to-program
-- assignment now that judges don't log in or score anything.
-- ============================================================

drop table if exists public.judge_assignments;

-- ============================================================
-- Result views: no judge_id involved, but recreate to be safe
-- since the underlying scores/group_scores columns changed.
-- ============================================================

create or replace view public.program_results as
select
  s.program_id,
  s.student_id,
  st.name as student_name,
  st.group_id,
  s.total as avg_total,
  rank() over (partition by s.program_id order by s.total desc) as rank
from public.scores s
join public.students st on st.id = s.student_id;

create or replace view public.group_program_results as
select
  gs.program_id,
  gs.group_id,
  g.name as group_name,
  gs.total as avg_total,
  rank() over (partition by gs.program_id order by gs.total desc) as rank
from public.group_scores gs
join public.groups g on g.id = gs.group_id;
