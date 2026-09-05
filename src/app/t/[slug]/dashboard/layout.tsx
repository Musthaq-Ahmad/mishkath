import { verifySession } from "@/lib/dal";
import { requireTenant } from "@/lib/tenant";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardNav } from "./dashboard-nav";
import { GlobalSearch } from "./global-search";
import { MobileBottomNav } from "./mobile-bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // profile carries global identity (display name); the tenant membership
  // carries the role that decides what this shell renders.
  const { profile } = await verifySession();
  const { membership, tenant, slug } = await requireTenant();
  const initials = profile.full_name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SidebarProvider>
      <DashboardNav role={membership.role} fullName={profile.full_name} slug={slug} />
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-card/90 px-4 backdrop-blur-sm print:hidden">
          <SidebarTrigger />
          <GlobalSearch tenantSlug={slug} />
          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <ThemeToggle />
            {/* Wrap in a plain span rather than hiding the icon span itself —
                the Material Symbols stylesheet sets `display: inline-block`
                directly on `.material-symbols-outlined`, which wins the
                specificity tie against Tailwind's `.hidden` when both land
                on the same element, so `hidden sm:inline` on the icon never
                actually hid it. */}
            <span className="hidden sm:inline-flex">
              <span className="material-symbols-outlined text-muted-foreground">
                notifications
              </span>
            </span>
            <span className="hidden sm:inline-flex">
              <span className="material-symbols-outlined text-muted-foreground">help</span>
            </span>
            <div className="flex items-center gap-2 border-l border-border pl-1.5 sm:pl-3">
              <div className="hidden flex-col text-right leading-tight md:flex">
                <span className="text-sm font-medium">{profile.full_name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {membership.role} · {tenant.name}
                </span>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {initials}
              </div>
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 pb-24 sm:p-6 md:pb-6">{children}</main>
      </SidebarInset>
      <MobileBottomNav role={membership.role} slug={slug} />
    </SidebarProvider>
  );
}
