/* eslint-disable @next/next/no-img-element -- this route renders Satori/ImageResponse JSX to a PNG, not a DOM; next/image doesn't apply here */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@/lib/supabase/server";
import { groupAccentHex } from "@/lib/group-color";
import { POSTER_VARIANTS, defaultVariantIndex } from "@/lib/poster-variants";
import { PROGRAM_TYPE_LABELS } from "@/lib/validations/program";
import { RANK_LABEL } from "@/app/leaderboard/labels";
import type { Division, EventPlacementRow, Group, Program } from "@/lib/types";

const CANVAS_SIZE = 1080;
const CARD_WIDTH = 1000;
const CARD_HEIGHT = 1020;

let logoDataUrlPromise: Promise<string> | null = null;
function getLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = readFile(join(process.cwd(), "public/mehfile-meem-logo-gold.png")).then(
      (buf) => `data:image/png;base64,${buf.toString("base64")}`,
    );
  }
  return logoDataUrlPromise;
}

let patternDataUrlPromise: Promise<string> | null = null;
function getPatternDataUrl() {
  if (!patternDataUrlPromise) {
    patternDataUrlPromise = readFile(join(process.cwd(), "public/poster-pattern.png")).then(
      (buf) => `data:image/png;base64,${buf.toString("base64")}`,
    );
  }
  return patternDataUrlPromise;
}

// Classic podium order: 2nd on the left, 1st in the center (tallest), 3rd on
// the right — matches the physical medal-ceremony layout.
const PODIUM_ORDER = [2, 1, 3];
const PEDESTAL_HEIGHT: Record<number, number> = { 1: 190, 2: 144, 3: 108 };
const AVATAR_SIZE: Record<number, number> = { 1: 152, 2: 122, 3: 108 };
const MEDAL_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

