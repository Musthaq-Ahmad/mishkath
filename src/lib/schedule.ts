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
