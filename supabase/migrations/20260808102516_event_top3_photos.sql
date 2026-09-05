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
