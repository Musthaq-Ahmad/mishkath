"use client";

import Image from "next/image";
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
import { NAV_ITEMS } from "./nav-items";
import type { Role } from "@/lib/types";

export function DashboardNav({
  role,
  fullName,
}: {
  role: Role;
  fullName: string;
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
        <Image
          src="/mehfile-meem-logo-gold.png"
          alt="Mehfile Meem — Meelad Fest 2K26"
          width={170}
          height={101}
          className="h-auto w-[170px]"
          priority
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
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
        {role === "admin" && (
          <div className="mt-auto px-3 pb-2">
            <Link
              href="/dashboard/programs"
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
