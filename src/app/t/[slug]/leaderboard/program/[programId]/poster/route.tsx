/* eslint-disable @next/next/no-img-element -- this route renders Satori/ImageResponse JSX to a PNG, not a DOM; next/image doesn't apply here */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@/lib/supabase/server";
import { POSTER_VARIANTS, defaultVariantIndex, type PosterVariant } from "@/lib/poster-variants";
import { GENDER_CATEGORY_LABELS } from "@/lib/validations/program";
import type { Division, EventPlacementRow, Group, Program } from "@/lib/types";

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1440;

// Where the fixed background artwork's open dark panel starts/how it's laid
// out — matches public/poster-background.jpg exactly (logos + ribbon above,
// ribbon + organizer credit below), so results must land inside this band.
const CONTENT_TOP = 380;
const CONTENT_PADDING_TOP = 96;
const RANK_ORDER = [1, 2, 3];

// Fixed row/icon-column widths so every rank lines up on the same left edge —
// rows can't just be individually centered, since shorter names would shift
// the whole icon+text unit sideways relative to longer ones.
const ROW_WIDTH = 640;
const ICON_COLUMN_WIDTH = 64;

const BADGE_SIZE = 46;
const BADGE_TEXT_COLOR = "#171225";

function badgeCore(variant: PosterVariant, rank: number, extraStyle: Record<string, unknown> = {}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: BADGE_SIZE,
        height: BADGE_SIZE,
        borderRadius: BADGE_SIZE,
        background: `linear-gradient(160deg, ${variant.accent} 0%, ${variant.ink} 150%)`,
        border: `2px solid ${variant.ink}`,
        boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
        ...extraStyle,
      }}
    >
      <div style={{ display: "flex", fontSize: 22, fontWeight: 900, color: BADGE_TEXT_COLOR }}>{rank}</div>
    </div>
  );
}

// Every rank icon is a custom-drawn numbered badge — the rank digit is
// always legible, only the badge's shape/ornamentation changes per variant.
function renderRankIcon(variant: PosterVariant, rank: number) {
  switch (variant.style.icons) {
    case "medallion":
      // A thin outer ring around the badge, like an engraved medallion.
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: BADGE_SIZE + 10,
            height: BADGE_SIZE + 10,
            borderRadius: BADGE_SIZE + 10,
            border: `1px solid ${variant.accent}`,
          }}
        >
          {badgeCore(variant, rank)}
        </div>
      );
    case "ribbon":
      // A round seal with two small ribbon tails hanging below it.
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {badgeCore(variant, rank)}
          <div style={{ display: "flex", gap: 4, marginTop: -4 }}>
            <div
              style={{
                display: "flex",
                width: 0,
                height: 0,
                borderLeft: "9px solid transparent",
                borderRight: "9px solid transparent",
                borderTop: `16px solid ${variant.accent}`,
                transform: "rotate(8deg)",
              }}
            />
            <div
              style={{
                display: "flex",
                width: 0,
                height: 0,
                borderLeft: "9px solid transparent",
                borderRight: "9px solid transparent",
                borderTop: `16px solid ${variant.accent}`,
                transform: "rotate(-8deg)",
              }}
            />
          </div>
        </div>
      );
    case "chip":
      // A flat, sharp-cornered chip — no extra ornamentation, just modern.
      return badgeCore(variant, rank, { borderRadius: 14 });
    case "shield":
      // A rounded-top, tapered-bottom shield silhouette.
      return badgeCore(variant, rank, { borderRadius: "24px 24px 8px 8px" });
    case "starburst": {
      // A soft glow halo plus four small diamond points radiating outward.
      const point = (pos: Record<string, unknown>) => (
        <div
          style={{
            display: "flex",
            position: "absolute",
            width: 7,
            height: 7,
            background: variant.accent,
            borderRadius: 2,
            transform: "rotate(45deg)",
            ...pos,
          }}
        />
      );
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: BADGE_SIZE + 24,
            height: BADGE_SIZE + 24,
            position: "relative",
          }}
        >
          {point({ top: 0, left: "50%", marginLeft: -3.5 })}
          {point({ bottom: 0, left: "50%", marginLeft: -3.5 })}
          {point({ left: 0, top: "50%", marginTop: -3.5 })}
          {point({ right: 0, top: "50%", marginTop: -3.5 })}
          <div style={{ display: "flex", boxShadow: `0 0 22px 4px ${variant.accentSoft}`, borderRadius: BADGE_SIZE }}>
            {badgeCore(variant, rank)}
          </div>
        </div>
      );
    }
  }
}

