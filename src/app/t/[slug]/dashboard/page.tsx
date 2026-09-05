import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { requireTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { findScheduleConflicts, getCurrentAndNextProgram, getUpcomingPrograms } from "@/lib/schedule";
import { groupPlacements } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";
import { STUDENT_CATEGORY_LABELS } from "@/lib/validations/student";
import type {
  Division,
  EventPlacementRow,
  GroupLeaderboardRow,
  Program,
  ProgramGroupParticipant,
  ProgramParticipant,
  ProgramStatus,
  Student,
} from "@/lib/types";

const ADMIN_STATS = [
  { key: "groups", label: "Total Groups", icon: "groups", table: "groups" as const },
  { key: "students", label: "Total Students", icon: "school", table: "students" as const },
  { key: "programs", label: "Total Programs", icon: "calendar_month", table: "programs" as const },
];

// Tenant-relative — prefixed with /t/<slug> at render.
const QUICK_ACTIONS = [
  { href: "/dashboard/students", label: "Add Student", icon: "person_add" },
  { href: "/dashboard/programs", label: "Create Program", icon: "calendar_add_on" },
  { href: "/dashboard/groups", label: "Manage Groups", icon: "groups" },
];

const PROGRAM_STATUSES: ProgramStatus[] = ["draft", "scheduled", "running", "completed"];
const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  running: "Running",
  completed: "Completed",
};

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeTime(isoString: string) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function CurrentNextPrograms({
  current,
  next,
  divisionNameById,
}: {
  current: Program | null;
  next: Program | null;
  divisionNameById: Map<string, string>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="card-elevated relative flex flex-col gap-2 overflow-hidden rounded-xl bg-card p-5 ring-1 ring-border">
        <span className="absolute inset-x-0 top-0 h-1 bg-gold" />
        <span className="inline-flex w-fit items-center gap-1.5 text-[10px] font-bold tracking-widest text-gold uppercase">
          <span className="size-2 animate-pulse rounded-full bg-gold" />
          Now Playing
        </span>
        {current ? (
          <>
            <p className="font-heading text-xl font-semibold">{current.name}</p>
            <p className="text-sm text-muted-foreground">
              {divisionNameById.get(current.category) ?? "—"}
              {current.scheduled_start && ` · Started ${formatTime(current.scheduled_start)}`}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No program in progress.</p>
        )}
      </div>

      <div className="card-elevated flex flex-col gap-2 rounded-xl bg-card p-5 ring-1 ring-border">
        <span className="inline-flex w-fit items-center gap-1.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          Up Next
        </span>
        {next ? (
          <>
            <p className="font-heading text-xl font-semibold">{next.name}</p>
            <p className="text-sm text-muted-foreground">
              {divisionNameById.get(next.category) ?? "—"}
              {next.scheduled_start && ` · ${formatTime(next.scheduled_start)}`}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
        )}
      </div>
    </div>
  );
}

const STATUS_DOT_COLOR: Record<ProgramStatus, string> = {
  draft: "bg-outline",
  scheduled: "bg-primary",
  running: "bg-warning",
  completed: "bg-success",
};

function StatusPills({ statusCounts }: { statusCounts: Map<ProgramStatus, number> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROGRAM_STATUSES.map((status) => (
        <span
          key={status}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-container px-3 py-1.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase"
        >
          <span className={cn("size-2 rounded-full", STATUS_DOT_COLOR[status])} />
          {PROGRAM_STATUS_LABELS[status]}: {statusCounts.get(status) ?? 0}
        </span>
      ))}
    </div>
  );
}

function ScoringProgressRing({ pct }: { pct: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="relative size-32">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="var(--surface-container-high)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke="var(--primary)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-heading text-2xl font-bold tabular-nums">{pct}%</span>
      </div>
    </div>
  );
}

type ActivityItem = {
  id: string;
  icon: string;
  text: string;
  created_at: string;
};

