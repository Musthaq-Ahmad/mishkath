-- Consolidated baseline — every migration in order, in one file.
--
-- Purpose: standing up a FRESH database (the staging clone Phase 0 calls
-- for, or a new Supabase project). It is a faithful concatenation of the
-- 30 migration files, not a hand-rewritten schema, so it reproduces
-- exactly what production was built from — including the corrections later
-- migrations make to earlier ones.
--
-- DO NOT run this against the live database. Everything up to and including
-- group_multiple_teams is already applied there; only the final tenants
-- section is new, and it should be run from its own migration file.
--
-- Not placed in migrations/ on purpose: the Supabase CLI globs that
-- directory, and this file would be a duplicate of everything in it.
--
-- Generated 2026-09-05. Regenerate rather than edit
-- by hand — see MULTI_TENANCY.md.


----------------------------------------------------------------------
-- 20260808102508_init.sql
----------------------------------------------------------------------

-- MISHKAT festival management schema
-- Run this in the Supabase SQL editor for a fresh project.

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'judge')),
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_id uuid not null references public.groups (id) on delete cascade,
  chest_number text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  max_score numeric not null default 25,
  created_at timestamptz not null default now()
);

create table if not exists public.program_participants (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (program_id, student_id)
);

create table if not exists public.judge_assignments (
  id uuid primary key default gen_random_uuid(),
  judge_id uuid not null references public.profiles (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (judge_id, program_id)
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  judge_id uuid not null references public.profiles (id) on delete cascade,
  presentation numeric not null check (presentation >= 0),
  content numeric not null check (content >= 0),
  overall numeric not null check (overall >= 0),
  total numeric generated always as (presentation + content + overall) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, student_id, judge_id)
);

-- ============================================================
-- Result views
-- ============================================================

create or replace view public.program_results as
select
  s.program_id,
  s.student_id,
  st.name as student_name,
  st.group_id,
  avg(s.total) as avg_total,
  rank() over (partition by s.program_id order by avg(s.total) desc) as rank
from public.scores s
join public.students st on st.id = s.student_id
group by s.program_id, s.student_id, st.name, st.group_id;

create or replace view public.group_leaderboard as
select
  g.id as group_id,
  g.name as group_name,
  coalesce(sum(
    case pr.rank
      when 1 then 5
      when 2 then 3
      when 3 then 1
      else 0
    end
  ), 0) as points
from public.groups g
left join public.program_results pr on pr.group_id = g.id
group by g.id, g.name
order by points desc;

-- ============================================================
-- Helpers
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-create a profiles row whenever a new auth user is created. This runs
-- as the table owner (security definer), so it works regardless of whether
-- the new user has an active session yet (e.g. email confirmation pending) —
-- avoiding the RLS chicken-and-egg problem of inserting a profile from
-- client code right after signup. The intended role/full name are read from
-- the auth user's metadata, set at signup (public signup) or invite time
-- (admin-created judges); defaults to 'admin' for safety since only admins
-- self-signup in this app.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'admin')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Non-admins may update their own profile row (e.g. full_name), but must
-- never be able to change their own role — otherwise the "self update"
-- RLS policy below would let a judge promote themselves to admin.
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change a profile role.';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_self_role_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_self_role_escalation();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.students enable row level security;
alter table public.programs enable row level security;
alter table public.program_participants enable row level security;
alter table public.judge_assignments enable row level security;
alter table public.scores enable row level security;

-- profiles: self read/update, admin full access
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());
create policy "profiles_insert_admin" on public.profiles
  for insert with check (public.is_admin() or id = auth.uid());
create policy "profiles_delete_admin" on public.profiles
  for delete using (public.is_admin());

-- groups / students / programs / program_participants: public read, admin write
create policy "groups_select_public" on public.groups for select using (true);
create policy "groups_write_admin" on public.groups for all
  using (public.is_admin()) with check (public.is_admin());

create policy "students_select_public" on public.students for select using (true);
create policy "students_write_admin" on public.students for all
  using (public.is_admin()) with check (public.is_admin());

create policy "programs_select_public" on public.programs for select using (true);
create policy "programs_write_admin" on public.programs for all
  using (public.is_admin()) with check (public.is_admin());

create policy "program_participants_select_public" on public.program_participants
  for select using (true);
create policy "program_participants_write_admin" on public.program_participants for all
  using (public.is_admin()) with check (public.is_admin());

-- judge_assignments: judge reads own, admin full access
create policy "judge_assignments_select_own_or_admin" on public.judge_assignments
  for select using (judge_id = auth.uid() or public.is_admin());
create policy "judge_assignments_write_admin" on public.judge_assignments for all
  using (public.is_admin()) with check (public.is_admin());

-- scores: judge can insert/update own scores for assigned programs, admin full access,
-- no public/select access to raw scores (only the aggregated views above are public)
create policy "scores_select_own_or_admin" on public.scores
  for select using (judge_id = auth.uid() or public.is_admin());
create policy "scores_insert_own_assigned" on public.scores
  for insert with check (
    public.is_admin()
    or (
      judge_id = auth.uid()
      and exists (
        select 1 from public.judge_assignments ja
        where ja.judge_id = auth.uid() and ja.program_id = scores.program_id
      )
    )
  );
create policy "scores_update_own_assigned" on public.scores
  for update using (
    public.is_admin()
    or (
      judge_id = auth.uid()
      and exists (
        select 1 from public.judge_assignments ja
        where ja.judge_id = auth.uid() and ja.program_id = scores.program_id
      )
    )
  )
  with check (
    public.is_admin()
    or (
      judge_id = auth.uid()
      and exists (
        select 1 from public.judge_assignments ja
        where ja.judge_id = auth.uid() and ja.program_id = scores.program_id
      )
    )
  );
create policy "scores_delete_admin" on public.scores
  for delete using (public.is_admin());

-- ============================================================
-- Storage: public bucket for student photos
-- ============================================================

insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', true)
on conflict (id) do nothing;

create policy "student_photos_public_read" on storage.objects
  for select using (bucket_id = 'student-photos');
create policy "student_photos_admin_write" on storage.objects
  for insert with check (bucket_id = 'student-photos' and public.is_admin());
create policy "student_photos_admin_update" on storage.objects
  for update using (bucket_id = 'student-photos' and public.is_admin());
create policy "student_photos_admin_delete" on storage.objects
  for delete using (bucket_id = 'student-photos' and public.is_admin());

-- ============================================================
-- Bootstrap note
-- ============================================================
-- After signing up your first user via /login, promote them manually:
--   update public.profiles set role = 'admin' where id = '<user-uuid>';

----------------------------------------------------------------------
-- 20260808102509_publish_results.sql
----------------------------------------------------------------------

-- Adds a publish/unpublish workflow for program results.
-- Run this after 20260808102508_init.sql.

alter table public.programs
  add column if not exists published boolean not null default false,
  add column if not exists published_at timestamptz;

-- Public-facing program results: only for programs an admin has published.
-- (program_results itself stays unfiltered for admin/internal use.)
create or replace view public.public_program_results as
select pr.*
from public.program_results pr
join public.programs p on p.id = pr.program_id
where p.published = true;

-- One row per published program: its #1-ranked student/group. Powers the
-- "recently published" feed and the scrollable past-results table on the
-- public leaderboard.
create or replace view public.public_program_winners as
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.published_at,
  pr.student_id,
  pr.student_name,
  pr.group_id,
  pr.avg_total
from public.programs p
join public.public_program_results pr on pr.program_id = p.id and pr.rank = 1
where p.published = true;

-- Overall group standings computed only from published programs, so the
-- public leaderboard never leaks a group's position via still-unpublished
-- scores.
create or replace view public.public_group_leaderboard as
select
  g.id as group_id,
  g.name as group_name,
  coalesce(sum(
    case ppr.rank
      when 1 then 5
      when 2 then 3
      when 3 then 1
      else 0
    end
  ), 0) as points
from public.groups g
left join public.public_program_results ppr on ppr.group_id = g.id
group by g.id, g.name
order by points desc;

----------------------------------------------------------------------
-- 20260808102510_student_chest_numbers.sql
----------------------------------------------------------------------

-- Adds class/guardian fields to students and auto-generates chest numbers
-- per class, blocked per group (50 numbers reserved per group per class).
-- Run this after 20260808102509_publish_results.sql.

alter table public.students
  add column if not exists class text,
  add column if not exists guardian_name text;

update public.students set class = 'senior' where class is null;

alter table public.students
  alter column class set not null,
  add constraint students_class_check check (class in ('senior', 'junior', 'sub_junior'));

-- Stable 0-based index per group, ordered by creation — determines which
-- 50-number block within a class's range a group's students get assigned.
create or replace view public.group_ranks as
select id as group_id, row_number() over (order by created_at, id) - 1 as group_index
from public.groups;

create or replace function public.assign_chest_number()
returns trigger
language plpgsql
as $$
declare
  base int;
  block_size int := 50;
  group_idx int;
  existing_count int;
begin
  if new.chest_number is not null then
    return new;
  end if;

  base := case new.class
    when 'senior' then 100
    when 'junior' then 1000
    when 'sub_junior' then 2000
  end;

  select group_index into group_idx from public.group_ranks where group_id = new.group_id;

  select count(*) into existing_count
  from public.students
  where group_id = new.group_id and class = new.class;

  if existing_count >= block_size then
    raise exception 'Chest number block full for this group and class (max % students)', block_size;
  end if;

  new.chest_number := (base + group_idx * block_size + existing_count)::text;

  return new;
