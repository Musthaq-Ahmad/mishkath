-- Group-type programs only ever tracked which *groups* (teams) took part
-- (program_group_participants: program_id + group_id) — there was no way
-- to record which individual students actually performed for a group in a
-- given program. This adds that roster, purely for participation/
-- attendance/certificate purposes; scoring stays group-level in
-- group_scores, unchanged.
--
-- FKs to program_group_participants via the (program_id, group_id) pair
-- (already unique from 20260808102512_students_programs_expansion.sql) rather than
-- its id, so callers that already have program_id/group_id in hand (the
-- same shape addGroupParticipant/removeGroupParticipant use) don't need an
-- extra lookup. Removing a group from a program cascades to its member
-- rows automatically.
--
-- Run this after 20260826111125_chest_number_gender_order.sql.

create table if not exists public.program_group_participant_members (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  group_id uuid not null,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (program_id, group_id, student_id),
  foreign key (program_id, group_id)
    references public.program_group_participants (program_id, group_id)
    on delete cascade
);

alter table public.program_group_participant_members enable row level security;

create policy "program_group_participant_members_select_public"
  on public.program_group_participant_members for select using (true);
create policy "program_group_participant_members_write_admin"
  on public.program_group_participant_members for all
  using (public.is_admin()) with check (public.is_admin());
