#!/usr/bin/env python3
"""
Remap all chromatic hex colors in the app to the official brand palette.

Strategy
--------
- The brand swatches are the ONLY allowed chromatic colors.
- The existing near-neutral UI ramp (light off-whites / inks, dark navy
  surfaces, white, black, shadow alphas) is treated as the structural canvas
  and is preserved so visual hierarchy + AAA contrast survive.
- Every other (chromatic) solid hex is snapped to its nearest brand swatch
  in CIELAB, with a few explicit overrides so hue families never go wrong.
- The legacy `--primary` rgb triplet used inside rgba() tints is rebased to
  the brand blue so soft tints stay consistent.

Run with --apply to write changes; without it, prints the full mapping.
"""
import re
import sys
import glob
import os

# ----------------------------------------------------------------------------
# Brand palette (the only allowed chromatic outputs)
# ----------------------------------------------------------------------------
BRAND = {
    # Blue
    "blue-100": "#C5CFD7", "blue-200": "#8B9FAF", "blue-300": "#687896",
    "blue-400": "#25507C", "blue-500": "#1A2339",
    # Warm / gold
    "warm-100": "#FBF6ED", "warm-200": "#E9DABF", "warm-300": "#D7BE91",
    "warm-400": "#C28E34", "warm-500": "#A16908",
    # Green
    "green-100": "#B6C9BE", "green-200": "#6D947C", "green-300": "#245E3B",
    "green-400": "#274332", "green-500": "#1B2D22",
    # Status
    "info-100": "#E2EEF7",
    "exc-100": "#E2F3E9", "exc-200": "#32A966",
    "ok-100": "#FFF5DD", "ok-200": "#FFC434", "ok-300": "#6F5517",
    "warn-100": "#FFEEE2", "warn-200": "#D27326", "warn-300": "#75360A",
    "poor-100": "#FFE1DC", "poor-200": "#DC3038", "poor-300": "#831F23",
    "poor-400": "#4D1007", "poor-500": "#531114",
}
BRAND_HEXES = {v.upper() for v in BRAND.values()}

# ----------------------------------------------------------------------------
# Neutral structural ramp to KEEP as-is (light + dark surfaces / ink / lines)
# ----------------------------------------------------------------------------
KEEP = {h.upper() for h in [
    # universal
    "#FFFFFF", "#000000",
    # light theme neutrals
    "#F9F8F3", "#F4F2EA", "#EFEDE2", "#F9FAFB", "#F3F8FF",
    "#111827", "#444B55", "#474E58", "#646E7C", "#535964", "#555960", "#40505F",
    "#E5E7EB", "#E2E8F0", "#374151",
    # dark theme neutrals
    "#05141C", "#0D1B24", "#0D1B27", "#112633", "#15303F", "#14242F", "#0E1C26",
    "#F3F4F6", "#BCC6D3", "#B1BAC7",
    # near-black scaffolding
    "#070707", "#090909", "#111111", "#10100D", "#11100C", "#12100A",
]}

