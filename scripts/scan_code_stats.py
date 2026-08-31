#!/usr/bin/env python3
"""Scan the repo for codebase size stats.

Counts lines of code by file type (HTML / JS / CSS / Python) and the number
of HTML pages — both for the working tree ("now") and for one snapshot per
day of git history (so the UI can show an up/down trend). Today's working
tree is also the last series point so the trend does not freeze on the last
commit day. Also walks every shippable file (images, video, the rest) and
writes a byte inventory so All Modules can show the real project size, not
just the handful of scripts the page itself downloaded.

Feeds the Codebase score cards and the load meter on pages/all-modules.html.

All Modules also live-crawls from this inventory when you click Re-evaluate
so the on-page numbers stay current even when this script has not been
re-run yet.

Regenerate with:
    python3 scripts/scan_code_stats.py
"""
import json
import os
import subprocess
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The file types that count as "code" here.
EXTS = ("html", "js", "css", "py")

# Auto-generated data blobs — big machine-written files that would distort a
# hand-written-code count (this scanner's own output included).
SKIP_FILES = {
    "icon-inventory-data.js",
    "code-stats-data.js",
    "gs-data.js",
    "project-inventory-data.js",
}

# Directories never worth scanning in the working tree. `_WISEdesigns` is a
# symlink out of the repo — os.walk won't follow it, but keep it listed so a
# later followlinks change cannot pull in the sibling tree. `_to_delete` is
# scratch, not the app.
SKIP_DIRS = {".git", "node_modules", "__pycache__", "_WISEdesigns", "_to_delete"}

# Extra folders left out of the *byte* inventory (not the LOC walk). Screenshots
# are local capture output; editor folders are not the shipped app.
INV_SKIP_DIRS = SKIP_DIRS | {"screenshots", ".cursor", ".vscode"}

IMAGE_EXTS = {"png", "jpg", "jpeg", "webp", "gif", "svg", "ico", "avif"}
VIDEO_EXTS = {"mp4", "webm", "mov", "m4v"}
FONT_EXTS = {"woff", "woff2", "ttf", "otf", "eot"}
CODE_KIND_EXTS = {"html", "js", "css", "py", "mjs"}


def ext_of(path):
    ext = path.rsplit(".", 1)[-1].lower()
    return ext if ext in EXTS else None


def skipped(path):
    return os.path.basename(path) in SKIP_FILES


def kind_of(name):
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext in CODE_KIND_EXTS:
        return "code"
    if ext in IMAGE_EXTS:
        return "image"
    if ext in VIDEO_EXTS:
        return "video"
    if ext in FONT_EXTS:
        return "font"
    return "other"


def scan_disk_inventory():
    """Every shippable file: path, bytes, kind. Used by the load meter and
    Re-evaluate so a server without directory listings still knows the tree."""
    kinds = {k: {"bytes": 0, "files": 0} for k in ("code", "image", "video", "font", "other")}
    listing = []
    for dirpath, dirs, names in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in INV_SKIP_DIRS and not d.startswith(".")]
        for name in names:
            if name.startswith("."):
                continue
            path = os.path.join(dirpath, name)
            try:
                sz = os.path.getsize(path)
            except OSError:
                continue
            rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
            kind = kind_of(name)
            kinds[kind]["bytes"] += sz
            kinds[kind]["files"] += 1
            listing.append({"path": rel, "bytes": sz, "kind": kind})
    listing.sort(key=lambda x: x["path"])
    return {
        "generatedAt": date.today().isoformat(),
        "bytes": sum(k["bytes"] for k in kinds.values()),
        "files": sum(k["files"] for k in kinds.values()),
        "kinds": kinds,
        "list": listing,
    }


def scan_working_tree():
    """Line + file counts for the repo as it is right now (uncommitted included)."""
    lines = {e: 0 for e in EXTS}
    files = {e: 0 for e in EXTS}
    for dirpath, dirs, names in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        for name in names:
            ext = ext_of(name)
            if not ext or name in SKIP_FILES:
                continue
            path = os.path.join(dirpath, name)
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                    n = sum(1 for _ in fh)
            except Exception:
                continue
            lines[ext] += n
            files[ext] += 1
    return lines, files


def git(*args):
    return subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, text=True, check=False
    ).stdout


def daily_snapshot_commits():
    """The newest commit of each day, oldest day first: [(date, sha), …]."""
    out = git("log", "--format=%H %cd", "--date=short")
    seen = set()
    snaps = []
    for line in out.splitlines():
        sha, day = line.split()
        if day in seen:
            continue
        seen.add(day)
        snaps.append((day, sha))
    snaps.reverse()
    return snaps


