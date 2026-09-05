-- A group/house could only ever field ONE entry in a given group-type
-- program — enforced by `unique (program_id, group_id)` on
-- program_group_participants, mirrored by an identical
-- `unique (program_id, group_id)` on group_scores. group_id was used
-- everywhere downstream (rosters, scores, results, certificates,
-- leaderboard) as if it were the unique identity of "a participation,"
-- because until now it always was.
--
-- This lets a group field 2+ independent teams in the same program, each
-- scored/ranked independently. program_group_participants.id (already
-- exists, already the identity the codes-generation logic uses) becomes
-- the real "entry" identity everywhere; group_id remains only an
-- attribute ("which house does this entry belong to"). Team labels
-- ("Team A"/"Team B") are computed by the result views from
-- program_group_participants.created_at order, not stored — only shown
-- when a group actually has 2+ entries in that program.
--
-- Several constraints being dropped/added below were defined without an
-- explicit name in their original CREATE TABLE (program_group_participants'
-- unique(program_id, group_id) in `students_programs_expansion`, program_group_participant_members'
-- composite FK in `group_participant_members`) — rather than guess Postgres's auto-generated name,
-- this looks the actual constraint up via pg_constraint and drops it by
-- whatever name it actually has.
--
-- Run this after 20260829041026_drop_unused_student_fields.sql.

-- ============================================================
-- 0. Backfill safety: group_scores and program_group_participant_members
-- were never actually FK'd to program_group_participants (only to
-- groups/programs directly) — a (program_id, group_id) pair can exist in
-- either without a matching program_group_participants row (e.g. the
-- entry was removed after it was already scored). Synthesize the missing
-- entry rather than fail the participant_id backfills below.
-- ============================================================

insert into public.program_group_participants (program_id, group_id)
select distinct gs.program_id, gs.group_id
from public.group_scores gs
where not exists (
  select 1 from public.program_group_participants pgp
  where pgp.program_id = gs.program_id and pgp.group_id = gs.group_id
);

insert into public.program_group_participants (program_id, group_id)
select distinct m.program_id, m.group_id
from public.program_group_participant_members m
where not exists (
  select 1 from public.program_group_participants pgp
  where pgp.program_id = m.program_id and pgp.group_id = m.group_id
);

-- ============================================================
-- 1. program_group_participant_members: repoint at the specific entry
--
-- This must happen BEFORE dropping program_group_participants' unique
-- constraint below — that constraint backs an index that this table's
-- OLD composite FK depends on (confirmed by a failed first run of this
-- migration: "cannot drop constraint ... because other objects depend on
-- it ... constraint ... program_id_group_id_fkey ... depends on index
-- program_group_participants_program_id_group_id_key"). Dropping the FK
-- first removes that dependency.
-- ============================================================

alter table public.program_group_participant_members
  add column if not exists participant_id uuid references public.program_group_participants (id) on delete cascade;

update public.program_group_participant_members m
set participant_id = pgp.id
from public.program_group_participants pgp
where m.participant_id is null
  and pgp.program_id = m.program_id
  and pgp.group_id = m.group_id;

alter table public.program_group_participant_members
  alter column participant_id set not null;

do $$
declare
  ct text;
begin
  -- Target the OLD composite (program_id, group_id) FK specifically by its
  -- 2-column shape, rather than by excluding the new participant_id FK by
  -- a guessed name — this is unambiguous regardless of what Postgres named
  -- either constraint.
  select conname into ct
  from pg_constraint
  where conrelid = 'public.program_group_participant_members'::regclass
    and contype = 'f'
    and confrelid = 'public.program_group_participants'::regclass
    and array_length(conkey, 1) = 2;
  if ct is not null then
    execute format('alter table public.program_group_participant_members drop constraint %I', ct);
  end if;
end $$;

-- Unchanged unique(program_id, group_id, student_id) now correctly means
-- "a student can only belong to one of this group's teams in this
-- program" — exactly the invariant we want, so it's left as-is.

-- ============================================================
-- 2. program_group_participants: allow multiple rows per (program_id, group_id)
-- Now safe — nothing depends on this constraint's backing index anymore.
-- ============================================================

do $$
declare
  ct text;
begin
  select conname into ct
  from pg_constraint
  where conrelid = 'public.program_group_participants'::regclass
    and contype = 'u';
  if ct is not null then
    execute format('alter table public.program_group_participants drop constraint %I', ct);
  end if;
end $$;

-- ============================================================
-- 3. group_scores: score belongs to a specific entry, not just a group
-- ============================================================

alter table public.group_scores
  add column if not exists participant_id uuid references public.program_group_participants (id) on delete cascade;

update public.group_scores gs
set participant_id = pgp.id
from public.program_group_participants pgp
where gs.participant_id is null
  and pgp.program_id = gs.program_id
  and pgp.group_id = gs.group_id;

alter table public.group_scores
  alter column participant_id set not null;

alter table public.group_scores
  drop constraint if exists group_scores_program_id_group_id_key;

alter table public.group_scores
  add constraint group_scores_participant_id_key unique (participant_id);

-- ============================================================
-- 4. Audit trail: record which entry changed, not just which group
-- ============================================================

-- Backfill existing group-kind audit rows while the group_id they stored
-- as participant_id still maps 1:1 to a program_group_participants row
-- (true right up until this migration).
update public.score_audit_log sal
set participant_id = pgp.id
from public.program_group_participants pgp
where sal.participant_kind = 'group'
  and pgp.program_id = sal.program_id
  and pgp.group_id = sal.participant_id;

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
      v_participant_id := old.participant_id;
      v_total := old.total;
    else
      v_program_id := new.program_id;
      v_participant_id := new.participant_id;
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

-- ============================================================
-- 5. Rebuild the result view chain — same cascade-drop-and-rebuild
-- pattern as 20260821121826_divisions.sql, since group_program_results' shape
-- changes (participant_id, computed team-suffix name).
-- ============================================================

drop view if exists public.public_event_top3 cascade;
drop view if exists public.public_group_leaderboard cascade;
drop view if exists public.public_group_program_results cascade;
drop view if exists public.group_program_results cascade;

create or replace view public.group_program_results as
select
  gs.program_id,
  gs.group_id,
  gs.participant_id,
  case
    when count(*) over (partition by gs.program_id, gs.group_id) > 1
      then g.name || ' ' || chr((64 + row_number() over (
        partition by gs.program_id, gs.group_id order by pgp.created_at, pgp.id
      ))::int)
    else g.name
  end as group_name,
  gs.total as avg_total,
  dense_rank() over (partition by gs.program_id order by gs.total desc) as rank
from public.group_scores gs
join public.groups g on g.id = gs.group_id
join public.program_group_participants pgp on pgp.id = gs.participant_id;

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
  gpr.participant_id as place_id,
  gpr.group_name as place_name,
  null as place_photo_url,
  gpr.group_id as place_group_id,
  null as place_category,
  gpr.avg_total
from public.programs p
join public.public_group_program_results gpr on gpr.program_id = p.id
where p.published = true and p.program_type = 'group' and gpr.rank <= 3;
