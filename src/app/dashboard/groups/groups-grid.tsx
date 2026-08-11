"use client";

import { useMemo, useState } from "react";
import { DeleteButton } from "@/components/delete-button";
import { cn } from "@/lib/utils";
import { GroupForm } from "./group-form";
import { deleteGroup } from "./actions";
import type { Group } from "@/lib/types";

const ACCENT_COLORS = ["bg-gold", "bg-primary-container", "bg-silver", "bg-primary", "bg-bronze"];

type GroupWithStats = Group & { points: number | undefined; studentCount: number };

const SORTS = ["All Groups", "By Points", "By Students"] as const;
type Sort = (typeof SORTS)[number];

export function GroupsGrid({
  groups,
  initialQuery,
}: {
  groups: GroupWithStats[];
  initialQuery: string;
}) {
  const [sort, setSort] = useState<Sort>("All Groups");
  const [query, setQuery] = useState(initialQuery);

  const visibleGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? groups.filter((g) => g.name.toLowerCase().includes(normalizedQuery))
      : groups;

    if (sort === "By Points") {
      return [...filtered].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
    }
    if (sort === "By Students") {
      return [...filtered].sort((a, b) => b.studentCount - a.studentCount);
    }
    return filtered;
  }, [groups, sort, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {SORTS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setSort(label)}
              className={cn(
                "rounded-full px-6 py-2 text-sm font-semibold transition-all active:scale-95",
                sort === label
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary",
              )}
            >
              {label === "All Groups" ? `${label} (${groups.length})` : label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-muted-foreground">
            search
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search groups..."
            className="w-full rounded-full border border-border bg-card py-2 pr-4 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/50"
          />
        </div>
      </div>

      {visibleGroups.length ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleGroups.map((group, index) => {
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
                    {group.studentCount}
                  </p>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-bold tracking-wide text-outline uppercase">
                      Total Performance
                    </p>
                    <p className="font-heading text-2xl font-semibold text-primary">
                      {group.points !== undefined ? `${group.points.toLocaleString()} pts` : "—"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <GroupForm group={group} />
                    <DeleteButton
                      action={deleteGroup.bind(null, group.id)}
                      size="icon-sm"
                      className="rounded-lg"
                      label="Group"
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
          {groups.length ? "No groups match this search." : "No groups yet."}
        </div>
      )}
    </div>
  );
}
