---
description: All charts and reports follow the analytics-types.html design language
globs:
alwaysApply: true
---

# Chart & Report Design

`pages/analytics-types.html` is the **single source of truth** for the visual
design of **any chart, graph, scorecard, or report** in the app. This file is
the written twin of that page — the same rules, in prose. When you generate or
edit a chart or report, open Analytics Types and mirror its animations, corner
radii, elevations, colors, headlines, and headers. Never invent a new
chart / report look.

Distribution / segmented bars (the stacked composition strip) are a chart. They
follow these rules; they are not a separate component.

## Source of truth

- **Visual:** `pages/analytics-types.html`
- **Written:** this file (`assets/chart-and-report-design.md`)
- If the two ever disagree, **Analytics Types wins** — update this file to
  match the page, not the reverse.

## Typography

- **Headlines (H1 / H2 / H3):** brand **serif** (`--module-title-family` /
  `'WISE Digits', 'Noto Serif'`). This includes report titles, section titles,
  card titles, chart titles, processing-scale tier names, and primary CTAs.
  Letter-spacing is tight (`-0.01em` on titles).
- **Big stat numerals** (claim counts, donut centers, WISEscore, pillar
  scores, report stats, segment percentages) use the **same serif** face —
  not the body sans.
- **Body, labels, pills, descriptions** stay in DM Sans.
- **Tables, heat cells, axis ticks, and other compact numbers** use
  `font-variant-numeric: tabular-nums` so columns stay aligned.
- **UPC / GTIN** use the **mono** face (`var(--font-mono)` / DM Mono).
- **Scorecards, KPI tiles, claim columns, and filter tiles have no
  eyebrow.** A report or matrix card may use an uppercase category pill
  (the Analytics Types matrix / product-hero brand line). Do not put a
  kicker above a scorecard headline.

Type on Analytics Types is authored at a **12px floor**. Do not set chart
or tooltip type below 12px (scatter axis ticks on that page are the
documented exception).

## Corner radii

- Big containers / cards: `var(--r-md, 16px)` (`.att-card`, chart cards).
- Popovers, tooltips, export menus: ~12px.
- Nested table-view cards: ~14px.
- Chips / pills / health-bar tracks: `var(--radius-pill, 9999px)`.
- Tiny cells (matrix, heatmap): 5px; tighten to 4px then 3px as the
  container narrows.
- Product thumbnails: ~9px rounded square with a token border — not a
  badge behind an icon.
- Circular avatars, legend dots, brand badges, and stamp marks only:
  `border-radius: 50%`.

## Elevation

- Use the shared token `var(--shadow-card)` (which resolves to `--shadow-2`)
  for cards and popovers. Do not hand-roll one-off `box-shadow` values; let
  the token carry the light / dark difference.
- Resting nested cards may use `--shadow-1` and lift to `--shadow-2` on
  hover (the classification card grid on Analytics Types).
- Polar-area wedges lift with a pair of drop-shadows so they read as
  raised petals, not a flat fill. Hover deepens the shadow and adds a
  status-color glow.

## Borders — hard rule

- Containers, steps, and cards must **never** highlight only the **left
  border** or only the **bottom border** in any color (no accent left-rail
  or underline-bar treatments). Borders are uniform, tinted from
  `--primary` (`var(--border)`), or absent.
- The one Analytics Types exception is a **nested component group** under
  Metrics Highlight: a 2px tinted left rule **indents child rows**, it is
  not a card accent. Do not copy that onto a card, step, or chart chrome.

## Backgrounds — match the source module

The report inherits the look of wherever it was generated from:

- **Report background** matches the **background of the module it came from.**
- **Containers inside the report** match the **containers of that source
  module.**
- **Scorecards:** brand light blue — the chat-module tint,
  `color-mix(in srgb, var(--primary) 8–14%, transparent)`.
- **Big containers / chart cards:** white in light, `var(--surface)` in
  both themes.
- **Charts:** `var(--surface)`.
- **Chips:** the background color of the **status** they represent on the
  page they came from (reuse that page's status color, don't recolor).
- **Print / PDF:** always a plain **white** page, even if the screen is in
  dark mode.

## Status color scale (five tiers)

Every heat cell, bar, donut slice, polar wedge, distribution segment, and
legend uses the same five-tier WISE scale. Never invent a sixth hue.

| Tier | Range | Token | Ink on the fill |
| --- | --- | --- | --- |
| Excellent | 80–100 | `--chart-status-excellent` (green) | `#fff` |
| Good | 60–79 | `--chart-status-good` (`#7DC470`) | `#14532D` |
| OK | 40–59 | `--chart-status-okay` (amber) | `#5A3A00` |
| Fair | 20–39 | `--chart-status-fair` (`#D27326`) | `#fff` |
| Poor | 0–19 | `--chart-status-poor` (red) | `#fff` |

Pills reuse the semantic tokens (`--sec-green`, `--ter-amber`, `--sec-red`,
`--primary-soft`) at a tinted fill so they stay AAA-readable in both themes.

## Animations

