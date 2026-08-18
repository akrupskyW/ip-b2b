#!/usr/bin/env python3
"""Scan the repo for Material Icons / Symbols usage.

Produces a JSON inventory of every icon glyph name, the CSS family it uses,
how many times it appears, the UI group(s) it belongs to, and example
placements (file + a short human label). This feeds the Icon Inventory module.

The All Modules kitchen-sink (pages/all-modules.html + js/all-modules-flow.js)
is excluded on purpose — that page *renders* the inventory and would otherwise
inflate counts and list glyphs that only exist as catalog chrome.
"""
import json
import os
import re
from collections import defaultdict
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SCAN_DIRS = ["js", "pages"]
SCAN_ROOT_FILES = [
    "index.html",
    "wise_ip3.html",
    "marketing-alliance.html",
    "marketing-app.html",
    "marketing-coach.html",
    "marketing-enterprise.html",
    "marketing-gras.html",
    "marketing-nonupf.html",
    "marketing-pricing.html",
    "marketing-products.html",
    "marketing-solutions.html",
    "marketing-wiseai.html",
]

# Skip giant generated blobs and the inventory page itself so listed icons
# reflect the live app, not the catalog that displays them.
SKIP_NAMES = {
    "gs-data.js",
    "icon-inventory-data.js",
    "all-modules-flow.js",
    "all-modules.html",
}

# Canonical UI groups — first matching file rule wins for a placement; an
# icon can still belong to several groups via several files.
ICON_GROUPS = [
    {"id": "chat", "label": "Chat module", "icon": "forum"},
    {"id": "nav", "label": "Primary nav", "icon": "menu"},
    {"id": "topbar", "label": "Top bar", "icon": "web_asset"},
    {"id": "workspace", "label": "Workspace", "icon": "space_dashboard"},
    {"id": "portfolio", "label": "Portfolio", "icon": "handyman"},
    {"id": "ai", "label": "WISEcodeAI Studio", "icon": "auto_awesome"},
    {"id": "reform", "label": "Reformulation", "icon": "auto_fix_high"},
    {"id": "reports", "label": "Reports", "icon": "insights"},
    {"id": "verify", "label": "Verification", "icon": "verified"},
    {"id": "admin", "label": "Admin", "icon": "shield"},
    {"id": "account", "label": "Account", "icon": "account_circle"},
    {"id": "auth", "label": "Auth", "icon": "login"},
    {"id": "marketing", "label": "Marketing", "icon": "campaign"},
]

FILE_GROUP_RULES = [
    (re.compile(r"(^|/)agent-menu\.js$"), "nav"),
    (re.compile(r"(^|/)(topbar|appearance-menu|lir-tooltip|popover-layer)\.js$"), "topbar"),
    (re.compile(r"(^|/)(wiseai-chat\.js|wiseai-chat\.css|sticky-modules\.js)$"), "chat"),
    (re.compile(r"(^|/)pages/wiseai\.html$"), "chat"),
    (re.compile(r"(^|/)(overview\.html|agent-overview\.js)$"), "workspace"),
    (re.compile(r"product-portfolio|add-product|view-product|product-comparison|marketing-assets|add-catalog"), "portfolio"),
    (re.compile(r"ingredient-browser|ai-dashboard|studio-ai|conversation-library|ai-chat"), "ai"),
    (re.compile(r"reformulation"), "reform"),
    (re.compile(r"report-guiding|analytics-types|(^|/)pages/reports\.html|app-vision"), "reports"),
    (re.compile(r"(^|/)(pages/)?(verification|gras-verification)"), "verify"),
    (re.compile(r"organizations|user-management|audit-queue|admin-utils|quick-invite|non-upf-dashboard|accessibility"), "admin"),
    (re.compile(r"invoices|api-keys|(^|/)pages/profile\.html|preferences|(^|/)pages/alerts\.html|(^|/)pages/agents\.html|(^|/)pages/help\.html|(^|/)pages/docs\.html"), "account"),
    (re.compile(r"login|create-account|forgot-password|auth-guard|auth\.css"), "auth"),
    (re.compile(r"marketing-|(^|/)index\.html$"), "marketing"),
]

FAMILY_RE = r"material-(icons|symbols-outlined|symbols-rounded|symbols-sharp)"
ICON_RE = re.compile(FAMILY_RE + r"[^>]*>\s*([a-z][a-z0-9_]+)\s*<")

# Assigned in data objects, e.g. icon: 'insights'  /  "icon":"bolt"
# Negative lookbehind so noteIcon: '…' does not match.
DATA_ICON_RE = re.compile(r"""(?<![A-Za-z_])icon\s*:\s*['"]([a-z][a-z0-9_]+)['"]""")

LABEL_AFTER_RE = re.compile(r"</span>\s*([A-Z][A-Za-z0-9 &/'’\-]{1,40})")
ARIA_RE = re.compile(r"""aria-label=['"]([^'"]{1,50})['"]""")
TITLE_RE = re.compile(r"""title=['"]([^'"]{1,50})['"]""")
LABEL_NEAR_RE = re.compile(r"""label\s*:\s*['"]([^'"]{1,50})['"]""")