// Exo 2 is this app's actual brand font (see src/app/layout.tsx); Baloo
// Chettan 2 is its own Malayalam-script fallback, so participant/program
// names in either script render correctly instead of Satori's generic
// default font.
const FONT_FILES = [
  { name: "Exo 2", file: "exo2-500.ttf", weight: 500 as const },
  { name: "Exo 2", file: "exo2-700.ttf", weight: 700 as const },
  { name: "Exo 2", file: "exo2-900.ttf", weight: 900 as const },
  { name: "Baloo Chettan 2", file: "baloo-chettan-2-700.ttf", weight: 700 as const },
];

let backgroundDataUrlPromise: Promise<string> | null = null;
function getBackgroundDataUrl() {
  if (!backgroundDataUrlPromise) {
    backgroundDataUrlPromise = readFile(join(process.cwd(), "public/poster-background.jpg")).then(
      (buf) => `data:image/jpeg;base64,${buf.toString("base64")}`,
    );
  }
  return backgroundDataUrlPromise;
}

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 500 | 700 | 900; style: "normal" }[]> | null = null;
function getFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      FONT_FILES.map(async (f) => ({
        name: f.name,
        data: await readFile(join(process.cwd(), "public/fonts", f.file)),
        weight: f.weight,
        style: "normal" as const,
      })),
    );
  }
  return fontsPromise;
}

function diamond(color: string, size = 10) {
  return {
    display: "flex" as const,
    width: size,
    height: size,
    background: color,
    borderRadius: 2,
    transform: "rotate(45deg)",
  };
}

// Scattered decorative accents around the results block, kept clear of the
// centered text column (x 220–860) so they never sit on top of copy — sized
// and positioned once, then recolored/reshaped per variant on shuffle.
const DECOR_POSITIONS: { top: number; left: number; size: number }[] = [
  { top: 410, left: 130, size: 11 },
  { top: 430, left: 950, size: 14 },
  { top: 530, left: 85, size: 9 },
  { top: 560, left: 995, size: 11 },
  { top: 680, left: 115, size: 13 },
  { top: 705, left: 970, size: 9 },
  { top: 835, left: 90, size: 10 },
  { top: 865, left: 965, size: 12 },
  { top: 985, left: 135, size: 9 },
  { top: 1010, left: 940, size: 11 },
];

function renderDecorShape(variant: PosterVariant, size: number) {
  const color = variant.accent;
  switch (variant.style.shape) {
    case "diamond":
      return (
        <div
          style={{ display: "flex", width: size, height: size, background: color, opacity: 0.4, borderRadius: 2, transform: "rotate(45deg)" }}
        />
      );
    case "dot":
      return (
        <div style={{ display: "flex", width: size, height: size, background: color, opacity: 0.4, borderRadius: size }} />
      );
    case "square":
      return (
        <div style={{ display: "flex", width: size, height: size, background: color, opacity: 0.4, borderRadius: 3 }} />
      );
    case "ring":
      return (
        <div
          style={{ display: "flex", width: size, height: size, border: `2px solid ${color}`, opacity: 0.45, borderRadius: size }}
        />
      );
    case "triangle":
      return (
        <div
          style={{
            display: "flex",
            width: 0,
            height: 0,
            borderLeft: `${size / 2}px solid transparent`,
            borderRight: `${size / 2}px solid transparent`,
            borderBottom: `${size}px solid ${color}`,
            opacity: 0.45,
          }}
        />
      );
  }
}

function renderDecor(variant: PosterVariant) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, display: "flex" }}>
      {DECOR_POSITIONS.map((p, i) => (
        <div key={i} style={{ display: "flex", position: "absolute", top: p.top, left: p.left }}>
          {renderDecorShape(variant, p.size)}
        </div>
      ))}
    </div>
  );
}