end;
$$;

drop trigger if exists students_assign_chest_number on public.students;
create trigger students_assign_chest_number
  before insert on public.students
  for each row execute function public.assign_chest_number();

----------------------------------------------------------------------
-- 20260808102511_program_schedule.sql
----------------------------------------------------------------------

-- Adds a schedule time to programs so the dashboard can show the current
-- and next program. Run this after 20260808102510_student_chest_numbers.sql.

alter table public.programs
  add column if not exists scheduled_start timestamptz;

----------------------------------------------------------------------
-- 20260808102512_students_programs_expansion.sql
----------------------------------------------------------------------

-- Expands students with richer profile fields and renames the existing
-- senior/junior/sub_junior/general enum from "class" to "division" (that's
-- what it always represented — "class" now means grade level, e.g. "Grade
-- 5"). Also adds program type/eligibility/status, group-type participant +
-- scoring tables, and the views that feed the public leaderboard.
-- Run this after 20260808102511_program_schedule.sql.

-- ============================================================
-- Students: division (renamed from class) + new fields
-- ============================================================

alter table public.students add column if not exists division text;
update public.students set division = class where division is null;

alter table public.students
  drop constraint if exists students_class_check;

alter table public.students
  alter column division set not null,
  add constraint students_division_check
    check (division in ('senior', 'junior', 'sub_junior', 'general'));

-- Repurpose "class" as a free-text grade level (e.g. "Grade 5", "Plus One").
alter table public.students alter column class drop not null;
update public.students set class = '' where class is null;
alter table public.students alter column class set default '';
alter table public.students alter column class set not null;

alter table public.students add column if not exists category text;
update public.students set category = 'boy' where category is null;
alter table public.students
  alter column category set not null,
  add constraint students_category_check check (category in ('boy', 'girl'));

alter table public.students add column if not exists admission_number text;
create unique index if not exists students_admission_number_key
  on public.students (admission_number) where admission_number is not null;

alter table public.students add column if not exists date_of_birth date;
alter table public.students add column if not exists phone_number text;
alter table public.students add column if not exists is_active boolean not null default true;

-- assign_chest_number() switched on the old "class" enum — repoint it at
-- "division", which is where those values actually live now.
create or replace function public.assign_chest_number()
returns trigger
language plpgsql
as $$
declare
  base int;
  block_size int := 50;
  group_idx int;
  existing_count int;
begin
  if new.chest_number is not null then
    return new;
  end if;

  base := case new.division
    when 'senior' then 100
    when 'junior' then 1000
    when 'sub_junior' then 2000
    when 'general' then 3000
  end;

  select group_index into group_idx from public.group_ranks where group_id = new.group_id;

  select count(*) into existing_count
  from public.students
  where group_id = new.group_id and division = new.division;

  if existing_count >= block_size then
    raise exception 'Chest number block full for this group and division (max % students)', block_size;
  end if;

  new.chest_number := (base + group_idx * block_size + existing_count)::text;

  return new;
end;
$$;

-- ============================================================
-- Programs: type, eligibility, status
-- ============================================================

alter table public.programs
  add column if not exists program_type text not null default 'individual',
  add column if not exists division text not null default 'senior',
  add column if not exists gender_category text not null default 'mixed',
  add column if not exists status text not null default 'draft';

alter table public.programs
  add constraint programs_program_type_check check (program_type in ('individual', 'group')),
  add constraint programs_division_check check (division in ('senior', 'junior', 'sub_junior', 'general')),
  add constraint programs_gender_category_check check (gender_category in ('boy', 'girl', 'mixed')),
  add constraint programs_status_check check (status in ('draft', 'scheduled', 'running', 'completed'));

-- ============================================================
-- Group-type participants + scoring
-- ============================================================

alter table public.program_participants add column if not exists code text;

create table if not exists public.program_group_participants (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  code text,
  created_at timestamptz not null default now(),
  unique (program_id, group_id)
);

alter table public.program_group_participants enable row level security;

create policy "program_group_participants_select_public" on public.program_group_participants
  for select using (true);
create policy "program_group_participants_write_admin" on public.program_group_participants for all
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.group_scores (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  judge_id uuid not null references public.profiles (id) on delete cascade,
  presentation numeric not null check (presentation >= 0),
  content numeric not null check (content >= 0),
  overall numeric not null check (overall >= 0),
  total numeric generated always as (presentation + content + overall) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, group_id, judge_id)
);

alter table public.group_scores enable row level security;

create policy "group_scores_select_own_or_admin" on public.group_scores
  for select using (judge_id = auth.uid() or public.is_admin());
create policy "group_scores_insert_own_assigned" on public.group_scores
  for insert with check (
    public.is_admin()
    or (
      judge_id = auth.uid()
      and exists (
        select 1 from public.judge_assignments ja
        where ja.judge_id = auth.uid() and ja.program_id = group_scores.program_id
      )
    )
  );
create policy "group_scores_update_own_assigned" on public.group_scores
  for update using (
    public.is_admin()
    or (
      judge_id = auth.uid()
      and exists (
        select 1 from public.judge_assignments ja
        where ja.judge_id = auth.uid() and ja.program_id = group_scores.program_id
      )
    )
  )
  with check (
    public.is_admin()
    or (
      judge_id = auth.uid()
      and exists (
        select 1 from public.judge_assignments ja
        where ja.judge_id = auth.uid() and ja.program_id = group_scores.program_id
      )
    )
  );
create policy "group_scores_delete_admin" on public.group_scores
  for delete using (public.is_admin());

-- ============================================================
-- Result views for group-type programs
-- ============================================================

create or replace view public.group_program_results as
select
  gs.program_id,
  gs.group_id,
  g.name as group_name,
  avg(gs.total) as avg_total,
  rank() over (partition by gs.program_id order by avg(gs.total) desc) as rank
from public.group_scores gs
join public.groups g on g.id = gs.group_id
group by gs.program_id, gs.group_id, g.name;

create or replace view public.public_group_program_results as
select gpr.*
from public.group_program_results gpr
join public.programs p on p.id = gpr.program_id
where p.published = true;

