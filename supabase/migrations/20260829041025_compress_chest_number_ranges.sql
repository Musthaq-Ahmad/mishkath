-- Compress division chest-number ranges from 100/1000/2000/3000 down to
-- 100/200/300/400 (the Nth division by sort_order gets base N*100), drop
-- the group/house block-splitting entirely, and restrict chest numbers to
-- boys only (girls don't need one — see badges/page.tsx) — chest numbers
-- are now just a consecutive boys-only sequence within a division,
-- regardless of which group a student belongs to.
--
-- Live DB note: 20260826111125_chest_number_gender_order.sql (renumber_chest_block(),
-- group-aware renumbering on every insert/update/delete) was never applied
-- here — `select proname from pg_proc where proname ilike '%chest%'` came
-- back showing only assign_chest_number() still live, the original
-- INSERT-only trigger from 20260821121826_divisions.sql. This migration replaces
-- that function directly (same name, so the existing trigger picks up the
-- new body automatically) rather than assuming `chest_number_gender_order`'s objects exist.
--
-- Run this after 20260826111127_fix_score_audit_log_fk.sql.

-- 1. New bases: Nth division by sort_order -> N * 100.
with ranked as (
  select id, row_number() over (order by sort_order) as rank
  from public.divisions
)
update public.divisions d
set base_chest_number = ranked.rank * 100
from ranked
where d.id = ranked.id;

-- 2. assign_chest_number(): only boys get chest numbers (badges are
-- boy-only, see src/app/dashboard/students/badges/page.tsx). Girls mixed
-- into the same per-division counter were the cause of the non-
-- consecutive numbering — a girl created between two boys consumed a
-- number, leaving gaps in the boys' sequence. Drop the group_id/
-- block_size offset too, just base_chest_number + how many boys already
-- exist in that division.
create or replace function public.assign_chest_number()
returns trigger
language plpgsql
as $$
declare
  base int;
  existing_count int;
begin
  if new.chest_number is not null then
    return new;
  end if;

  if new.category <> 'boy' then
    return new;
  end if;

  select base_chest_number into base from public.divisions where id = new.division;

  select count(*) into existing_count
  from public.students
  where division = new.division and category = 'boy';

  new.chest_number := (base + existing_count)::text;

  return new;
end;
$$;

-- 3. One-time backfill: renumber every existing BOY sequentially within
-- their division (ordered by created_at), matching the new bases and the
-- group-agnostic, boys-only scheme above. This reassigns chest numbers on
-- any already-printed badges/codes. Girls never needed a chest number
-- (badges are boy-only) — clear any they already have so they stop
-- occupying slots in the count.
update public.students
set chest_number = null
where category <> 'boy' and chest_number is not null;

with ranked as (
  select
    s.id,
    d.base_chest_number + row_number() over (partition by s.division order by s.created_at, s.id) - 1
      as new_chest_number
  from public.students s
  join public.divisions d on d.id = s.division
  where s.category = 'boy'
)
update public.students s
set chest_number = ranked.new_chest_number::text
from ranked
where s.id = ranked.id;
