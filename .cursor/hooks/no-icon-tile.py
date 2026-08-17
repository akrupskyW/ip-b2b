#!/usr/bin/env python3
"""preToolUse hook: block writes that put an icon on a rounded-corner square.

Enforces the project rule `no-icon-background-squares`. Fires before a file is
written/edited, scans ONLY the new content, and denies the write when it finds an
icon sitting on a rounded-rectangle (square/tile/badge) background.

Design goals:
- High precision. Circles (border-radius: 50%), pills, transparent backgrounds,
  chips/buttons with text, thumbnails and avatars must NOT trip it.
- Fail open. Any parsing error allows the edit through so a bug never bricks editing.
"""
import json
import re
import sys

RELEVANT_EXT = (".html", ".htm", ".css", ".svg", ".jsx", ".tsx", ".vue", ".astro", ".php")

# Markers that indicate an actual icon (not text) lives inside a container.
ICON_MARKER = re.compile(
    r"material-symbols|material-icons|<svg\b|<use\b|data-lucide|data-icon"
    r'|<i\s+[^>]*class\s*=\s*["\'][^"\']*\b(?:fa|fas|far|fab|fal|bi|mdi|lucide|feather|icon)\b'
    r'|class\s*=\s*["\'][^"\']*\b(?:fa|fas|far|fab|fal|bi|mdi|lucide|feather)\b',
    re.I,
)


def allow():
    print(json.dumps({"permission": "allow"}))
    sys.exit(0)


def deny(violations):
    bullets = "\n".join(f"  - {v}" for v in violations[:8])
    extra = "" if len(violations) <= 8 else f"\n  …and {len(violations) - 8} more."
    agent_message = (
        "BLOCKED by the no-icon-tile hook (project rule `no-icon-background-squares`).\n"
        "This edit puts an icon on a rounded-corner square/tile/badge background, which is "
        "permanently banned in this app.\n\n"
        f"Offending pattern(s):\n{bullets}{extra}\n\n"
        "Fix it: render the icon bare (no boxed backdrop), OR use a fully circular container "
        "(border-radius: 50%), OR a transparent background. Never a rounded rectangle behind an icon. "
        "Then retry the write."
    )
    print(json.dumps({
        "permission": "deny",
        "user_message": "Blocked: an icon was placed on a rounded-corner square. See agent message.",
        "agent_message": agent_message,
    }))
    sys.exit(0)


def decl_values(body, prop):
    """All values declared for a CSS property within a rule body."""
    out = []
    for m in re.finditer(r"(?<![\w-])" + re.escape(prop) + r"\s*:\s*([^;}]+)", body, re.I):
        out.append(m.group(1).strip())
    return out


def radius_values(body):
    out = []
    for m in re.finditer(r"(?<![\w-])border(?:-[a-z]+)*-radius\s*:\s*([^;}]+)", body, re.I):
        out.append(m.group(1).strip())
    return out


def is_rounded_rectangle(radius_value):
    """True for a rounded rectangle. False for circles (50%), pills, or no rounding."""
    v = radius_value.strip().lower()
    if not v or v in ("0", "0px", "none", "unset", "initial", "inherit"):
        return False
    nums = re.findall(r"([\d.]+)\s*(px|rem|em|%)", v)
    for num, unit in nums:
        n = float(num)
        if unit == "%" and n >= 50:
            return False  # circle
        if unit == "px" and n >= 400:
            return False  # pill
        if unit in ("rem", "em") and n >= 25:
            return False  # pill
    for num, _unit in nums:
        if float(num) > 0:
            return True  # a real, small rounding => rounded rectangle
    return False


def is_filled_background(values):
    """True if any background value paints a visible fill."""
    for raw in values:
        v = raw.strip().lower()
        if not v:
            continue
        if v in ("transparent", "none", "inherit", "initial", "unset", "currentcolor", "0"):
            continue
        if re.fullmatch(r"(?:rgba|hsla)\([^)]*,\s*0(?:\.0+)?\s*\)", v):
            continue  # fully transparent
        return True
    return False


# Icon tiles are tiny; never scan further than this for a closing tag. This keeps
# the hook fast (bounded, not O(n^2)) even when a whole large file is rewritten.
INNER_SEARCH_LIMIT = 2000


