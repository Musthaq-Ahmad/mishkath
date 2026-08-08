import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/delete-button";
import { cn } from "@/lib/utils";
import type { Group, GroupLeaderboardRow, Student } from "@/lib/types";
import { GroupForm } from "./group-form";
import { GroupFilterPills } from "./group-filter-pills";
import { deleteGroup } from "./actions";

const ACCENT_COLORS = ["bg-gold", "bg-primary-container", "bg-silver", "bg-primary", "bg-bronze"];

export default async function GroupsPage() {
  await requireRole("admin");

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

  const groupsList = groups ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-primary">Groups</h1>
          <p className="mt-1 text-muted-foreground">
            Manage and track active student circles for the festival season.
          </p>
        </div>
        <GroupForm />
      </div>

      <GroupFilterPills groupCount={groupsList.length} />

      {groupsList.length ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groupsList.map((group, index) => {
            const points = pointsByGroup.get(group.id);
            const studentCount = studentCountByGroup.get(group.id) ?? 0;
            const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];

            return (
              <div
                key={group.id}
                className="card-elevated animate-fade-in-up rounded-xl bg-card p-6"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="mb-6 flex items-center gap-3">
                  <div className={cn("h-12 w-1.5 rounded-full", accent)} />
                  <h3 className="font-heading text-xl font-semibold text-primary">
                    {group.name}
                  </h3>
                </div>

                <div className="mb-8 rounded-xl bg-surface-container-low p-4 text-center">
                  <p className="mb-1 text-[10px] font-bold tracking-wide text-outline uppercase">
                    Students
                  </p>
                  <p className="font-heading text-2xl font-semibold text-primary">
                    {studentCount}
                  </p>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-bold tracking-wide text-outline uppercase">
                      Total Performance
                    </p>
                    <p className="font-heading text-2xl font-semibold text-primary">
                      {points !== undefined ? `${points.toLocaleString()} pts` : "—"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <GroupForm group={group} />
                    <DeleteButton
                      action={deleteGroup.bind(null, group.id)}
                      size="icon-sm"
                      className="rounded-lg"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                      <span className="sr-only">Delete group</span>
                    </DeleteButton>
                  </div>
                </div>
              </div>
            );
          })}
          <GroupForm variant="card" />
        </div>
      ) : (
        <div className="card-elevated rounded-xl bg-card p-10 text-center text-muted-foreground ring-1 ring-border">
          No groups yet.
        </div>
      )}
    </div>
  );
}
