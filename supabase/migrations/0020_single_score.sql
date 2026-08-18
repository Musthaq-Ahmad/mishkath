-- Collapses the 3-part score (presentation/content/overall) into a single
-- overall score. `total` was a generated column (presentation+content+
-- overall); DROP EXPRESSION freezes each row's current computed value in
-- place as a plain column before the source columns are dropped, so
-- existing scores become "one number" without recomputation and every
-- downstream view/query that already reads `total` (program_results,
-- public_event_top3, etc.) keeps working unchanged.
-- Run this after 0019_event_top3_points.sql.

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
