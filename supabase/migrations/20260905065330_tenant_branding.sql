-- Festival branding: a per-tenant logo, uploaded at onboarding and shown on
-- everything the festival produces — leaderboard, reports, certificates,
-- posters, rosters, scoresheets, badges.
--
-- The platform's own brand (Fiestify) is not stored here; it lives in the
-- app as an inline component, because it never varies per tenant.
--
-- tenants.branding already exists as jsonb (see the tenants migration), so
-- the logo URL needs no column — only somewhere to put the file, and rules
-- about who may put it there.
--
-- Run this after the tenants migration.

-- ============================================================
-- 1. Bucket
--
-- Public-read, like student-photos: a festival logo is rendered on a public
-- leaderboard and printed on certificates handed to participants, so there
-- is nothing to protect. Writes are what need locking down.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-logos',
  'tenant-logos',
  true,
  2097152,  -- 2 MB; a logo that needs more than this is the wrong asset
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- 2. Path -> tenant
--
-- Objects are keyed `<tenant_id>/<filename>`. Casting the first path
-- segment straight to uuid would raise on any object whose name is not a
-- uuid — including one an attacker uploads deliberately — so parse
-- defensively and let a non-uuid path resolve to null, which no
-- has_tenant_role() check can ever match.
-- ============================================================

create or replace function private.tenant_id_from_storage_path(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when (storage.foldername(p_name))[1] ~
         '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(p_name))[1])::uuid
  end;
$$;

grant execute on function private.tenant_id_from_storage_path(text) to authenticated;

-- ============================================================
-- 3. Policies
-- ============================================================

drop policy if exists "tenant_logos_public_read" on storage.objects;
create policy "tenant_logos_public_read" on storage.objects
  for select using (bucket_id = 'tenant-logos');

drop policy if exists "tenant_logos_admin_insert" on storage.objects;
create policy "tenant_logos_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'tenant-logos'
    and (select private.has_tenant_role(
      private.tenant_id_from_storage_path(name), array['owner', 'admin']))
  );

drop policy if exists "tenant_logos_admin_update" on storage.objects;
create policy "tenant_logos_admin_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'tenant-logos'
    and (select private.has_tenant_role(
      private.tenant_id_from_storage_path(name), array['owner', 'admin']))
  );

drop policy if exists "tenant_logos_admin_delete" on storage.objects;
create policy "tenant_logos_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'tenant-logos'
    and (select private.has_tenant_role(
      private.tenant_id_from_storage_path(name), array['owner', 'admin']))
  );

-- ============================================================
-- 4. Tenant #1 keeps the logo it already has
--
-- The Mehfile Meem artwork stays in public/ and becomes that festival's
-- branding, so renaming the platform to Fiestify changes nothing about how
-- the live festival's leaderboard, certificates or reports look.
-- ============================================================

update public.tenants
set branding = branding || jsonb_build_object(
  'logo_url', '/mehfile-meem-logo-indigo.png',
  'logo_url_dark', '/mehfile-meem-logo-gold.png'
)
where slug = 'mishkat'
  and not (branding ? 'logo_url');
