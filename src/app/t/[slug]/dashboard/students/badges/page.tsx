import Link from "next/link";
import type { Metadata } from "next";
import { TENANT_WRITE_ROLES, requireTenantRole } from "@/lib/tenant";
import { FestivalBrand, festivalBrand } from "@/components/brand/festival-brand";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { groupTextColor } from "@/lib/group-color";
import { cn } from "@/lib/utils";
import type { Division, Group, Student } from "@/lib/types";

const BADGES_PER_SHEET = 12;

// One accent per division, picked deterministically from the division's id
// (stable across reloads, works for however many divisions exist — an
// admin-editable table, not a fixed 4). `glow` is the bare "r,g,b" triplet
// for use inside rgba(...), `solid` is the same color as a hex string.
const DIVISION_ACCENTS: { glow: string; solid: string }[] = [
  { glow: "56,224,255", solid: "#38f2ff" }, // cyan
  { glow: "192,132,252", solid: "#c084fc" }, // violet
  { glow: "244,114,182", solid: "#f472b6" }, // pink
  { glow: "74,222,128", solid: "#4ade80" }, // green
  { glow: "251,191,36", solid: "#fbbf24" }, // amber
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function divisionAccent(divisionId: string): { glow: string; solid: string } {
  return DIVISION_ACCENTS[hashString(divisionId) % DIVISION_ACCENTS.length];
}

// Small deterministic PRNG (not Math.random()) seeded per-student, so each
// badge gets its own scatter pattern but the same badge renders identically
// every time — same technique as the leaderboard podium's backdrop
// (src/app/leaderboard/published-results-feed.tsx).
function createSeededRandom(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

// Broader than DIVISION_ACCENTS on purpose — the scattered marks are
// background texture, not identity, so they can draw from more hues
// without being mistaken for the division's own accent color.
const SCATTER_COLORS = [
  "#38f2ff", // cyan
  "#c084fc", // violet
  "#f472b6", // pink
  "#4ade80", // green
  "#fbbf24", // amber
  "#60a5fa", // blue
  "#fb7185", // rose
];

type LogoMark = {
  left: number;
  top: number;
  size: number;
  rotate: number;
  opacity: number;
  color: string;
};

function logoScatterMarks(seed: number): LogoMark[] {
  const rand = createSeededRandom(seed);
  return Array.from({ length: 20 }, () => ({
    left: rand() * 100,
    top: rand() * 100,
    size: 8 + rand() * 8,
    rotate: (rand() - 0.5) * 50,
    opacity: 0.05 + rand() * 0.07,
    color: SCATTER_COLORS[Math.floor(rand() * SCATTER_COLORS.length)],
  }));
}

// Futuristic duotone glow: the division's accent color top-left and a
// violet undertone bottom-right blended over a near-black base, instead of
// a flat single gradient.
function badgeBackground(accentGlow: string): string {
  return (
    `radial-gradient(circle at 15% -10%, rgba(${accentGlow},0.35) 0%, transparent 45%), ` +
    "radial-gradient(circle at 105% 115%, rgba(139,92,246,0.3) 0%, transparent 50%), " +
    "linear-gradient(160deg, #0b1220 0%, #0d1b2a 55%, #060a12 100%)"
  );
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}): Promise<Metadata> {
  const { group: groupId } = await searchParams;
  if (!groupId) return { title: "Chest Number Badges — All Groups" };

  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("name")
    .eq("id", groupId)
    .maybeSingle<Pick<Group, "name">>();

  return { title: `Chest Number Badges — ${data?.name ?? "Group"}` };
}

export default async function StudentBadgesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { slug, tenant } = await requireTenantRole(TENANT_WRITE_ROLES);
  const brand = festivalBrand(tenant);

  const { group: groupId } = await searchParams;
  const supabase = await createClient();

  const [{ data: groups }, { data: students }, { data: divisions }] =
    await Promise.all([
      supabase.from("groups").select("*").order("name").returns<Group[]>(),
      supabase
        .from("students")
        .select("*")
        .not("chest_number", "is", null)
        .eq("category", "boy")
        .order("chest_number")
        .returns<Student[]>(),
      supabase.from("divisions").select("*").returns<Division[]>(),
    ]);

  const groupsList = groups ?? [];
  const groupNameById = new Map(groupsList.map((g) => [g.id, g.name]));
  const divisionNameById = new Map(
    (divisions ?? []).map((d) => [d.id, d.name]),
  );
  const visibleStudents = groupId
    ? (students ?? []).filter((s) => s.group_id === groupId)
    : (students ?? []);
  const sheets = chunkArray(visibleStudents, BADGES_PER_SHEET);

  return (
    <div className="flex flex-col gap-6">
      {/* A3 sheet, 12 badges per page (3 cols x 4 rows) — scoped to this
          page's own document, not globals.css, so other print views (judge
          scoresheet, certificates) keep their own page size. */}
      <style>{`
        @page {
          size: A3;
          margin: 10mm;
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <Link
            href={`/t/${slug}/dashboard/students`}
            className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            Students
          </Link>
          <h1 className="font-heading text-2xl font-semibold text-primary">
            Chest Number Badges
          </h1>
          <p className="text-sm text-muted-foreground">
            {visibleStudents.length} badge
            {visibleStudents.length === 1 ? "" : "s"} ready to print.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/t/${slug}/dashboard/students/badges`}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              !groupId
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            All Groups
          </Link>
          {groupsList.map((group) => (
            <Link
              key={group.id}
              href={`/t/${slug}/dashboard/students/badges?group=${group.id}`}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                groupId === group.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {group.name}
            </Link>
          ))}
          <PrintButton label="Print Badges" />
        </div>
      </div>

      {visibleStudents.length ? (
        <div className="flex flex-col gap-8 print:gap-0">
          {sheets.map((sheet, sheetIndex) => (
            <div
              key={sheetIndex}
              className={cn(
                "grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 print:grid-flow-col print:grid-cols-3 print:grid-rows-4 print:h-[400mm] print:items-start print:gap-4",
                sheetIndex < sheets.length - 1 && "print:break-after-page",
              )}
            >
              {sheet.map((student) => {
                const accent = divisionAccent(student.division);
                const marks = logoScatterMarks(hashString(student.id));
                return (
                  <div
                    key={student.id}
                    className="relative flex flex-col overflow-hidden rounded-2xl border break-inside-avoid [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:w-full print:rotate-90"
                    style={{
                      background: badgeBackground(accent.glow),
                      borderColor: `rgba(${accent.glow},0.4)`,
                      boxShadow: `0 0 20px rgba(${accent.glow},0.2), 0 8px 20px rgba(0,0,0,0.5)`,
                    }}
                  >
                    {/* Scattered logo marks, recolored via a CSS mask (the
                        logo PNG's alpha shape masking a solid-color span) —
                        same technique as the leaderboard podium backdrop. */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]"
                    >
                      {marks.map((mark, index) => (
                        <span
                          key={index}
                          className="absolute aspect-[2011/1220]"
                          style={{
                            left: `${mark.left}%`,
                            top: `${mark.top}%`,
                            width: `${mark.size}px`,
                            opacity: mark.opacity,
                            backgroundColor: mark.color,
                            transform: `translate(-50%, -50%) rotate(${mark.rotate}deg)`,
                            maskImage: `url(${brand.logoUrl})`,
                            maskSize: "contain",
                            maskRepeat: "no-repeat",
                            maskPosition: "center",
                            WebkitMaskImage: `url(${brand.logoUrl})`,
                            WebkitMaskSize: "contain",
                            WebkitMaskRepeat: "no-repeat",
                            WebkitMaskPosition: "center",
                          }}
                        />
                        ))}
                    </div>

                    {/* Logo */}
                    <div className="relative z-10 flex justify-center pt-4 pb-1">
                      <FestivalBrand {...brand} logoClassName="h-9 w-auto" nameClassName="text-lg" />
                    </div>

                    {/* Divider */}
                    <div className="relative z-10 px-8 py-1.5">
                      <span
                        className="block h-px w-full"
                        style={{
                          background: `linear-gradient(to right, transparent, rgba(${accent.glow},0.7), transparent)`,
                        }}
                      />
                    </div>

                    {/* Chest number readout + tag */}
                    <div className="relative z-10 flex flex-col items-center gap-1 px-6 pt-0.5">
                      <div
                        className="flex w-full flex-col items-center rounded-md px-4 py-2"
                        style={{
                          background: `rgba(${accent.glow},0.06)`,
                          border: `1px solid rgba(${accent.glow},0.5)`,
                          boxShadow: `inset 0 0 12px rgba(${accent.glow},0.15)`,
                        }}
                      >
                        <span
                          className="font-mono text-4xl font-black tabular-nums"
                          style={{
                            color: "#eafcff",
                            textShadow: `0 0 10px rgba(${accent.glow},0.85), 0 0 2px #ffffff`,
                          }}
                        >
                          {student.chest_number}
                        </span>
                      </div>
                      <div
                        className="rounded-full px-4 py-0.5"
                        style={{
                          background: `rgba(${accent.glow},0.14)`,
                          border: `1px solid rgba(${accent.glow},0.6)`,
                        }}
                      >
                        <span
                          className="font-mono text-[8px] font-bold tracking-widest uppercase"
                          style={{ color: accent.solid }}
                        >
                          Chest No.
                        </span>
                      </div>
                    </div>

                    {/* Name tag */}
                    <div
                      className="relative z-10 mx-4 mt-2.5 rounded-lg px-4 py-1.5 text-center"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: `1px solid rgba(${accent.glow},0.4)`,
                      }}
                    >
                      <p className="text-sm font-bold break-words text-white">
                        {student.name}
                      </p>
                    </div>

                    {/* Division / group readout */}
                    <div
                      className="relative z-10 mx-auto mt-1.5 mb-2.5 w-fit rounded-full px-3 py-0.5"
                      style={{ border: `1px solid rgba(${accent.glow},0.35)` }}
                    >
                      <span
                        className="font-mono text-[9px] font-bold tracking-wider uppercase"
                        style={{ color: accent.solid }}
                      >
                        {divisionNameById.get(student.division) ?? "—"}
                      </span>
                      <span style={{ color: `rgba(${accent.glow},0.5)` }}>
                        {" // "}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[9px] font-bold tracking-wider uppercase",
                          groupTextColor(student.group_id),
                        )}
                      >
                        {groupNameById.get(student.group_id) ?? "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="card-elevated rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          No chest numbers assigned yet.
        </div>
      )}
    </div>
  );
}
