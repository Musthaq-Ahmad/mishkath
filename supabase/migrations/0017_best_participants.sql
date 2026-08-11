-- "Best Participant" award: an individual student's aggregate points across
-- every published program they've placed top-3 in, using the same points
-- scale as the group leaderboard's individual contribution (1st=5, 2nd=3,
-- 3rd=1). Split by category (boy/girl) at the query level so the public
-- leaderboard and reports can show a separate award per gender.
-- Run this after 0016_student_category_on_results.sql.

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
