-- Surfaces each placement's score (avg_total) through public_event_top3 so
-- the live podium can show "N Points" under each place, matching the score
-- already used to rank them.
-- Run this after 0016_student_category_on_results.sql.

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
