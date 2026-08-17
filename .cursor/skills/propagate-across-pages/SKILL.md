---
name: propagate-across-pages
description: Apply one UI change consistently across all matching pages or modules. Use for any "do this everywhere / across all pages / every chat module" request so nothing is missed and every page ends up identical.
---

# Propagate Across Pages

Many requests are "make this change everywhere." This skill ensures the change
lands on every affected page identically, with none skipped.

## Procedure

1. **Find the canonical implementation.** Usually `pages/wiseai.html` or a
   shared module in `js/`. Confirm the exact target state there first.
2. **Enumerate affected files.** Glob `pages/*.html`, the marketing pages, and
   the relevant `js/*.js` modules. If the behavior is shared code, prefer
   editing the shared module once over editing each page.
3. **Apply identically.** Make the same change on each target. Note which files
   already had it (so the diff is honest) and which needed it.
4. **Handle edge cases explicitly.** If a page legitimately differs, call it out
   rather than silently skipping.
5. **Verify.** Run the `visual-verify` skill (light + dark) on a representative
   sample, including wiseai.html and the pages most likely to break.
6. **Report** a short table: file → changed / already-correct / N/A.

## Notes

- Prefer shared-module edits so future pages inherit the change automatically.
- Respect the always-on rules (canonical structure, chat parity, serif
  headlines, count-up, dark-mode parity, scorecard/popover conventions).