export default async function DashboardPage() {
  const { profile } = await verifySession();
  const { membership, slug } = await requireTenant();
  // The old global 'judge' role became the tenant-scoped 'scorer'/'viewer'
  // pair; both get the same read-only dashboard the judge role used to.
  const canManage = membership.role === "owner" || membership.role === "admin";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const supabase = await createClient();
  const [{ data: scheduledPrograms }, { data: divisions }] = await Promise.all([
    supabase
      .from("programs")
      .select("*")
      .not("scheduled_start", "is", null)
      .order("scheduled_start")
      .returns<Program[]>(),
    supabase.from("divisions").select("*").order("sort_order").returns<Division[]>(),
  ]);

  const divisionNameById = new Map((divisions ?? []).map((d) => [d.id, d.name]));
  const { current, next } = getCurrentAndNextProgram(scheduledPrograms ?? []);

  if (!canManage) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-primary">
            Welcome back, {profile.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
        <CurrentNextPrograms current={current} next={next} divisionNameById={divisionNameById} />
        <div className="card-elevated rounded-xl bg-card p-6 text-muted-foreground ring-1 ring-border">
          Scoring is recorded on paper during judging and entered into the system by
          festival admins. Head to <span className="font-medium text-foreground">Results</span>{" "}
          in the sidebar to see published standings.
        </div>
      </div>
    );
  }

  const [
    counts,
    { data: recentStudents },
    { data: recentPrograms },
    { data: allStudents },
    { data: allPrograms },
    { data: programParticipants },
    { data: groupParticipants },
    { data: scores },
    { data: groupScores },
    { data: groupLeaderboard },
    { data: placementRows },
    { count: checkedInCount },
  ] = await Promise.all([
    Promise.all(
      ADMIN_STATS.map(async (stat) => {
        const { count } = await supabase
          .from(stat.table)
          .select("*", { count: "exact", head: true });
        return { ...stat, count: count ?? 0 };
      }),
    ),
    supabase
      .from("students")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<Pick<Student, "id" | "name" | "created_at">[]>(),
    supabase
      .from("programs")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<Pick<Program, "id" | "name" | "created_at">[]>(),
    supabase
      .from("students")
      .select("division, category")
      .returns<Pick<Student, "division" | "category">[]>(),
    supabase
      .from("programs")
      .select("id, name, program_type, status, published")
      .returns<Pick<Program, "id" | "name" | "program_type" | "status" | "published">[]>(),
    supabase
      .from("program_participants")
      .select("id, program_id")
      .returns<Pick<ProgramParticipant, "id" | "program_id">[]>(),
    supabase
      .from("program_group_participants")
      .select("id, program_id")
      .returns<Pick<ProgramGroupParticipant, "id" | "program_id">[]>(),
    supabase.from("scores").select("id, program_id"),
    supabase.from("group_scores").select("id, program_id"),
    supabase
      .from("public_group_leaderboard")
      .select("*")
      .order("points", { ascending: false })
      .limit(3)
      .returns<GroupLeaderboardRow[]>(),
    supabase
      .from("public_event_top3")
      .select("*")
      .order("published_at", { ascending: false })
      .order("rank", { ascending: true })
      .returns<EventPlacementRow[]>(),
    supabase.from("students").select("*", { count: "exact", head: true }).eq("checked_in", true),
  ]);

  const activity: ActivityItem[] = [
    ...(recentStudents ?? []).map((s) => ({
      id: `student-${s.id}`,
      icon: "person_add",
      text: `${s.name} was added as a student`,
      created_at: s.created_at,
    })),
    ...(recentPrograms ?? []).map((p) => ({
      id: `program-${p.id}`,
      icon: "calendar_month",
      text: `Program "${p.name}" was created`,
      created_at: p.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const upcoming = getUpcomingPrograms(scheduledPrograms ?? []);

  const divisionCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  for (const s of allStudents ?? []) {
    divisionCounts.set(s.division, (divisionCounts.get(s.division) ?? 0) + 1);
    categoryCounts.set(s.category, (categoryCounts.get(s.category) ?? 0) + 1);
  }
  const totalStudentsForBreakdown = allStudents?.length ?? 0;

  // Per-program participant/scored counts, aggregated across every program —
  // same idea as the per-program completion check in
  // programs/[id]/score-completion-banner.tsx, just rolled up here.
  const participantCountByProgram = new Map<string, number>();
  for (const p of programParticipants ?? []) {
    participantCountByProgram.set(p.program_id, (participantCountByProgram.get(p.program_id) ?? 0) + 1);
  }
  for (const p of groupParticipants ?? []) {
    participantCountByProgram.set(p.program_id, (participantCountByProgram.get(p.program_id) ?? 0) + 1);
  }
  const scoredCountByProgram = new Map<string, number>();
  for (const s of scores ?? []) {
    scoredCountByProgram.set(s.program_id, (scoredCountByProgram.get(s.program_id) ?? 0) + 1);
  }
  for (const s of groupScores ?? []) {
    scoredCountByProgram.set(s.program_id, (scoredCountByProgram.get(s.program_id) ?? 0) + 1);
  }

  const statusCounts = new Map<ProgramStatus, number>();
  for (const p of allPrograms ?? []) {
    statusCounts.set(p.status, (statusCounts.get(p.status) ?? 0) + 1);
  }
  const totalPrograms = allPrograms?.length ?? 0;

  const conflictedProgramIds = findScheduleConflicts(scheduledPrograms ?? []);

  let programsWithParticipants = 0;
  let programsFullyScored = 0;
  const needsAttention: { id: string; name: string; reason: string }[] = [];
  for (const p of allPrograms ?? []) {
    const total = participantCountByProgram.get(p.id) ?? 0;
    const scored = scoredCountByProgram.get(p.id) ?? 0;
    if (total > 0) {
      programsWithParticipants += 1;
      if (scored === total) programsFullyScored += 1;
    }
    if (total === 0) {
      needsAttention.push({ id: p.id, name: p.name, reason: "No participants added yet" });
    } else if (p.status === "completed" && !p.published) {
      needsAttention.push({ id: p.id, name: p.name, reason: "Fully scored — ready to publish" });
    }
    if (conflictedProgramIds.has(p.id)) {
      needsAttention.push({
        id: p.id,
        name: p.name,
        reason: "Scheduling conflict — shares a start time with another program",
      });
    }
  }

  const recentlyPublished = groupPlacements(placementRows ?? []).slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-primary">
            Welcome back, {profile.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
        <StatusPills statusCounts={statusCounts} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {counts.map((stat, index) => (
          <div
            key={stat.key}
            style={{ animationDelay: `${index * 40}ms` }}
            className="card-elevated animate-fade-in-up rounded-xl bg-card p-6 ring-1 ring-border"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-surface-container-low text-primary">
              <span className="material-symbols-outlined text-[20px]">{stat.icon}</span>
            </div>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="font-heading text-3xl font-semibold tabular-nums">
              {stat.count.toLocaleString()}
            </p>
            {stat.key === "students" && (
              <p className="mt-1 text-xs text-muted-foreground">
                Checked in: {(checkedInCount ?? 0).toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>

      <CurrentNextPrograms current={current} next={next} divisionNameById={divisionNameById} />

      <div>
        <h2 className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={`/t/${slug}${action.href}`}
              className="card-elevated flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-border transition-colors hover:bg-surface-container-low"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="material-symbols-outlined text-[18px]">{action.icon}</span>
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card-elevated flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-border">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            <span className="material-symbols-outlined text-[16px] text-gold">emoji_events</span>
            Top Groups
          </h2>
          <ul className="flex flex-col gap-3">
            {(groupLeaderboard ?? []).map((row, index) => (
              <li key={row.group_id} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums",
                      index === 0 ? "text-gold ring-2 ring-gold/50" : "text-muted-foreground ring-1 ring-border",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="truncate text-sm font-medium">{row.group_name}</span>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                  {row.points}
                </span>
              </li>
            ))}
            {!groupLeaderboard?.length && (
              <li className="text-sm text-muted-foreground">No published results yet.</li>
            )}
          </ul>
        </div>

        <div className="card-elevated flex flex-col items-center gap-3 rounded-xl bg-card p-5 text-center ring-1 ring-border">
          <h2 className="w-full text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Scoring Progress
          </h2>
          <ScoringProgressRing
            pct={programsWithParticipants ? Math.round((programsFullyScored / programsWithParticipants) * 100) : 0}
          />
          <p className="font-heading text-lg font-semibold tabular-nums">
            {programsFullyScored} / {programsWithParticipants || 0}
          </p>
          <p className="text-xs text-muted-foreground">
            programs fully judged &middot; {totalPrograms} total
          </p>
        </div>

        <div className="card-elevated flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-border">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            <span className="material-symbols-outlined text-[16px] text-warning">priority_high</span>
            Needs Attention
          </h2>
          <ul className="flex flex-col gap-3">
            {needsAttention.slice(0, 6).map((item) => (
              <li key={item.id}>
                <Link
                  href={`/t/${slug}/dashboard/programs/${item.id}`}
                  className="flex flex-col hover:text-primary"
                >
                  <span className="truncate text-sm font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.reason}</span>
                </Link>
              </li>
            ))}
            {!needsAttention.length && (
              <li className="text-sm text-muted-foreground">Nothing needs attention right now.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card-elevated flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-border">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Recent Activity
          </h2>
          {activity.length ? (
            <ul className="relative ml-1.5 flex flex-col gap-4 border-l border-border pb-1">
              {activity.map((item, index) => (
                <li key={item.id} className="relative pl-5">
                  <span
                    className={cn(
                      "absolute top-1 -left-[5px] size-2.5 rounded-full ring-4 ring-card",
                      index === 0 ? "bg-primary" : "bg-outline-variant",
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(item.created_at)}
                  </p>
                  <p className="text-sm">{item.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          )}
        </div>

        <div className="card-elevated flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-border">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Upcoming Schedule
          </h2>
          <ul className="flex flex-col gap-3">
            {upcoming.slice(0, 5).map((program) => (
              <li key={program.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{program.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {divisionNameById.get(program.category) ?? "—"}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-gold">
                  {formatTime(program.scheduled_start!)}
                </span>
              </li>
            ))}
            {!upcoming.length && (
              <li className="text-sm text-muted-foreground">Nothing scheduled yet.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card-elevated rounded-xl bg-card p-5 ring-1 ring-border">
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Students by Division
          </h2>
          <div className="flex flex-col gap-3">
            {(divisions ?? []).map((division) => {
              const count = divisionCounts.get(division.id) ?? 0;
              const pct = totalStudentsForBreakdown
                ? Math.round((count / totalStudentsForBreakdown) * 100)
                : 0;
              return (
                <div key={division.id} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-sm text-muted-foreground">
                    {division.name}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-low">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-elevated rounded-xl bg-card p-5 ring-1 ring-border">
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Students by Category
          </h2>
          <div className="flex flex-col gap-3">
            {Object.entries(STUDENT_CATEGORY_LABELS).map(([key, label]) => {
              const count = categoryCounts.get(key) ?? 0;
              const pct = totalStudentsForBreakdown
                ? Math.round((count / totalStudentsForBreakdown) * 100)
                : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-low">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {recentlyPublished.length > 0 && (
        <div className="card-elevated rounded-xl bg-card p-5 ring-1 ring-border">
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Recently Published
          </h2>
          <ul className="flex flex-col gap-3">
            {recentlyPublished.map((program) => (
              <li key={program.program_id}>
                <Link
                  href={`/t/${slug}/leaderboard/program/${program.program_id}`}
                  target="_blank"
                  className="flex items-center justify-between gap-3 hover:text-primary"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{program.program_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {divisionNameById.get(program.category) ?? "—"} ·{" "}
                      {program.places[0]?.name ?? "—"}
                    </p>
                  </div>
                  {program.published_at && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeTime(program.published_at)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
