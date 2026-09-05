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
