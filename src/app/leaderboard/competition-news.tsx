import type { ProgramPlacements } from "@/lib/types";
import { formatTimeAgoMalayalam } from "@/lib/time";

export function CompetitionNews({ placements }: { placements: ProgramPlacements[] }) {
  const items = placements.slice(0, 3);

  if (items.length === 0) return null;

  return (
    <div className="flex max-h-52 shrink-0 flex-col gap-3 overflow-hidden rounded-2xl bg-white/6 p-6 ring-1 ring-gold/15 backdrop-blur-md">
      <h2 className="font-heading text-xl font-bold text-gold">മത്സര വാർത്തകൾ</h2>
      <ul className="flex flex-col gap-3 overflow-y-auto">
        {items.map((program) => (
          <li key={program.program_id} className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wide text-gold/70 uppercase">
              {formatTimeAgoMalayalam(program.published_at)}
            </span>
            <p className="text-sm leading-snug font-semibold text-primary-foreground/90">
              {program.program_name} ഫലങ്ങൾ പ്രസിദ്ധീകരിച്ചു.
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
