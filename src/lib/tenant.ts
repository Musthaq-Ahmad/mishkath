import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession, verifySession } from "@/lib/dal";
import { TENANT_SLUG_HEADER } from "@/lib/tenant-slug";
import type { Tenant, TenantMember, TenantRole } from "@/lib/types";

// Set by proxy.ts from the /t/<slug>/... path segment, so Server Components
// and Server Actions resolve the current tenant without every one of them
// threading `params.slug` down through its callers. The proxy overwrites any
// client-supplied value, and this only ever *looks up* a tenant — never
// authorizes one. A forged header still has to survive requireTenant()'s
// membership check and then RLS, so the worst it can address is a tenant the
// caller already belongs to.
export { TENANT_SLUG_HEADER };

const TENANT_COLUMNS =
  "id, slug, name, name_ml, status, locale, public_leaderboard_enabled, branding, created_at";


export type TenantContext = {
  tenant: Tenant;
  /** null when the viewer is not a member — i.e. a public leaderboard visitor. */
  membership: TenantMember | null;
};

/** Roles allowed to write festival data. */
export const TENANT_WRITE_ROLES = ["owner", "admin"] as const;
/** Roles allowed to administer the tenant itself (members, settings, branding). */
export const TENANT_OWNER_ROLES = ["owner"] as const;
/** Everyone with any access to the dashboard. */
export const TENANT_READ_ROLES = ["owner", "admin", "scorer", "viewer"] as const;

/** Builds an absolute in-app path for a tenant, e.g. tenantPath("acme", "/dashboard"). */
export function tenantPath(slug: string, path = ""): string {
  return `/t/${slug}${path}`;
}

export const getCurrentTenantSlug = cache(async (): Promise<string> => {
  const slug = (await headers()).get(TENANT_SLUG_HEADER);
  if (!slug) notFound();
  return slug;
});

/**
 * Resolves a URL slug to a tenant, plus the current user's membership in it.
 *
 * Visibility is decided by RLS, not here: a member sees their own tenant, and
 * anyone sees a tenant that is active with public_leaderboard_enabled. A
 * private tenant and a nonexistent one are indistinguishable to a
 * non-member — both come back as null — so this cannot be used to probe which
 * slugs are taken.
 *
 * cache()d so a layout, a page and its server actions resolving the same slug
 * in one request share a single round trip.
 */
export const getTenantContext = cache(async (slug: string): Promise<TenantContext | null> => {
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select(TENANT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle<Tenant>();

  if (!tenant) return null;

  const session = await getSession();
  if (!session) return { tenant, membership: null };

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("tenant_id, user_id, role, created_at")
    .eq("tenant_id", tenant.id)
    .eq("user_id", session.userId)
    .maybeSingle<TenantMember>();

  return { tenant, membership: membership ?? null };
});

/**
 * For public leaderboard routes. No session required; 404s on anything the
 * viewer may not see.
 */
export async function getPublicTenant(): Promise<Tenant> {
  const context = await getTenantContext(await getCurrentTenantSlug());
  if (!context) notFound();
  return context.tenant;
}

/**
 * For dashboard routes. Requires a session (the DAL redirects to /login) and
 * membership in the current tenant.
 *
 * A logged-in non-member gets notFound() rather than a redirect: they should
 * not be able to tell an existing tenant they lack access to from one that was
 * never created.
 */
export async function requireTenant(): Promise<{
  tenant: Tenant;
  membership: TenantMember;
  slug: string;
}> {
  await verifySession();

  const slug = await getCurrentTenantSlug();
  const context = await getTenantContext(slug);
  if (!context || !context.membership) notFound();

  if (context.tenant.status === "suspended") {
    redirect("/suspended");
  }

  return { tenant: context.tenant, membership: context.membership, slug };
}

/**
 * Membership plus a role check. An insufficient role goes back to the tenant's
 * dashboard root rather than 404ing — they are a legitimate member, just not
 * for this page.
 */
export async function requireTenantRole(roles: readonly TenantRole[]) {
  const context = await requireTenant();

  if (!roles.includes(context.membership.role)) {
    redirect(tenantPath(context.slug, "/dashboard"));
  }

  return context;
}

/**
 * Every tenant the current user belongs to, for the tenant switcher and for
 * deciding where to send someone after login.
 */
export const listUserTenants = cache(async (): Promise<(Tenant & { role: TenantRole })[]> => {
  const session = await getSession();
  if (!session) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("tenant_members")
    .select(`role, tenants!inner (${TENANT_COLUMNS})`)
    .eq("user_id", session.userId)
    .returns<{ role: TenantRole; tenants: Tenant }[]>();

  return (data ?? [])
    .map(({ role, tenants }) => ({ ...tenants, role }))
    .sort((a, b) => a.name.localeCompare(b.name));
});
