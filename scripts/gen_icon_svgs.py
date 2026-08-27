#!/usr/bin/env python3
"""Generate js/icon-svg-data.js — the SVG twin of the icon font.

The app paints every glyph with the Material Symbols *variable font* served from
fonts.googleapis.com. The Icon Inventory's Font/SVG toggle needs those same
glyphs as real vector geometry, so this script lifts the path data straight out
of Google's own published SVG exports and writes one lazy-loaded ES module.

Sources (devDependencies — build-time only, nothing new ships to the page):

  @material-symbols/svg-400   Material Symbols at wght 400, outlined/rounded/
  @material-symbols/svg-300   sharp, FILL 0 and FILL 1. Auto-generated mirrors
                              of google/material-design-icons (Apache-2.0), so
                              the geometry is what the variable font renders.

  @material-icons/svg         The classic Material Icons set (also Google,
                              Apache-2.0). Used only as a fallback: 28 of the
                              397 glyphs in the app are legacy Material Icons
                              names (expand_more, star_border, delete_outline,
                              warning_amber, …) that still resolve as ligatures
                              in the Symbols font but were renamed in the
                              Symbols SVG export. Those come from here, and are
                              flagged `legacy` so the inventory can say so.

Variant mapping onto the inventory's existing style buttons:

  style      Material Symbols                        Material Icons (legacy)
  --------   -------------------------------------   -----------------------
  outlined   svg-400/outlined/<name>.svg             svg/<name>/outline.svg
  filled     svg-400/outlined/<name>-fill.svg        svg/<name>/baseline.svg
  light      svg-300/rounded/<name>.svg              svg/<name>/round.svg

Regenerate with:
  python3 scripts/gen_icon_svgs.py
"""
import json
import os
import re
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INVENTORY_JS = os.path.join(ROOT, "js", "icon-inventory-data.js")
OUT_JS = os.path.join(ROOT, "js", "icon-svg-data.js")

NM = os.path.join(ROOT, "node_modules")
PKG_400 = os.path.join(NM, "@material-symbols", "svg-400")
PKG_300 = os.path.join(NM, "@material-symbols", "svg-300")
PKG_LEGACY = os.path.join(NM, "@material-icons", "svg", "svg")

# The viewBox the vast majority of glyphs share; only outliers are stored.
DEFAULT_VIEWBOX = "0 -960 960 960"

# style key -> path template, in preference order per source.
SYMBOLS_VARIANTS = {
    "outlined": os.path.join(PKG_400, "outlined", "{name}.svg"),
    "filled": os.path.join(PKG_400, "outlined", "{name}-fill.svg"),
    "light": os.path.join(PKG_300, "rounded", "{name}.svg"),
}
LEGACY_VARIANTS = {
    "outlined": os.path.join(PKG_LEGACY, "{name}", "outline.svg"),
    "filled": os.path.join(PKG_LEGACY, "{name}", "baseline.svg"),
    "light": os.path.join(PKG_LEGACY, "{name}", "round.svg"),
}

VIEWBOX_RE = re.compile(r'viewBox="([^"]+)"')
BODY_RE = re.compile(r"<svg[^>]*>(.*)</svg>\s*$", re.S)


def inventory_names():
    """Pull the icon-name list out of the generated inventory module."""
    src = open(INVENTORY_JS, encoding="utf-8").read()
    blob = src[src.index("{") : src.rindex("}") + 1]
    data = json.loads(blob)
    return [ic["name"] for ic in data.get("icons", [])], data.get("generatedAt", "")


def read_svg(path):
    """-> (viewBox, inner geometry) or None. The <svg> wrapper is dropped: the
    page supplies width, height and fill, so only viewBox + paths matter."""
    if not os.path.isfile(path):
        return None
    raw = open(path, encoding="utf-8").read()
    vb = VIEWBOX_RE.search(raw)
    body = BODY_RE.search(raw)
    if not vb or not body:
        return None
    inner = re.sub(r"\s+", " ", body.group(1)).strip()
    # Drop the no-op rects some exports carry as a bounding box.
    inner = re.sub(r'<(?:path|rect)[^>]*fill="none"[^>]*/>', "", inner).strip()
    if not inner:
        return None
    return vb.group(1), inner


