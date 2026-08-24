import { ImageResponse } from "next/og.js";
import { writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

const POSTER_VARIANTS = [
  {
    name: "Gold Radiance",
    background: "linear-gradient(160deg, #1c1710 0%, #2a2013 45%, #171310 100%)",
    accent: "#e8b84b",
    accentSoft: "rgba(232, 184, 75, 0.16)",
    ink: "#fdf6e3",
    inkSoft: "rgba(253, 246, 227, 0.7)",
  },
  {
    name: "Emerald Night",
    background: "linear-gradient(160deg, #0b2e24 0%, #0f4535 45%, #082019 100%)",
    accent: "#f2c94c",
    accentSoft: "rgba(242, 201, 76, 0.16)",
    ink: "#f4fbf7",
    inkSoft: "rgba(244, 251, 247, 0.72)",
  },
  {
    name: "Rose Bloom",
    background: "linear-gradient(160deg, #3a0f1c 0%, #591629 45%, #260a12 100%)",
    accent: "#f0b85c",
    accentSoft: "rgba(240, 184, 92, 0.16)",
    ink: "#fdf1ee",
    inkSoft: "rgba(253, 241, 238, 0.72)",
  },
];

const PODIUM_ORDER = [2, 1, 3];
const PEDESTAL_HEIGHT = { 1: 190, 2: 140, 3: 105 };
const AVATAR_SIZE = { 1: 168, 2: 132, 3: 116 };
const MEDAL_COLOR = { 1: "#e8b84b", 2: "#c8c6c2", 3: "#c8a97e" };
const MEDAL_INK = { 1: "#3a2a05", 2: "#232320", 3: "#2e1f0f" };
const RANK_LABEL = { 1: "1st Place", 2: "2nd Place", 3: "3rd Place" };

function initials(name) {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

const GROUP_HEX_COLORS = ["#f472b6", "#67e8f9", "#fbbf24", "#a78bfa", "#34d399", "#fb923c", "#60a5fa", "#f87171"];
function groupAccentHex(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return GROUP_HEX_COLORS[hash % GROUP_HEX_COLORS.length];
}

const placements = [
  { rank: 1, place_name: "Ahmed Zaid", place_photo_url: null, place_group_id: "group-a" },
  { rank: 2, place_name: "Fathima Nasrin K.P.", place_photo_url: null, place_group_id: "group-b" },
  { rank: 3, place_name: "Rayyan", place_photo_url: null, place_group_id: "group-c" },
];
const groupNameById = new Map([
  ["group-a", "Al Firdous"],
  ["group-b", "Nooriya"],
  ["group-c", "Rahmaniya"],
]);
const isGroup = false;
const programName = "Qirath Competition — Senior";
const divisionLabel = "Senior · Individual";
const generatedOn = "August 24, 2026";

const logoBuf = await readFile(join(process.cwd(), "public/mehfile-meem-icon.png"));
const logoDataUrl = `data:image/png;base64,${logoBuf.toString("base64")}`;

function buildElement(variant) {
  const byRank = new Map(placements.map((p) => [p.rank, p]));
  return (
    {
      type: "div",
    }
  );
}

// Build JSX via React.createElement since this is a plain .mjs script (no JSX transform)
import React from "react";
const h = React.createElement;

function poster(variant) {
  const byRank = new Map(placements.map((p) => [p.rank, p]));
  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: variant.background,
        color: variant.ink,
        padding: "56px 64px",
        position: "relative",
        fontFamily: "sans-serif",
      },
    },
    h("div", {
      style: {
        position: "absolute",
        top: -200,
        left: "50%",
        transform: "translateX(-50%)",
        width: 900,
        height: 900,
        borderRadius: 900,
        background: `radial-gradient(circle, ${variant.accentSoft} 0%, rgba(0,0,0,0) 65%)`,
        display: "flex",
      },
    }),
    ...[
      { top: 28, left: 28, borderWidth: "3px 0 0 3px" },
      { top: 28, right: 28, borderWidth: "3px 3px 0 0" },
      { bottom: 28, left: 28, borderWidth: "0 0 3px 3px" },
      { bottom: 28, right: 28, borderWidth: "0 3px 3px 0" },
    ].map((pos, i) =>
      h("div", {
        key: i,
        style: {
          position: "absolute",
          width: 48,
          height: 48,
          borderColor: variant.accent,
          borderStyle: "solid",
          display: "flex",
          ...pos,
        },
      }),
    ),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, zIndex: 1 } },
      h("img", { src: logoDataUrl, width: 64, height: 56, style: { opacity: 0.95 } }),
      h(
        "div",
        {
          style: {
            display: "flex",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 6,
            color: variant.accent,
            textTransform: "uppercase",
          },
        },
        "Meelad Fest 2K26 · Official Results",
      ),
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          marginTop: 36,
          zIndex: 1,
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 3,
            color: variant.inkSoft,
            textTransform: "uppercase",
          },
        },
        divisionLabel,
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            fontSize: 58,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: 880,
          },
        },
        programName,
      ),
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          flex: 1,
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 28,
          marginTop: 24,
          zIndex: 1,
        },
      },
      ...PODIUM_ORDER.map((rank) => {
        const place = byRank.get(rank);
        const groupName = place ? (isGroup ? null : groupNameById.get(place.place_group_id)) : null;
        const accentHex = place ? groupAccentHex(place.place_group_id) : "#555";
        return h(
          "div",
          { key: rank, style: { display: "flex", flexDirection: "column", alignItems: "center", width: 260, background: "#00ffff" } },
          place
            ? h(
                React.Fragment,
                {},
                h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      width: AVATAR_SIZE[rank],
                      height: AVATAR_SIZE[rank],
                      borderRadius: AVATAR_SIZE[rank],
                      border: `4px solid ${accentHex}`,
                      overflow: "hidden",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#ff00ff",
                      marginBottom: 14,
                    },
                  },
                  place.place_photo_url
                    ? h("img", {
                        src: place.place_photo_url,
                        width: AVATAR_SIZE[rank],
                        height: AVATAR_SIZE[rank],
                        style: { objectFit: "cover" },
                      })
                    : h(
                        "div",
                        {
                          style: {
                            display: "flex",
                            fontSize: AVATAR_SIZE[rank] * 0.36,
                            fontWeight: 800,
                            color: variant.ink,
                          },
                        },
                        initials(place.place_name),
                      ),
                ),
                h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      fontSize: 24,
                      fontWeight: 700,
                      textAlign: "center",
                      maxWidth: 240,
                      marginBottom: 4,
                    },
                  },
                  place.place_name,
                ),
                groupName &&
                  h(
                    "div",
                    {
                      style: {
                        display: "flex",
                        fontSize: 16,
                        fontWeight: 600,
                        color: accentHex,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        marginBottom: 14,
                      },
                    },
                    groupName,
                  ),
              )
            : h("div", { style: { display: "flex", height: AVATAR_SIZE[rank] + 18 + 44 } }),
          h(
            "div",
            {
              style: {
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
              },
            },
            h(
              "div",
              {
                style: {
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
                },
              },
              String(rank),
            ),
            h(
              "div",
              {
                style: {
                  display: "flex",
                  fontSize: 14,
                  fontWeight: 700,
                  color: variant.inkSoft,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  marginTop: 8,
                },
              },
              RANK_LABEL[rank],
            ),
          ),
        );
      }),
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: `2px solid ${variant.accentSoft}`,
          paddingTop: 18,
          marginTop: 24,
          zIndex: 1,
          fontSize: 16,
          color: variant.inkSoft,
        },
      },
      h("div", { style: { display: "flex" } }, "Mehfile Meem — Meelad Fest 2K26"),
      h("div", { style: { display: "flex" } }, generatedOn),
    ),
  );
}

for (let i = 0; i < POSTER_VARIANTS.length; i++) {
  const variant = POSTER_VARIANTS[i];
  const res = new ImageResponse(poster(variant), { width: 1080, height: 1080 });
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = `/tmp/claude-1003/-home-musthaq-ahmad-Documents-mishkath/f84dbd6e-8607-41e8-a666-1e87bac9b09f/scratchpad/poster-${i}-${variant.name.replace(/\s+/g, "-").toLowerCase()}.png`;
  await writeFile(outPath, buf);
  console.log("wrote", outPath);
}
