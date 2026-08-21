import type { Division } from "@/lib/types";

/** Divisions are admin-entered data, not app-managed translation keys — this
 * just picks the Malayalam name if one was entered and the current language
 * is Malayalam, falling back to the English name otherwise. */
export function divisionLabel(division: Division | undefined, lang: "en" | "ml"): string {
  if (!division) return "";
  if (lang === "ml" && division.name_ml) return division.name_ml;
  return division.name;
}

export function divisionById(divisions: Division[]): Record<string, Division> {
  return Object.fromEntries(divisions.map((division) => [division.id, division]));
}
