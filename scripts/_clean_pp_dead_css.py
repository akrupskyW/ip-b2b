"""Drop leftover CSS on product-portfolio for panels we already removed.

Safe to re-run: only strips selectors that name deleted leftover IDs / NFP /
settings / verification-sidebar classes. Shared chat, portfolio, workflow,
compare, and notifications rules stay.
"""
from __future__ import annotations

import re
from pathlib import Path

PATH = Path("pages/product-portfolio.html")

DEAD_IDS = re.compile(
    r"#(?:"
    r"history-panel|wiseai-panel|upf-panel|tier-panel|shield-panel|"
    r"lens-panel|vault-panel|settings-screen|nfp-panel|verification-sidebar|"
    r"profile-panel|prefs-panel|apikeys-panel|help-panel|docs-panel|"
    r"left-icon-rail|lir-more-popover|lir-more-btn|lir-more-wrap|"
    r"lir-theme-icon|lir-theme-label|lir-history-btn|lir-wiseai-btn|"
    r"lir-upf-btn|lir-nfp-btn|lir-settings-btn|lir-tier-btn|lir-shield-btn|"
    r"lir-lens-btn|lir-vault-btn|nfp-barcode-svg|tier-panel-body|"
    r"shield-panel-body|summary-dots-mini"
    r")\b"
)

DEAD_CLASS = re.compile(
    r"(?:^|[^\w-])(?:\.?(?:nfp|ss|ssa|ssr|ssn|vs|upf)-[\w-]+|"
    r"\.lir-(?:history|wiseai|upf|nfp|settings|tier|shield|lens|vault|hidden))\b"
)


def _skip_comment_or_string(css: str, i: int) -> int:
    if css.startswith("/*", i):
        end = css.find("*/", i + 2)
        return len(css) if end < 0 else end + 2
    if css[i] in "\"'":
        q = css[i]
        i += 1
        while i < len(css) and css[i] != q:
            i += 2 if css[i] == "\\" else 1
        return i + 1 if i < len(css) else i
    return i


def split_selectors(sel: str) -> list[str]:
    parts, buf, i = [], [], 0
    while i < len(sel):
        nxt = _skip_comment_or_string(sel, i)
        if nxt != i:
            buf.append(sel[i:nxt])
            i = nxt
            continue
        if sel[i] == "," and buf.count("(") == buf.count(")"):
            parts.append("".join(buf).strip())
            buf = []
        else:
            buf.append(sel[i])
        i += 1
    tail = "".join(buf).strip()
    if tail:
        parts.append(tail)
    return [p for p in parts if p]


def selector_is_dead(sel: str) -> bool:
    if DEAD_IDS.search(sel):
        return True
    # Class-only leftovers (NFP / settings / verification sidebar / LIR leftovers).
    if DEAD_CLASS.search(sel) and not re.search(r"#[a-zA-Z]", sel):
        # Keep if the selector also names a live id we care about (none of the
        # leftover class prefixes share an id with live modules).
        return True
    return False


def filter_selector(sel: str) -> str:
    kept = [p for p in split_selectors(sel) if not selector_is_dead(p)]
    return ",\n    ".join(kept)


def parse_blocks(css: str) -> list[tuple]:
    i, n, out = 0, len(css), []
    while i < n:
        start = i
        while i < n:
            nxt = _skip_comment_or_string(css, i)
            if nxt != i:
                i = nxt
                continue
            if css[i] in " \t\n\r":
                i += 1
            else:
                break
        prelude = css[start:i]
        if i >= n:
            if prelude:
                out.append(("text", prelude))
            break
        sel_start = i
        while i < n and css[i] not in "{;":
            nxt = _skip_comment_or_string(css, i)
            if nxt != i:
                i = nxt
                continue
            i += 1
        if i >= n:
            out.append(("text", css[start:]))
            break
        if css[i] == ";":
            out.append(("text", css[start : i + 1]))
            i += 1
            continue
        selector = css[sel_start:i].strip()
        i += 1
        depth, body_start = 1, i
        while i < n and depth:
            nxt = _skip_comment_or_string(css, i)
            if nxt != i:
                i = nxt
                continue
            if css[i] == "{":
                depth += 1
            elif css[i] == "}":
                depth -= 1
                if depth == 0:
                    out.append(("rule", prelude, selector, css[body_start:i]))
                    i += 1
                    break
            i += 1
    return out


def emit_blocks(blocks: list[tuple]) -> str:
    parts = []
    for kind, *rest in blocks:
        if kind == "text":
            parts.append(rest[0])
            continue
        prelude, selector, body = rest
        if selector.startswith("@") and not selector.startswith("@font-face"):
            inner = emit_blocks(parse_blocks(body))
            if not inner.strip():
                continue
            parts.append(f"{prelude}{selector} {{{inner}}}")
            continue
        kept = filter_selector(selector)
        if not kept:
            continue
        parts.append(f"{prelude}{kept} {{{body}}}")
    return "".join(parts)


def main() -> None:
    src = PATH.read_text()
    open_tag = src.find("<style>")
    close_tag = src.find("</style>", open_tag)
    if open_tag < 0 or close_tag < 0:
        raise SystemExit("style block not found")
    before = src[open_tag + len("<style>") : close_tag]
    after = emit_blocks(parse_blocks(before))
    # Collapse runs of blank lines left by dropped rules.
    after = re.sub(r"\n{3,}", "\n\n", after)
    PATH.write_text(src[: open_tag + len("<style>")] + after + src[close_tag:])
    print(f"style {len(before):,} → {len(after):,} chars ({len(before) - len(after):,} removed)")


if __name__ == "__main__":
    main()