-- Overall group standings now credit BOTH individual-program results
-- (via the student's group) and group-type program results (directly).
create or replace view public.public_group_leaderboard as
select
  g.id as group_id,
  g.name as group_name,
  coalesce(sum(contributions.points), 0) as points
from public.groups g
left join (
  select group_id, case rank when 1 then 5 when 2 then 3 when 3 then 1 else 0 end as points
  from public.public_program_results
  union all
  select group_id, case rank when 1 then 5 when 2 then 3 when 3 then 1 else 0 end as points
  from public.public_group_program_results
) contributions on contributions.group_id = g.id
group by g.id, g.name
order by points desc;

-- Superseded by public_event_winners below (adds program_type/group support).
drop view if exists public.public_program_winners;

-- Unified "winner" feed for the public leaderboard, regardless of program type.
create or replace view public.public_event_winners as
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.program_type,
  p.published_at,
  pr.group_id,
  pr.student_name as winner_name,
  pr.avg_total
from public.programs p
join public.public_program_results pr on pr.program_id = p.id and pr.rank = 1
where p.published = true and p.program_type = 'individual'
union all
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.program_type,
  p.published_at,
  gpr.group_id,
  gpr.group_name as winner_name,
  gpr.avg_total
from public.programs p
join public.public_group_program_results gpr on gpr.program_id = p.id and gpr.rank = 1
where p.published = true and p.program_type = 'group';

----------------------------------------------------------------------
-- 20260808102513_program_category_is_division.sql
----------------------------------------------------------------------

-- Consolidates programs.category and programs.division into one field:
-- "category" now IS the division selector (senior/junior/sub_junior/general)
-- — there's no separate division concept for programs anymore. Any prior
-- free-text category value (e.g. "Hifz") is overwritten by the program's
-- division value, since going forward category always holds a division.
-- Run this after 20260808102512_students_programs_expansion.sql.

update public.programs set category = division;

alter table public.programs alter column category set not null;
alter table public.programs drop constraint if exists programs_category_check;
alter table public.programs
  add constraint programs_category_check check (category in ('senior', 'junior', 'sub_junior', 'general'));

alter table public.programs drop constraint if exists programs_division_check;
alter table public.programs drop column if exists division;

----------------------------------------------------------------------
-- 20260808102514_remove_judges.sql
----------------------------------------------------------------------

-- Removes the judge-account concept entirely. Scoring is now manual
-- single-entry: one final score row per participant per program, entered
-- directly by an admin (transcribed from paper). Existing judge auth
-- accounts/profiles are left untouched — this only removes the app's use
-- of them for scoring, and drops the assignment/attribution plumbing.
-- Run this after 20260808102513_program_category_is_division.sql.

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

----------------------------------------------------------------------
-- 20260808102515_event_top3.sql
----------------------------------------------------------------------

-- Replaces public_event_winners (rank=1 only) with public_event_top3,
-- which includes ranks 1-3 for every published program regardless of type.
-- Powers the public leaderboard's "Just Published" hero and "Past Results"
-- list, both of which now show the full top-3 per program, not just the
-- winner.
-- Run this after 20260808102514_remove_judges.sql.

drop view if exists public.public_event_winners;

create or replace view public.public_event_top3 as
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.program_type,
  p.published_at,
  pr.rank,
  pr.student_id as place_id,
  pr.student_name as place_name
from public.programs p
join public.public_program_results pr on pr.program_id = p.id
where p.published = true and p.program_type = 'individual' and pr.rank <= 3
union all
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.program_type,
  p.published_at,
  gpr.rank,
  gpr.group_id as place_id,
  gpr.group_name as place_name
from public.programs p
join public.public_group_program_results gpr on gpr.program_id = p.id
where p.published = true and p.program_type = 'group' and gpr.rank <= 3;

----------------------------------------------------------------------
-- 20260808102516_event_top3_photos.sql
----------------------------------------------------------------------

-- Surfaces each individual winner's photo through to the public leaderboard
-- so podium/spotlight cards can show a real avatar instead of a generic
-- person icon. Group-type placements have no single photo, so they stay
-- null (the icon fallback still applies there).
-- Run this after 20260808102515_event_top3.sql.

create or replace view public.program_results as
select
  s.program_id,
  s.student_id,
  st.name as student_name,
  st.group_id,
  s.total as avg_total,
  rank() over (partition by s.program_id order by s.total desc) as rank,
  st.photo_url
from public.scores s
join public.students st on st.id = s.student_id;

-- Recreated (unchanged body) so its expanded "select *" picks up the new
-- photo_url column from program_results above.
create or replace view public.public_program_results as
select pr.*
from public.program_results pr
join public.programs p on p.id = pr.program_id
where p.published = true;

create or replace view public.public_event_top3 as
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.program_type,
  p.published_at,
  pr.rank,
  pr.student_id as place_id,
  pr.student_name as place_name,
  pr.photo_url as place_photo_url
from public.programs p
join public.public_program_results pr on pr.program_id = p.id
where p.published = true and p.program_type = 'individual' and pr.rank <= 3
union all
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.program_type,
  p.published_at,
  gpr.rank,
  gpr.group_id as place_id,
  gpr.group_name as place_name,
  null as place_photo_url
from public.programs p
join public.public_group_program_results gpr on gpr.program_id = p.id
where p.published = true and p.program_type = 'group' and gpr.rank <= 3;

----------------------------------------------------------------------
-- 20260808102517_event_top3_group_id.sql
----------------------------------------------------------------------

-- Surfaces each placement's group_id through to the public leaderboard so
-- avatars can show a colored ring identifying the participant's group at a
-- glance. For group-type programs the "place" already IS a group, so its
-- own id doubles as the group id.
-- Run this after 20260808102516_event_top3_photos.sql.

create or replace view public.public_event_top3 as
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.program_type,
  p.published_at,
  pr.rank,
  pr.student_id as place_id,
  pr.student_name as place_name,
  pr.photo_url as place_photo_url,
  pr.group_id as place_group_id
from public.programs p
join public.public_program_results pr on pr.program_id = p.id
where p.published = true and p.program_type = 'individual' and pr.rank <= 3
union all
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.program_type,
  p.published_at,
  gpr.rank,
  gpr.group_id as place_id,
  gpr.group_name as place_name,
  null as place_photo_url,
  gpr.group_id as place_group_id
from public.programs p
join public.public_group_program_results gpr on gpr.program_id = p.id
where p.published = true and p.program_type = 'group' and gpr.rank <= 3;

----------------------------------------------------------------------
-- 20260808102518_group_leaderboard_points_by_type.sql
----------------------------------------------------------------------

-- Differentiates point values by program type: group-type programs are
-- worth more (10/5/3 for 1st/2nd/3rd) since they represent a whole group's
-- combined effort, while individual programs keep the original 5/3/1.
-- Run this after 20260808102517_event_top3_group_id.sql.

create or replace view public.public_group_leaderboard as
select
  g.id as group_id,
  g.name as group_name,
  coalesce(sum(contributions.points), 0) as points
from public.groups g
left join (
  select group_id, case rank when 1 then 5 when 2 then 3 when 3 then 1 else 0 end as points
  from public.public_program_results
  union all
  select group_id, case rank when 1 then 10 when 2 then 5 when 3 then 3 else 0 end as points
  from public.public_group_program_results
) contributions on contributions.group_id = g.id
group by g.id, g.name
order by points desc;

----------------------------------------------------------------------
-- 20260811122632_enable_realtime.sql
----------------------------------------------------------------------

-- Enable Realtime (postgres_changes) for the tables the public leaderboard
-- and dashboard subscribe to. No prior migration ever added these tables to
-- the supabase_realtime publication, so every .channel(...).on("postgres_changes",
-- ...) subscription in the app (published-results-feed, championship-sidebar,
-- info-cards-row, leaderboard-footer, the podium celebration layout) has
-- silently never received live change events — pages only ever reflected
-- fresh data on a hard reload, never a live push.
--
-- Idempotent: skips any table already in the publication, so this is safe to
-- run even if some tables were already added via the Dashboard's Replication
-- toggle.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'programs'
  ) then
    alter publication supabase_realtime add table public.programs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'scores'
  ) then
    alter publication supabase_realtime add table public.scores;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_scores'
  ) then
    alter publication supabase_realtime add table public.group_scores;
  end if;
end $$;

----------------------------------------------------------------------
-- 20260811122633_dense_rank_ties.sql
----------------------------------------------------------------------

-- Fixes tied placements: `rank()` leaves a gap after a tie (e.g. two
-- students tied for 1st produces ranks 1, 1, 3 — no rank 2 at all), which
-- made the podium and public_event_top3 (rank <= 3) show the true 3rd
-- place as "2nd" while dropping the actual 3rd place entirely.
-- `dense_rank()` collapses ties instead (1, 1, 2, 3), so every medal tier
-- is always filled correctly regardless of ties.
-- Run this after 20260811122632_enable_realtime.sql.
--
-- Only program_results/group_program_results need redefining — every
-- dependent view (public_program_results, public_group_program_results,
-- public_event_top3, public_group_leaderboard, public_program_winners)
-- selects through unchanged columns, so Postgres reflects the corrected
-- rank values automatically without needing to be recreated.

create or replace view public.program_results as
select
  s.program_id,
  s.student_id,
  st.name as student_name,
  st.group_id,
  s.total as avg_total,
  dense_rank() over (partition by s.program_id order by s.total desc) as rank,
  st.photo_url
from public.scores s
join public.students st on st.id = s.student_id;

create or replace view public.group_program_results as
select
  gs.program_id,
  gs.group_id,
  g.name as group_name,
  gs.total as avg_total,
  dense_rank() over (partition by gs.program_id order by gs.total desc) as rank
from public.group_scores gs
join public.groups g on g.id = gs.group_id;

----------------------------------------------------------------------
-- 20260811122634_score_audit_log.sql
----------------------------------------------------------------------

-- Score edit audit trail: every insert/update/delete on scores or
-- group_scores is captured here (old totals are visible via prior rows in
-- this log), so admins can answer "who changed this score, and when" —
-- previously there was no history and a score could be silently overwritten.
-- Run this after 20260811122633_dense_rank_ties.sql.