// Fixed (not random) decorative dot positions — Math.random() isn't
// available in this environment and would break resumability anyway.
const CONFETTI: { top: number; left: number; size?: number }[] = [
  { top: 70, left: 70, size: 8 },
  { top: 120, left: 940 },
  { top: 500, left: 60, size: 8 },
  { top: 480, left: 960, size: 10 },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
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

  const [logoDataUrl, patternDataUrl] = await Promise.all([getLogoDataUrl(), getPatternDataUrl()]);
  const generatedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const byRank = new Map((placements ?? []).map((p) => [p.rank, p]));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: variant.frame,
          fontFamily: "sans-serif",
        }}
      >
        {/* Arch-topped card — a nod to a mihrab silhouette */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            position: "relative",
            overflow: "hidden",
            background: variant.background,
            borderTopLeftRadius: 160,
            borderTopRightRadius: 160,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            color: variant.ink,
            padding: "56px 56px 40px",
            boxShadow: "0 30px 60px rgba(0,0,0,0.55)",
          }}
        >
          {/* Islamic geometric texture */}
          <img
            src={patternDataUrl}
            alt=""
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            style={{ position: "absolute", top: 0, left: 0, opacity: 0.5 }}
          />

          {/* Soft glow behind header */}
          <div
            style={{
              position: "absolute",
              top: -220,
              left: "50%",
              transform: "translateX(-50%)",
              width: 900,
              height: 900,
              borderRadius: 900,
              background: `radial-gradient(circle, ${variant.accentSoft} 0%, rgba(0,0,0,0) 65%)`,
              display: "flex",
            }}
          />

          {/* Decorative confetti */}
          {CONFETTI.map((c, i) => (
            <div
              key={`confetti${i}`}
              style={{
                position: "absolute",
                top: c.top,
                left: c.left,
                width: c.size ?? 10,
                height: c.size ?? 10,
                borderRadius: c.size ?? 10,
                background: i % 2 === 0 ? variant.accent : "#ffffff",
                opacity: 0.45,
                display: "flex",
              }}
            />
          ))}

          {/* Corner ornaments */}
          {[
            { top: 34, left: 34, borderWidth: "3px 0 0 3px" },
            { top: 34, right: 34, borderWidth: "3px 3px 0 0" },
            { bottom: 34, left: 34, borderWidth: "0 0 3px 3px" },
            { bottom: 34, right: 34, borderWidth: "0 3px 3px 0" },
          ].map((pos, i) => (
            <div
              key={`corner${i}`}
              style={{
                position: "absolute",
                width: 40,
                height: 40,
                borderColor: variant.accent,
                borderStyle: "solid",
                display: "flex",
                ...pos,
              }}
            />
          ))}

          {/* Header */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <img src={logoDataUrl} alt="" width={220} height={131} style={{ opacity: 0.98 }} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: 5,
                color: variant.accent,
                textTransform: "uppercase",
              }}
            >
              <div style={{ display: "flex" }}>⭐</div>
              <div style={{ display: "flex" }}>Official Results</div>
              <div style={{ display: "flex" }}>⭐</div>
            </div>
          </div>

          {/* Program title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              marginTop: 26,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: 3,
                color: variant.inkSoft,
                textTransform: "uppercase",
              }}
            >
              {(division?.name ?? "—") + " · " + PROGRAM_TYPE_LABELS[program.program_type]}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 50,
                fontWeight: 800,
                textAlign: "center",
                lineHeight: 1.15,
                maxWidth: 820,
              }}
            >
              {program.name}
            </div>
            {/* Rosette divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <div style={{ display: "flex", width: 40, height: 2, background: variant.accentSoft }} />
              <div
                style={{
                  display: "flex",
                  width: 12,
                  height: 12,
                  borderRadius: 12,
                  border: `2px solid ${variant.accent}`,
                  transform: "rotate(45deg)",
                }}
              />
              <div style={{ display: "flex", width: 40, height: 2, background: variant.accentSoft }} />
            </div>
          </div>

          {/* Podium */}
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 24,
              marginTop: 18,
            }}
          >
            {PODIUM_ORDER.map((rank) => {
              const place = byRank.get(rank);
              const groupName = place
                ? isGroup
                  ? null
                  : groupNameById.get(place.place_group_id)
                : null;
              const accentHex = place ? groupAccentHex(place.place_group_id) : "#555";
              const isChampion = rank === 1;

              return (
                <div
                  key={rank}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 250 }}
                >
                  {place ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        position: "relative",
                      }}
                    >
                      {isChampion && (
                        <div
                          style={{
                            position: "absolute",
                            top: -10,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 260,
                            height: 260,
                            borderRadius: 260,
                            background: `radial-gradient(circle, ${accentHex}55 0%, rgba(0,0,0,0) 70%)`,
                            display: "flex",
                          }}
                        />
                      )}
                      {isChampion && (
                        <div style={{ display: "flex", fontSize: 38, marginBottom: -4 }}>👑</div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          width: AVATAR_SIZE[rank],
                          height: AVATAR_SIZE[rank],
                          borderRadius: 22,
                          border: `4px solid ${accentHex}`,
                          overflow: "hidden",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(0,0,0,0.35)",
                          marginTop: 6,
                          marginBottom: 12,
                          boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
                        }}
                      >
                        {place.place_photo_url ? (
                          <img
                            src={place.place_photo_url}
                            alt=""
                            width={AVATAR_SIZE[rank]}
                            height={AVATAR_SIZE[rank]}
                            style={{ objectFit: "cover" }}
                          />
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              fontSize: AVATAR_SIZE[rank] * 0.36,
                              fontWeight: 800,
                              color: variant.ink,
                            }}
                          >
                            {initials(place.place_name)}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          fontSize: 23,
                          fontWeight: 700,
                          textAlign: "center",
                          maxWidth: 230,
                          marginBottom: 4,
                        }}
                      >
                        {place.place_name}
                      </div>
                      {groupName && (
                        <div
                          style={{
                            display: "flex",
                            fontSize: 15,
                            fontWeight: 600,
                            color: accentHex,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            marginBottom: 12,
                          }}
                        >
                          {groupName}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", height: AVATAR_SIZE[rank] + 18 + 40 }} />
                  )}

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      width: "100%",
                      height: PEDESTAL_HEIGHT[rank],
                      background: isChampion
                        ? `linear-gradient(180deg, ${variant.accentSoft} 0%, rgba(255,255,255,0.03) 100%)`
                        : "rgba(0,0,0,0.28)",
                      borderTop: `5px solid ${variant.accent}`,
                      borderTopLeftRadius: 14,
                      borderTopRightRadius: 14,
                      paddingTop: 14,
                    }}
                  >
                    <div style={{ display: "flex", fontSize: 44 }}>{MEDAL_EMOJI[rank]}</div>
                    <div
                      style={{
                        display: "flex",
                        fontSize: 13,
                        fontWeight: 700,
                        color: variant.inkSoft,
                        textTransform: "uppercase",
                        letterSpacing: 2,
                        marginTop: 6,
                      }}
                    >
                      {RANK_LABEL[rank]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: `2px solid ${variant.accentSoft}`,
              paddingTop: 14,
              marginTop: 18,
              fontSize: 15,
              color: variant.inkSoft,
            }}
          >
            <div style={{ display: "flex" }}>Mehfile Meem — Meelad Fest 2K26</div>
            <div style={{ display: "flex" }}>{generatedOn}</div>
          </div>
        </div>
      </div>
    ),
    { width: CANVAS_SIZE, height: CANVAS_SIZE },
  );
}
