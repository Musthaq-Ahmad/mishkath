-- Differentiates point values by program type: group-type programs are
-- worth more (10/5/3 for 1st/2nd/3rd) since they represent a whole group's
-- combined effort, while individual programs keep the original 5/3/1.
-- Run this after 0010_event_top3_group_id.sql.

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
