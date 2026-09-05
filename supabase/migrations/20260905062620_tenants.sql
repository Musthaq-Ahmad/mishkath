-- Phase 1 of the multi-tenancy migration (see MULTI_TENANCY.md).
--
-- Introduces the tenant model and nothing else: new tables, a `private`
-- helper schema, and the membership functions every later phase's RLS
-- policies will call. No existing table is altered, no existing policy is
-- touched, no existing function changes behaviour — the running festival
-- keeps working exactly as it does today, and the app remains unaware
-- these tables exist until Phase 5.
--
-- Deliberately NOT done here:
--   * profiles.role is kept. dal.ts, dashboard/layout.tsx and the nav
--     components all read it; it gets dropped in Phase 4 once
--     tenant_members is the authority.
--   * handle_new_user() still defaults role='admin'. That is a real
--     problem for public signup (MULTI_TENANCY.md §2.1.4) but fixing it
--     is a behaviour change, so it belongs in Phase 4 with the rest of
--     the function rewrites.
--   * No tenant_id on domain tables. That is Phase 2, and it is gated on
--     reconciling the live schema against migration history first — see
--     `divisions`'s comments for why that reconciliation is not optional.
--
-- Run this after 20260829041027_group_multiple_teams.sql.

-- ============================================================
-- 0. Private schema for RLS helper functions
--
-- These are SECURITY DEFINER and therefore bypass RLS on the tables they
-- read. Keeping them out of `public` means PostgREST never exposes them
-- as RPC endpoints, so they can only ever be reached from inside a policy
-- or another function.
-- ============================================================

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, anon;

