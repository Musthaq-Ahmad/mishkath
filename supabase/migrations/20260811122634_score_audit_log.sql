-- Score edit audit trail: every insert/update/delete on scores or
-- group_scores is captured here (old totals are visible via prior rows in
-- this log), so admins can answer "who changed this score, and when" —
-- previously there was no history and a score could be silently overwritten.
-- Run this after 20260811122633_dense_rank_ties.sql.

create table if not exists public.score_audit_log (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  participant_kind text not null check (participant_kind in ('student', 'group')),
  participant_id uuid not null,
  presentation numeric,
  content numeric,
  overall numeric,
  total numeric,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists score_audit_log_program_id_idx
  on public.score_audit_log (program_id, changed_at desc);

alter table public.score_audit_log enable row level security;

create policy "score_audit_log_select_admin" on public.score_audit_log
  for select using (public.is_admin());
-- No insert/update/delete policy for regular clients — rows are only ever
-- written by the trigger function below, which runs security definer.

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
  v_presentation numeric;
  v_content numeric;
  v_overall numeric;
  v_total numeric;
begin
  -- A CASE expression referencing both new.student_id and new.group_id in
  -- one embedded SQL statement makes Postgres validate BOTH field names
  -- against the actual row — and a scores row has no group_id (nor a
  -- group_scores row a student_id), so that fails every time. Plain
  -- PL/pgSQL assignments below are resolved per-branch at runtime instead,
  -- which is the standard pattern for a trigger function shared across
  -- tables with different shapes.
  if tg_table_name = 'scores' then
    v_participant_kind := 'student';
    if tg_op = 'DELETE' then
      v_program_id := old.program_id;
      v_participant_id := old.student_id;
      v_presentation := old.presentation;
      v_content := old.content;
      v_overall := old.overall;
      v_total := old.total;
    else
      v_program_id := new.program_id;
      v_participant_id := new.student_id;
      v_presentation := new.presentation;
      v_content := new.content;
      v_overall := new.overall;
      v_total := new.total;
    end if;
  else
    v_participant_kind := 'group';
    if tg_op = 'DELETE' then
      v_program_id := old.program_id;
      v_participant_id := old.group_id;
      v_presentation := old.presentation;
      v_content := old.content;
      v_overall := old.overall;
      v_total := old.total;
    else
      v_program_id := new.program_id;
      v_participant_id := new.group_id;
      v_presentation := new.presentation;
      v_content := new.content;
      v_overall := new.overall;
      v_total := new.total;
    end if;
  end if;

  insert into public.score_audit_log (
    program_id, participant_kind, participant_id,
    presentation, content, overall, total, action, changed_by
  )
  values (
    v_program_id, v_participant_kind, v_participant_id,
    v_presentation, v_content, v_overall, v_total, lower(tg_op), auth.uid()
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists scores_audit_trigger on public.scores;
create trigger scores_audit_trigger
  after insert or update or delete on public.scores
  for each row execute function public.log_score_change();

drop trigger if exists group_scores_audit_trigger on public.group_scores;
create trigger group_scores_audit_trigger
  after insert or update or delete on public.group_scores
  for each row execute function public.log_score_change();