def family_label(fam):
    if fam == "icons":
        return "Material Icons"
    return "Material Symbols (" + fam.replace("symbols-", "") + ")"


def group_for_file(relpath):
    p = relpath.replace("\\", "/")
    for rx, gid in FILE_GROUP_RULES:
        if rx.search(p):
            return gid
    return None


def iter_files():
    for d in SCAN_DIRS:
        base = os.path.join(ROOT, d)
        for dirpath, _dirs, files in os.walk(base):
            for f in files:
                if f in SKIP_NAMES:
                    continue
                if f.rsplit(".", 1)[-1] in ("js", "html", "css"):
                    yield os.path.join(dirpath, f)
    for f in SCAN_ROOT_FILES:
        p = os.path.join(ROOT, f)
        if os.path.exists(p):
            yield p


def rel(p):
    return os.path.relpath(p, ROOT)


def infer_label(line, markup_end=None):
    if markup_end is not None:
        after = LABEL_AFTER_RE.search(line, max(0, markup_end - 1))
        if after:
            return after.group(1).strip()
    a = ARIA_RE.search(line)
    if a:
        return a.group(1).strip()
    t = TITLE_RE.search(line)
    if t:
        return t.group(1).strip()
    near = LABEL_NEAR_RE.search(line)
    if near:
        return near.group(1).strip()
    return ""


def add_hit(inv, glyph, fam, path, lineno, line, markup_end=None):
    rec = inv[glyph]
    rec["families"].add(family_label(fam))
    rec["count"] += 1
    group = group_for_file(path)
    if group:
        rec["groups"].add(group)
    label = infer_label(line, markup_end)
    if len(rec["placements"]) < 10:
        rec["placements"].append(
            {
                "file": path,
                "line": lineno,
                "label": label,
                "group": group or "",
            }
        )


def main():
    inv = defaultdict(lambda: {"families": set(), "count": 0, "placements": [], "groups": set()})

    for path in iter_files():
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                text = fh.read()
        except Exception:
            continue
        rpath = rel(path)
        lines = text.splitlines()
        for lineno, line in enumerate(lines, 1):
            seen_on_line = set()
            for m in ICON_RE.finditer(line):
                fam, glyph = m.group(1), m.group(2)
                seen_on_line.add(glyph)
                add_hit(inv, glyph, fam, rpath, lineno, line, m.end())
            # Data-assigned icons (nav items, intent chips) — skip glyphs already
            # counted from markup on this line so we don't double-count.
            for m in DATA_ICON_RE.finditer(line):
                glyph = m.group(1)
                if glyph in seen_on_line:
                    continue
                add_hit(inv, glyph, "symbols-outlined", rpath, lineno, line)

    group_counts = {g["id"]: 0 for g in ICON_GROUPS}
    for rec in inv.values():
        for gid in rec["groups"]:
            if gid in group_counts:
                group_counts[gid] += 1

    groups_out = []
    for g in ICON_GROUPS:
        n = group_counts[g["id"]]
        if n:
            groups_out.append({**g, "count": n})

    total_uses = sum(v["count"] for v in inv.values())
    out = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "totalUniqueIcons": len(inv),
        "totalUses": total_uses,
        "excluded": ["pages/all-modules.html", "js/all-modules-flow.js"],
        "groups": groups_out,
        "icons": [],
    }
    for glyph in sorted(inv.keys()):
        rec = inv[glyph]
        rep_label = ""
        for pl in rec["placements"]:
            if pl["label"] and not rep_label:
                rep_label = pl["label"]
                break
        out["icons"].append(
            {
                "name": glyph,
                "families": sorted(rec["families"]),
                "count": rec["count"],
                "label": rep_label,
                "groups": [g["id"] for g in ICON_GROUPS if g["id"] in rec["groups"]],
                "placements": rec["placements"],
            }
        )

    out_path = os.path.join(ROOT, "scripts", "icon-inventory.json")
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2)

    js_path = os.path.join(ROOT, "js", "icon-inventory-data.js")
    header = (
        "/* AUTO-GENERATED by scripts/scan_icons.py — do not edit by hand.\n"
        " * A scan of every Material Icons / Symbols glyph used across the app\n"
        " * (All Modules itself excluded), with family, count, UI group, label,\n"
        " * and example placements. Regenerate with:\n"
        " *   python3 scripts/scan_icons.py\n"
        " */\n"
    )
    with open(js_path, "w", encoding="utf-8") as fh:
        fh.write(header)
        fh.write("export const ICON_INVENTORY = ")
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write(";\n")

    print("unique icons:", len(inv))
    print("total uses:", total_uses)
    print("groups:", ", ".join(f"{g['id']}={g['count']}" for g in groups_out))
    print("wrote:", rel(out_path))
    print("wrote:", rel(js_path))


if __name__ == "__main__":
    main()
