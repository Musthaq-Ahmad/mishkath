import type { TenantRole } from "@/lib/types";

export type NavItem = {
  /** Tenant-relative — the nav components prefix it with /t/<slug>. */
  href: string;
  label: string;
  icon: string;
  roles: TenantRole[];
};

const ALL: TenantRole[] = ["owner", "admin", "scorer", "viewer"];
const WRITERS: TenantRole[] = ["owner", "admin"];

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", roles: ALL },
  { href: "/dashboard/groups", label: "Groups", icon: "groups", roles: WRITERS },
  { href: "/dashboard/divisions", label: "Divisions", icon: "category", roles: WRITERS },
  { href: "/dashboard/students", label: "Students", icon: "school", roles: WRITERS },
  { href: "/dashboard/programs", label: "Programs", icon: "calendar_month", roles: WRITERS },
  { href: "/dashboard/results", label: "Results", icon: "emoji_events", roles: ALL },
];
