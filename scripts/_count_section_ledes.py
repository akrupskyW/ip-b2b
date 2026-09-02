#!/usr/bin/env python3
"""Count words in All Modules section ledes (HTML stripped)."""
import re, pathlib, sys

src = pathlib.Path(sys.argv[1]).read_text()
# Pull SECTION_LEDES values
blocks = re.findall(r"'mi-[^']+':\s*`([^`]*)`", src, re.S)
if not blocks:
    # fallback: count each <!--WORDCOUNT:id--> ... <!--/WORDCOUNT-->
    blocks = re.findall(r'<!--WORDCOUNT:(\w+)-->(.*?)<!--/WORDCOUNT-->', src, re.S)
    for name, html in blocks:
        text = re.sub(r'<[^>]+>', ' ', html)
        words = re.findall(r"[A-Za-z0-9'’]+", text)
        print(f'{name}: {len(words)}')
    raise SystemExit(0)

# named
named = re.findall(r"'(mi-[^']+)':\s*`([^`]*)`", src, re.S)
for name, html in named:
    text = re.sub(r'<[^>]+>', ' ', html)
    words = re.findall(r"[A-Za-z0-9'’]+", text)
    print(f'{name}: {len(words)}')
