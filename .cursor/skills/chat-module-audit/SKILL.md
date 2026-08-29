---
name: chat-module-audit
description: Audit every chat module in the app for feature parity with wiseai.html (three-dots, What-can-I-ask, intent chips, streaming, helix, unlocked composer, sticky history). Use when chat features have drifted or after changing shared chat code.
---

# Chat Module Audit

Enforce the `chat-module-parity` rule across every page that renders a chat
module. `pages/wiseai.html` is the reference.

## Find the chat surfaces

Search for the shared chat module usage across pages:

- `js/wiseai-chat.js`, `js/wiseai-dock.js`, `js/chat-*.js`
- Pages that include a chat module (e.g. `wiseai.html`, `add-product.html`,
  `ai-dashboard.html`, `gras-verification.html`, and other `pages/*.html`).

## Parity checklist (per page)

- [ ] Three-dot menu opens the sticky history module (no sticky on/off toggle); History starts collapsed to the icon rail
- [ ] "What can I ask?" panel opens in-window and breaks out; headline is serif
- [ ] Intent chips: clickable, actionable, each opens a real transcript
- [ ] Intent chips have no tooltip (no hover card, no native title, no data-tip)
- [ ] Intent chip icon is brand blue (gold only on What can I ask?); right-side label animates
- [ ] Every transcript / answer ends on related intent chips (never a dead end)
- [ ] Streaming paragraph-by-paragraph (then thumbs row, then intent chips)
- [ ] Helix matches wiseai.html (published Scene pose; no per-page defaults)
- [ ] Composer unlocked (no lock icon / readonly); typing a chip word plays that transcript
- [ ] Right-hand module actions reflected in the chat

## Procedure

1. Enumerate all pages with a chat module.
2. For each, verify the checklist against wiseai.html.
3. Produce a per-page pass/fail table listing exactly what's missing/broken.
4. Fix each failing page by matching the shared implementation from
   wiseai.html — never fork a bespoke variant.
5. Run the `visual-verify` skill on a representative sample (light + dark).
