export type PosterVariant = {
  name: string;
  frame: string;
  background: string;
  accent: string;
  accentSoft: string;
  ink: string;
  inkSoft: string;
};

// Three festive palettes a results-announcement poster can render in.
// Kept separate from the leaderboard's own dark+gold theme so posters read
// as celebratory social-media graphics rather than dashboard UI. `frame` is
// the flat backdrop the arch-topped card floats on — matches the darkest
// stop of each gradient so the card edge doesn't show a hard seam.
export const POSTER_VARIANTS: PosterVariant[] = [
  {
    name: "Gold Radiance",
    frame: "#0e0c09",
    background: "linear-gradient(160deg, #1c1710 0%, #2a2013 45%, #171310 100%)",
    accent: "#e8b84b",
    accentSoft: "rgba(232, 184, 75, 0.16)",
    ink: "#fdf6e3",
    inkSoft: "rgba(253, 246, 227, 0.7)",
  },
  {
    name: "Emerald Night",
    frame: "#05130f",
    background: "linear-gradient(160deg, #0b2e24 0%, #0f4535 45%, #082019 100%)",
    accent: "#f2c94c",
    accentSoft: "rgba(242, 201, 76, 0.16)",
    ink: "#f4fbf7",
    inkSoft: "rgba(244, 251, 247, 0.72)",
  },
  {
    name: "Rose Bloom",
    frame: "#170609",
    background: "linear-gradient(160deg, #3a0f1c 0%, #591629 45%, #260a12 100%)",
    accent: "#f0b85c",
    accentSoft: "rgba(240, 184, 92, 0.16)",
    ink: "#fdf1ee",
    inkSoft: "rgba(253, 241, 238, 0.72)",
  },
];

export function defaultVariantIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % POSTER_VARIANTS.length;
}
