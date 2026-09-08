"""Give every app page the same Tailwind Play CDN + config.

The app pages were split: product-comparison.html loaded the Tailwind CDN and
the other 41 did not, while two of them still used Tailwind utility classes in
markup. This makes the CDN set identical across pages/.

The snippet is inserted right after the shared `wise.css` link so page CSS still
wins the cascade, and is skipped on any page that already has it.

  python3 scripts/_tw_rollout.py            # every page in pages/
  python3 scripts/_tw_rollout.py a b c      # only these page stems
  python3 scripts/_tw_rollout.py --revert   # take it back out again
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANCHOR = '<link rel="stylesheet" href="wise.css" />'

# preflight stays OFF: it is a global reset, and 41 of these pages were built
# against wise.css without it. Utilities only, so the CDN adds classes and
# changes nothing that already renders.
SNIPPET = """
  <!-- Tailwind — same CDN + config on every app page (see also index.html and
       the marketing-*.html set). preflight is off: these pages are styled by
       wise.css, so Tailwind supplies utilities only and resets nothing. -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      corePlugins: { preflight: false },
      theme: {
        extend: {
          fontFamily: { sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'] },
          colors: {
            oyster: { 100: '#E2EEF7', 300: '#C5CFD7', 400: '#C5CFD7', 500: '#C5CFD7', 600: '#C5CFD7', 700: '#1A2339', 800: '#1A2339' },
          },
        },
      },
    };
  </script>"""

# The old hand-rolled tag + config block on product-comparison.html, so it ends
# up with the one shared snippet instead of a second copy.
OLD_BLOCK = re.compile(
    r'\n[ \t]*<script src="https://cdn\.tailwindcss\.com"></script>'
    r'(?:\s*<script>\s*tailwind\.config\s*=\s*\{.*?\};?\s*</script>)?',
    re.S)

revert = "--revert" in sys.argv
stems = [a for a in sys.argv[1:] if not a.startswith("--")]

files = sorted(glob.glob(os.path.join(ROOT, "pages", "*.html")))
if stems:
    files = [f for f in files
             if os.path.basename(f)[:-5] in stems]

for path in files:
    name = os.path.basename(path)
    src = open(path, encoding="utf-8").read()
    had = "cdn.tailwindcss.com" in src

    if revert:
        if not had:
            print("  %-34s no tailwind" % name)
            continue
        out = OLD_BLOCK.sub("", src, count=1)
        out = re.sub(r'\n[ \t]*<!-- Tailwind — same CDN \+ config.*?-->', "", out, flags=re.S)
        open(path, "w", encoding="utf-8").write(out)
        print("  %-34s reverted" % name)
        continue

    if ANCHOR not in src:
        print("  %-34s SKIP (no wise.css anchor)" % name)
        continue

    if had:
        # Replace whatever it has with the shared snippet so all pages match.
        src = OLD_BLOCK.sub("", src, count=1)

    out = src.replace(ANCHOR, ANCHOR + SNIPPET, 1)
    open(path, "w", encoding="utf-8").write(out)
    print("  %-34s %s" % (name, "normalised" if had else "added"))
