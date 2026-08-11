import type { Program } from "@/lib/types";

export function getCurrentAndNextProgram(programs: Program[]) {
  const now = Date.now();
  let current: Program | null = null;
  let next: Program | null = null;

  for (const program of programs) {
    const startTime = new Date(program.scheduled_start!).getTime();
    if (startTime <= now) {
      current = program;
    } else if (!next) {
      next = program;
      break;
    }
  }

  return { current, next };
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
