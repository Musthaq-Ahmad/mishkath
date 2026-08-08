import { verifySession } from "@/lib/dal";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardNav } from "./dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await verifySession();
  const initials = profile.full_name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SidebarProvider>
      <DashboardNav role={profile.role} fullName={profile.full_name} />
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-card/90 px-4 backdrop-blur-sm">
          <SidebarTrigger />
          <div className="relative hidden max-w-md flex-1 md:block">
            <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-muted-foreground">
              search
            </span>
            <input
              type="search"
              placeholder="Search programs, students or results..."
              className="w-full rounded-full border-none bg-muted py-2 pr-4 pl-10 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/50"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <span className="material-symbols-outlined text-muted-foreground">
              notifications
            </span>
            <span className="material-symbols-outlined text-muted-foreground">
              help
            </span>
            <div className="flex items-center gap-2 border-l border-border pl-3">
              <div className="flex flex-col text-right leading-tight">
                <span className="text-sm font-medium">{profile.full_name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {profile.role}
                </span>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {initials}
              </div>
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