- Numeric values animate a **count-up** on load (~1300ms), easing
  `cubic-bezier(0.22, 1, 0.36, 1)`; reuse the shared count-up helpers
  (`js/count-up-all.js` / `js/count-up.js`), not ad-hoc counters.
- Charts are **click-to-replay**: tapping a chart re-runs its entrance
  animation, including the count-up. Analytics Types wires this on every
  chart, including the performance-matrix sweep.
- Charts also play their entrance **once when they scroll into view**.
- Strip a one-shot entrance class when the animation ends so hover
  transforms can take over again.
- Always guard motion behind `@media (prefers-reduced-motion: reduce)` —
  skip the sweep or snap to the finished state.
- Print / export snaps any in-flight animation to its finished geometry
  so nothing prints at zero (`wise:finalize-charts` / `beforeprint`).

## Responsiveness

- Each chart card is its **own size container**
  (`container-type: inline-size`). Bars, rings, and labels shrink to stay
  legible three-up, two-up, or docked beside the chat — **never a viewport
  media query** for chart internals.
- The performance matrix keys off the dashboard column (`@container dash`)
  and trades horizontal scroll for graceful shrink (760 / 560 / 440).
- The six-segment processing scale wraps to two rows of three at a 640px
  container, rather than crushing six slivers.
- Classification tables flip to a responsive card grid (same rows, same
  sort). Do not invent a second table pattern.

## Chart orientation

Every chart on Analytics Types gets the same **Horizontal / Vertical**
pill. Default keeps the existing layout; the other value flips the
primary axis (or, for tables / polar / scatter / the matrix, the
already-built alternate reading). Hide the pill when printing.

## Chart types to mirror

Do not invent a new chart family. Mirror the ones Analytics Types already
ships:

1. **Processing spectrum** — six-segment scale (Shield + NOVA ladder).
2. **Claim / overview stats** — three-column big numerals with a
   debossed circular stamp icon (no rounded-square tile).
3. **Donuts** — thick rounded annular sectors, raised center disc, serif
   center numeral.
4. **Pillar / breakdown bars** — fat health pills; skinny mode moves the
   score into the row head.
5. **Polar area** — 15 equal-angle wedges, radius = score, one hue per
   pillar. (Analytics Types replaces the shared radar with this.)
6. **Ingredient / GRAS health bars.**
7. **Metrics Highlight** — stacked gut-health rows (composite + component).
8. **Flag cards.**
9. **Score distribution / segmented bars** — the stacked composition
   strip (`.dash-seg` / `.dash-seg-piece` / `.dash-seg-tags` / `.dash-dot`).
10. **Scatter** (“Where to focus”).
11. **Performance matrix** — SKU × metric heat grid; cell color is status.
12. **Sortable classification tables** (+ matching card view).
13. **Pour-into-bar funnels** (ingredient path, then product-claim path).
    Vertical and horizontal are first-class layouts, not a CSS rotate.
14. **GRAS conversion funnel** — a different chart type from the pour-into-bar.

## Scorecards

- **No eyebrow**, even when there is no status or count.
- Numeric values **count up**.
- Stamp marks are **circular** and tone-on-tone (`.dash-stamp-icon`).
  Never sit an icon on a rounded-square badge.
- Serif for the hero numeral.

## Tooltips and popovers

- Chart hover cards match the shared donut tip: `var(--surface)`, ~12px
  radius, `var(--shadow-card)`, type at or above the 12px floor.
- Anchor **above** or **to the right** of the trigger — never directly
  below (see the scorecard-and-popover rule).
- The five-tier status popover stays hidden until its term is hovered or
  focused.
- Text must be legible in both light and dark mode.

## Print / PDF

Rules taken from the Analytics Types print sheet:

- Unlock height and overflow so the report **flows onto paper**.
- `print-color-adjust: exact` so charts and heat cells print as seen.
- Always print on **white**, even in dark mode.
- Scale the roomy desktop layout to US Letter (Analytics Types uses
  `zoom: 0.7`), not the collapsed narrow layout.
- Hide interactive chrome (export, toasts, tips, orientation pills).
- **Do not** force whole cards onto one page — that leaves empty gaps.
  Let big containers break; protect **atomic** pieces (one chart graphic,
  a legend, one bar / row) with `break-inside: avoid`.
- Never orphan a heading at the bottom of a page from its chart.
- `@page { size: 8.5in 11in; margin: 14mm; }`

## Dark mode

- Every chart / report must work in both light and dark mode. Use the
  theme tokens (`--surface`, `--primary`, `--border`, `--shadow-card`,
  `--chart-status-*`) so both themes are covered; never ship a light-only
  value.
- Theme is **global** (`wise-theme` / `chat-theme` plus the `dark` class
  on `<html>`). Do not add a per-page theme toggle.

## Icons

- **No rounded-square backgrounds** behind icons.
- A fully circular disc is allowed (processing-scale mark, brand badge,
  stamp).
- A **primary** (solid brand-blue) button uses the **filled** icon twin
  (`FILL` 1). Ghost / outline controls stay outlined.

## When in doubt

Open `pages/analytics-types.html`, find the equivalent chart / scorecard /
report element, and mirror its markup, tokens, and animation hooks
exactly. Then keep this file in lockstep with that page.