// The divider beneath the title — its shape is what gives each shuffled
// variant a distinct typographic "voice" beyond just color. "chip" has no
// divider since it frames the title itself instead (handled inline below).
function renderOrnament(variant: PosterVariant) {
  const accent = variant.accent;
  switch (variant.style.ornament) {
    case "flanked":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
          <div style={diamond(accent)} />
          <div style={{ display: "flex", width: 70, height: 3, background: accent }} />
          <div style={diamond(accent, 13)} />
          <div style={{ display: "flex", width: 70, height: 3, background: accent }} />
          <div style={diamond(accent)} />
        </div>
      );
    case "rosette":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
          <div style={{ display: "flex", width: 40, height: 2, background: accent }} />
          <div style={diamond(accent, 12)} />
          <div style={{ display: "flex", width: 40, height: 2, background: accent }} />
        </div>
      );
    case "bar":
      return (
        <div
          style={{ display: "flex", width: 90, height: 6, borderRadius: 3, marginTop: 18, background: accent }}
        />
      );
    case "dots":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: "flex", width: 9, height: 9, borderRadius: 9, background: accent }} />
          ))}
        </div>
      );
    case "chip":
      return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ programId: string }> },
) {
  const { programId } = await params;
  const url = new URL(request.url);
  const variantParam = Number(url.searchParams.get("variant"));

  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("*")
    .eq("id", programId)
    .maybeSingle<Program>();

  if (!program || !program.published) {
    return new Response("Not found", { status: 404 });
  }

  const [{ data: placements }, { data: groups }, { data: division }] = await Promise.all([
    supabase
      .from("public_event_top3")
      .select("*")
      .eq("program_id", programId)
      .order("rank", { ascending: true })
      .returns<EventPlacementRow[]>(),
    supabase.from("groups").select("id, name").returns<Pick<Group, "id" | "name">[]>(),
    supabase
      .from("divisions")
      .select("name")
      .eq("id", program.category)
      .maybeSingle<Pick<Division, "name">>(),
  ]);

  const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const isGroup = program.program_type === "group";

  const variantIndex = Number.isInteger(variantParam) && POSTER_VARIANTS[variantParam]
    ? variantParam
    : defaultVariantIndex(programId);
  const variant = POSTER_VARIANTS[variantIndex];
  const { style } = variant;

  const [backgroundDataUrl, fonts] = await Promise.all([getBackgroundDataUrl(), getFonts()]);
  const byRank = new Map((placements ?? []).map((p) => [p.rank, p]));

  const eyebrowNode = (
    <div
      style={{
        display: "flex",
        fontSize: 19,
        fontWeight: 700,
        letterSpacing: 3,
        textTransform: "uppercase",
        color: variant.accent,
        marginBottom: 14,
      }}
    >
      {(division?.name ?? "—") + " · " + GENDER_CATEGORY_LABELS[program.gender_category]}
    </div>
  );

  const titleNode = (
    <div
      style={{
        display: "flex",
        fontSize: 46,
        fontWeight: style.titleWeight,
        letterSpacing: style.titleLetterSpacing,
        textTransform: style.titleUppercase ? "uppercase" : "none",
        textAlign: "center",
        maxWidth: 880,
        color: variant.ink,
        textShadow: `0 0 34px ${variant.accentSoft}, 0 2px 10px rgba(0,0,0,0.55)`,
      }}
    >
      {program.name}
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          fontFamily: "Exo 2, Baloo Chettan 2",
        }}
      >
        <img
          src={backgroundDataUrl}
          alt=""
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ position: "absolute", top: 0, left: 0 }}
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            display: "flex",
            background: variant.tint,
          }}
        />

        {renderDecor(variant)}

        <div
          style={{
            position: "absolute",
            top: CONTENT_TOP,
            left: 0,
            width: CANVAS_WIDTH,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: CONTENT_PADDING_TOP,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {eyebrowNode}
            {style.ornament === "chip" ? (
              <div
                style={{
                  display: "flex",
                  padding: "16px 36px",
                  borderRadius: 18,
                  background: variant.accentSoft,
                  border: `1px solid ${variant.accent}`,
                }}
              >
                {titleNode}
              </div>
            ) : (
              titleNode
            )}
            {renderOrnament(variant)}
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 46, marginTop: 60 }}
          >
            {RANK_ORDER.map((rank) => {
              const place = byRank.get(rank);
              if (!place) return null;
              const groupName = isGroup ? null : groupNameById.get(place.place_group_id);

              return (
                <div key={rank} style={{ display: "flex", alignItems: "center", gap: 22, width: ROW_WIDTH }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: ICON_COLUMN_WIDTH,
                    }}
                  >
                    {renderRankIcon(variant, rank)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      maxWidth: ROW_WIDTH - ICON_COLUMN_WIDTH - 22,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        fontSize: 34,
                        fontWeight: style.nameWeight,
                        letterSpacing: style.nameLetterSpacing,
                        textTransform: style.nameUppercase ? "uppercase" : "none",
                        color: "#ffffff",
                      }}
                    >
                      {place.place_name}
                    </div>
                    {groupName && (
                      <div
                        style={{
                          display: "flex",
                          fontSize: 23,
                          fontWeight: style.teamWeight,
                          letterSpacing: style.teamLetterSpacing,
                          textTransform: style.teamUppercase ? "uppercase" : "none",
                          color: variant.accent,
                          marginTop: 6,
                        }}
                      >
                        {groupName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ),
    { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, fonts },
  );
}
