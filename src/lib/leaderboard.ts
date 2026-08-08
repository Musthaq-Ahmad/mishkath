import type { EventPlacementRow, ProgramPlacements } from "@/lib/types";

/**
 * Groups flat rank<=3 rows (from public_event_top3, already ordered by
 * published_at desc, rank asc) into one entry per program with its places
 * list. Insertion order is preserved, so the first group is the most
 * recently published program.
 */
export function groupPlacements(rows: EventPlacementRow[]): ProgramPlacements[] {
  const byProgram = new Map<string, ProgramPlacements>();

  for (const row of rows) {
    let entry = byProgram.get(row.program_id);
    if (!entry) {
      entry = {
        program_id: row.program_id,
        program_name: row.program_name,
        category: row.category,
        program_type: row.program_type,
        published_at: row.published_at,
        places: [],
      };
      byProgram.set(row.program_id, entry);
    }
    entry.places.push({
      id: row.place_id,
      rank: row.rank,
      name: row.place_name,
      photoUrl: row.place_photo_url,
      groupId: row.place_group_id,
    });
  }

  return [...byProgram.values()];
}