-- ============================================================
-- 1. Tables
-- ============================================================

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  -- Lowercase, hyphen-separated, 2-32 chars, no leading/trailing hyphen.
  -- This lands in the URL as /t/<slug>/dashboard.
  slug text not null unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$'),
  name text not null,
  name_ml text,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'trial')),
  locale text not null default 'en'
    check (locale in ('en', 'ml')),
  -- Opt-in, not opt-out: a brand new tenant's roster and results are
  -- private until someone deliberately publishes them. Tenant #1 is
  -- switched on in the backfill below because its leaderboard is already
  -- public today.
  public_leaderboard_enabled boolean not null default false,
  -- { accent, logo_url, ... } — consumed by the per-tenant layout and
  -- manifest in Phase 5. Free-form so branding can grow without a
  -- migration per field.
  branding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_members (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- owner  : + billing, member management, tenant deletion
  -- admin  : all festival data (today's profiles.role='admin')
  -- scorer : reads festival data, writes scores only (today's 'judge',
  --          which `remove_judges` removed and Phase 3 restores properly scoped)
  -- viewer : read-only dashboard
  role text not null check (role in ('owner', 'admin', 'scorer', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

-- The PK covers (tenant_id, user_id); this covers the other direction,
-- which is what "list the tenants I belong to" and every
-- is_tenant_member() call actually probe.
create index if not exists tenant_members_user_id_idx
  on public.tenant_members (user_id, tenant_id);

create table if not exists public.tenant_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  -- Stored lowercased rather than reaching for citext, so this table has
  -- no extension dependency.
  email text not null check (email = lower(email) and position('@' in email) > 1),
  role text not null check (role in ('admin', 'scorer', 'viewer')),
  -- The raw token is mailed to the invitee and never stored. A leaked
  -- database dump therefore does not hand out working invites.
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create index if not exists tenant_invites_tenant_id_idx
  on public.tenant_invites (tenant_id);
create index if not exists tenant_invites_email_idx
  on public.tenant_invites (email) where accepted_at is null;

-- ============================================================
-- 2. Membership helpers
--
-- SECURITY DEFINER is what makes the tenant_members policies below
-- non-recursive: the function bypasses RLS on tenant_members, so a policy
-- ON tenant_members can call it without re-entering its own policy check.
--
-- `set search_path = ''` forces every reference to be schema-qualified,
-- which is what stops a caller-controlled search_path from swapping in a
-- fake public.tenant_members.
--
-- EXECUTE stays granted to authenticated because RLS policies are
-- evaluated with the caller's privileges — a policy calling a function the
-- caller cannot execute fails outright. This is safe: both functions only
-- ever answer about auth.uid(), so neither is an oracle for other users'
-- memberships.
-- ============================================================

create or replace function private.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = p_tenant_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.has_tenant_role(p_tenant_id uuid, p_roles text[])
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = p_tenant_id
      and user_id = (select auth.uid())
      and role = any(p_roles)
  );
$$;

revoke all on function private.is_tenant_member(uuid) from public;
revoke all on function private.has_tenant_role(uuid, text[]) from public;
grant execute on function private.is_tenant_member(uuid) to authenticated;
grant execute on function private.has_tenant_role(uuid, text[]) to authenticated;

-- ============================================================
-- 3. Membership integrity trigger
-- ============================================================

create or replace function public.tenant_members_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_other_owners int;
begin
  -- Cascade deletes: by the time the FK cascade reaches this row the
  -- parent (tenant or auth user) is already gone, so there is no tenant
  -- left to leave ownerless. Without this, deleting a tenant — or a user
  -- who happens to be an owner — would raise below.
  if tg_op = 'DELETE' then
    if not exists (select 1 from public.tenants where id = old.tenant_id)
       or not exists (select 1 from auth.users where id = old.user_id) then
      return old;
    end if;
  end if;

  -- Nobody promotes themselves. Mirrors the intent of
  -- prevent_self_role_escalation() on profiles (`init`), but scoped to a
  -- tenant and closing the demote-others-then-promote-self loophole by
  -- refusing any self role change at all.
  if tg_op = 'UPDATE'
     and new.role is distinct from old.role
     and old.user_id = (select auth.uid()) then
    raise exception 'You cannot change your own role.';
  end if;

  -- A tenant is never left ownerless.
  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    select count(*) into v_other_owners
    from public.tenant_members
    where tenant_id = old.tenant_id
      and role = 'owner'
      and user_id <> old.user_id;

    if v_other_owners = 0 then
      raise exception 'A tenant must always have at least one owner.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists tenant_members_guard on public.tenant_members;
create trigger tenant_members_guard
  before update or delete on public.tenant_members
  for each row execute function public.tenant_members_guard();

-- ============================================================
-- 4. Row Level Security
-- ============================================================

-- Deliberately ENABLE without FORCE.
--
-- FORCE ROW LEVEL SECURITY subjects the *table owner* to policies too. A
-- SECURITY DEFINER function runs as its owner, so under FORCE the two
-- helpers above would be subject to tenant_members' own policies — which
-- grant nothing to `postgres` — and private.is_tenant_member() would
-- return false for everyone, taking every policy in Phase 3 down with it.
-- create_tenant() would likewise be unable to insert, since `tenants` has
-- no INSERT policy by design.
--
-- Nothing is lost by omitting it: real traffic arrives as `anon` or
-- `authenticated`, both fully governed by the policies below with or
-- without FORCE, and `service_role` carries BYPASSRLS, which FORCE cannot
-- restrain either way. Service-role usage stays the one bypass path, and
-- is contained by keeping createAdminClient() out of request handlers
-- (MULTI_TENANCY.md §13).
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.tenant_invites enable row level security;

-- tenants ----------------------------------------------------

drop policy if exists tenants_member_read on public.tenants;
create policy tenants_member_read on public.tenants
  for select to authenticated
  using ((select private.is_tenant_member(id)));

-- Slug -> tenant resolution for the public leaderboard. Covers
-- `authenticated` as well as `anon`: a logged-in user viewing some other
-- tenant's public leaderboard is still the authenticated role, and would
-- otherwise fall through every policy.
drop policy if exists tenants_public_read on public.tenants;
create policy tenants_public_read on public.tenants
  for select to anon, authenticated
  using (status = 'active' and public_leaderboard_enabled);

drop policy if exists tenants_admin_update on public.tenants;
create policy tenants_admin_update on public.tenants
  for update to authenticated
  using ((select private.has_tenant_role(id, array['owner', 'admin'])))
  with check ((select private.has_tenant_role(id, array['owner', 'admin'])));

-- No INSERT policy: tenants are created only through
-- public.create_tenant() below, so slug reservation and owner assignment
-- can never be bypassed. No DELETE policy either — tenant deletion is
-- deferred until the soft-delete/retention question is settled
-- (MULTI_TENANCY.md §12.3).

-- tenant_members ---------------------------------------------

drop policy if exists tenant_members_read on public.tenant_members;
create policy tenant_members_read on public.tenant_members
  for select to authenticated
  using ((select private.is_tenant_member(tenant_id)));

drop policy if exists tenant_members_manage on public.tenant_members;
create policy tenant_members_manage on public.tenant_members
  for all to authenticated
  using ((select private.has_tenant_role(tenant_id, array['owner', 'admin'])))
  with check (
    (select private.has_tenant_role(tenant_id, array['owner', 'admin']))
    -- Only an owner may mint another owner; admins manage everyone below
    -- themselves but cannot escalate a peer past their own level.
    and (tenant_members.role <> 'owner'
         or (select private.has_tenant_role(tenant_id, array['owner'])))
  );

-- tenant_invites ---------------------------------------------

drop policy if exists tenant_invites_manage on public.tenant_invites;
create policy tenant_invites_manage on public.tenant_invites
  for all to authenticated
  using ((select private.has_tenant_role(tenant_id, array['owner', 'admin'])))
  with check ((select private.has_tenant_role(tenant_id, array['owner', 'admin'])));

-- An invitee is by definition not yet a member, so they cannot read their
-- own invite row through RLS. Redemption goes through a SECURITY DEFINER
-- accept_tenant_invite(token) function added with the onboarding UI in
-- Phase 7; until then this table is written but never redeemed.

-- ============================================================
-- 5. Grants
--
-- Supabase's default privileges grant ALL on new public tables to anon
-- and authenticated, so the sensitive tables have to be revoked
-- explicitly — a policy mistake should not be the only thing standing
-- between anon and the member list.
-- ============================================================

revoke all on public.tenants from anon, authenticated;
revoke all on public.tenant_members from anon, authenticated;
revoke all on public.tenant_invites from anon, authenticated;

grant select on public.tenants to anon, authenticated;
grant update on public.tenants to authenticated;
grant select, insert, update, delete on public.tenant_members to authenticated;
grant select, insert, update, delete on public.tenant_invites to authenticated;

-- ============================================================
-- 6. Tenant creation
--
-- Replaces `init`'s bootstrap note ("promote them manually: update
-- public.profiles set role = 'admin' ..."). Tenant and owner are inserted
-- in one transaction so a tenant can never exist without an owner — the
-- state the tenant_members_guard trigger above refuses to allow later.
-- ============================================================

create or replace function public.create_tenant(p_slug text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text := lower(trim(p_slug));
  v_tenant_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated.' using errcode = '42501';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Tenant name is required.' using errcode = '22023';
  end if;

  -- Slugs that would collide with a top-level route. Kept here rather
  -- than in a CHECK constraint so the list can grow as routes are added
  -- without rewriting a table constraint.
  if v_slug = any (array[
    'admin', 'api', 'app', 'auth', 'billing', 'dashboard', 'docs', 'help',
    'leaderboard', 'login', 'logout', 'new', 'offline', 'onboarding',
    'settings', 'signup', 'static', 'status', 'support', 't',
    'update-password', 'www'
  ]) then
    raise exception 'That address is reserved. Pick a different one.'
      using errcode = '23514';
  end if;

  insert into public.tenants (slug, name)
  values (v_slug, trim(p_name))
  returning id into v_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tenant_id, (select auth.uid()), 'owner');

  return v_tenant_id;
exception
  when unique_violation then
    raise exception 'That address is already taken.' using errcode = '23505';
end;
$$;

revoke all on function public.create_tenant(text, text) from public;
grant execute on function public.create_tenant(text, text) to authenticated;

-- ============================================================
-- 7. Backfill: the existing festival becomes tenant #1
--
-- Idempotent — re-running this migration will not create a second copy or
-- disturb roles that have since been changed by hand.
--
-- profiles.role maps admin -> 'admin' and judge -> 'scorer'. The earliest
-- profile is promoted to 'owner', since `init`'s model has no equivalent
-- concept and every tenant needs exactly that.
-- ============================================================

do $$
declare
  v_tenant_id uuid;
  v_first_admin uuid;
begin
  select id into v_tenant_id from public.tenants where slug = 'mishkat';

  if v_tenant_id is null then
    insert into public.tenants (slug, name, name_ml, locale, public_leaderboard_enabled)
    values (
      'mishkat',
      'Mehfile Meem',
      null,
      'en',
      -- Already public today; flipping it to the new default of false
      -- would take the live leaderboard down.
      true
    )
    returning id into v_tenant_id;
  end if;

  insert into public.tenant_members (tenant_id, user_id, role)
  select
    v_tenant_id,
    p.id,
    case p.role when 'admin' then 'admin' else 'scorer' end
  from public.profiles p
  on conflict (tenant_id, user_id) do nothing;

  -- Promote the longest-standing admin to owner, preferring an actual
  -- admin over whoever merely signed up first.
  if not exists (
    select 1 from public.tenant_members
    where tenant_id = v_tenant_id and role = 'owner'
  ) then
    select p.id into v_first_admin
    from public.profiles p
    order by (p.role = 'admin') desc, p.created_at, p.id
    limit 1;

    if v_first_admin is not null then
      update public.tenant_members
      set role = 'owner'
      where tenant_id = v_tenant_id and user_id = v_first_admin;
    end if;
  end if;
end $$;
