---
description: All charts and reports follow the analytics-types.html design language
globs:
alwaysApply: true
---

# Chart & Report Design

`pages/analytics-types.html` is the single source of truth for the visual
design of **any chart, graph, scorecard, or report** in the app. When you
generate or edit one, mirror its animations, corner radii, elevations, colors,
headlines, and headers. Never invent a new chart/report look.

## Typography

- **Headlines (H1 / H2 / H3):** brand **serif** (`--module-title-family`,
  `'WISE Digits', 'Noto Serif'`). This includes report titles, section titles,
  and card titles.
- **All numbers** (stats, axis ticks, scores, counts, percentages) use the
  **mono** face — reuse the `.ws-count` utility / the
  `var(--font-mono)` stack (DM Mono with a system fallback) with
  `font-variant-numeric: tabular-nums`.
- **No eyebrows.** Never place an eyebrow / kicker label above any headline.

## Corner radii

- Big containers / cards: `var(--r-md, 16px)`.
- Charts and popovers: ~12px.
- Chips / pills: `var(--radius-pill, 9999px)`.
- Tiny cells (matrix, heatmap): 4–5px.
- Circular avatars / dots only: `border-radius: 50%`.

## Elevation

- Use the shared token `var(--shadow-card)` (which resolves to `--shadow-2`)
  for cards and popovers. Do not hand-roll one-off `box-shadow` values; let the
  token carry the light / dark difference.

## Borders — hard rule

- Containers, steps, and cards must **never** highlight only the **left border**
  or only the **bottom border** in any color (no accent left-rail or
  underline-bar treatments). Borders are uniform, tinted from `--primary`
  (`var(--border)`), or absent.

## Backgrounds — match the source module

The report inherits the look of wherever it was generated from:

- **Report background** matches the **background of the module it came from.**
- **Containers inside the report** match the **containers of that source
  module.**
- **Scorecards:** brand light blue — the chat-module tint,
  `color-mix(in srgb, var(--primary) 8–14%, transparent)`.
- **Big containers:** white (`var(--surface)`).
- **Charts:** white (`var(--surface)`).
- **Chips:** the background color of the **status** they represent on the page
  they came from (reuse that page's status color, don't recolor).

## Animations

- Numeric values animate a **count-up** on load (~1300ms), easing
  `cubic-bezier(0.22, 1, 0.36, 1)`; reuse the shared count-up helpers
  (`js/count-up-all.js` / `js/count-up.js`), not ad-hoc counters.
- Charts are **click-to-replay**: tapping a chart re-runs its entrance
  animation, including the count-up (matches analytics-types.html).
- Always guard motion behind `@media (prefers-reduced-motion: reduce)`.

## Dark mode

- Every chart / report must work in both light and dark mode. Use the theme
  tokens (`--surface`, `--primary`, `--border`, `--shadow-card`) so both themes
  are covered; never ship a light-only value.

## When in doubt

Open `pages/analytics-types.html`, find the equivalent chart / scorecard /
report element, and mirror its markup, tokens, and animation hooks exactly.
