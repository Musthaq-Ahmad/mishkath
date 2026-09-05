# Multi-Tenancy Spec

Turning Mishkat/Mehfile Meem from a single-festival app into Fiestify — a
platform where many institutions each run their own festival, isolated from
each other. The festival that existed before the split is now tenant #1.

**Decisions already made** (locked before this spec was written):

| Decision | Choice |
|---|---|
| Product | Multi-tenant SaaS of the *existing* festival app — not a new product |
| Isolation | Shared schema, `tenant_id` on every table, enforced by RLS |
| Routing | Path prefix — `/t/[slug]/dashboard`, `/t/[slug]/leaderboard` |
| Existing data | Backfilled as tenant #1; the live event keeps working |

---

## 1. Vocabulary

- **Tenant** — one institution running one or more festivals. Owns divisions,
  groups (houses), students, programs, scores, and one public leaderboard.
- **Member** — a `auth.users` row with a role *inside a specific tenant*. The
  same person can be a member of several tenants with different roles.
- **Platform operator** — you. Cross-tenant, out-of-band, never via RLS.

A tenant is *not* a festival edition. Multi-year support (2025 vs 2026 fest)
is a separate `events` dimension and is explicitly **out of scope** here — but
see §11, because getting `tenant_id` wrong now makes adding `event_id` later
twice as expensive.

---

## 2. What already exists (the honest starting point)

13 domain tables, 9 result views, 6 functions/triggers, 1 storage bucket,
3 realtime subscriptions, 29 files doing data access, ~30 RLS policies — every
one of which assumes a single tenant.

**Tables** (post-`group_multiple_teams`): `profiles`, `divisions`, `groups`, `students`,
`programs`, `program_participants`, `program_group_participants`,
`program_group_participant_members`, `program_judges`, `scores`,
`group_scores`, `score_audit_log`.

**Views**: `group_ranks`, `program_results`, `group_program_results`,
`public_program_results`, `public_group_program_results`,
`public_program_winners`, `public_group_leaderboard`, `public_event_top3`,
plus the legacy `group_leaderboard` from `init`.

**Functions/triggers**: `is_admin()`, `handle_new_user()`,
`prevent_self_role_escalation()`, `renumber_chest_block()`,
`students_renumber_chest_numbers()`, `log_score_change()`.

### 2.1 The five things that will leak data if not handled

These are not hypothetical. Each is a concrete property of the current schema
that becomes a cross-tenant leak the moment a second tenant exists.

