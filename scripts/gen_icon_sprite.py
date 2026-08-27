#!/usr/bin/env python3
"""Generate js/icon-svg-sprite.js — the app-wide SVG icon set.

Companion to scripts/gen_icon_svgs.py (which serves the Icon Inventory's
three-variant preview). This one serves the *whole app*: js/icon-svg-shim.js
swaps every Material Symbols <span> for a <use> of this sprite, so the app stops
depending on fonts.googleapis.com to draw its icons.

Output is a real SVG sprite (assets/icons/wise-icons.svg) rather than a JS blob:
one HTTP request that the browser caches once for all 51 pages, and no 600 KB of
JavaScript to parse on every navigation.

Look: Rounded, at the weight set by WEIGHT below.
  base   @material-symbols/svg-<WEIGHT>/rounded/<name>.svg
  filled @material-symbols/svg-<WEIGHT>/rounded/<name>-fill.svg
         (used where CSS asks for font-variation-settings 'FILL' 1)

Weight is the one knob worth turning here: rounded terminals are the look, the
stroke is a taste call. 300 read too thin at the app's usual 18-20px, so this
ships 400. The packages exist at 100..700 in steps of 100 — change WEIGHT, run
`npm install --save-dev @material-symbols/svg-<n>`, and regenerate.

WEIGHT_OVERRIDES bumps individual glyphs whose shape reads lighter than its
nominal weight — see the comment on that constant.

29 of the 429 glyph names in the app are legacy *Material Icons* names —
expand_more, star_border, delete_outline, warning_amber, auto_awesome … They
still resolve as ligatures in the Symbols variable font, but the Symbols SVG
export renamed them (expand_more -> keyboard_arrow_down). Those fall back to
the classic set, and are flagged so the inventory can say so:
  base   @material-icons/svg/svg/<name>/round.svg
  filled @material-icons/svg/svg/<name>/baseline.svg

Name collection scans every .html and .js in the repo for the ways an icon name
reaches the DOM: a literal inside a material-symbols span, an `icon:` /
`glyph:` / `iconName:` data field, an `icon=` assignment, a data-icon
attribute. Template slots (`>${ic.icon}<`) are covered because the names they
interpolate live in those data fields. Anything still missed degrades to the
webfont glyph, and the shim reports it on window.WISE_ICON_MISSES.

Regenerate with:
  python3 scripts/gen_icon_sprite.py
"""
import json
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_SVG = os.path.join(ROOT, "assets", "icons", "wise-icons.svg")
OUT_META = os.path.join(ROOT, "assets", "icons", "wise-icons.meta.json")

NM = os.path.join(ROOT, "node_modules")
# Stroke weight for the app-wide icon set. 100..700 in steps of 100, each its
# own package (@material-symbols/svg-<WEIGHT>). Rounded is the style.
WEIGHT = 400

# Per-glyph weight overrides. Nominal weight is not perceived weight: how heavy
# a glyph reads depends on how much ink it puts on the grid. more_vert is three
# dots stacked in a column — far less ink than more_horiz's three in a row at the
# same weight — so at 400 it reads noticeably lighter than everything beside it.
# 600 is the first step that clearly outweighs more_horiz without going blobby
# at 16px.
#
# Each weight named here needs its own package:
#   npm install --save-dev @material-symbols/svg-<weight>
WEIGHT_OVERRIDES = {
    "more_vert": 600,
}

SYM = os.path.join(NM, "@material-symbols", f"svg-{WEIGHT}", "rounded")
LEG = os.path.join(NM, "@material-icons", "svg", "svg")


def sym_dir(name):
    """The rounded-SVG directory for one glyph, honouring WEIGHT_OVERRIDES."""
    w = WEIGHT_OVERRIDES.get(name, WEIGHT)
    return SYM if w == WEIGHT else os.path.join(
        NM, "@material-symbols", f"svg-{w}", "rounded")

DEFAULT_VIEWBOX = "0 -960 960 960"

SKIP_DIRS = {
    "node_modules", ".git", "screenshots", "assets", "__pycache__",
    "_to_delete", "_WISEdesigns", "server",
}
SKIP_FILES = {"icon-svg-data.js", "icon-svg-shim.js"}