def find_matching_inner(blob, after_idx, tag):
    """Return inner HTML between an opening tag and its matching close, else None.

    Only searches a bounded window; returns None if no close is found within it.
    """
    pattern = re.compile(r"<(/?)" + re.escape(tag) + r"\b", re.I)
    end_limit = after_idx + INNER_SEARCH_LIMIT
    depth = 1
    for m in pattern.finditer(blob, after_idx, end_limit):
        if m.group(1) == "/":
            depth -= 1
            if depth == 0:
                return blob[after_idx:m.start()]
        else:
            depth += 1
    return None


def strip_tags(html):
    return re.sub(r"<[^>]+>", "", html)


def is_icon_only(inner):
    """True if `inner` contains an icon and no real (non-icon) text.

    Icon glyphs are removed first: Material Symbols use their ligature name as
    text content (e.g. `star`), and <i>/<svg> icons may too. Only text that
    survives removal of icon elements counts as real content.
    """
    if not ICON_MARKER.search(inner):
        return False
    cleaned = re.sub(
        r'<span[^>]*class\s*=\s*["\'][^"\']*material-(?:symbols|icons)[^"\']*["\'][^>]*>.*?</span>',
        "", inner, flags=re.I | re.S,
    )
    cleaned = re.sub(r"<i\b[^>]*>.*?</i>", "", cleaned, flags=re.I | re.S)
    cleaned = re.sub(r"<svg\b.*?</svg>", "", cleaned, flags=re.I | re.S)
    cleaned = re.sub(r"<svg\b[^>]*/>", "", cleaned, flags=re.I | re.S)
    return strip_tags(cleaned).strip() == ""


def strip_comments(blob):
    blob = re.sub(r"/\*.*?\*/", " ", blob, flags=re.S)   # CSS comments
    blob = re.sub(r"<!--.*?-->", " ", blob, flags=re.S)  # HTML comments
    return blob


def _length_px(text, prop):
    """First length declared for `prop`, normalized to px. None if absent/non-length."""
    m = re.search(r"(?<![\w-])" + prop + r"\s*:\s*([\d.]+)(px|rem|em)\b", text, re.I)
    if not m:
        return None
    val, unit = float(m.group(1)), m.group(2).lower()
    return val * 16 if unit in ("rem", "em") else val


def _is_flexible(text, prop):
    """True if `prop` uses a stretchy value (%/auto/vw/vh/calc) — never a fixed tile."""
    return bool(re.search(
        r"(?<![\w-])" + prop + r"\s*:\s*(?:100%|auto|[\d.]+(?:%|vw|vh)|calc\()",
        text, re.I,
    ))


def is_non_tile_box(text):
    """True when width/height prove this is NOT a small square icon tile.

    Rails, bars, rows and cards are large, non-square, or stretchy
    (e.g. #left-icon-rail 100%x44, .app-icon-home-bar 134x5). If dimensions
    aren't known we don't exclude (padding-sized tiles are still tiles).
    """
    if _is_flexible(text, "width") or _is_flexible(text, "height"):
        return True
    w, h = _length_px(text, "width"), _length_px(text, "height")
    if w is not None and h is not None:
        if w <= 0 or h <= 0:
            return True
        if max(w, h) > 120:
            return True
        return (max(w, h) / min(w, h)) > 1.4
    # No fixed square box: a padded element is a panel/wall/card that merely
    # contains icons (e.g. .icon-wall), not a single icon on a tile.
    pad = re.search(r"(?<![\w-])padding\s*:\s*([^;}]+)", text, re.I)
    if pad and any(float(n) > 0 for n, _u in re.findall(r"([\d.]+)(px|rem|em)", pad.group(1))):
        return True
    return False


def scan_css(blob):
    """CSS rules whose selector mentions 'icon' with a filled, rounded-rectangle bg.

    Uses a linear split on '}' (not a brace-pair regex, which backtracks
    catastrophically on nested braces / embedded JS in large files).
    """
    blob = strip_comments(blob)
    violations = []
    for segment in blob.split("}"):
        brace = segment.rfind("{")
        if brace < 0:
            continue
        selector, body = segment[:brace], segment[brace + 1:]
        if "icon" not in selector.lower():
            continue
        radii = radius_values(body)
        if not any(is_rounded_rectangle(r) for r in radii):
            continue
        bg = decl_values(body, "background") + decl_values(body, "background-color")
        if not is_filled_background(bg):
            continue
        if is_non_tile_box(body):
            continue  # a rail/bar/row, not an icon tile
        sel = re.sub(r"\s+", " ", selector.rsplit("{", 1)[-1]).strip()[-80:]
        violations.append(f"CSS rule `{sel}` has a filled, rounded-rectangle background (icon tile).")
    return violations


