---
name: chat-module-audit
description: Audit every chat module in the app for feature parity with wiseai.html (three-dots, What-can-I-ask, intent chips, streaming, helix, lock icon, sticky history). Use when chat features have drifted or after changing shared chat code.
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

- [ ] Three-dot menu opens the sticky history module (no sticky on/off toggle)
- [ ] "What can I ask?" panel opens in-window and breaks out; headline is serif
- [ ] Intent chips: clickable, actionable, each opens a real transcript
- [ ] Intent chip icon is gold; right-side label animates
- [ ] Streaming word-by-word output (not the old pulsating dots)
- [ ] Helix animation ON by default at 20% opacity
- [ ] Lock icon left of the input placeholder with hover popover (light + dark)
- [ ] Right-hand module actions reflected in the chat

## Procedure

1. Enumerate all pages with a chat module.
2. For each, verify the checklist against wiseai.html.
3. Produce a per-page pass/fail table listing exactly what's missing/broken.
4. Fix each failing page by matching the shared implementation from
   wiseai.html — never fork a bespoke variant.
5. Run the `visual-verify` skill on a representative sample (light + dark).