NAME = r"([a-z][a-z0-9_]{1,40})"

# Every shape an icon name takes in this repo, split by how confident the match
# is. STRONG patterns can only match an icon, so a STRONG name that resolves to
# no glyph is a real problem and gets reported. WEAK patterns (tuple tails,
# ICONS map bodies) also sweep up ordinary strings; they are tried against the
# packages and silently dropped when they are not glyphs.
STRONG = [
    # a literal inside a material-symbols span
    re.compile(r'class="[^"]*material-symbols[^"]*"[^>]*>\s*' + NAME + r"\s*<"),
    # any *icon*-ish or *glyph*-ish key: icon:, noteIcon:, iconName:, glyph: …
    # but not iconTone / iconColor / iconClass / iconSize, which hold styling
    # values rather than glyph names.
    re.compile(r"""[A-Za-z_]*[Ii]con(?!Tone|Colo|Class|Size|Style)[A-Za-z_]*\s*[:=]\s*['"`]"""
               + NAME + r"""['"`]"""),
    re.compile(r"""[A-Za-z_]*[Gg]lyph[A-Za-z_]*\s*[:=]\s*['"`]""" + NAME + r"""['"`]"""),
    re.compile(r'data-icon="' + NAME + r'"'),
]
WEAK = [
    # tuple / array tails: ['.sc-bganim-spin', 'rotate_right']
    re.compile(r""",\s*['"`]""" + NAME + r"""['"`]\s*[\]\)]"""),
]
# Map bodies keyed by tier or state: SC_WIDTH_ICONS = { wide: 'view_week', … }
ICON_MAP = re.compile(r"""[A-Za-z_]*ICONS[A-Za-z_]*\s*=\s*[\[{]([^\]}]{0,600})[\]}]""")
QUOTED = re.compile(r"""['"`]([a-z][a-z0-9_]{1,40})['"`]""")

EXTRAS_FILE = os.path.join(ROOT, "scripts", "icon-extras.txt")

VIEWBOX_RE = re.compile(r'viewBox="([^"]+)"')
BODY_RE = re.compile(r"<svg[^>]*>(.*)</svg>\s*$", re.S)


def scan_names():
    """Every candidate glyph name the repo mentions.

    -> (strong, weak): two sets. A strong name that resolves to no glyph is
    reported; a weak one is dropped quietly.
    """
    strong, weak = set(), set()
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in filenames:
            if not fname.endswith((".html", ".js")) or fname in SKIP_FILES:
                continue
            try:
                src = open(os.path.join(dirpath, fname), encoding="utf-8").read()
            except (OSError, UnicodeDecodeError):
                continue
            for pat in STRONG:
                strong.update(m.group(1) for m in pat.finditer(src))
            for pat in WEAK:
                weak.update(m.group(1) for m in pat.finditer(src))
            for m in ICON_MAP.finditer(src):
                weak.update(q.group(1) for q in QUOTED.finditer(m.group(1)))

    # Names no static pattern can see, because the name is computed. Harvested
    # from the runtime sweep: load a page and js/icon-svg-shim.js warns with
    # every name that had no SVG twin (also on window.WISE_ICONS.misses).
    if os.path.isfile(EXTRAS_FILE):
        for line in open(EXTRAS_FILE, encoding="utf-8"):
            line = line.split("#", 1)[0].strip()
            if line:
                strong.add(line)

    return strong, weak - strong


def read_svg(path):
    if not os.path.isfile(path):
        return None
    raw = open(path, encoding="utf-8").read()
    vb = VIEWBOX_RE.search(raw)
    body = BODY_RE.search(raw)
    if not vb or not body:
        return None
    inner = re.sub(r"\s+", " ", body.group(1)).strip()
    inner = re.sub(r'<(?:path|rect)[^>]*fill="none"[^>]*/>', "", inner).strip()
    if not inner:
        return None
    return vb.group(1), inner


