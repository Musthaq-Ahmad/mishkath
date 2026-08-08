-- Adds class/guardian fields to students and auto-generates chest numbers
-- per class, blocked per group (50 numbers reserved per group per class).
-- Run this after 0002_publish_results.sql.

alter table public.students
  add column if not exists class text,
  add column if not exists guardian_name text;

update public.students set class = 'senior' where class is null;

alter table public.students
  alter column class set not null,
  add constraint students_class_check check (class in ('senior', 'junior', 'sub_junior'));

-- Stable 0-based index per group, ordered by creation — determines which
-- 50-number block within a class's range a group's students get assigned.
create or replace view public.group_ranks as
select id as group_id, row_number() over (order by created_at, id) - 1 as group_index
from public.groups;

create or replace function public.assign_chest_number()
returns trigger
language plpgsql
as $$
declare
  base int;
  block_size int := 50;
  group_idx int;
  existing_count int;
begin
  if new.chest_number is not null then
    return new;
  end if;

  base := case new.class
    when 'senior' then 100
    when 'junior' then 1000
    when 'sub_junior' then 2000
  end;

  select group_index into group_idx from public.group_ranks where group_id = new.group_id;

  select count(*) into existing_count
  from public.students
  where group_id = new.group_id and class = new.class;

  if existing_count >= block_size then
    raise exception 'Chest number block full for this group and class (max % students)', block_size;
  end if;

  new.chest_number := (base + group_idx * block_size + existing_count)::text;

  return new;
end;
$$;

drop trigger if exists students_assign_chest_number on public.students;
create trigger students_assign_chest_number
  before insert on public.students
  for each row execute function public.assign_chest_number();