def read_set(templates, name):
    """Read all three styles for one icon from one source set."""
    out = {}
    for style, tpl in templates.items():
        got = read_svg(tpl.format(name=name))
        if got:
            out[style] = got
    return out if out.get("outlined") else {}


def main():
    for pkg, hint in (
        (PKG_400, "@material-symbols/svg-400"),
        (PKG_300, "@material-symbols/svg-300"),
        (PKG_LEGACY, "@material-icons/svg"),
    ):
        if not os.path.isdir(pkg):
            sys.exit(
                f"missing {hint} — run:\n  npm install --save-dev "
                "@material-symbols/svg-400 @material-symbols/svg-300 @material-icons/svg"
            )

    names, inv_stamp = inventory_names()
    icons = {}
    missing = []
    legacy = []

    for name in names:
        found = read_set(SYMBOLS_VARIANTS, name)
        is_legacy = False
        if not found:
            found = read_set(LEGACY_VARIANTS, name)
            is_legacy = bool(found)
        if not found:
            missing.append(name)
            continue

        entry = {}
        base_vb, base_body = found["outlined"]
        entry["outlined"] = base_body
        for style in ("filled", "light"):
            if style not in found:
                continue
            vb, body = found[style]
            # Collapse variants identical to outlined — the renderer falls back,
            # and it keeps the module a lot smaller.
            if body != base_body or vb != base_vb:
                entry[style] = body
        if base_vb != DEFAULT_VIEWBOX:
            entry["viewBox"] = base_vb
        if is_legacy:
            entry["legacy"] = True
            legacy.append(name)
        icons[name] = entry

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = {
        "generatedAt": stamp,
        "fromInventory": inv_stamp,
        "defaultViewBox": DEFAULT_VIEWBOX,
        "sources": {
            "symbols": "@material-symbols/svg-400 + svg-300 — mirrors of "
            "google/material-design-icons variable font (Apache-2.0)",
            "legacy": "@material-icons/svg — classic Material Icons, for glyph "
            "names the Symbols SVG export renamed (Apache-2.0)",
        },
        "variants": {
            "outlined": "wght 400, FILL 0 (Symbols outlined) / outline (Icons)",
            "filled": "wght 400, FILL 1 (Symbols outlined -fill) / baseline (Icons)",
            "light": "wght 300, FILL 0, rounded (Symbols rounded) / round (Icons)",
        },
        "count": len(icons),
        "legacyCount": len(legacy),
        "legacy": legacy,
        "missing": missing,
        "icons": icons,
    }

    header = f"""/* AUTO-GENERATED by scripts/gen_icon_svgs.py — do not edit by hand.
 * Vector twins of the {len(icons)} Material Symbols glyphs in the Icon Inventory,
 * lifted from Google's own SVG exports: @material-symbols/svg-400 and svg-300
 * (mirrors of google/material-design-icons), with @material-icons/svg covering
 * the {len(legacy)} legacy glyph names the Symbols export renamed. Both Apache-2.0.
 *
 * Each entry holds only the inner geometry; the page supplies size and color.
 * `filled` / `light` are omitted when identical to `outlined`, and `viewBox`
 * only when it differs from defaultViewBox — so the renderer falls back.
 *
 * Imported dynamically: the Icon Inventory pays for this module only when
 * someone flips the Font/SVG toggle to SVG.
 *
 * Regenerate with:
 *   python3 scripts/gen_icon_svgs.py
 */
export const ICON_SVGS = """

    with open(OUT_JS, "w", encoding="utf-8") as fh:
        fh.write(header)
        json.dump(payload, fh, indent=2, ensure_ascii=False)
        fh.write(";\n")

    size = os.path.getsize(OUT_JS)
    fills = sum(1 for v in icons.values() if "filled" in v)
    lights = sum(1 for v in icons.values() if "light" in v)
    print(f"wrote {os.path.relpath(OUT_JS, ROOT)} — {len(icons)}/{len(names)} icons, {size / 1024:.0f} KB")
    print(f"  distinct filled: {fills} · distinct light: {lights} · legacy-sourced: {len(legacy)}")
    if legacy:
        print(f"  legacy Material Icons names: {', '.join(legacy)}")
    if missing:
        print(f"  MISSING ({len(missing)}): {', '.join(missing)}")


if __name__ == "__main__":
    main()