def counts_at(sha):
    """Per-extension line counts + HTML page count at one commit, via
    `git grep -c` (a line count per tracked file, no checkout needed)."""
    pathspecs = ["*." + e for e in EXTS]
    out = git("grep", "-I", "-c", "-e", "", sha, "--", *pathspecs)
    lines = {e: 0 for e in EXTS}
    pages = 0
    for row in out.splitlines():
        # <sha>:<path>:<count>
        try:
            _sha, rest = row.split(":", 1)
            path, count = rest.rsplit(":", 1)
        except ValueError:
            continue
        ext = ext_of(path)
        if not ext or skipped(path):
            continue
        lines[ext] += int(count)
        if ext == "html":
            pages += 1
    return lines, pages


def write_inventory(inv):
    json_path = os.path.join(ROOT, "scripts", "project-inventory.json")
    with open(json_path, "w", encoding="utf-8") as fh:
        json.dump(inv, fh, indent=2)

    js_path = os.path.join(ROOT, "js", "project-inventory-data.js")
    header = (
        "/* AUTO-GENERATED by scripts/scan_code_stats.py — do not edit by hand.\n"
        " * Every shippable file in the project (path, bytes, kind). The All\n"
        " * Modules load meter and Re-evaluate read this so the size is the\n"
        " * whole tree, not just what this tab happened to download.\n"
        " * Git, node_modules, screenshots, and scratch folders are excluded.\n"
        " * Regenerate with: python3 scripts/scan_code_stats.py\n"
        " */\n"
    )
    with open(js_path, "w", encoding="utf-8") as fh:
        fh.write(header)
        fh.write("window.WISE_PROJECT_INVENTORY = ")
        json.dump(inv, fh, indent=2, ensure_ascii=False)
        fh.write(";\n")
    return json_path, js_path


def main():
    now_lines, now_files = scan_working_tree()
    inv = scan_disk_inventory()

    series = []
    for day, sha in daily_snapshot_commits():
        lines, pages = counts_at(sha)
        series.append(
            {
                "date": day,
                "total": sum(lines.values()),
                "html": lines["html"],
                "js": lines["js"],
                "css": lines["css"],
                "py": lines["py"],
                "pages": pages,
            }
        )

    today = date.today().isoformat()
    today_pt = {
        "date": today,
        "total": sum(now_lines.values()),
        "html": now_lines["html"],
        "js": now_lines["js"],
        "css": now_lines["css"],
        "py": now_lines["py"],
        "pages": now_files["html"],
    }
    if series and series[-1]["date"] == today:
        series[-1] = today_pt
    elif not series or series[-1]["date"] < today:
        series.append(today_pt)

    out = {
        "generatedAt": today,
        "now": {
            "total": sum(now_lines.values()),
            "html": now_lines["html"],
            "js": now_lines["js"],
            "css": now_lines["css"],
            "py": now_lines["py"],
            "pages": now_files["html"],
            "files": sum(now_files.values()),
            "bytes": inv["bytes"],
            "allFiles": inv["files"],
            "codeBytes": inv["kinds"]["code"]["bytes"],
            "imageBytes": inv["kinds"]["image"]["bytes"],
            "videoBytes": inv["kinds"]["video"]["bytes"],
            "otherBytes": inv["kinds"]["other"]["bytes"] + inv["kinds"]["font"]["bytes"],
        },
        "series": series,
    }

    json_path = os.path.join(ROOT, "scripts", "code-stats.json")
    with open(json_path, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2)

    # An ES module the Codebase score cards can import directly (no fetch,
    # works from file:// and the dev server alike) — same pattern as the
    # Icon Inventory data.
    js_path = os.path.join(ROOT, "js", "code-stats-data.js")
    header = (
        "/* AUTO-GENERATED by scripts/scan_code_stats.py — do not edit by hand.\n"
        " * Lines of code by file type (HTML/JS/CSS/Python) + the HTML page count,\n"
        " * for the working tree now and one git snapshot per day (the trend),\n"
        " * plus today's working tree as the latest series point, plus the\n"
        " * shippable project size in bytes (images, video, everything else).\n"
        " * Generated data blobs are excluded from line counts. Regenerate with:\n"
        " *   python3 scripts/scan_code_stats.py\n"
        " */\n"
    )
    with open(js_path, "w", encoding="utf-8") as fh:
        fh.write(header)
        fh.write("export const CODE_STATS = ")
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write(";\n")

    inv_json, inv_js = write_inventory(inv)

    print("now:", out["now"])
    print("inventory:", inv["files"], "files,", round(inv["bytes"] / (1024 * 1024), 1), "MB")
    print("snapshots:", len(series))
    print("wrote:", os.path.relpath(json_path, ROOT))
    print("wrote:", os.path.relpath(js_path, ROOT))
    print("wrote:", os.path.relpath(inv_json, ROOT))
    print("wrote:", os.path.relpath(inv_js, ROOT))


if __name__ == "__main__":
    main()
