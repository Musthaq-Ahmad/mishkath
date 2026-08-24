// Deterministic ring/background color per group, so the same group always
// renders the same color across the leaderboard (lets viewers spot "same
// group" at a glance around a participant's avatar). Full literal class
// strings are kept in these arrays (not built via template-literal
// concatenation) because Tailwind's build-time scanner only picks up
// classes that appear verbatim in source — a dynamically-constructed
// `` `ring-[${hex}]` `` string never appears in the built CSS.
const GROUP_RING_COLORS = [
  "ring-[#f472b6]", // pink
  "ring-[#67e8f9]", // cyan
  "ring-[#fbbf24]", // amber
  "ring-[#a78bfa]", // violet
  "ring-[#34d399]", // emerald
  "ring-[#fb923c]", // orange
  "ring-[#60a5fa]", // blue
  "ring-[#f87171]", // red
];

const GROUP_BG_COLORS = [
  "bg-[#f472b6]/25", // pink
  "bg-[#67e8f9]/25", // cyan
  "bg-[#fbbf24]/25", // amber
  "bg-[#a78bfa]/25", // violet
  "bg-[#34d399]/25", // emerald
  "bg-[#fb923c]/25", // orange
  "bg-[#60a5fa]/25", // blue
  "bg-[#f87171]/25", // red
];

const GROUP_TEXT_COLORS = [
  "text-[#f472b6]", // pink
  "text-[#67e8f9]", // cyan
  "text-[#fbbf24]", // amber
  "text-[#a78bfa]", // violet
  "text-[#34d399]", // emerald
  "text-[#fb923c]", // orange
  "text-[#60a5fa]", // blue
  "text-[#f87171]", // red
];

// Same palette/order as GROUP_RING_COLORS above, as raw hex — for contexts
// that can't use Tailwind arbitrary-value classes (e.g. inline styles fed to
// Satori/ImageResponse when rendering the shareable results poster).
const GROUP_HEX_COLORS = [
  "#f472b6", // pink
  "#67e8f9", // cyan
  "#fbbf24", // amber
  "#a78bfa", // violet
  "#34d399", // emerald
  "#fb923c", // orange
  "#60a5fa", // blue
  "#f87171", // red
];

function groupColorIndex(groupId: string): number {
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = (hash * 31 + groupId.charCodeAt(i)) >>> 0;
  }
  return hash % GROUP_RING_COLORS.length;
}

export function groupRingColor(groupId: string | null | undefined): string {
  if (!groupId) return "ring-border";
  return GROUP_RING_COLORS[groupColorIndex(groupId)];
}

// Solid background fill in the same deterministic color, for shield/badge
// icons where a tinted fill reads better than a ring outline.
export function groupBgColor(groupId: string | null | undefined): string {
  if (!groupId) return "bg-muted";
  return GROUP_BG_COLORS[groupColorIndex(groupId)];
}

// Text color in the same deterministic palette, for labeling a
// participant's group affiliation inline (e.g. under their name).
export function groupTextColor(groupId: string | null | undefined): string {
  if (!groupId) return "text-muted-foreground";
  return GROUP_TEXT_COLORS[groupColorIndex(groupId)];
}

export function groupAccentHex(groupId: string | null | undefined): string {
  if (!groupId) return "#9a9a9a";
  return GROUP_HEX_COLORS[groupColorIndex(groupId)];
}
