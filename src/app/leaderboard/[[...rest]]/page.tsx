import { redirect } from "next/navigation";
import { tenantPath } from "@/lib/tenant";

/**
 * Back-compat for the pre-tenancy public /leaderboard/** URLs. These are
 * printed on the QR codes handed to attendees (see results-qr-code.tsx), so
 * this redirect is permanent, not transitional.
 *
 * The public leaderboard has no session to derive a tenant from, so it points
 * at the tenant that owned these URLs before the split — tenant #1, backfilled
 * by 20260905062620_tenants.sql.
 */
const DEFAULT_TENANT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? "mishkat";

export default async function LegacyLeaderboardRedirect({
  params,
}: {
  params: Promise<{ rest?: string[] }>;
}) {
  const { rest } = await params;
  const suffix = rest?.length ? `/${rest.join("/")}` : "";
  redirect(tenantPath(DEFAULT_TENANT_SLUG, `/leaderboard${suffix}`));
}
