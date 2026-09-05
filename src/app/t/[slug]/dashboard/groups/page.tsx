import { TENANT_WRITE_ROLES, requireTenantRole } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import type { Group, GroupLeaderboardRow, Student } from "@/lib/types";
import { GroupForm } from "./group-form";
import { GroupsGrid } from "./groups-grid";

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireTenantRole(TENANT_WRITE_ROLES);

  const { q } = await searchParams;
  const supabase = await createClient();
  const [{ data: groups }, { data: leaderboard }, { data: students }] = await Promise.all([
    supabase.from("groups").select("*").order("created_at").returns<Group[]>(),
    supabase.from("group_leaderboard").select("*").returns<GroupLeaderboardRow[]>(),
    supabase.from("students").select("id, group_id").returns<Pick<Student, "id" | "group_id">[]>(),
  ]);

  const pointsByGroup = new Map((leaderboard ?? []).map((row) => [row.group_id, row.points]));
  const studentCountByGroup = new Map<string, number>();
  for (const student of students ?? []) {
    studentCountByGroup.set(student.group_id, (studentCountByGroup.get(student.group_id) ?? 0) + 1);
  }

  const groupsList = (groups ?? []).map((group) => ({
    ...group,
    points: pointsByGroup.get(group.id),
    studentCount: studentCountByGroup.get(group.id) ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <nav className="mb-1 flex items-center text-xs font-medium tracking-wide text-muted-foreground">
            <span>Management</span>
            <span className="mx-2">/</span>
            <span className="text-secondary-foreground">Groups</span>
          </nav>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-primary">Groups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track active student circles for the festival season.
          </p>
        </div>
        <GroupForm />
      </div>

      <GroupsGrid groups={groupsList} initialQuery={q ?? ""} />
    </div>
  );
}
