-- Chest numbers within a group+division block now order boys before girls,
-- contiguously, instead of "whoever was inserted first". Block boundaries
-- are unchanged (base_chest_number + group_index * 50, from 0022_divisions.sql).
--
-- The old assign_chest_number() only ran on insert and appended the new
-- student to the end of the block — fine for a single ordering, but it
-- can't keep "boys first" true once students of different categories are
-- inserted out of order (as happened manually once already — see the
-- Muhammed Ilyas M fix in the app's history). Renumbering the whole block
-- on every insert/update/delete is the only way to keep that invariant
-- regardless of insertion order.
--
-- renumber_chest_block() recomputes every chest_number in one group+division
-- block from scratch, ordered by category ('boy' before 'girl') then
-- created_at. The trigger fires after insert/update/delete and calls it for
-- the affected block(s). The "is distinct from" guard in the UPDATE only
-- touches rows whose number actually changes, so the same trigger firing
-- again on those rows converges immediately (second pass computes the same
-- numbers, updates nothing, no further recursion) instead of looping.
--
-- Run this after 0023_program_memento.sql.

create or replace function public.renumber_chest_block(p_group_id uuid, p_division uuid)
returns void
language plpgsql
as $$
declare
  base int;
  group_idx int;
  block_size int := 50;
  total_count int;
begin
  select base_chest_number into base from public.divisions where id = p_division;
  select group_index into group_idx from public.group_ranks where group_id = p_group_id;

  select count(*) into total_count
  from public.students
  where group_id = p_group_id and division = p_division;

  if total_count > block_size then
    raise exception 'Chest number block full for this group and division (max % students)', block_size;
  end if;

  with ordered as (
    select
      id,
      base + group_idx * block_size + row_number() over (
        order by case category when 'boy' then 0 else 1 end, created_at
      ) - 1 as new_chest_number
    from public.students
    where group_id = p_group_id and division = p_division
  )
  update public.students s
  set chest_number = ordered.new_chest_number::text
  from ordered
  where s.id = ordered.id
    and s.chest_number is distinct from ordered.new_chest_number::text;
end;
$$;

create or replace function public.students_renumber_chest_numbers()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.renumber_chest_block(old.group_id, old.division);
    return old;
  end if;

  perform public.renumber_chest_block(new.group_id, new.division);

  if tg_op = 'UPDATE' and (new.group_id <> old.group_id or new.division <> old.division) then
    perform public.renumber_chest_block(old.group_id, old.division);
  end if;

  return new;
end;
$$;

drop trigger if exists students_assign_chest_number on public.students;
drop function if exists public.assign_chest_number();

drop trigger if exists students_renumber_chest_numbers on public.students;
create trigger students_renumber_chest_numbers
  after insert or update or delete on public.students
  for each row execute function public.students_renumber_chest_numbers();
