import type { Role } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", roles: ["admin", "judge"] },
  { href: "/dashboard/groups", label: "Groups", icon: "groups", roles: ["admin"] },
  { href: "/dashboard/divisions", label: "Divisions", icon: "category", roles: ["admin"] },
  { href: "/dashboard/students", label: "Students", icon: "school", roles: ["admin"] },
  { href: "/dashboard/programs", label: "Programs", icon: "calendar_month", roles: ["admin"] },
  { href: "/dashboard/results", label: "Results", icon: "emoji_events", roles: ["admin", "judge"] },
];