# ----------------------------------------------------------------------------
# Explicit overrides so accent hue families never snap to the wrong brand hue
# ----------------------------------------------------------------------------
OVERRIDE = {h.upper(): v.upper() for h, v in {
    # primary blue
    "#024EAE": "#25507C", "#025ED3": "#25507C", "#1E3A8A": "#1A2339",
    "#1E40AF": "#1A2339", "#1D4ED8": "#25507C", "#2563EB": "#25507C",
    "#3B82F6": "#25507C", "#60A5FA": "#8B9FAF", "#93C5FD": "#8B9FAF",
    "#7EB8FF": "#C5CFD7", "#A8C9EA": "#C5CFD7", "#A3C0E7": "#C5CFD7",
    "#A6BFD9": "#C5CFD7", "#D2E0F5": "#E2EEF7", "#DBEAFE": "#E2EEF7",
    "#BFDBFE": "#E2EEF7", "#EFF6FF": "#E2EEF7", "#EEF6FF": "#E2EEF7",
    "#EAF3FF": "#E2EEF7", "#DCEEFF": "#E2EEF7", "#F8FBFF": "#E2EEF7",
    "#6E9AD6": "#687896", "#5B9BD5": "#687896", "#5FA511": "#6D947C",
    "#3A72C2": "#25507C", "#487AA8": "#687896", "#2B6FD6": "#25507C",
    "#7DC4F0": "#8B9FAF", "#16245C": "#1A2339", "#1A2A4A": "#1A2339",
    "#122033": "#1A2339", "#0B1F33": "#1A2339", "#001A2E": "#1A2339",
    "#00162E": "#1A2339", "#081223": "#1A2339", "#061626": "#1A2339",
    "#0A1729": "#1A2339", "#0A1722": "#1A2339", "#08171A": "#1A2339",
    "#142A3A": "#1A2339", "#385067": "#25507C", "#163950": "#1A2339",
    "#102B3C": "#1A2339", "#0A1C28": "#1A2339",

    # cyan -> blue
    "#06B6D4": "#25507C", "#22D3EE": "#8B9FAF", "#67E8F9": "#C5CFD7",
    "#8CDDEB": "#C5CFD7", "#035E6B": "#1A2339", "#094E61": "#1A2339",
    "#4EE0B7": "#6D947C", "#6EE7B7": "#B6C9BE", "#34D399": "#32A966",
    "#2E846C": "#6D947C", "#0F3B2E": "#1B2D22",

    # green / success
    "#3BAA5C": "#32A966", "#16A34A": "#32A966", "#15803D": "#245E3B",
    "#4ADE80": "#6D947C", "#6EE7A8": "#B6C9BE", "#1D6634": "#245E3B",
    "#84CC16": "#6D947C", "#A3E635": "#B6C9BE", "#6FA82B": "#6D947C",
    "#003326": "#1B2D22", "#002A22": "#1B2D22", "#00261A": "#1B2D22",
    "#002218": "#1B2D22", "#004433": "#1B2D22", "#0A1F1A": "#1B2D22",
    "#061614": "#1B2D22", "#104D27": "#245E3B",

    # amber / warning / gold
    "#F5A524": "#FFC434", "#FFB347": "#FFC434", "#FFD84D": "#FFC434",
    "#FCD34D": "#FFC434", "#FBBF24": "#FFC434", "#EAB308": "#FFC434",
    "#FFF1A6": "#FFF5DD", "#FFF8D8": "#FFF5DD", "#FCD34D": "#FFC434",
    "#F5C84B": "#FFC434", "#E6AD18": "#C28E34", "#D4A853": "#D7BE91",
    "#D7BE76": "#D7BE91", "#EFD88F": "#E9DABF", "#C0A257": "#D7BE91",
    "#907238": "#C28E34", "#9A6C00": "#A16908", "#C47100": "#A16908",
    "#B45309": "#75360A", "#B4691B": "#75360A", "#B3690B": "#75360A",
    "#6F3604": "#75360A", "#F97316": "#D27326", "#F08A4B": "#D27326",
    "#F26D5B": "#D27326", "#2A1A00": "#4D1007", "#3D2200": "#4D1007",
    "#261A0A": "#1B2D22",

    # red / poor
    "#D94C4C": "#DC3038", "#EF4444": "#DC3038", "#E5484D": "#DC3038",
    "#F87171": "#DC3038", "#FCA5A5": "#FFE1DC", "#FBB1B1": "#FFE1DC",
    "#FF7C7E": "#DC3038", "#FF8A8A": "#FFE1DC", "#FF5E60": "#DC3038",
    "#FB7185": "#DC3038", "#F472B6": "#DC3038", "#B91C1C": "#831F23",
    "#8F2727": "#831F23", "#831313": "#831F23", "#3E0F10": "#4D1007",

    # violet / magenta -> blue family (no brand purple)
    "#7C3AED": "#25507C", "#6D28D9": "#1A2339", "#4F1D96": "#1A2339",
    "#5B5BF5": "#25507C", "#4F46E5": "#25507C", "#E879F9": "#8B9FAF",
    "#C026D3": "#25507C",
}.items()}


