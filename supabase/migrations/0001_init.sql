-- MISHKAT festival management schema
-- Run this in the Supabase SQL editor for a fresh project.

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'judge')),
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_id uuid not null references public.groups (id) on delete cascade,
  chest_number text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  max_score numeric not null default 25,
  created_at timestamptz not null default now()
);

create table if not exists public.program_participants (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (program_id, student_id)
);

create table if not exists public.judge_assignments (
  id uuid primary key default gen_random_uuid(),
  judge_id uuid not null references public.profiles (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (judge_id, program_id)
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  judge_id uuid not null references public.profiles (id) on delete cascade,
  presentation numeric not null check (presentation >= 0),
  content numeric not null check (content >= 0),
  overall numeric not null check (overall >= 0),
  total numeric generated always as (presentation + content + overall) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, student_id, judge_id)
);

-- ============================================================
-- Result views
-- ============================================================

create or replace view public.program_results as
select
  s.program_id,
  s.student_id,
  st.name as student_name,
  st.group_id,
  avg(s.total) as avg_total,
  rank() over (partition by s.program_id order by avg(s.total) desc) as rank
from public.scores s
join public.students st on st.id = s.student_id
group by s.program_id, s.student_id, st.name, st.group_id;

create or replace view public.group_leaderboard as
select
  g.id as group_id,
  g.name as group_name,
  coalesce(sum(
    case pr.rank
      when 1 then 5
      when 2 then 3
      when 3 then 1
      else 0
    end
  ), 0) as points
from public.groups g
left join public.program_results pr on pr.group_id = g.id
group by g.id, g.name
order by points desc;

-- ============================================================
-- Helpers
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-create a profiles row whenever a new auth user is created. This runs
-- as the table owner (security definer), so it works regardless of whether
-- the new user has an active session yet (e.g. email confirmation pending) —
-- avoiding the RLS chicken-and-egg problem of inserting a profile from
-- client code right after signup. The intended role/full name are read from
-- the auth user's metadata, set at signup (public signup) or invite time
-- (admin-created judges); defaults to 'admin' for safety since only admins
-- self-signup in this app.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'admin')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Non-admins may update their own profile row (e.g. full_name), but must
-- never be able to change their own role — otherwise the "self update"
-- RLS policy below would let a judge promote themselves to admin.
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change a profile role.';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_self_role_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_self_role_escalation();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.students enable row level security;
alter table public.programs enable row level security;
alter table public.program_participants enable row level security;
alter table public.judge_assignments enable row level security;
alter table public.scores enable row level security;

-- profiles: self read/update, admin full access
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());
create policy "profiles_insert_admin" on public.profiles
  for insert with check (public.is_admin() or id = auth.uid());
create policy "profiles_delete_admin" on public.profiles
  for delete using (public.is_admin());

-- groups / students / programs / program_participants: public read, admin write
create policy "groups_select_public" on public.groups for select using (true);
create policy "groups_write_admin" on public.groups for all
  using (public.is_admin()) with check (public.is_admin());

create policy "students_select_public" on public.students for select using (true);
create policy "students_write_admin" on public.students for all
  using (public.is_admin()) with check (public.is_admin());

create policy "programs_select_public" on public.programs for select using (true);
create policy "programs_write_admin" on public.programs for all
  using (public.is_admin()) with check (public.is_admin());

create policy "program_participants_select_public" on public.program_participants
  for select using (true);
create policy "program_participants_write_admin" on public.program_participants for all
  using (public.is_admin()) with check (public.is_admin());

-- judge_assignments: judge reads own, admin full access
create policy "judge_assignments_select_own_or_admin" on public.judge_assignments
  for select using (judge_id = auth.uid() or public.is_admin());
create policy "judge_assignments_write_admin" on public.judge_assignments for all
  using (public.is_admin()) with check (public.is_admin());

-- scores: judge can insert/update own scores for assigned programs, admin full access,
-- no public/select access to raw scores (only the aggregated views above are public)
create policy "scores_select_own_or_admin" on public.scores
  for select using (judge_id = auth.uid() or public.is_admin());
create policy "scores_insert_own_assigned" on public.scores
  for insert with check (
    public.is_admin()
    or (
      judge_id = auth.uid()
      and exists (
        select 1 from public.judge_assignments ja
        where ja.judge_id = auth.uid() and ja.program_id = scores.program_id
      )
    )
  );
create policy "scores_update_own_assigned" on public.scores
  for update using (
    public.is_admin()
    or (
      judge_id = auth.uid()
      and exists (
        select 1 from public.judge_assignments ja
        where ja.judge_id = auth.uid() and ja.program_id = scores.program_id
      )
    )
  )
  with check (
    public.is_admin()
    or (
      judge_id = auth.uid()
      and exists (
        select 1 from public.judge_assignments ja
        where ja.judge_id = auth.uid() and ja.program_id = scores.program_id
      )
    )
  );
create policy "scores_delete_admin" on public.scores
  for delete using (public.is_admin());

-- ============================================================
-- Storage: public bucket for student photos
-- ============================================================

insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', true)
on conflict (id) do nothing;

create policy "student_photos_public_read" on storage.objects
  for select using (bucket_id = 'student-photos');
create policy "student_photos_admin_write" on storage.objects
  for insert with check (bucket_id = 'student-photos' and public.is_admin());
create policy "student_photos_admin_update" on storage.objects
  for update using (bucket_id = 'student-photos' and public.is_admin());
create policy "student_photos_admin_delete" on storage.objects
  for delete using (bucket_id = 'student-photos' and public.is_admin());

-- ============================================================
-- Bootstrap note
-- ============================================================
-- After signing up your first user via /login, promote them manually:
--   update public.profiles set role = 'admin' where id = '<user-uuid>';
