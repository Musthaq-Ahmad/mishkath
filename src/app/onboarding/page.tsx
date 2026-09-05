import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { listUserTenants, tenantPath } from "@/lib/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Create a festival" };

export default async function OnboardingPage() {
  await verifySession();
  const tenants = await listUserTenants();

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-6">
        {tenants.length > 0 && (
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-base">Your festivals</CardTitle>
              <CardDescription>Pick up where you left off.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {tenants.map((tenant) => (
                <Link
                  key={tenant.id}
                  href={tenantPath(tenant.slug, "/dashboard")}
                  className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium">{tenant.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{tenant.role}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>
              {tenants.length > 0 ? "Start another festival" : "Create your festival"}
            </CardTitle>
            <CardDescription>
              You&apos;ll be its owner, and can invite the rest of your team afterwards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