1. **`using (true)` public-read policies.** `groups`, `students`, `programs`,
   `divisions`, `program_participants`, `program_group_participants`,
   `program_group_participant_members`, `program_judges` all have
   `for select using (true)`. Anon can read every student's name, photo, chest
   number, and division today — fine for one festival, a PII breach across
   tenants. See [`20260808102508_init.sql:191`](supabase/migrations/20260808102508_init.sql#L191).

2. **Views bypass RLS.** None of the 9 views declare
   `security_invoker = on`, so Postgres defaults them to *definer* semantics —
   they run as the view owner and ignore RLS on their base tables. Even after
   `students` gets a correct tenant policy, `public_event_top3` would still
   return every tenant's podium. This is the single highest-risk item in the
   migration.

3. **`is_admin()` is global.** It answers "is this user an admin *anywhere*",
   which after tenancy means "any admin of any tenant can write any tenant's
   data". Every policy that calls it must be rewritten.
   [`20260808102508_init.sql:105`](supabase/migrations/20260808102508_init.sql#L105)

4. **`handle_new_user()` defaults `role` to `'admin'`.** Public self-signup
   currently mints a global admin. Under multi-tenancy that is instant total
   compromise. [`20260808102508_init.sql:125`](supabase/migrations/20260808102508_init.sql#L125)

5. **`group_ranks` ranks globally.** `row_number() over (order by created_at,
   id)` across *all* groups feeds `renumber_chest_block()`'s 50-number block
   arithmetic. Tenant #2's first house would be assigned block index 40-something
   and immediately hit `'Chest number block full'`, or worse, silently collide
   with tenant #1's chest numbers.
   [`20260808102510_student_chest_numbers.sql:17`](supabase/migrations/20260808102510_student_chest_numbers.sql#L17),
   [`20260826111125_chest_number_gender_order.sql:23`](supabase/migrations/20260826111125_chest_number_gender_order.sql#L23)

### 2.2 Pre-existing issues this work should resolve or explicitly defer

- **The live DB has drifted from migration history.** `divisions`'s own comments
  document three separate surprises where the deployed schema didn't match what
  the migrations said. Phase 0 must reconcile this (`supabase db diff`) — a
  tenant backfill against an unknown schema is how you lose a festival's scores.
- **Anon realtime on `scores` almost certainly delivers nothing.**
  `scores`/`group_scores` have admin-only select policies, and `postgres_changes`
  enforces RLS per subscriber, so the leaderboard's four anon subscriptions to
  those tables should be silently dead. Needs verification; if confirmed, the
  fix belongs in this work (§8).
- **`createAdminClient()` is defined but never called.**
  [`src/lib/supabase/admin.ts`](src/lib/supabase/admin.ts) — service role bypasses
  RLS entirely. Keep it unused, or gate it (§9).

---

## 3. Tenant model

```sql
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$'),
  name text not null,
  name_ml text,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'trial')),
  locale text not null default 'en',
  -- Public leaderboard is opt-in per tenant. When false, anon reads nothing.
  public_leaderboard_enabled boolean not null default false,
  branding jsonb not null default '{}'::jsonb,   -- accent, logo_url, theme
  created_at timestamptz not null default now()
);

create table public.tenant_members (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'scorer', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index tenant_members_user_id_idx on public.tenant_members (user_id, tenant_id);

create table public.tenant_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email citext not null,
  role text not null check (role in ('admin', 'scorer', 'viewer')),
  token_hash text not null,          -- store the hash, mail the token
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  unique (tenant_id, email)
);
```

**`profiles` keeps only global identity** (`full_name`, avatar). Its `role`
column is dropped — role now lives in `tenant_members`, because a user can be
an owner of one festival and a scorer at another, which a single global column
cannot express.

### Roles

| Role | Can |
|---|---|
| `owner` | Everything, plus billing, member management, tenant deletion. At least one per tenant, always. |
| `admin` | All festival data: divisions, groups, students, programs, scores, publish. |
| `scorer` | Read festival data; write `scores`/`group_scores` only, and only for programs they're assigned. Restores the judge role that `remove_judges` removed, now scoped properly. |
| `viewer` | Read-only dashboard. |

`scorer` reintroduces per-program assignment (`20260808102514_remove_judges.sql` dropped
`judge_assignments`). If you don't want that back, ship v1 with
`owner`/`admin`/`viewer` and leave `scorer` in the CHECK constraint unused —
cheaper than adding it to the enum later.

---

## 4. Tenant column placement

Every domain table gets:

```sql
tenant_id uuid not null references public.tenants (id) on delete cascade
```

on **all 11** of: `divisions`, `groups`, `students`, `programs`,
`program_participants`, `program_group_participants`,
`program_group_participant_members`, `program_judges`, `scores`,
`group_scores`, `score_audit_log`.

**Denormalized onto children, not derived by joining up to `programs`.** Two
reasons: an RLS policy that joins to a parent runs that join per row, and a
denormalized column keeps every policy a single indexed equality check.

### Structural consistency via composite foreign keys

A denormalized `tenant_id` can drift — a participant row in tenant A pointing
at a program in tenant B. Prevent it in the schema rather than in review:

```sql
alter table public.programs
  add constraint programs_tenant_id_id_key unique (tenant_id, id);

alter table public.program_participants
  drop constraint program_participants_program_id_fkey,
  add constraint program_participants_program_fk
    foreign key (tenant_id, program_id)
    references public.programs (tenant_id, id) on delete cascade;
```

Repeat for every child→parent edge: participants→programs, participants→students,
scores→programs/students, group_scores→programs/groups/participants,
members→participants, students→groups/divisions, programs→divisions.
This makes cross-tenant rows *unrepresentable*, not merely unlikely.

### Indexes

Every RLS predicate is `tenant_id = ...`, so every table needs `tenant_id`
leading an index. Prefer composite indexes matching real query shapes over a
bare `(tenant_id)`:

```sql
create index students_tenant_group_division_idx
  on public.students (tenant_id, group_id, division);   -- renumber_chest_block
create index programs_tenant_status_idx
  on public.programs (tenant_id, status, scheduled_start);
create index programs_tenant_published_idx
  on public.programs (tenant_id, published_at desc) where published;
create index scores_tenant_program_idx
  on public.scores (tenant_id, program_id);
```

The composite unique constraints added above (`(tenant_id, id)`) double as the
FK-supporting indexes.

### Uniqueness rewrites

Every existing unique constraint is now per-tenant:

| Was | Becomes |
|---|---|
| `program_participants (program_id, student_id)` | unchanged — `program_id` is already tenant-unique |
| `students.chest_number` uniqueness | `(tenant_id, chest_number)` |
| `divisions` implicit name uniqueness | `(tenant_id, lower(name))` |
| `groups` implicit name uniqueness | `(tenant_id, lower(name))` |

---

## 5. Tenant context in the database

```sql
create schema if not exists private;

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

grant execute on function private.is_tenant_member(uuid) to authenticated;
grant execute on function private.has_tenant_role(uuid, text[]) to authenticated;
```

Notes that matter:

- `security definer` + `set search_path = ''` is required — the function reads
  `tenant_members`, which is itself RLS-protected, and an empty search_path
  blocks search-path hijacking.
- `EXECUTE` **must** stay granted to `authenticated`; RLS policies are evaluated
  with the caller's privileges. This is safe because the function only ever
  answers about `auth.uid()` — it is not an oracle for other users.
- Always call it as `(select private.is_tenant_member(tenant_id))`. Be precise
  about what the wrapper buys, though: it only becomes a cached InitPlan when
  the subquery is *uncorrelated*, as with `(select auth.uid())`. These calls
  reference the row's own `tenant_id`, so they stay correlated and run per row.
  The wrapper is still worth keeping for consistency, but the thing that
  actually makes these policies fast is `tenant_members_user_id_idx` plus the
  `tenant_id`-leading indexes in §4.

**Why a membership lookup instead of a JWT claim:** a claim
(`app_metadata.tenant_ids`) avoids the lookup but goes stale until the token
refreshes, so revoking someone's access doesn't take effect for up to an hour.
Start with the lookup — it's an index hit on a tiny table. Add the claim later
as a pure optimization if `pg_stat_statements` says it matters.

---

## 6. RLS rewrite

Pattern, applied to all 11 domain tables:

```sql
alter table public.students enable row level security;

create policy students_member_read on public.students
  for select to authenticated
  using ((select private.is_tenant_member(tenant_id)));

create policy students_admin_write on public.students
  for all to authenticated
  using ((select private.has_tenant_role(tenant_id, array['owner','admin'])))
  with check ((select private.has_tenant_role(tenant_id, array['owner','admin'])));
```

**Do not add `force row level security`.** It subjects the table owner to
policies as well — and a `security definer` function runs *as* its owner, so
under FORCE `private.is_tenant_member()` would be governed by
`tenant_members`' own policies, which grant `postgres` nothing. It would
return false for every caller and take every policy here down with it.
Omitting it costs nothing: real traffic arrives as `anon` or `authenticated`,
both fully governed either way, and `service_role` carries BYPASSRLS, which
FORCE cannot restrain. (Corrected during Phase 1 implementation.)

### Anon access — the public leaderboard

`using (true)` is gone. Anon gets exactly what the leaderboard renders, and
only for tenants that opted in:

```sql
create policy programs_public_read on public.programs
  for select to anon
  using (
    published
    and exists (
      select 1 from public.tenants t
      where t.id = programs.tenant_id
        and t.status = 'active'
        and t.public_leaderboard_enabled
    )
  );
```

`divisions` and `groups` get the same opted-in-tenant predicate without the
`published` clause (the leaderboard needs division/house names to label rows).

**`students` gets no anon policy at all.** The leaderboard never needs the
roster — it needs the name and photo of *placed* students, which
`public_program_results` already carries. Dropping anon access to `students`
removes the entire PII surface in one move. Same for `scores` / `group_scores`
(already admin-only) and `score_audit_log`.

Callers that today read `students` as anon must be audited and repointed at the
`public_*` views. Grep target: the 18 `from("students")` call sites.

### Views

Every view gets `security_invoker`:

```sql
alter view public.public_event_top3 set (security_invoker = on);
```

All 9 views, no exceptions. With invoker semantics the base-table policies above
do the filtering, and window functions (`dense_rank() over (partition by
program_id ...)`) compute over only the rows the caller may see — which is what
makes the ranks correct rather than merely non-leaky.

Each view must also **select `tenant_id`** so the app can filter and so
realtime can subscribe by tenant. For `public_group_leaderboard` that means
`group by g.tenant_id, g.id, g.name`.

`group_ranks` is the special case: add `partition by tenant_id` to its
`row_number()`, or chest-number blocks break (§2.1.5).

### Grants

```sql
revoke all on all tables in schema public from anon;
grant select on
  public.divisions, public.groups, public.programs,
  public.public_program_results, public.public_group_program_results,
  public.public_group_leaderboard, public.public_event_top3,
  public.public_program_winners
to anon;
```

Belt and braces: even a policy mistake can't expose a table anon has no
`SELECT` privilege on.

---

## 7. Functions and triggers

| Function | Change |
|---|---|
| `is_admin()` | **Dropped.** Replaced by `private.has_tenant_role`. Every one of its ~20 policy call sites is rewritten. |
| `handle_new_user()` | No longer assigns a role. Inserts a `profiles` row only. Tenant creation becomes explicit (below). |
| `prevent_self_role_escalation()` | Moves from `profiles` to `tenant_members`: a member cannot change their own role, and the last `owner` of a tenant cannot be demoted or removed. |
| `renumber_chest_block(group_id, division)` | Gains `p_tenant_id`; all three internal queries filter by it. `group_ranks` lookup becomes tenant-partitioned. |
| `students_renumber_chest_numbers()` | Passes `new.tenant_id` / `old.tenant_id` through. |
| `log_score_change()` | Writes `tenant_id` into `score_audit_log`. |

New, replacing the `init` bootstrap note ("promote them manually"):

```sql
create or replace function public.create_tenant(p_slug text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_tenant_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated';
  end if;
  insert into public.tenants (slug, name) values (p_slug, p_name)
    returning id into v_tenant_id;
  insert into public.tenant_members (tenant_id, user_id, role)
    values (v_tenant_id, (select auth.uid()), 'owner');
  return v_tenant_id;
end;
$$;
```

Atomic tenant + owner creation, so a tenant can never exist ownerless.

---

## 8. Storage, realtime, integrations

### Storage

`student-photos` is a public bucket with `is_admin()` write policies. Changes:

- Object key becomes `{tenant_id}/{student_id}.{ext}`.
- Write/update/delete policies check
  `private.has_tenant_role(((storage.foldername(name))[1])::uuid, array['owner','admin'])`.
- Read stays public. **Accepted residual risk:** a leaked/guessed object URL is
  readable across tenants. The leaderboard renders these photos publicly anyway,
  and `next.config.ts` `remotePatterns` already assumes public URLs. If a tenant
  requires private photos, that's a private bucket + signed URLs + a
  `next/image` loader change — scope it separately.

### Realtime

Four client components subscribe to `programs`/`scores`/`group_scores` as anon.
Two changes:

1. Add a tenant filter to every subscription so tenant A's score entry doesn't
   wake every other tenant's leaderboard:
   ```ts
   .on("postgres_changes",
     { event: "*", schema: "public", table: "programs", filter: `tenant_id=eq.${tenantId}` },
     refetch)
   ```
2. Resolve the dead `scores`/`group_scores` subscriptions (§2.2). Since anon
   has — and should have — no read access to raw scores, subscribe to
   `programs` (the `published` flip is the event the leaderboard actually cares
   about) and drop the score subscriptions entirely.

Files: [`info-cards-row.tsx:118`](src/app/t/[slug]/leaderboard/info-cards-row.tsx#L118),
[`championship-sidebar.tsx:34`](src/app/t/[slug]/leaderboard/championship-sidebar.tsx#L34),
[`published-results-feed.tsx:483`](src/app/t/[slug]/leaderboard/published-results-feed.tsx#L483),
[`celebration-layout.tsx:95`](src/app/t/[slug]/leaderboard/celebration-layout.tsx#L95).

### WhatsApp notifications

`CALLMEBOT_GROUP_ID` / `CALLMEBOT_APIKEY` are process-wide env vars — one
WhatsApp group for the whole platform. They move to a `tenant_integrations`
table with **no `anon` or `authenticated` select grant at all**, read only by a
server action running as service role after verifying the caller's tenant role.
`notifyWhatsAppGroup(text)` becomes `notifyWhatsAppGroup(tenantId, text)` and
no-ops when the tenant has no integration row — matching its current
never-throws contract. ([`src/lib/whatsapp.ts`](src/lib/whatsapp.ts))

---

## 9. Application layer

### Routes

```
/                         → marketing / tenant picker
/login, /signup           → global auth (unchanged)
/onboarding               → create first tenant (calls create_tenant)
/t/[slug]/dashboard/**    → moved from /dashboard/**
/t/[slug]/leaderboard/**  → moved from /leaderboard/**
/admin/**                 → platform operator console
```

`/dashboard` and `/leaderboard` redirect to the user's default tenant. Worth
keeping permanently rather than as a migration shim: there are printed QR codes
in the wild pointing at the current leaderboard URL
([`results-qr-code.tsx`](src/app/t/[slug]/leaderboard/results-qr-code.tsx)).

### `src/lib/tenant.ts` (new)

```ts
export const getTenantContext = cache(async (slug: string) => { ... })
// → { tenant, membership } | notFound()
export async function requireTenantRole(slug: string, roles: Role[]) { ... }
```

`cache()`-wrapped per request, same shape as the existing
[`verifySession()`](src/lib/dal.ts) so it composes with the DAL pattern already
in use. `requireRole("admin")` in every action becomes
`requireTenantRole(slug, ["owner", "admin"])`.

### `src/proxy.ts`

Next 16 renamed middleware → proxy; it defaults to the Node runtime. Per Next's
own guidance it stays **optimistic only** — session refresh and unauthenticated
redirects. It resolves the slug from the path into an `x-tenant-slug` header for
convenience; it does **not** authorize. Authorization stays in the DAL and RLS.

**It must live at `src/proxy.ts`, not the repo root.** Next requires the file at
the same level as `app` — and this app is `src/app`. It sat at the repo root
before this work and therefore had never run at all; nothing noticed, because
the DAL's `verifySession()` performs the same redirect one layer down. Once the
tenant lookup started reading a proxy-set header, the silent no-op stopped being
harmless: `getCurrentTenantSlug()` found no header and every tenant page called
`notFound()`. If tenant routes start 404ing, check this first.

### Every data-access call site

29 files. Each one:

- adds `tenant_id` to inserts,
- adds `.eq("tenant_id", tenant.id)` to selects as defense-in-depth (RLS is the
  real boundary; the explicit filter keeps query plans using the composite
  indexes and makes the intent legible),
- takes `slug` and calls `requireTenantRole` at the top of every server action,
- rewrites `revalidatePath("/dashboard/...")` → `` `/t/${slug}/dashboard/...` ``.

[`global-search.tsx`](src/app/t/[slug]/dashboard/global-search.tsx) is a client component
querying with the anon key directly — it must pass the tenant filter explicitly.

### PWA and branding

- [`manifest.ts`](src/app/manifest.ts) hardcodes "Mehfile Meem" and
  `start_url: "/dashboard"`. Becomes a per-tenant route
  (`/t/[slug]/manifest.webmanifest`) generating name, icons, and `start_url`
  from `tenants.branding`.
- [`public/sw.js`](public/sw.js) precaches tenant-branded logo assets under a
  single `CACHE_NAME`. Either drop tenant assets from `PRECACHE_URLS` or version
  the cache name per tenant — otherwise tenant B installs the PWA and sees
  tenant A's logo.
- `DESIGN.md`'s single indigo accent becomes a per-tenant CSS variable set on
  the `/t/[slug]` layout. The gold/silver/bronze rank tokens stay fixed — they
  carry meaning, not brand.

### Platform operator console

`/admin` does **not** get RLS bypass policies on every table. It runs server
actions as service role, each gated by an `is_platform_admin()` check against a
`platform_admins` table. Keeps the policy surface minimal and keeps the
"who can see everything" answer in one place.

---

## 10. Migration plan

Filenames follow the Supabase CLI convention, `<timestamp>_name.sql`.

### Applying migrations

**To apply this work to the live database you run exactly one file:**
`supabase/migrations/20260905062620_tenants.sql`, pasted into the SQL editor
the same way every previous migration was. The other 29 are already applied and
are never re-run. Everything below is optional.

There are three ways to get SQL into a database here, and they serve different
situations:

| Situation | Use |
|---|---|
| Apply the new tenant work to production | The single tenants migration file, by hand |
| Stand up a fresh database (the Phase 0 staging clone) | `supabase/baseline.sql` — all 30 concatenated in order |
| Hand migration tracking to the CLI, permanently | `link` + `repair` + `db push`, below — a one-time setup |

`baseline.sql` is a faithful concatenation rather than a rewritten schema, so a
fresh database is built the same way production was, corrections and all. It is
kept outside `migrations/` so the CLI does not treat it as a duplicate, and it
must never be run against the live database.

### Putting the CLI in charge (optional)

Until now every migration was pasted into the Supabase SQL editor by hand — the
files were named `0001_init.sql`-style, which the CLI skips, and the project had
no `config.toml`. Both are fixed: `supabase init` has been run, and all 30 files
renamed to `<timestamp>_name.sql` with timestamps taken from their original git
authoring dates, so relative order is unchanged.

One-time setup:

```bash
npx supabase link --project-ref qysambsljiqvpbgcvgln
```

**Then, before the first push — this step is not optional.** Applying by hand
never wrote to `supabase_migrations.schema_migrations`, so as far as the CLI is
concerned *nothing* has been applied. A bare `db push` would try to replay every
migration from `init` against the live festival database. Record the 29 already-
applied versions first; `repair` only writes the tracking table and executes no
SQL:

```bash
npx supabase migration repair --linked --status applied \
  20260808102508 20260808102509 20260808102510 20260808102511 \
  20260808102512 20260808102513 20260808102514 20260808102515 \
  20260808102516 20260808102517 20260808102518 20260811122632 \
  20260811122633 20260811122634 20260811122635 20260811182747 \
  20260811182748 20260811182749 20260817145017 20260818141446 \
  20260818144331 20260821121826 20260824100119 20260826111125 \
  20260826111126 20260826111127 20260829041025 20260829041026 \
  20260829041027
```

Confirm the CLI and the database now agree, and that exactly one migration is
pending:

```bash
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

Only when the dry run reports the tenants migration alone:

```bash
npx supabase db push --linked
```

Two caveats. `config.toml` was generated with `major_version = 17`; check that
against the remote project's Postgres version if you intend to use the local
stack. And the repair step assumes the live schema really does match migration
history — which Phase 0 exists to verify, and which `divisions`'s comments give
concrete reason to doubt.

**Phase 0 — Reconcile and arm** *(no schema change)*
Diff live schema against migration history and close the drift documented in
`divisions`. Stand up pgTAP. Clone production to staging. Nothing else starts until
`supabase db diff` is clean.

**Phase 1 — `20260905062620_tenants.sql`**
`tenants`, `tenant_members`, `tenant_invites`, `private` schema and helper
functions, `create_tenant()`. Insert tenant #1 (`slug = 'mishkat'`) and make
every existing `profiles` row an `owner`/`admin` member of it. Zero behavior
change — the app doesn't know these tables exist yet.

**Phase 2 — `<timestamp>_tenant_columns.sql`** *(maintenance window)*
Add `tenant_id` nullable → backfill to tenant #1 → `set not null`. Parents
before children. Add composite uniques, composite FKs, indexes.
Use `add constraint ... not valid` then `validate constraint` in a separate
transaction so the ACCESS EXCLUSIVE lock is brief — `divisions` already burned a
window taking full-table locks on `students`/`programs`, don't repeat it.

**Phase 3 — `<timestamp>_tenant_rls.sql`**
Rewrite all policies. Drop `is_admin()`. `force row level security`.
`security_invoker = on` on all 9 views + `tenant_id` in their select lists.
Revoke/re-grant `anon`. **This is the phase that can silently leak; it does not
ship without Phase 6's tests green.**

**Phase 4 — `<timestamp>_tenant_functions.sql`**
`handle_new_user`, `prevent_self_role_escalation`, `renumber_chest_block`,
`group_ranks` partitioning, `log_score_change`. Storage policies. Realtime
publication check.

**Phase 5 — App layer**
`lib/tenant.ts`, route move, 29 call sites, `proxy.ts`, realtime filters,
`revalidatePath`, manifest, service worker, branding.

**Phase 6 — Isolation test suite** *(runs from Phase 3 onward, gates cutover)*

**Phase 7 — Onboarding**
Signup → create tenant, invites + accept flow, member management UI, tenant
switcher.

**Phase 8 — Platform console** — `/admin`, tenant list, suspend, impersonate.

Phases 1-4 are sequential and blocking. Phase 5 can start against staging as
soon as Phase 2 lands. Phases 7-8 are independent once 5 is done.

### Rough sizing

| Phase | Size | Status |
|---|---|---|
| 0 Reconcile | S — but unbounded if drift is bad | **Blocked** — needs the Supabase MCP connection |
| 1 Tenant tables | S | **Written** — `20260905062620_tenants.sql`, not yet applied |
| 2 Columns + backfill | M | Blocked on Phase 0 |
| 3 RLS rewrite | L — 30 policies, 9 views, the risky one | Not started |
| 4 Functions | M | Not started |
| 5 App layer | L — 29 files, route move | **Mostly done** — see below |
| 6 Tests | M | Not started |
| 7 Onboarding | M | **Partly done** — `/onboarding` creates a tenant |
| 8 Platform console | M | Not started |

### Phase 5 — what landed, what is left

Done: the `/t/[slug]` route move (62 files), `src/lib/tenant.ts` request context,
slug resolution in `proxy.ts`, tenant-scoped `requireTenantRole` on all 44 auth
call sites, all 45 `revalidatePath` calls, all 29 internal links, permanent
back-compat redirects for the old `/dashboard/**` and `/leaderboard/**` URLs,
and `/onboarding` + `/suspended`.

Still open, and deliberately so — each depends on Phase 2's `tenant_id`:

- **Data queries are not yet tenant-filtered.** Every `.from(...)` still reads
  unscoped. Harmless while one tenant exists; it is the *whole* point of Phase 2
  and 3, and must land before a second tenant is created.
- **Realtime subscriptions carry no tenant filter** (§8).
- **The PWA manifest is intentionally global, and that is now correct.** It
  describes Fiestify, the platform, not any one festival — name, icons and
  `start_url` are the same for everyone, and `start_url: "/dashboard"`
  resolves through the redirect to the right tenant, onboarding, or login.
  `public/sw.js` no longer precaches festival artwork. A *per-tenant* manifest
  would only be worth adding if organisers want to install a festival as its
  own home-screen app; that is a product decision, not leftover work.
- **WhatsApp credentials are still process-wide env vars** (§8).

---

## 11. Testing

Isolation is not a thing you review your way to. It needs executable proof.

**Per-table matrix** — for each of the 11 domain tables, as a tenant-A member:
`select`/`insert`/`update`/`delete` against a tenant-B row must return 0 rows or
raise. Both directions.

**Anon matrix** — anon cannot read `students`, `scores`, `group_scores`,
`score_audit_log`, `tenant_members`, `tenant_invites` at all; cannot read *any*
row of a tenant with `public_leaderboard_enabled = false`; cannot read
unpublished programs of an opted-in tenant.

**View matrix** — for each of the 9 views, a tenant-A caller sees only tenant-A
rows, and `dense_rank` values match what a single-tenant DB would produce
(catches window functions ranking across tenants).

**Schema guard** — a test that iterates `information_schema.tables` for schema
`public` and asserts every table has RLS enabled, at least one policy, and a
`tenant_id` column, with an explicit allowlist for `tenants`/`profiles`.
This is the test that stops tenancy from rotting the first time someone adds a
table in six months.

**Chest-number test** — two tenants, same division names and
`base_chest_number`, 40 students each. Both must number from their own base with
no collision and no "block full".

**Seed** — `supabase/seed.sql` creating two tenants with deliberately colliding
slugs-adjacent names, identical division names, and overlapping chest ranges.

---

## 12. Open questions

1. **Scorer role in v1?** Reintroducing per-program assignment restores what
   `remove_judges` deleted. Ship it, or defer and leave the CHECK value unused?
2. **Public leaderboard default.** Spec'd as opt-in (`false`). Tenant #1 gets
   `true` on backfill. Confirm new tenants should default to private.
3. **Tenant deletion.** `on delete cascade` wipes everything. Is a soft-delete
   + retention window needed, or is hard delete acceptable?
4. **Plan limits / billing.** No `plan` column spec'd beyond `status`. In scope?
5. **Slug reservations.** `admin`, `api`, `login`, `signup`, `t`, `www` must be
   blocked. Static list, or a `reserved_slugs` table?
6. **Multi-year events.** Out of scope here — but if a tenant will run a 2026
   festival alongside 2025 archives, `event_id` should be designed *now* even if
   implemented later, because retrofitting a second scoping dimension through
   these same 30 policies is the expensive part.

---

## 13. Residual risks

| Risk | Mitigation |
|---|---|
| Definer views leak everything (§2.1.2) | `security_invoker = on` + view test matrix |
| A future table ships without `tenant_id` | Schema-guard test (§11) |
| Service-role code path bypasses RLS | `createAdminClient` stays unused or platform-console-only; consider an ESLint import restriction |
| Storage object URLs cross tenants | Accepted; documented in §8 |
| Backfill window too long | `not valid` + `validate` split; rehearse on the staging clone |
| Live schema drift breaks the backfill | Phase 0 gates everything |
