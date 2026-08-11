# Mehfile Meem Design System

A single reference for the app-wide visual redesign — admin dashboard, auth
pages, and the public leaderboard now share one design language instead of
three separate themes.

## Direction

**Modern SaaS**: one bold accent color, crisp cards with normal (single,
soft) elevation, high contrast text everywhere. No molded-surface
(neumorphic) effects and no retro/arcade styling — both were considered and
rejected, neumorphism specifically because shadow-only depth with
near-zero contrast is a real accessibility problem on data-dense screens
(tables, forms), which this app has a lot of (students/programs/results
tables, score entry).

**Hard constraint carried through every phase**: body text must always meet
contrast against its surface. Shadows and color are for hierarchy and
brand, never the only way to tell elements apart.

## Palette

One accent carries the brand everywhere: **indigo**. It reads as modern/
premium, and — importantly — doesn't compete with the gold/silver/bronze
rank colors used throughout results and the leaderboard, so 1st/2nd/3rd
place styling keeps its exact current meaning.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--primary` | `#4f46e5` (indigo-600) | `#818cf8` (indigo-400) | Primary buttons, links, active nav, focus rings |
| `--primary-foreground` | `#ffffff` | `#0b0f19` | Text/icons on primary |
| `--background` | `#f8fafc` (slate-50) | `#0b0f19` | Page background |
| `--foreground` | `#0f172a` (slate-900) | `#f1f5f9` | Body text |
| `--card` | `#ffffff` | `#131a29` | Cards, dialogs, dropdowns |
| `--border` / `--input` | `#e2e8f0` (slate-200) | `#1f2937` | Table/input borders — always visible, never shadow-only |
| `--muted` | `#f1f5f9` | `#1e293b` | Subtle fills (badges, hover rows) |
| `--muted-foreground` | `#64748b` | `#94a3b8` | Secondary text — checked against its background for contrast |
| `--secondary` | `#eef2ff` (indigo-50) | `#1e1b4b` (indigo-950) | Secondary buttons/pills |
| `--destructive` | `#dc2626` | `#f87171` | Delete/error states |
| `--gold` | `#c7a24a` | `#e9c266` | 1st place (unchanged) |
| `--silver` | `#c8c6c2` | `#c8c6c2` | 2nd place (unchanged) |
| `--bronze` | `#c8a97e` | `#c8a97e` | 3rd place (unchanged) |
| `--sidebar` | `#111827` (slate-900) | `#0b0f19` | Dashboard nav rail — dark regardless of mode, standard SaaS pattern |
| `--sidebar-primary` | `#818cf8` (indigo-400) | `#818cf8` | Active nav item |

Everything else (`--success`, `--warning`, `--outline`, chart colors) is
derived from this same slate+indigo scale rather than the old teal/cyan
tones — kept in `globals.css`, not duplicated here.

## Elevation

Single soft shadow scale, neutral (slate-tinted, not brand-tinted):

- `sm`: `0 1px 2px rgba(15,23,42,0.04)`
- `md` (default `.card-elevated`): `0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)`, lifts to a deeper variant + `translateY(-2px)` on hover
- `lg` (dialogs/dropdowns): deeper spread, used sparingly

Dark mode uses the same shape with black-based shadows instead of slate.

**Tables, inputs, and dense data areas keep a solid 1px border** — they
never rely on shadow alone to read as distinct regions. Shadows are for
things that visually "float" (cards, dialogs, dropdowns, popovers).

## Shape

- Base radius tightened from `1rem` → `0.75rem` (crisper, less "bubbly"),
  same derived scale (`sm`/`md`/`lg`/`xl`/`2xl`.../`4xl`) stays proportional.
- Primary CTAs use full pill radius; everything else uses the standard
  scale.

## Typography

Inter stays as the single sans face (`--font-sans`/`--font-heading`) — no
font swap needed, it already reads clean and modern. What changes is
*usage discipline*, not the face itself: a clear scale (display for page
titles, heading for section titles, body, caption/label for table headers
and metadata) applied consistently across dashboard pages that currently
mix ad-hoc sizes.

Malayalam leaderboard text is unaffected by any of this — it keeps its own
Noto Sans Malayalam scoping in `src/app/leaderboard/layout.tsx` (font only;
the color-variable override there is removed, see Phase 1).

## Motion

Existing keyframes (`fade-in-up`, `pulse-glow`, `float`, `twinkle`,
`confetti-fall`, `sunburst-spin`, `shimmer-sweep`) stay for leaderboard
celebratory moments (podium reveal, winner glow), retuned to reference the
new `--gold` token via `color-mix()` instead of a hardcoded rgba. Dashboard
motion stays subtle — hover lift on cards, fade-in on load — no confetti or
glow effects on data screens.

## Component patterns

- **Buttons**: solid indigo primary (pill radius), soft indigo-tinted
  secondary, ghost/outline for tertiary actions. Destructive actions always
  use `--destructive`, never rely on placement alone.
- **Cards**: white/`--card` surface, `.card-elevated` shadow, `0.75rem`
  radius, no border by default (shadow implies the floating card) — except
  where a card contains tabular data, which gets an internal border.
- **Stat tiles**: icon in a soft indigo-tinted circle, large number in
  heading weight, label in muted-foreground — same pattern for every count
  widget (Groups/Students/Programs/new widgets below).
- **Tables**: solid `--border` row separators and outer border, sticky
  header row in `--muted`, no shadow needed since borders already define
  the region.
- **Badges/status pills**: solid `--muted` background + border, status-
  specific color only in the text/dot (draft=slate, scheduled=indigo,
  running=amber, completed=green, published=green) — never color-only.

## Dashboard widgets

Existing, restyled in place: stat cards (Groups/Students/Programs),
Now-Playing/Up-Next program cards, Quick Actions, Recent Activity, Upcoming
Schedule, Students-by-Division.

New:
- **Top Groups board** — top-3 groups from `public_group_leaderboard`, same
  source the leaderboard's sidebar already queries.
- **Scoring Progress** — "X / Y programs fully judged," same completion
  check `score-completion-banner.tsx` already does per-program, aggregated.
- **Recently Published feed** — compact list from the same
  `groupPlacements`/`public_event_top3` pattern behind the leaderboard's
  Competition News panel.
- **Needs Attention** — programs with zero participants, no
  `scheduled_start`, or scored-but-unpublished results.
- **Program Status breakdown** — counts by `status` (draft/scheduled/
  running/completed).
- **Students by Category** — Boy/Girl split, same treatment as the
  Division breakdown.

## Leaderboard-specific additions

- **Festival Progress bar** — "N / M programs published" in the header.
- **Live countdown** on the existing Next-Up banner, ticking off
  `scheduled_start`.
- **QR code** linking back to the same public leaderboard URL, for
  attendees to pull up results on their own phones.
