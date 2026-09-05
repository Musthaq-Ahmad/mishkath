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
