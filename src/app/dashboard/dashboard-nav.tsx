"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <Sidebar className="border-none bg-sidebar">
      <SidebarHeader className="gap-0 px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
            <Image src="/mishkat-icon.png" alt="" width={32} height={32} className="size-8 object-cover" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-heading text-lg font-bold tracking-tight text-gold">
              MISHKAT
            </span>
            <span className="text-[10px] font-semibold tracking-[0.15em] text-sidebar-foreground/60 uppercase">
              Festival Management
            </span>
          </div>
        </div>
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
      </SidebarContent>
      <SidebarFooter className="gap-1 border-t border-white/10 px-2 py-3">
        <div className="flex flex-col px-2 py-2 text-sm text-sidebar-foreground">
          <span className="font-medium">{fullName}</span>
          <span className="text-xs text-sidebar-foreground/60 capitalize">{role}</span>
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