def main():
    sources = [(SYM, f"@material-symbols/svg-{WEIGHT}"), (LEG, "@material-icons/svg")]
    for w in sorted(set(WEIGHT_OVERRIDES.values()) - {WEIGHT}):
        sources.append((os.path.join(NM, "@material-symbols", f"svg-{w}", "rounded"),
                        f"@material-symbols/svg-{w}"))
    for pkg, hint in sources:
        if not os.path.isdir(pkg):
            sys.exit(f"missing {hint} — run:\n  npm install --save-dev {hint}")

    strong, weak = scan_names()
    icons = {}
    legacy = []
    unresolved = []

    for name in sorted(strong | weak):
        d = sym_dir(name)
        base = read_svg(os.path.join(d, f"{name}.svg"))
        fill = read_svg(os.path.join(d, f"{name}-fill.svg"))
        is_legacy = False
        if not base:
            base = read_svg(os.path.join(LEG, name, "round.svg"))
            fill = read_svg(os.path.join(LEG, name, "baseline.svg"))
            is_legacy = bool(base)
        if not base:
            if name in strong:
                unresolved.append(name)
            continue

        vb, body = base
        entry = {"b": body}
        if fill and fill[1] != body:
            entry["f"] = fill[1]
        if vb != DEFAULT_VIEWBOX:
            entry["vb"] = vb
        if is_legacy:
            entry["l"] = 1
            legacy.append(name)
        elif name in WEIGHT_OVERRIDES:
            entry["w"] = WEIGHT_OVERRIDES[name]
        icons[name] = entry

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    parts = [
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        "<!-- AUTO-GENERATED by scripts/gen_icon_sprite.py - do not edit by hand.",
        f"     {len(icons)} glyphs as Material Symbols Rounded {WEIGHT}, from Google's own",
        f"     SVG exports: @material-symbols/svg-{WEIGHT}/rounded, with @material-icons/svg",
        f"     covering the {len(legacy)} legacy names the Symbols export renamed. Apache-2.0.",
        f"     Generated {stamp}. Consumed by js/icon-svg-shim.js. -->",
        f'<svg xmlns="http://www.w3.org/2000/svg" style="display:none" '
        f'data-wise-icons="{len(icons)}" data-generated="{stamp}">',
    ]
    for name in sorted(icons):
        e = icons[name]
        vb = e.get("vb", DEFAULT_VIEWBOX)
        parts.append(f'<symbol id="wi-{name}" viewBox="{vb}">{e["b"]}</symbol>')
        if "f" in e:
            parts.append(f'<symbol id="wi-{name}-f" viewBox="{vb}">{e["f"]}</symbol>')
    parts.append("</svg>")

    os.makedirs(os.path.dirname(OUT_SVG), exist_ok=True)
    with open(OUT_SVG, "w", encoding="utf-8") as fh:
        fh.write("\n".join(parts) + "\n")

    # A tiny sidecar so the build is inspectable without parsing the sprite.
    meta = {
        "generatedAt": stamp,
        "style": f"Material Symbols Rounded, weight {WEIGHT}",
        "weight": WEIGHT,
        "weightOverrides": WEIGHT_OVERRIDES,
        "sources": {
            "symbols": f"@material-symbols/svg-{WEIGHT}/rounded \u2014 mirror of "
            "google/material-design-icons (Apache-2.0)",
            "legacy": "@material-icons/svg \u2014 classic Material Icons, for the "
            "glyph names the Symbols SVG export renamed (Apache-2.0)",
        },
        "count": len(icons),
        "fillTwins": sum(1 for v in icons.values() if "f" in v),
        "legacyCount": len(legacy),
        "legacy": legacy,
        "unresolved": unresolved,
        "names": sorted(icons),
    }
    with open(OUT_META, "w", encoding="utf-8") as fh:
        json.dump(meta, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    size = os.path.getsize(OUT_SVG)
    print(f"wrote {os.path.relpath(OUT_SVG, ROOT)} \u2014 {len(icons)} symbols "
          f"+ {meta['fillTwins']} fill twins, {size / 1024:.0f} KB")
    print(f"  also {os.path.relpath(OUT_META, ROOT)}")
    print(f"  scanned {len(strong)} strong + {len(weak)} weak candidate names \u00b7 legacy-sourced: {len(legacy)}")
    if legacy:
        print(f"  legacy: {', '.join(legacy)}")
    if unresolved:
        print(f"  UNRESOLVED ({len(unresolved)}) \u2014 these keep the webfont glyph: "
              f"{', '.join(unresolved)}")


if __name__ == "__main__":
    main()
