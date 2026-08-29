export type PosterOrnament = "flanked" | "rosette" | "bar" | "chip" | "dots";
// All rank icons are custom-drawn numbered badges (no emoji) so the rank
// (1st/2nd/3rd) is always legible — only the badge shape/ornamentation
// varies per variant.
export type PosterIconSet = "medallion" | "ribbon" | "chip" | "shield" | "starburst";
// Scattered decorative accents around the results block — shape varies per variant.
export type PosterShape = "diamond" | "dot" | "square" | "ring" | "triangle";

export type PosterVariant = {
  name: string;
  /** Title color + underline/glow tint. */
  ink: string;
  /** Team-name text color + stronger glow accent. */
  accent: string;
  accentSoft: string;
  /** Full-canvas color wash layered over the fixed background artwork. */
  tint: string;
  /** Typographic voice — what actually makes each shuffle feel like a different poster. */
  style: {
    ornament: PosterOrnament;
    icons: PosterIconSet;
    shape: PosterShape;
    titleUppercase: boolean;
    titleWeight: number;
    titleLetterSpacing: number;
    nameUppercase: boolean;
    nameWeight: number;
    nameLetterSpacing: number;
    teamUppercase: boolean;
    teamWeight: number;
    teamLetterSpacing: number;
  };
};

// The poster background artwork itself (public/poster-background.jpg) is
// fixed, but each variant lays a translucent color wash over it — fading out
// before the bottom logos/credits — and pairs it with its own typographic
// voice (weight, casing, spacing, divider ornament), so "Shuffle Design"
// visibly changes the whole poster's look, not just its color.
export const POSTER_VARIANTS: PosterVariant[] = [
  {
    name: "Regal Gold",
    ink: "#ffd876",
    accent: "#f2c94c",
    accentSoft: "rgba(242, 201, 76, 0.45)",
    tint: "linear-gradient(165deg, rgba(242, 201, 76, 0.42) 0%, rgba(120, 84, 12, 0.22) 42%, rgba(0, 0, 0, 0) 78%)",
    style: {
      ornament: "flanked",
      icons: "medallion",
      shape: "diamond",
      titleUppercase: true,
      titleWeight: 900,
      titleLetterSpacing: 6,
      nameUppercase: false,
      nameWeight: 700,
      nameLetterSpacing: 0,
      teamUppercase: true,
      teamWeight: 600,
      teamLetterSpacing: 2,
    },
  },
  {
    name: "Romantic Rose",
    ink: "#ff9fc0",
    accent: "#ff6f9c",
    accentSoft: "rgba(255, 111, 156, 0.45)",
    tint: "linear-gradient(165deg, rgba(255, 111, 156, 0.4) 0%, rgba(122, 22, 58, 0.22) 42%, rgba(0, 0, 0, 0) 78%)",
    style: {
      ornament: "rosette",
      icons: "ribbon",
      shape: "dot",
      titleUppercase: false,
      titleWeight: 700,
      titleLetterSpacing: 1,
      nameUppercase: false,
      nameWeight: 700,
      nameLetterSpacing: 0,
      teamUppercase: false,
      teamWeight: 500,
      teamLetterSpacing: 0,
    },
  },
  {
    name: "Modern Emerald",
    ink: "#7ce8c4",
    accent: "#2fd9a8",
    accentSoft: "rgba(47, 217, 168, 0.45)",
    tint: "linear-gradient(165deg, rgba(47, 217, 168, 0.38) 0%, rgba(8, 92, 72, 0.22) 42%, rgba(0, 0, 0, 0) 78%)",
    style: {
      ornament: "bar",
      icons: "chip",
      shape: "square",
      titleUppercase: true,
      titleWeight: 900,
      titleLetterSpacing: 3,
      nameUppercase: true,
      nameWeight: 700,
      nameLetterSpacing: 1,
      teamUppercase: true,
      teamWeight: 600,
      teamLetterSpacing: 3,
    },
  },
  {
    name: "Classic Sapphire",
    ink: "#9fd4ff",
    accent: "#4fb3ff",
    accentSoft: "rgba(79, 179, 255, 0.45)",
    tint: "linear-gradient(165deg, rgba(79, 179, 255, 0.38) 0%, rgba(12, 62, 122, 0.22) 42%, rgba(0, 0, 0, 0) 78%)",
    style: {
      ornament: "chip",
      icons: "shield",
      shape: "ring",
      titleUppercase: false,
      titleWeight: 700,
      titleLetterSpacing: 0,
      nameUppercase: false,
      nameWeight: 600,
      nameLetterSpacing: 0,
      teamUppercase: false,
      teamWeight: 500,
      teamLetterSpacing: 0,
    },
  },
  {
    name: "Festive Amber",
    ink: "#ffc98a",
    accent: "#ff9a3d",
    accentSoft: "rgba(255, 154, 61, 0.45)",
    tint: "linear-gradient(165deg, rgba(255, 154, 61, 0.4) 0%, rgba(128, 58, 8, 0.22) 42%, rgba(0, 0, 0, 0) 78%)",
    style: {
      ornament: "dots",
      icons: "starburst",
      shape: "triangle",
      titleUppercase: true,
      titleWeight: 800,
      titleLetterSpacing: 4,
      nameUppercase: false,
      nameWeight: 700,
      nameLetterSpacing: 0,
      teamUppercase: false,
      teamWeight: 600,
      teamLetterSpacing: 1,
    },
  },
];

export function defaultVariantIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % POSTER_VARIANTS.length;
}
