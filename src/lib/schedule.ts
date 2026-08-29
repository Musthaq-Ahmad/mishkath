import type { Program } from "@/lib/types";

// Driven by the admin-controlled status field (set via StatusControl / the
// dashboard's "Enter Scores" flow), not scheduled_start — a program's
// actual start/finish rarely matches its planned time exactly, so status
// is the source of truth for "what's happening right now."
export function getCurrentAndNextProgram(programs: Program[]) {
  const current = programs.find((p) => p.status === "running") ?? null;

  const next = programs
    .filter((p) => p.status === "scheduled")
    .sort((a, b) => {
      if (!a.scheduled_start && !b.scheduled_start) return 0;
      if (!a.scheduled_start) return 1;
      if (!b.scheduled_start) return -1;
      return new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime();
    })[0];

  return { current, next: next ?? null };
}

export function getUpcomingPrograms(programs: Program[]) {
  const now = Date.now();
  return programs.filter((p) => new Date(p.scheduled_start!).getTime() > now);
}

export function formatScheduleTime(isoString: string) {
  return new Date(isoString).toLocaleString("en-IN", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Programs that share the exact same scheduled_start timestamp as another
 * program — flags a likely double-booking so it can be surfaced to admins. */
export function findScheduleConflicts(programs: Program[]): Set<string> {
  const idsByStart = new Map<string, string[]>();
  for (const program of programs) {
    if (!program.scheduled_start) continue;
    const key = new Date(program.scheduled_start).toISOString();
    idsByStart.set(key, [...(idsByStart.get(key) ?? []), program.id]);
  }

  const conflicted = new Set<string>();
  for (const ids of idsByStart.values()) {
    if (ids.length > 1) ids.forEach((id) => conflicted.add(id));
  }
  return conflicted;
}