create table if not exists public.score_audit_log (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  participant_kind text not null check (participant_kind in ('student', 'group')),
  participant_id uuid not null,
  presentation numeric,
  content numeric,
  overall numeric,
  total numeric,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists score_audit_log_program_id_idx
  on public.score_audit_log (program_id, changed_at desc);

alter table public.score_audit_log enable row level security;

create policy "score_audit_log_select_admin" on public.score_audit_log
  for select using (public.is_admin());
-- No insert/update/delete policy for regular clients — rows are only ever
-- written by the trigger function below, which runs security definer.

create or replace function public.log_score_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_kind text;
  v_participant_id uuid;
  v_program_id uuid;
  v_presentation numeric;
  v_content numeric;
  v_overall numeric;
  v_total numeric;
begin
  -- A CASE expression referencing both new.student_id and new.group_id in
  -- one embedded SQL statement makes Postgres validate BOTH field names
  -- against the actual row — and a scores row has no group_id (nor a
  -- group_scores row a student_id), so that fails every time. Plain
  -- PL/pgSQL assignments below are resolved per-branch at runtime instead,
  -- which is the standard pattern for a trigger function shared across
  -- tables with different shapes.
  if tg_table_name = 'scores' then
    v_participant_kind := 'student';
    if tg_op = 'DELETE' then
      v_program_id := old.program_id;
      v_participant_id := old.student_id;
      v_presentation := old.presentation;
      v_content := old.content;
      v_overall := old.overall;
      v_total := old.total;
    else
      v_program_id := new.program_id;
      v_participant_id := new.student_id;
      v_presentation := new.presentation;
      v_content := new.content;
      v_overall := new.overall;
      v_total := new.total;
    end if;
  else
    v_participant_kind := 'group';
    if tg_op = 'DELETE' then
      v_program_id := old.program_id;
      v_participant_id := old.group_id;
      v_presentation := old.presentation;
      v_content := old.content;
      v_overall := old.overall;
      v_total := old.total;
    else
      v_program_id := new.program_id;
      v_participant_id := new.group_id;
      v_presentation := new.presentation;
      v_content := new.content;
      v_overall := new.overall;
      v_total := new.total;
    end if;
  end if;

  insert into public.score_audit_log (
    program_id, participant_kind, participant_id,
    presentation, content, overall, total, action, changed_by
  )
  values (
    v_program_id, v_participant_kind, v_participant_id,
    v_presentation, v_content, v_overall, v_total, lower(tg_op), auth.uid()
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists scores_audit_trigger on public.scores;
create trigger scores_audit_trigger
  after insert or update or delete on public.scores
  for each row execute function public.log_score_change();

drop trigger if exists group_scores_audit_trigger on public.group_scores;
create trigger group_scores_audit_trigger
  after insert or update or delete on public.group_scores
  for each row execute function public.log_score_change();

----------------------------------------------------------------------
-- 20260811122635_student_checkin.sql
----------------------------------------------------------------------

-- Attendance/check-in tracking for students. Lets admins mark a student as
-- physically checked in at the venue and surfaces a real "Checked in: X/Y"
-- count on the dashboard (previously no such data existed).
-- Run this after 20260811122634_score_audit_log.sql.

alter table public.students
  add column if not exists checked_in boolean not null default false,
  add column if not exists checked_in_at timestamptz;

----------------------------------------------------------------------
-- 20260811182747_student_category_on_results.sql
----------------------------------------------------------------------

-- Surfaces each individual placement's student category (boy/girl) through
-- to the public leaderboard, so a participant with no uploaded photo can
-- fall back to a gender-appropriate illustrated avatar instead of a
-- generic person icon. Group-type placements have no single student, so
-- they stay null (the "groups" icon fallback still applies there).
-- Run this after 20260811122635_student_checkin.sql.

create or replace view public.program_results as
select
  s.program_id,
  s.student_id,
  st.name as student_name,
  st.group_id,
  s.total as avg_total,
  dense_rank() over (partition by s.program_id order by s.total desc) as rank,
  st.photo_url,
  st.category as student_category
from public.scores s
join public.students st on st.id = s.student_id;

-- Recreated (unchanged body) so its expanded "select *" picks up the new
-- student_category column from program_results above.
create or replace view public.public_program_results as
select pr.*
from public.program_results pr
join public.programs p on p.id = pr.program_id
where p.published = true;

create or replace view public.public_event_top3 as
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.program_type,
  p.published_at,
  pr.rank,
  pr.student_id as place_id,
  pr.student_name as place_name,
  pr.photo_url as place_photo_url,
  pr.group_id as place_group_id,
  pr.student_category as place_category
from public.programs p
join public.public_program_results pr on pr.program_id = p.id
where p.published = true and p.program_type = 'individual' and pr.rank <= 3
union all
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.program_type,
  p.published_at,
  gpr.rank,
  gpr.group_id as place_id,
  gpr.group_name as place_name,
  null as place_photo_url,
  gpr.group_id as place_group_id,
  null as place_category
from public.programs p
join public.public_group_program_results gpr on gpr.program_id = p.id
where p.published = true and p.program_type = 'group' and gpr.rank <= 3;

----------------------------------------------------------------------
-- 20260811182748_best_participants.sql
----------------------------------------------------------------------

-- "Best Participant" award: an individual student's aggregate points across
-- every published program they've placed top-3 in, using the same points
-- scale as the group leaderboard's individual contribution (1st=5, 2nd=3,
-- 3rd=1). Split by category (boy/girl) at the query level so the public
-- leaderboard and reports can show a separate award per gender.
-- Run this after 20260811182747_student_category_on_results.sql.

create or replace view public.public_best_participants as
select
  st.id as student_id,
  st.name as student_name,
  st.category as student_category,
  st.group_id,
  g.name as group_name,
  coalesce(sum(
    case pr.rank
      when 1 then 5
      when 2 then 3
      when 3 then 1
      else 0
    end
  ), 0) as points
from public.students st
join public.groups g on g.id = st.group_id
left join public.public_program_results pr on pr.student_id = st.id
group by st.id, st.name, st.category, st.group_id, g.name
order by points desc;

----------------------------------------------------------------------
-- 20260811182749_drop_best_participants.sql
----------------------------------------------------------------------

-- Best Participant award removed from the product; drop the view added in
-- 20260811182748_best_participants.sql.

drop view if exists public.public_best_participants;

----------------------------------------------------------------------
-- 20260817145017_event_top3_points.sql
----------------------------------------------------------------------

-- Surfaces each placement's score (avg_total) through public_event_top3 so
-- the live podium can show "N Points" under each place, matching the score
-- already used to rank them.
-- Run this after 20260811182747_student_category_on_results.sql.

create or replace view public.public_event_top3 as
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.program_type,
  p.published_at,
  pr.rank,
  pr.student_id as place_id,
  pr.student_name as place_name,
  pr.photo_url as place_photo_url,
  pr.group_id as place_group_id,
  pr.student_category as place_category,
  pr.avg_total
from public.programs p
join public.public_program_results pr on pr.program_id = p.id
where p.published = true and p.program_type = 'individual' and pr.rank <= 3
union all
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.program_type,
  p.published_at,
  gpr.rank,
  gpr.group_id as place_id,
  gpr.group_name as place_name,
  null as place_photo_url,
  gpr.group_id as place_group_id,
  null as place_category,
  gpr.avg_total
from public.programs p
join public.public_group_program_results gpr on gpr.program_id = p.id
where p.published = true and p.program_type = 'group' and gpr.rank <= 3;

----------------------------------------------------------------------
-- 20260818141446_single_score.sql
----------------------------------------------------------------------

-- Collapses the 3-part score (presentation/content/overall) into a single
-- overall score. `total` was a generated column (presentation+content+
-- overall); DROP EXPRESSION freezes each row's current computed value in
-- place as a plain column before the source columns are dropped, so
-- existing scores become "one number" without recomputation and every
-- downstream view/query that already reads `total` (program_results,
-- public_event_top3, etc.) keeps working unchanged.
-- Run this after 20260817145017_event_top3_points.sql.

alter table public.scores alter column total drop expression;
alter table public.scores alter column total set not null;
alter table public.scores add constraint scores_total_check check (total >= 0);
alter table public.scores drop column presentation;
alter table public.scores drop column content;
alter table public.scores drop column overall;

alter table public.group_scores alter column total drop expression;
alter table public.group_scores alter column total set not null;
alter table public.group_scores add constraint group_scores_total_check check (total >= 0);
alter table public.group_scores drop column presentation;
alter table public.group_scores drop column content;
alter table public.group_scores drop column overall;

alter table public.score_audit_log drop column presentation;
alter table public.score_audit_log drop column content;
alter table public.score_audit_log drop column overall;

-- Trigger function simplified to match: only `total` is captured per change.
create or replace function public.log_score_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_kind text;
  v_participant_id uuid;
  v_program_id uuid;
  v_total numeric;
begin
  if tg_table_name = 'scores' then
    v_participant_kind := 'student';
    if tg_op = 'DELETE' then
      v_program_id := old.program_id;
      v_participant_id := old.student_id;
      v_total := old.total;
    else
      v_program_id := new.program_id;
      v_participant_id := new.student_id;
      v_total := new.total;
    end if;
  else
    v_participant_kind := 'group';
    if tg_op = 'DELETE' then
      v_program_id := old.program_id;
      v_participant_id := old.group_id;
      v_total := old.total;
    else
      v_program_id := new.program_id;
      v_participant_id := new.group_id;
      v_total := new.total;
    end if;
  end if;

  insert into public.score_audit_log (
    program_id, participant_kind, participant_id, total, action, changed_by
  )
  values (
    v_program_id, v_participant_kind, v_participant_id, v_total, lower(tg_op), auth.uid()
  );

  return coalesce(new, old);
end;
$$;

----------------------------------------------------------------------
-- 20260818144331_program_judges.sql
----------------------------------------------------------------------

-- Free-text judge names per program — NOT a return to judge user
-- accounts/logins (that judge_id/judge_assignments/profiles-role system was
-- intentionally removed in 20260808102514_remove_judges.sql, since scoring is a
-- single admin-transcribed value per participant). This just lets an admin
-- record who's on a program's judging panel so their names can be printed
-- on the scoresheet instead of left blank for handwriting.
-- Run this after 20260818141446_single_score.sql.

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

----------------------------------------------------------------------
-- 20260821121826_divisions.sql
----------------------------------------------------------------------

-- Turns "division" (senior/junior/sub_junior/general) from a fixed 4-value
-- CHECK-constrained text field into a real, admin-editable table. Today
-- students.division and programs.category (named "category" but holding a
-- division value — see 20260808102513_program_category_is_division.sql) are both
-- `text` with a `check (... in ('senior','junior','sub_junior','general'))`.
-- Going forward both become `uuid references divisions(id)`, so an admin
-- can add/remove/reorder divisions from a dashboard page instead of being
-- stuck with these 4 forever.
--
-- Takes ACCESS EXCLUSIVE locks on students/programs for its full duration —
-- run this during a maintenance window, not while check-in or scoring is
-- actively writing to those tables.
--
-- Run this after 20260818144331_program_judges.sql.

create table public.divisions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ml text,
  sort_order integer not null default 0,
  base_chest_number integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.divisions enable row level security;

create policy "divisions_select_public" on public.divisions for select using (true);
create policy "divisions_write_admin" on public.divisions for all
  using (public.is_admin()) with check (public.is_admin());

-- Seed the 4 existing divisions, matching today's hardcoded
-- assign_chest_number() base numbers and a stable display order. legacy_key
-- is temporary — used only to map the old text values to the new ids
-- below, then dropped at the end of this migration.
alter table public.divisions add column legacy_key text;

insert into public.divisions (name, name_ml, sort_order, base_chest_number, legacy_key) values
  ('Senior', 'സീനിയർ', 0, 100, 'senior'),
  ('Junior', 'ജൂനിയർ', 1, 1000, 'junior'),
  ('Sub-Junior', 'സബ് ജൂനിയർ', 2, 2000, 'sub_junior'),
  ('General', 'ജനറൽ', 3, 3000, 'general');

-- A prior run of this migration hit three surprises in a row: "cannot drop
-- column category ... view public_event_top3 depends on it", then "column
-- pr.student_category does not exist" (program_results/public_program_
-- results had drifted from migration history), then "cannot drop view
-- public_program_results ... view public_group_leaderboard depends on it"
-- — this whole results-view chain has more live dependents than migration
-- history alone accounts for. Rather than keep discovering them one error
-- at a time, CASCADE from the two root views: every view built on top of
-- program_results/group_program_results (known ones and any not yet
-- discovered) gets dropped in one go. All of these are pure SELECT views
-- with no stored data, so there's nothing to lose — they're all rebuilt
-- from canonical migration-history definitions below regardless of what
-- shape they'd drifted into.
drop view if exists public.program_results cascade;
drop view if exists public.group_program_results cascade;

