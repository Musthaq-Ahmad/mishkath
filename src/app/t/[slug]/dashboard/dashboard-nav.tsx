"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { logout } from "@/app/login/actions";
import { FiestifyLogo } from "@/components/brand/fiestify-logo";
import { NAV_ITEMS } from "./nav-items";
import type { TenantRole } from "@/lib/types";

export function DashboardNav({
  role,
  fullName,
  slug,
}: {
  role: TenantRole;
  fullName: string;
  slug: string;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Sidebar className="border-none bg-sidebar print:hidden">
      <SidebarHeader className="gap-0 px-4 py-5">
        {/* Platform brand, deliberately not the festival's — the sidebar is
            Fiestify chrome. The festival's own name and logo belong on the
            things it produces: leaderboard, reports, certificates, posters. */}
        <FiestifyLogo surface="dark" className="h-9" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {items.map((item) => {
                const href = `/t/${slug}${item.href}`;
                const isActive = pathname === href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={href} />}
                      isActive={isActive}
                      className="gap-3 rounded-md border-l-4 border-transparent py-5 text-sidebar-foreground/80 transition-all duration-200 ease-out hover:bg-sidebar-accent/60 hover:text-sidebar-foreground data-active:border-sidebar-primary data-active:bg-sidebar-accent/40 data-active:text-sidebar-foreground [&_svg]:size-5"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {(role === "owner" || role === "admin") && (
          <div className="mt-auto px-3 pb-2">
            <Link
              href={`/t/${slug}/dashboard/programs`}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Program
            </Link>
          </div>
        )}
      </SidebarContent>
      <SidebarFooter className="gap-1 border-t border-white/10 px-2 py-3">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-foreground">
            {initials}
          </div>
          <div className="flex flex-col text-sm text-sidebar-foreground">
            <span className="font-medium">{fullName}</span>
            <span className="text-xs text-sidebar-foreground/60 capitalize">{role}</span>
          </div>
        </div>
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <form action={logout} className="w-full">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                Log out
              </button>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
