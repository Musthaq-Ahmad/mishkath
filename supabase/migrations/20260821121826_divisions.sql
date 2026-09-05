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
