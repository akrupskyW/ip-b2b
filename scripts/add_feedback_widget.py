#!/usr/bin/env python3
"""Add (or remove) the on-page comment widget script tag on every HTML page.

The widget is a single self-contained file, so propagating it is one <script>
tag per page, inserted just before </body> where the other deferred app scripts
live. Idempotent: pages that already have the tag are left untouched.

    python3 scripts/add_feedback_widget.py            # report only
    python3 scripts/add_feedback_widget.py --apply
    python3 scripts/add_feedback_widget.py --apply --remove
"""

import argparse
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = "js/feedback.js"


def targets():
    found = []
    for name in sorted(os.listdir(ROOT)):
        if name.endswith(".html"):
            found.append(name)
    pages = os.path.join(ROOT, "pages")
    for name in sorted(os.listdir(pages)):
        if name.endswith(".html"):
            found.append(os.path.join("pages", name))
    return found


def tag_for(rel):
    prefix = "../" if os.path.dirname(rel) else ""
    return '  <script defer src="%s%s"></script>\n' % (prefix, MARK)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write changes")
    ap.add_argument("--remove", action="store_true", help="strip the tag instead")
    args = ap.parse_args()

    changed, skipped, failed = [], [], []

    for rel in targets():
        path = os.path.join(ROOT, rel)
        with open(path, "r", encoding="utf-8") as fh:
            html = fh.read()
        has = MARK in html

        if args.remove:
            if not has:
                skipped.append(rel)
                continue
            out = re.sub(r"[ \t]*<script[^>]*%s[^>]*></script>\n?" % re.escape(MARK), "", html)
        else:
            if has:
                skipped.append(rel)
                continue
            idx = html.rfind("</body>")
            if idx == -1:
                failed.append(rel)
                continue
            out = html[:idx] + tag_for(rel) + html[idx:]

        changed.append(rel)
        if args.apply:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(out)

    verb = "removed from" if args.remove else "added to"
    head = "%s %d file(s)" % (verb, len(changed)) if args.apply else "would change %d file(s)" % len(changed)
    print(head)
    for rel in changed:
        print("  " + rel)
    print("already correct: %d" % len(skipped))
    if failed:
        print("NO </body> (skipped): %s" % ", ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
