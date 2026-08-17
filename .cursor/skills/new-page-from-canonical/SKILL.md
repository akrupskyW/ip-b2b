---
name: new-page-from-canonical
description: Scaffold a new WISE page by cloning wiseai.html's nav, shell, and module structure. Use whenever creating a brand-new page so it inherits the correct navigation, spacing, serif headlines, dark-mode support, and count-up hooks.
---

# New Page From Canonical

`pages/wiseai.html` is the canonical page shell. Never build a new page from
scratch — start from it so nav/spacing/modules are correct by construction.

## Procedure

1. Read `pages/wiseai.html` and identify: the head includes, the primary
   navigation / shell, the module container markup, and the script includes
   (`js/agent-menu.js`, `js/topbar.js`, `js/appearance-menu.js`,
   `js/count-up-all.js`, chat modules, etc.).
2. Copy that structure into the new `pages/<name>.html`, keeping:
   - primary navigation + shell exactly as-is
   - module container markup, padding, and margins
   - serif headline styles
   - dark-mode support (no per-page theme toggle)
   - count-up hooks for any numeric scorecards
   - the shared chat module if the page has chat (see `chat-module-parity`)
3. Strip only wiseai-specific content and drop in the new page's content.
4. If the page should appear in navigation, register it where the nav is
   defined (e.g. `WISE_APP_NAV` / `WISE_ACCOUNT_NAV` in `js/agent-menu.js`) and
   add it to `screenshots/_shoot.py` PAGES if it's part of the real flow.
5. Run the `visual-verify` skill (light + dark) and compare against wiseai.html.

## Definition of done

New page matches wiseai.html's nav/spacing/modules, has serif headlines,
works in dark mode, animates any numbers, and passes visual-verify.