-- students.division: text -> uuid references divisions(id)
alter table public.students
  add column division_new uuid constraint students_division_fkey references public.divisions (id);

update public.students
set division_new = (select id from public.divisions where legacy_key = students.division);

alter table public.students drop constraint if exists students_division_check;
alter table public.students drop column division;
alter table public.students rename column division_new to division;
alter table public.students alter column division set not null;

-- programs.category: text -> uuid references divisions(id)
-- (column name kept as "category" — see migration comment above; renaming
-- it is a separate follow-up, not part of this migration). The views that
-- depended on this column were already dropped above.
alter table public.programs
  add column category_new uuid constraint programs_category_fkey references public.divisions (id);

update public.programs
set category_new = (select id from public.divisions where legacy_key = programs.category);

alter table public.programs drop constraint if exists programs_category_check;
alter table public.programs drop column category;
alter table public.programs rename column category_new to category;
alter table public.programs alter column category set not null;

-- Rebuild the view chain dropped above (by CASCADE, so this recreates
-- every dependent regardless of how it was discovered), in dependency
-- order — canonical definitions from 20260811182747_student_category_on_results.sql
-- / 20260811122633_dense_rank_ties.sql / 20260808102518_group_leaderboard_points_by_type.sql /
-- 20260817145017_event_top3_points.sql, unchanged except that p.category (used
-- inside public_event_top3 below) now resolves to a uuid.
create or replace view public.program_results as
select
  s.program_id,
  s.student_id,
  st.name as student_name,
  st.group_id,
  s.total as avg_total,
  dense_rank() over (partition by s.program_id order by s.total desc) as rank,
  st.photo_url,
  st.category as student_category
from public.scores s
join public.students st on st.id = s.student_id;

create or replace view public.public_program_results as
select pr.*
from public.program_results pr
join public.programs p on p.id = pr.program_id
where p.published = true;

create or replace view public.group_program_results as
select
  gs.program_id,
  gs.group_id,
  g.name as group_name,
  gs.total as avg_total,
  dense_rank() over (partition by gs.program_id order by gs.total desc) as rank
from public.group_scores gs
join public.groups g on g.id = gs.group_id;

create or replace view public.public_group_program_results as
select gpr.*
from public.group_program_results gpr
join public.programs p on p.id = gpr.program_id
where p.published = true;

create or replace view public.public_group_leaderboard as
select
  g.id as group_id,
  g.name as group_name,
  coalesce(sum(contributions.points), 0) as points
from public.groups g
left join (
  select group_id, case rank when 1 then 5 when 2 then 3 when 3 then 1 else 0 end as points
  from public.public_program_results
  union all
  select group_id, case rank when 1 then 10 when 2 then 5 when 3 then 3 else 0 end as points
  from public.public_group_program_results
) contributions on contributions.group_id = g.id
group by g.id, g.name
order by points desc;

create or replace view public.public_event_top3 as
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.program_type,
  p.published_at,
  pr.rank,
  pr.student_id as place_id,
  pr.student_name as place_name,
  pr.photo_url as place_photo_url,
  pr.group_id as place_group_id,
  pr.student_category as place_category,
  pr.avg_total
from public.programs p
join public.public_program_results pr on pr.program_id = p.id
where p.published = true and p.program_type = 'individual' and pr.rank <= 3
union all
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.program_type,
  p.published_at,
  gpr.rank,
  gpr.group_id as place_id,
  gpr.group_name as place_name,
  null as place_photo_url,
  gpr.group_id as place_group_id,
  null as place_category,
  gpr.avg_total
from public.programs p
join public.public_group_program_results gpr on gpr.program_id = p.id
where p.published = true and p.program_type = 'group' and gpr.rank <= 3;

alter table public.divisions drop column legacy_key;

-- assign_chest_number() switched on a hardcoded 4-way case on the old text
-- division value — now looks up the base number from the divisions table
-- itself, so a newly-added division works without a code change.
create or replace function public.assign_chest_number()
returns trigger
language plpgsql
as $$
declare
  base int;
  block_size int := 50;
  group_idx int;
  existing_count int;
begin
  if new.chest_number is not null then
    return new;
  end if;

  select base_chest_number into base from public.divisions where id = new.division;

  select group_index into group_idx from public.group_ranks where group_id = new.group_id;

  select count(*) into existing_count
  from public.students
  where group_id = new.group_id and division = new.division;

  if existing_count >= block_size then
    raise exception 'Chest number block full for this group and division (max % students)', block_size;
  end if;

  new.chest_number := (base + group_idx * block_size + existing_count)::text;

  return new;
end;
$$;

----------------------------------------------------------------------
-- 20260824100119_program_memento.sql
----------------------------------------------------------------------

-- Tracks whether the physical memento/trophy for a program's winners has
-- been handed over at the ceremony, separate from result publishing.
-- Run this after 20260821121826_divisions.sql.

alter table public.programs
  add column if not exists memento_given boolean not null default false,
  add column if not exists memento_given_at timestamptz;

----------------------------------------------------------------------
-- 20260826111125_chest_number_gender_order.sql
----------------------------------------------------------------------