def hex_to_rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _f(c):
    c = c / 255.0
    return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92


def rgb_to_lab(rgb):
    r, g, b = (_f(c) for c in rgb)
    x = r * 0.4124 + g * 0.3576 + b * 0.1805
    y = r * 0.2126 + g * 0.7152 + b * 0.0722
    z = r * 0.0193 + g * 0.1192 + b * 0.9505
    x, y, z = x / 0.95047, y / 1.0, z / 1.08883

    def fx(t):
        return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx_, fy_, fz_ = fx(x), fx(y), fx(z)
    return (116 * fy_ - 16, 500 * (fx_ - fy_), 200 * (fy_ - fz_))


BRAND_LABS = {h: rgb_to_lab(hex_to_rgb(h)) for h in BRAND_HEXES}


def nearest_brand(h):
    lab = rgb_to_lab(hex_to_rgb(h))
    best, bestd = None, 1e9
    for bh, blab in BRAND_LABS.items():
        d = sum((a - b) ** 2 for a, b in zip(lab, blab))
        if d < bestd:
            bestd, best = d, bh
    return best


def map_hex(h):
    H = h.upper()
    full = "#" + "".join(c * 2 for c in H.lstrip("#")) if len(H.lstrip("#")) == 3 else H
    if full in KEEP or full in BRAND_HEXES:
        return None  # keep
    if full in OVERRIDE:
        return OVERRIDE[full]
    return nearest_brand(full)


# Match color hexes only. The (?!-) guards against CSS id selectors / anchors
# whose name happens to start with hex chars (e.g. `#add-member-modal`).
HEX_RE = re.compile(r"#[0-9a-fA-F]{6}(?![\w-])|#[0-9a-fA-F]{3}(?![\w-])")

FILES = (
    glob.glob("*.html") + glob.glob("pages/*.html") +
    glob.glob("pages/*.css") + glob.glob("js/*.js")
)

apply = "--apply" in sys.argv
all_map = {}

for path in sorted(set(FILES)):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    orig = text

    def repl(m):
        h = m.group(0)
        t = map_hex(h)
        if t is None:
            return h
        all_map[h.upper()] = t
        return t

    text = HEX_RE.sub(repl, text)

    # Remap chromatic rgb()/rgba() triplets to the nearest brand color, keeping
    # the alpha. Neutral inks/grays, white, black and near-black scaffolding are
    # left untouched (they are the structural canvas, like the hex keep-set).
    def repl_rgb(m):
        r, g, b = int(m.group("r")), int(m.group("g")), int(m.group("b"))
        mx, mn = max(r, g, b), min(r, g, b)
        sat = 0 if mx == 0 else (mx - mn) / mx
        if sat <= 0.18 or mx <= 40:
            return m.group(0)  # neutral / near-black -> keep
        hexc = "#{:02X}{:02X}{:02X}".format(r, g, b)
        if hexc in BRAND_HEXES:
            return m.group(0)
        target = OVERRIDE.get(hexc) or nearest_brand(hexc)
        all_map["rgb(%d,%d,%d)" % (r, g, b)] = target
        nr, ng, nb = hex_to_rgb(target)
        return "{}({}, {}, {}{}".format(m.group("fn"), nr, ng, nb, m.group("tail"))

    text = re.sub(
        r"(?P<fn>rgba?)\(\s*(?P<r>\d{1,3})\s*,\s*(?P<g>\d{1,3})\s*,\s*(?P<b>\d{1,3})(?P<tail>\s*[,)])",
        repl_rgb, text)

    if apply and text != orig:
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

print("DISTINCT MAPPINGS ({}):".format(len(all_map)))
for k in sorted(all_map):
    print("  {} -> {}".format(k, all_map[k]))
print("\nAPPLIED" if apply else "\nDRY RUN (use --apply to write)")
