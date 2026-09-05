import { redirect } from "next/navigation";
import { listUserTenants, tenantPath } from "@/lib/tenant";

/**
 * Back-compat for the pre-tenancy /dashboard/** URLs, and the landing spot the
 * proxy sends people to after login. Forwards to the user's tenant, preserving
 * whatever path followed — so an existing bookmark to
 * /dashboard/programs/<id>/roster still lands on the right page.
 *
 * Kept permanently rather than as a migration shim: these URLs are in browser
 * histories and pinned tabs.
 */
export default async function LegacyDashboardRedirect({
  params,
}: {
  params: Promise<{ rest?: string[] }>;
}) {
  const { rest } = await params;
  const tenants = await listUserTenants();

  if (tenants.length === 0) {
    redirect("/onboarding");
  }

  const suffix = rest?.length ? `/${rest.join("/")}` : "";
  redirect(tenantPath(tenants[0].slug, `/dashboard${suffix}`));
}