-- Chest numbers within a group+division block now order boys before girls,
-- contiguously, instead of "whoever was inserted first". Block boundaries
-- are unchanged (base_chest_number + group_index * 50, from 20260821121826_divisions.sql).
--
-- The old assign_chest_number() only ran on insert and appended the new
-- student to the end of the block — fine for a single ordering, but it
-- can't keep "boys first" true once students of different categories are
-- inserted out of order (as happened manually once already — see the
-- Muhammed Ilyas M fix in the app's history). Renumbering the whole block
-- on every insert/update/delete is the only way to keep that invariant
-- regardless of insertion order.
--
-- renumber_chest_block() recomputes every chest_number in one group+division
-- block from scratch, ordered by category ('boy' before 'girl') then
-- created_at. The trigger fires after insert/update/delete and calls it for
-- the affected block(s). The "is distinct from" guard in the UPDATE only
-- touches rows whose number actually changes, so the same trigger firing
-- again on those rows converges immediately (second pass computes the same
-- numbers, updates nothing, no further recursion) instead of looping.
--
-- Run this after 20260824100119_program_memento.sql.

create or replace function public.renumber_chest_block(p_group_id uuid, p_division uuid)
returns void
language plpgsql
as $$
declare
  base int;
  group_idx int;
  block_size int := 50;
  total_count int;
begin
  select base_chest_number into base from public.divisions where id = p_division;
  select group_index into group_idx from public.group_ranks where group_id = p_group_id;

  select count(*) into total_count
  from public.students
  where group_id = p_group_id and division = p_division;

  if total_count > block_size then
    raise exception 'Chest number block full for this group and division (max % students)', block_size;
  end if;

  with ordered as (
    select
      id,
      base + group_idx * block_size + row_number() over (
        order by case category when 'boy' then 0 else 1 end, created_at
      ) - 1 as new_chest_number
    from public.students
    where group_id = p_group_id and division = p_division
  )
  update public.students s
  set chest_number = ordered.new_chest_number::text
  from ordered
  where s.id = ordered.id
    and s.chest_number is distinct from ordered.new_chest_number::text;
end;
$$;

create or replace function public.students_renumber_chest_numbers()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.renumber_chest_block(old.group_id, old.division);
    return old;
  end if;

  perform public.renumber_chest_block(new.group_id, new.division);

  if tg_op = 'UPDATE' and (new.group_id <> old.group_id or new.division <> old.division) then
    perform public.renumber_chest_block(old.group_id, old.division);
  end if;

  return new;
end;
$$;

drop trigger if exists students_assign_chest_number on public.students;
drop function if exists public.assign_chest_number();

drop trigger if exists students_renumber_chest_numbers on public.students;
create trigger students_renumber_chest_numbers
  after insert or update or delete on public.students
  for each row execute function public.students_renumber_chest_numbers();

----------------------------------------------------------------------
-- 20260826111126_group_participant_members.sql
----------------------------------------------------------------------

-- Group-type programs only ever tracked which *groups* (teams) took part
-- (program_group_participants: program_id + group_id) — there was no way
-- to record which individual students actually performed for a group in a
-- given program. This adds that roster, purely for participation/
-- attendance/certificate purposes; scoring stays group-level in
-- group_scores, unchanged.
--
-- FKs to program_group_participants via the (program_id, group_id) pair
-- (already unique from 20260808102512_students_programs_expansion.sql) rather than
-- its id, so callers that already have program_id/group_id in hand (the
-- same shape addGroupParticipant/removeGroupParticipant use) don't need an
-- extra lookup. Removing a group from a program cascades to its member
-- rows automatically.
--
-- Run this after 20260826111125_chest_number_gender_order.sql.

create table if not exists public.program_group_participant_members (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  group_id uuid not null,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (program_id, group_id, student_id),
  foreign key (program_id, group_id)
    references public.program_group_participants (program_id, group_id)
    on delete cascade
);

alter table public.program_group_participant_members enable row level security;

create policy "program_group_participant_members_select_public"
  on public.program_group_participant_members for select using (true);
create policy "program_group_participant_members_write_admin"
  on public.program_group_participant_members for all
  using (public.is_admin()) with check (public.is_admin());

----------------------------------------------------------------------
-- 20260826111127_fix_score_audit_log_fk.sql
----------------------------------------------------------------------

-- Deleting a program cascades to delete its scores/group_scores, which
-- fires log_score_change() to record the deletion in score_audit_log —
-- but score_audit_log.program_id had its own "on delete cascade" FK back
-- to programs. The trigger's INSERT into score_audit_log references
-- program_id while the parent programs row is being deleted in the SAME
-- statement, and by the time that INSERT runs the parent row is already
-- gone, so the FK check fails: "Key (program_id)=(...) is not present in
-- table programs". The whole DELETE then rolls back — meaning any
-- program that has ever had a score entered (published or not) could
-- never actually be deleted; deleteProgram just surfaced a generic
-- "Could not delete program." error.
--
-- Reproduced directly against the database:
--   delete from programs where id = '<a program with scores>';
--   -> insert or update on table "score_audit_log" violates foreign key
--      constraint "score_audit_log_program_id_fkey"
--
-- Fix: an audit log is a historical record and shouldn't require its
-- subject to still exist. Drop the FK so old entries survive program
-- deletion instead of racing it.
-- Run this after 20260826111126_group_participant_members.sql.

alter table public.score_audit_log
  drop constraint if exists score_audit_log_program_id_fkey;

----------------------------------------------------------------------
-- 20260829041025_compress_chest_number_ranges.sql
----------------------------------------------------------------------

-- Compress division chest-number ranges from 100/1000/2000/3000 down to
-- 100/200/300/400 (the Nth division by sort_order gets base N*100), drop
-- the group/house block-splitting entirely, and restrict chest numbers to
-- boys only (girls don't need one — see badges/page.tsx) — chest numbers
-- are now just a consecutive boys-only sequence within a division,
-- regardless of which group a student belongs to.
--
-- Live DB note: 20260826111125_chest_number_gender_order.sql (renumber_chest_block(),
-- group-aware renumbering on every insert/update/delete) was never applied
-- here — `select proname from pg_proc where proname ilike '%chest%'` came
-- back showing only assign_chest_number() still live, the original
-- INSERT-only trigger from 20260821121826_divisions.sql. This migration replaces
-- that function directly (same name, so the existing trigger picks up the
-- new body automatically) rather than assuming `chest_number_gender_order`'s objects exist.
--
-- Run this after 20260826111127_fix_score_audit_log_fk.sql.

-- 1. New bases: Nth division by sort_order -> N * 100.
with ranked as (
  select id, row_number() over (order by sort_order) as rank
  from public.divisions
)
update public.divisions d
set base_chest_number = ranked.rank * 100
from ranked
where d.id = ranked.id;

-- 2. assign_chest_number(): only boys get chest numbers (badges are
-- boy-only, see src/app/dashboard/students/badges/page.tsx). Girls mixed
-- into the same per-division counter were the cause of the non-
-- consecutive numbering — a girl created between two boys consumed a
-- number, leaving gaps in the boys' sequence. Drop the group_id/
-- block_size offset too, just base_chest_number + how many boys already
-- exist in that division.
create or replace function public.assign_chest_number()
returns trigger
language plpgsql
as $$
declare
  base int;
  existing_count int;
begin
  if new.chest_number is not null then
    return new;
  end if;

  if new.category <> 'boy' then
    return new;
  end if;

  select base_chest_number into base from public.divisions where id = new.division;

  select count(*) into existing_count
  from public.students
  where division = new.division and category = 'boy';

  new.chest_number := (base + existing_count)::text;

  return new;
end;
$$;

-- 3. One-time backfill: renumber every existing BOY sequentially within
-- their division (ordered by created_at), matching the new bases and the
-- group-agnostic, boys-only scheme above. This reassigns chest numbers on
-- any already-printed badges/codes. Girls never needed a chest number
-- (badges are boy-only) — clear any they already have so they stop
-- occupying slots in the count.
update public.students
set chest_number = null
where category <> 'boy' and chest_number is not null;

with ranked as (
  select
    s.id,
    d.base_chest_number + row_number() over (partition by s.division order by s.created_at, s.id) - 1
      as new_chest_number
  from public.students s
  join public.divisions d on d.id = s.division
  where s.category = 'boy'
)
update public.students s
set chest_number = ranked.new_chest_number::text
from ranked
where s.id = ranked.id;

----------------------------------------------------------------------
-- 20260829041026_drop_unused_student_fields.sql
----------------------------------------------------------------------

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

----------------------------------------------------------------------
-- 20260829041027_group_multiple_teams.sql
----------------------------------------------------------------------

-- A group/house could only ever field ONE entry in a given group-type
-- program — enforced by `unique (program_id, group_id)` on
-- program_group_participants, mirrored by an identical
-- `unique (program_id, group_id)` on group_scores. group_id was used
-- everywhere downstream (rosters, scores, results, certificates,
-- leaderboard) as if it were the unique identity of "a participation,"
-- because until now it always was.
--
-- This lets a group field 2+ independent teams in the same program, each
-- scored/ranked independently. program_group_participants.id (already
-- exists, already the identity the codes-generation logic uses) becomes
-- the real "entry" identity everywhere; group_id remains only an
-- attribute ("which house does this entry belong to"). Team labels
-- ("Team A"/"Team B") are computed by the result views from
-- program_group_participants.created_at order, not stored — only shown
-- when a group actually has 2+ entries in that program.
--
-- Several constraints being dropped/added below were defined without an
-- explicit name in their original CREATE TABLE (program_group_participants'
-- unique(program_id, group_id) in `students_programs_expansion`, program_group_participant_members'
-- composite FK in `group_participant_members`) — rather than guess Postgres's auto-generated name,
-- this looks the actual constraint up via pg_constraint and drops it by
-- whatever name it actually has.
--
-- Run this after 20260829041026_drop_unused_student_fields.sql.

-- ============================================================
-- 0. Backfill safety: group_scores and program_group_participant_members
-- were never actually FK'd to program_group_participants (only to
-- groups/programs directly) — a (program_id, group_id) pair can exist in
-- either without a matching program_group_participants row (e.g. the
-- entry was removed after it was already scored). Synthesize the missing
-- entry rather than fail the participant_id backfills below.
-- ============================================================

insert into public.program_group_participants (program_id, group_id)
select distinct gs.program_id, gs.group_id
from public.group_scores gs
where not exists (
  select 1 from public.program_group_participants pgp
  where pgp.program_id = gs.program_id and pgp.group_id = gs.group_id
);

insert into public.program_group_participants (program_id, group_id)
select distinct m.program_id, m.group_id
from public.program_group_participant_members m
where not exists (
  select 1 from public.program_group_participants pgp
  where pgp.program_id = m.program_id and pgp.group_id = m.group_id
);

-- ============================================================
-- 1. program_group_participant_members: repoint at the specific entry
--
-- This must happen BEFORE dropping program_group_participants' unique
-- constraint below — that constraint backs an index that this table's
-- OLD composite FK depends on (confirmed by a failed first run of this
-- migration: "cannot drop constraint ... because other objects depend on
-- it ... constraint ... program_id_group_id_fkey ... depends on index
-- program_group_participants_program_id_group_id_key"). Dropping the FK
-- first removes that dependency.
-- ============================================================

alter table public.program_group_participant_members
  add column if not exists participant_id uuid references public.program_group_participants (id) on delete cascade;

update public.program_group_participant_members m
set participant_id = pgp.id
from public.program_group_participants pgp
where m.participant_id is null
  and pgp.program_id = m.program_id
  and pgp.group_id = m.group_id;

alter table public.program_group_participant_members
  alter column participant_id set not null;

do $$
declare
  ct text;
begin
  -- Target the OLD composite (program_id, group_id) FK specifically by its
  -- 2-column shape, rather than by excluding the new participant_id FK by
  -- a guessed name — this is unambiguous regardless of what Postgres named
  -- either constraint.
  select conname into ct
  from pg_constraint
  where conrelid = 'public.program_group_participant_members'::regclass
    and contype = 'f'
    and confrelid = 'public.program_group_participants'::regclass
    and array_length(conkey, 1) = 2;
  if ct is not null then
    execute format('alter table public.program_group_participant_members drop constraint %I', ct);
  end if;
end $$;

-- Unchanged unique(program_id, group_id, student_id) now correctly means
-- "a student can only belong to one of this group's teams in this
-- program" — exactly the invariant we want, so it's left as-is.

-- ============================================================
-- 2. program_group_participants: allow multiple rows per (program_id, group_id)
-- Now safe — nothing depends on this constraint's backing index anymore.
-- ============================================================

do $$
declare
  ct text;
begin
  select conname into ct
  from pg_constraint
  where conrelid = 'public.program_group_participants'::regclass
    and contype = 'u';
  if ct is not null then
    execute format('alter table public.program_group_participants drop constraint %I', ct);
  end if;
end $$;

-- ============================================================
-- 3. group_scores: score belongs to a specific entry, not just a group
-- ============================================================

alter table public.group_scores
  add column if not exists participant_id uuid references public.program_group_participants (id) on delete cascade;

update public.group_scores gs
set participant_id = pgp.id
from public.program_group_participants pgp
where gs.participant_id is null
  and pgp.program_id = gs.program_id
  and pgp.group_id = gs.group_id;

alter table public.group_scores
  alter column participant_id set not null;

alter table public.group_scores
  drop constraint if exists group_scores_program_id_group_id_key;

alter table public.group_scores
  add constraint group_scores_participant_id_key unique (participant_id);

-- ============================================================
-- 4. Audit trail: record which entry changed, not just which group
-- ============================================================

-- Backfill existing group-kind audit rows while the group_id they stored
-- as participant_id still maps 1:1 to a program_group_participants row
-- (true right up until this migration).
update public.score_audit_log sal
set participant_id = pgp.id
from public.program_group_participants pgp
where sal.participant_kind = 'group'
  and pgp.program_id = sal.program_id
  and pgp.group_id = sal.participant_id;

create or replace function public.log_score_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_kind text;
  v_participant_id uuid;
  v_program_id uuid;
  v_total numeric;
begin
  if tg_table_name = 'scores' then
    v_participant_kind := 'student';
    if tg_op = 'DELETE' then
      v_program_id := old.program_id;
      v_participant_id := old.student_id;
      v_total := old.total;
    else
      v_program_id := new.program_id;
      v_participant_id := new.student_id;
      v_total := new.total;
    end if;
  else
    v_participant_kind := 'group';
    if tg_op = 'DELETE' then
      v_program_id := old.program_id;
      v_participant_id := old.participant_id;
      v_total := old.total;
    else
      v_program_id := new.program_id;
      v_participant_id := new.participant_id;
      v_total := new.total;
    end if;
  end if;

  insert into public.score_audit_log (
    program_id, participant_kind, participant_id, total, action, changed_by
  )
  values (
    v_program_id, v_participant_kind, v_participant_id, v_total, lower(tg_op), auth.uid()
  );

  return coalesce(new, old);
end;
$$;

-- ============================================================
-- 5. Rebuild the result view chain — same cascade-drop-and-rebuild
-- pattern as 20260821121826_divisions.sql, since group_program_results' shape
-- changes (participant_id, computed team-suffix name).
-- ============================================================

drop view if exists public.public_event_top3 cascade;
drop view if exists public.public_group_leaderboard cascade;
drop view if exists public.public_group_program_results cascade;
drop view if exists public.group_program_results cascade;

create or replace view public.group_program_results as
select
  gs.program_id,
  gs.group_id,
  gs.participant_id,
  case
    when count(*) over (partition by gs.program_id, gs.group_id) > 1
      then g.name || ' ' || chr((64 + row_number() over (
        partition by gs.program_id, gs.group_id order by pgp.created_at, pgp.id
      ))::int)
    else g.name
  end as group_name,
  gs.total as avg_total,
  dense_rank() over (partition by gs.program_id order by gs.total desc) as rank
from public.group_scores gs
join public.groups g on g.id = gs.group_id
join public.program_group_participants pgp on pgp.id = gs.participant_id;

create or replace view public.public_group_program_results as
select gpr.*
from public.group_program_results gpr
join public.programs p on p.id = gpr.program_id
where p.published = true;

create or replace view public.public_group_leaderboard as
select
  g.id as group_id,
  g.name as group_name,
  coalesce(sum(contributions.points), 0) as points
from public.groups g
left join (
  select group_id, case rank when 1 then 5 when 2 then 3 when 3 then 1 else 0 end as points
  from public.public_program_results
  union all
  select group_id, case rank when 1 then 10 when 2 then 5 when 3 then 3 else 0 end as points
  from public.public_group_program_results
) contributions on contributions.group_id = g.id
group by g.id, g.name
order by points desc;

create or replace view public.public_event_top3 as
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.program_type,
  p.published_at,
  pr.rank,
  pr.student_id as place_id,
  pr.student_name as place_name,
  pr.photo_url as place_photo_url,
  pr.group_id as place_group_id,
  pr.student_category as place_category,
  pr.avg_total
from public.programs p
join public.public_program_results pr on pr.program_id = p.id
where p.published = true and p.program_type = 'individual' and pr.rank <= 3
union all
select
  p.id as program_id,
  p.name as program_name,
  p.category,
  p.program_type,
  p.published_at,
  gpr.rank,
  gpr.participant_id as place_id,
  gpr.group_name as place_name,
  null as place_photo_url,
  gpr.group_id as place_group_id,
  null as place_category,
  gpr.avg_total
from public.programs p
join public.public_group_program_results gpr on gpr.program_id = p.id
where p.published = true and p.program_type = 'group' and gpr.rank <= 3;

----------------------------------------------------------------------
-- 20260905062620_tenants.sql
----------------------------------------------------------------------

-- Phase 1 of the multi-tenancy migration (see MULTI_TENANCY.md).
--
-- Introduces the tenant model and nothing else: new tables, a `private`
-- helper schema, and the membership functions every later phase's RLS
-- policies will call. No existing table is altered, no existing policy is
-- touched, no existing function changes behaviour — the running festival
-- keeps working exactly as it does today, and the app remains unaware
-- these tables exist until Phase 5.
--
-- Deliberately NOT done here:
--   * profiles.role is kept. dal.ts, dashboard/layout.tsx and the nav
--     components all read it; it gets dropped in Phase 4 once
--     tenant_members is the authority.
--   * handle_new_user() still defaults role='admin'. That is a real
--     problem for public signup (MULTI_TENANCY.md §2.1.4) but fixing it
--     is a behaviour change, so it belongs in Phase 4 with the rest of
--     the function rewrites.
--   * No tenant_id on domain tables. That is Phase 2, and it is gated on
--     reconciling the live schema against migration history first — see
--     `divisions`'s comments for why that reconciliation is not optional.
--
-- Run this after 20260829041027_group_multiple_teams.sql.

-- ============================================================
-- 0. Private schema for RLS helper functions
--
-- These are SECURITY DEFINER and therefore bypass RLS on the tables they
-- read. Keeping them out of `public` means PostgREST never exposes them
-- as RPC endpoints, so they can only ever be reached from inside a policy
-- or another function.
-- ============================================================

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, anon;

-- ============================================================
-- 1. Tables
-- ============================================================

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  -- Lowercase, hyphen-separated, 2-32 chars, no leading/trailing hyphen.
  -- This lands in the URL as /t/<slug>/dashboard.
  slug text not null unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$'),
  name text not null,
  name_ml text,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'trial')),
  locale text not null default 'en'
    check (locale in ('en', 'ml')),
  -- Opt-in, not opt-out: a brand new tenant's roster and results are
  -- private until someone deliberately publishes them. Tenant #1 is
  -- switched on in the backfill below because its leaderboard is already
  -- public today.
  public_leaderboard_enabled boolean not null default false,
  -- { accent, logo_url, ... } — consumed by the per-tenant layout and
  -- manifest in Phase 5. Free-form so branding can grow without a
  -- migration per field.
  branding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_members (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- owner  : + billing, member management, tenant deletion
  -- admin  : all festival data (today's profiles.role='admin')
  -- scorer : reads festival data, writes scores only (today's 'judge',
  --          which `remove_judges` removed and Phase 3 restores properly scoped)
  -- viewer : read-only dashboard
  role text not null check (role in ('owner', 'admin', 'scorer', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

-- The PK covers (tenant_id, user_id); this covers the other direction,
-- which is what "list the tenants I belong to" and every
-- is_tenant_member() call actually probe.
create index if not exists tenant_members_user_id_idx
  on public.tenant_members (user_id, tenant_id);

create table if not exists public.tenant_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  -- Stored lowercased rather than reaching for citext, so this table has
  -- no extension dependency.
  email text not null check (email = lower(email) and position('@' in email) > 1),
  role text not null check (role in ('admin', 'scorer', 'viewer')),
  -- The raw token is mailed to the invitee and never stored. A leaked
  -- database dump therefore does not hand out working invites.
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create index if not exists tenant_invites_tenant_id_idx
  on public.tenant_invites (tenant_id);
create index if not exists tenant_invites_email_idx
  on public.tenant_invites (email) where accepted_at is null;

-- ============================================================
-- 2. Membership helpers
--
-- SECURITY DEFINER is what makes the tenant_members policies below
-- non-recursive: the function bypasses RLS on tenant_members, so a policy
-- ON tenant_members can call it without re-entering its own policy check.
--
-- `set search_path = ''` forces every reference to be schema-qualified,
-- which is what stops a caller-controlled search_path from swapping in a
-- fake public.tenant_members.
--
-- EXECUTE stays granted to authenticated because RLS policies are
-- evaluated with the caller's privileges — a policy calling a function the
-- caller cannot execute fails outright. This is safe: both functions only
-- ever answer about auth.uid(), so neither is an oracle for other users'
-- memberships.
-- ============================================================

create or replace function private.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = p_tenant_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.has_tenant_role(p_tenant_id uuid, p_roles text[])
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = p_tenant_id
      and user_id = (select auth.uid())
      and role = any(p_roles)
  );
$$;

revoke all on function private.is_tenant_member(uuid) from public;
revoke all on function private.has_tenant_role(uuid, text[]) from public;
grant execute on function private.is_tenant_member(uuid) to authenticated;
grant execute on function private.has_tenant_role(uuid, text[]) to authenticated;

-- ============================================================
-- 3. Membership integrity trigger
-- ============================================================

create or replace function public.tenant_members_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_other_owners int;
begin
  -- Cascade deletes: by the time the FK cascade reaches this row the
  -- parent (tenant or auth user) is already gone, so there is no tenant
  -- left to leave ownerless. Without this, deleting a tenant — or a user
  -- who happens to be an owner — would raise below.
  if tg_op = 'DELETE' then
    if not exists (select 1 from public.tenants where id = old.tenant_id)
       or not exists (select 1 from auth.users where id = old.user_id) then
      return old;
    end if;
  end if;

  -- Nobody promotes themselves. Mirrors the intent of
  -- prevent_self_role_escalation() on profiles (`init`), but scoped to a
  -- tenant and closing the demote-others-then-promote-self loophole by
  -- refusing any self role change at all.
  if tg_op = 'UPDATE'
     and new.role is distinct from old.role
     and old.user_id = (select auth.uid()) then
    raise exception 'You cannot change your own role.';
  end if;

  -- A tenant is never left ownerless.
  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    select count(*) into v_other_owners
    from public.tenant_members
    where tenant_id = old.tenant_id
      and role = 'owner'
      and user_id <> old.user_id;

    if v_other_owners = 0 then
      raise exception 'A tenant must always have at least one owner.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists tenant_members_guard on public.tenant_members;
create trigger tenant_members_guard
  before update or delete on public.tenant_members
  for each row execute function public.tenant_members_guard();

-- ============================================================
-- 4. Row Level Security
-- ============================================================

-- Deliberately ENABLE without FORCE.
--
-- FORCE ROW LEVEL SECURITY subjects the *table owner* to policies too. A
-- SECURITY DEFINER function runs as its owner, so under FORCE the two
-- helpers above would be subject to tenant_members' own policies — which
-- grant nothing to `postgres` — and private.is_tenant_member() would
-- return false for everyone, taking every policy in Phase 3 down with it.
-- create_tenant() would likewise be unable to insert, since `tenants` has
-- no INSERT policy by design.
--
-- Nothing is lost by omitting it: real traffic arrives as `anon` or
-- `authenticated`, both fully governed by the policies below with or
-- without FORCE, and `service_role` carries BYPASSRLS, which FORCE cannot
-- restrain either way. Service-role usage stays the one bypass path, and
-- is contained by keeping createAdminClient() out of request handlers
-- (MULTI_TENANCY.md §13).
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.tenant_invites enable row level security;

-- tenants ----------------------------------------------------

drop policy if exists tenants_member_read on public.tenants;
create policy tenants_member_read on public.tenants
  for select to authenticated
  using ((select private.is_tenant_member(id)));

-- Slug -> tenant resolution for the public leaderboard. Covers
-- `authenticated` as well as `anon`: a logged-in user viewing some other
-- tenant's public leaderboard is still the authenticated role, and would
-- otherwise fall through every policy.
drop policy if exists tenants_public_read on public.tenants;
create policy tenants_public_read on public.tenants
  for select to anon, authenticated
  using (status = 'active' and public_leaderboard_enabled);

drop policy if exists tenants_admin_update on public.tenants;
create policy tenants_admin_update on public.tenants
  for update to authenticated
  using ((select private.has_tenant_role(id, array['owner', 'admin'])))
  with check ((select private.has_tenant_role(id, array['owner', 'admin'])));

-- No INSERT policy: tenants are created only through
-- public.create_tenant() below, so slug reservation and owner assignment
-- can never be bypassed. No DELETE policy either — tenant deletion is
-- deferred until the soft-delete/retention question is settled
-- (MULTI_TENANCY.md §12.3).

-- tenant_members ---------------------------------------------

drop policy if exists tenant_members_read on public.tenant_members;
create policy tenant_members_read on public.tenant_members
  for select to authenticated
  using ((select private.is_tenant_member(tenant_id)));

drop policy if exists tenant_members_manage on public.tenant_members;
create policy tenant_members_manage on public.tenant_members
  for all to authenticated
  using ((select private.has_tenant_role(tenant_id, array['owner', 'admin'])))
  with check (
    (select private.has_tenant_role(tenant_id, array['owner', 'admin']))
    -- Only an owner may mint another owner; admins manage everyone below
    -- themselves but cannot escalate a peer past their own level.
    and (tenant_members.role <> 'owner'
         or (select private.has_tenant_role(tenant_id, array['owner'])))
  );

-- tenant_invites ---------------------------------------------

drop policy if exists tenant_invites_manage on public.tenant_invites;
create policy tenant_invites_manage on public.tenant_invites
  for all to authenticated
  using ((select private.has_tenant_role(tenant_id, array['owner', 'admin'])))
  with check ((select private.has_tenant_role(tenant_id, array['owner', 'admin'])));

-- An invitee is by definition not yet a member, so they cannot read their
-- own invite row through RLS. Redemption goes through a SECURITY DEFINER
-- accept_tenant_invite(token) function added with the onboarding UI in
-- Phase 7; until then this table is written but never redeemed.

-- ============================================================
-- 5. Grants
--
-- Supabase's default privileges grant ALL on new public tables to anon
-- and authenticated, so the sensitive tables have to be revoked
-- explicitly — a policy mistake should not be the only thing standing
-- between anon and the member list.
-- ============================================================

revoke all on public.tenants from anon, authenticated;
revoke all on public.tenant_members from anon, authenticated;
revoke all on public.tenant_invites from anon, authenticated;

grant select on public.tenants to anon, authenticated;
grant update on public.tenants to authenticated;
grant select, insert, update, delete on public.tenant_members to authenticated;
grant select, insert, update, delete on public.tenant_invites to authenticated;

-- ============================================================
-- 6. Tenant creation
--
-- Replaces `init`'s bootstrap note ("promote them manually: update
-- public.profiles set role = 'admin' ..."). Tenant and owner are inserted
-- in one transaction so a tenant can never exist without an owner — the
-- state the tenant_members_guard trigger above refuses to allow later.
-- ============================================================

create or replace function public.create_tenant(p_slug text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text := lower(trim(p_slug));
  v_tenant_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Tenant name is required.' using errcode = '22023';
  end if;

  -- Slugs that would collide with a top-level route. Kept here rather
  -- than in a CHECK constraint so the list can grow as routes are added
  -- without rewriting a table constraint.
  if v_slug = any (array[
    'admin', 'api', 'app', 'auth', 'billing', 'dashboard', 'docs', 'help',
    'leaderboard', 'login', 'logout', 'new', 'offline', 'onboarding',
    'settings', 'signup', 'static', 'status', 'support', 't',
    'update-password', 'www'
  ]) then
    raise exception 'That address is reserved. Pick a different one.'
      using errcode = '23514';
  end if;

  insert into public.tenants (slug, name)
  values (v_slug, trim(p_name))
  returning id into v_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tenant_id, (select auth.uid()), 'owner');

  return v_tenant_id;
exception
  when unique_violation then
    raise exception 'That address is already taken.' using errcode = '23505';
end;
$$;

revoke all on function public.create_tenant(text, text) from public;
grant execute on function public.create_tenant(text, text) to authenticated;

-- ============================================================
-- 7. Backfill: the existing festival becomes tenant #1
--
-- Idempotent — re-running this migration will not create a second copy or
-- disturb roles that have since been changed by hand.
--
-- profiles.role maps admin -> 'admin' and judge -> 'scorer'. The earliest
-- profile is promoted to 'owner', since `init`'s model has no equivalent
-- concept and every tenant needs exactly that.
-- ============================================================

do $$
declare
  v_tenant_id uuid;
  v_first_admin uuid;
begin
  select id into v_tenant_id from public.tenants where slug = 'mishkat';

  if v_tenant_id is null then
    insert into public.tenants (slug, name, name_ml, locale, public_leaderboard_enabled)
    values (
      'mishkat',
      'Mehfile Meem',
      null,
      'en',
      -- Already public today; flipping it to the new default of false
      -- would take the live leaderboard down.
      true
    )
    returning id into v_tenant_id;
  end if;

  insert into public.tenant_members (tenant_id, user_id, role)
  select
    v_tenant_id,
    p.id,
    case p.role when 'admin' then 'admin' else 'scorer' end
  from public.profiles p
  on conflict (tenant_id, user_id) do nothing;

  -- Promote the longest-standing admin to owner, preferring an actual
  -- admin over whoever merely signed up first.
  if not exists (
    select 1 from public.tenant_members
    where tenant_id = v_tenant_id and role = 'owner'
  ) then
    select p.id into v_first_admin
    from public.profiles p
    order by (p.role = 'admin') desc, p.created_at, p.id
    limit 1;

    if v_first_admin is not null then
      update public.tenant_members
      set role = 'owner'
      where tenant_id = v_tenant_id and user_id = v_first_admin;
    end if;
  end if;
end $$;
