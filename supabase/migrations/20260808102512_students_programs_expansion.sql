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
