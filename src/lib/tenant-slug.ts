/**
 * Shared between proxy.ts and the server-only tenant data layer, so neither
 * has to import the other. Deliberately free of "server-only" and of any
 * Supabase import: proxy.ts runs on every request and should stay cheap.
 */
export const TENANT_SLUG_HEADER = "x-tenant-slug";

/** Mirrors the CHECK constraint on tenants.slug in 20260905062620_tenants.sql. */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$/;

/**
 * Pulls the tenant slug out of a /t/<slug>/... pathname.
 * Returns null for any other path, and for a segment that could never be a
 * real slug — so a malformed one 404s at the route level instead of reaching
 * the database as a query.
 */
export function parseTenantSlug(pathname: string): string | null {
  const match = /^\/t\/([^/]+)/.exec(pathname);
  if (!match) return null;

  const slug = decodeURIComponent(match[1]).toLowerCase();
  return SLUG_PATTERN.test(slug) ? slug : null;
}
