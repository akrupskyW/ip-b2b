---
name: visual-verify
description: Screenshot a WISE page in both light and dark mode via headless Chrome to verify UI changes. Use after any visual edit to confirm layout, count-up animations, and dark-mode parity before reporting done.
---

# Visual Verify

Capture real screenshots of a page so UI changes can be confirmed visually,
in both themes, with animations settled. Always embed the resulting images in
the reply.

## Tooling in this repo

- `screenshots/_shoot.py` — Playwright driver. Forces auth via localStorage,
  scrolls to trigger lazy content, grows the viewport so nothing is cut off,
  and writes full-page PNGs to `screenshots/<page>__<...>.png`. Takes optional
  page-name filters as args (e.g. `add-product`).
- `scripts/cdp_shot.py` — dependency-free Chrome DevTools driver. Waits real
  wall-clock time so count-up animations settle; good for interaction flows.

Theme is controlled by the `wise-theme` and `chat-theme` localStorage keys plus
the `dark` class on `<html>`.

## Procedure

1. Start a static server if one isn't already running (check the terminals
   folder first). Match the port the script expects (e.g. `python3 -m http.server 8099`
   for `_shoot.py`, or `8765` for `cdp_shot.py`).
2. **Light mode:** run the screenshot script for the target page(s).
3. **Dark mode:** repeat with dark forced — set `wise-theme`/`chat-theme` to
   `dark` and add the `dark` class in the init script (mirror the existing
   `FORCE_LIGHT` block but for dark), then re-shoot.
4. Allow animations to settle (the scripts already wait; for count-ups give
   real time before capturing).
5. Embed both light and dark screenshots in the reply using
   `![alt](absolute/path.png)` and call out any issues.
6. Compare structure against `pages/wiseai.html` for parity.

## Definition of done

Both light and dark screenshots captured, embedded, and free of layout,
dark-mode, or animation regressions.
