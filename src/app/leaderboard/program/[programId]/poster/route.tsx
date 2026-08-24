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

const SIZE = 1080;

let logoDataUrlPromise: Promise<string> | null = null;
function getLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = readFile(join(process.cwd(), "public/mehfile-meem-icon.png")).then(
      (buf) => `data:image/png;base64,${buf.toString("base64")}`,
    );
  }
  return logoDataUrlPromise;
}

// Classic podium order: 2nd on the left, 1st in the center (tallest), 3rd on
// the right — matches the physical medal-ceremony layout.
const PODIUM_ORDER = [2, 1, 3];
const PEDESTAL_HEIGHT: Record<number, number> = { 1: 190, 2: 140, 3: 105 };
const AVATAR_SIZE: Record<number, number> = { 1: 168, 2: 132, 3: 116 };
const MEDAL_COLOR: Record<number, string> = { 1: "#e8b84b", 2: "#c8c6c2", 3: "#c8a97e" };
const MEDAL_INK: Record<number, string> = { 1: "#3a2a05", 2: "#232320", 3: "#2e1f0f" };

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

  const logoDataUrl = await getLogoDataUrl();
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
          flexDirection: "column",
          background: variant.background,
          color: variant.ink,
          padding: "56px 64px",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Soft glow */}
        <div
          style={{
            position: "absolute",
            top: -200,
            left: "50%",
            transform: "translateX(-50%)",
            width: 900,
            height: 900,
            borderRadius: 900,
            background: `radial-gradient(circle, ${variant.accentSoft} 0%, rgba(0,0,0,0) 65%)`,
            display: "flex",
          }}
        />

        {/* Corner ornaments */}
        {[
          { top: 28, left: 28, borderWidth: "3px 0 0 3px" },
          { top: 28, right: 28, borderWidth: "3px 3px 0 0" },
          { bottom: 28, left: 28, borderWidth: "0 0 3px 3px" },
          { bottom: 28, right: 28, borderWidth: "0 3px 3px 0" },
        ].map((pos, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 48,
              height: 48,
              borderColor: variant.accent,
              borderStyle: "solid",
              display: "flex",
              ...pos,
            }}
          />
        ))}

        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <img src={logoDataUrl} alt="" width={64} height={56} style={{ opacity: 0.95 }} />
          <div
            style={{
              display: "flex",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 6,
              color: variant.accent,
              textTransform: "uppercase",
            }}
          >
            Meelad Fest 2K26 · Official Results
          </div>
        </div>

        {/* Program title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            marginTop: 36,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 22,
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
              fontSize: 58,
              fontWeight: 800,
              textAlign: "center",
              lineHeight: 1.15,
              maxWidth: 880,
            }}
          >
            {program.name}
          </div>
        </div>

        {/* Podium */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 28,
            marginTop: 24,
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

            return (
              <div
                key={rank}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: 260,
                }}
              >
                {place ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        width: AVATAR_SIZE[rank],
                        height: AVATAR_SIZE[rank],
                        borderRadius: AVATAR_SIZE[rank],
                        border: `4px solid ${accentHex}`,
                        overflow: "hidden",
                        alignItems: "center",
                        justifyContent: "center",
                        background: variant.accentSoft,
                        marginBottom: 14,
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
                        fontSize: 24,
                        fontWeight: 700,
                        textAlign: "center",
                        maxWidth: 240,
                        marginBottom: 4,
                      }}
                    >
                      {place.place_name}
                    </div>
                    {groupName && (
                      <div
                        style={{
                          display: "flex",
                          fontSize: 16,
                          fontWeight: 600,
                          color: accentHex,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                          marginBottom: 14,
                        }}
                      >
                        {groupName}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: "flex", height: AVATAR_SIZE[rank] + 18 + 44 }} />
                )}

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    width: "100%",
                    height: PEDESTAL_HEIGHT[rank],
                    background: variant.accentSoft,
                    borderTop: `5px solid ${variant.accent}`,
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    paddingTop: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: 56,
                      height: 56,
                      borderRadius: 56,
                      background: MEDAL_COLOR[rank],
                      color: MEDAL_INK[rank],
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 28,
                      fontWeight: 800,
                    }}
                  >
                    {rank}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 14,
                      fontWeight: 700,
                      color: variant.inkSoft,
                      textTransform: "uppercase",
                      letterSpacing: 2,
                      marginTop: 8,
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
            paddingTop: 18,
            marginTop: 24,
            fontSize: 16,
            color: variant.inkSoft,
          }}
        >
          <div style={{ display: "flex" }}>Mehfile Meem — Meelad Fest 2K26</div>
          <div style={{ display: "flex" }}>{generatedOn}</div>
        </div>
      </div>
    ),
    { width: SIZE, height: SIZE },
  );
}