def scan_inline(blob):
    """Inline-styled or utility-classed icon containers with a rounded-rect fill."""
    blob = strip_comments(blob)
    violations = []
    for m in re.finditer(r"<([a-zA-Z][\w-]*)\b([^>]*)>", blob):
        tag, attrs = m.group(1), m.group(2)
        # Cheap early skip: only elements that could possibly be a rounded fill.
        if "radius" not in attrs and "rounded" not in attrs and "bg-" not in attrs:
            continue
        style_m = re.search(r'style\s*=\s*"([^"]*)"', attrs, re.I) or \
            re.search(r"style\s*=\s*'([^']*)'", attrs, re.I)
        class_m = re.search(r'class\s*=\s*"([^"]*)"', attrs, re.I) or \
            re.search(r"class\s*=\s*'([^']*)'", attrs, re.I)
        style = style_m.group(1) if style_m else ""
        cls = class_m.group(1) if class_m else ""

        rounded = False
        filled = False
        if style:
            radii = radius_values(style)
            rounded = any(is_rounded_rectangle(r) for r in radii)
            filled = is_filled_background(decl_values(style, "background") +
                                         decl_values(style, "background-color"))
        # Utility-class combo: rounded-* (not full/none) + bg-*. `rounded-full` and
        # `rounded-none` are circles/no-rounding and must NOT count (token-based so
        # the bare word "rounded" inside "rounded-full" can't false-match).
        def _rounded_rect_util(token):
            if token == "rounded":
                return True
            if token.startswith("rounded-"):
                parts = token[len("rounded-"):].split("-")
                return "full" not in parts and "none" not in parts
            return False
        tokens = cls.split()
        util_rounded = any(_rounded_rect_util(t) for t in tokens)
        util_bg = bool(re.search(r"\bbg-[a-z0-9./#\[\]-]+", cls))
        util_combo = util_rounded and util_bg

        if not (rounded and filled) and not util_combo:
            continue

        if style and is_non_tile_box(style):
            continue  # explicit non-square/large box: a rail/bar, not an icon tile

        container_is_icon = bool(re.search(r"\bicon\b", cls, re.I))
        inner = find_matching_inner(blob, m.end(), tag)

        is_violation = False
        detail = ""
        if container_is_icon:
            is_violation = True
            detail = f'<{tag} class="{cls[:60]}"> is an icon container with a rounded-rectangle fill.'
        elif inner is not None:
            if is_icon_only(inner):
                is_violation = True
                detail = f"<{tag}> wraps only an icon on a rounded-rectangle background (icon tile)."
        else:
            # Snippet was cut off; only flag if there is an icon marker right after.
            window = blob[m.end():m.end() + 220]
            if is_icon_only(window):
                is_violation = True
                detail = f"<{tag}> appears to wrap an icon on a rounded-rectangle background."

        if is_violation:
            violations.append(detail)
    return violations


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        allow()

    tool_input = payload.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        allow()

    file_path = tool_input.get("path") or tool_input.get("file_path") or ""

    parts = []
    for key in ("contents", "content", "new_string", "code_edit", "text"):
        v = tool_input.get(key)
        if isinstance(v, str):
            parts.append(v)
    edits = tool_input.get("edits")
    if isinstance(edits, list):
        for e in edits:
            if isinstance(e, dict) and isinstance(e.get("new_string"), str):
                parts.append(e["new_string"])
    blob = "\n".join(parts)

    if not blob.strip():
        allow()
    if file_path and not str(file_path).lower().endswith(RELEVANT_EXT):
        allow()
    if "<" not in blob and "{" not in blob:
        allow()
    if not re.search(r"icon|rounded-|border-radius", blob, re.I):
        allow()

    try:
        violations = scan_css(blob) + scan_inline(blob)
    except Exception:
        allow()  # fail open

    seen, unique = set(), []
    for v in violations:
        if v not in seen:
            seen.add(v)
            unique.append(v)

    if unique:
        deny(unique)
    allow()


if __name__ == "__main__":
    main()
