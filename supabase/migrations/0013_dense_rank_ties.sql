-- Fixes tied placements: `rank()` leaves a gap after a tie (e.g. two
-- students tied for 1st produces ranks 1, 1, 3 — no rank 2 at all), which
-- made the podium and public_event_top3 (rank <= 3) show the true 3rd
-- place as "2nd" while dropping the actual 3rd place entirely.
-- `dense_rank()` collapses ties instead (1, 1, 2, 3), so every medal tier
-- is always filled correctly regardless of ties.
-- Run this after 0012_enable_realtime.sql.
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
