#!/usr/bin/env python3
"""
_campaign_card_trim.py — turn a generated card into a Food Truth Wins asset.

The image generator only offers 3:4, and the collector rail is 2:3, so every
card is drawn to fill the frame's height with flat background down the left and
right. This finds the card inside that frame, squares it to 2:3, and writes the
full-size file and its thumbnail at the sizes the rest of the set already uses.

    python3 scripts/_campaign_card_trim.py <src.png> <slug>
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / 'assets' / 'wise-campaign' / 'cards'

FULL = (1024, 1536)
THUMB = (427, 640)
# How far a pixel must drift from the corner before it counts as the card
# rather than the flat margin the card was drawn inside.
TOLERANCE = 26


def card_box(im):
    """Bounding box of the card inside its flat margin."""
    px = im.convert('RGB').load()
    w, h = im.size
    bg = px[1, 1]

    def differs(x, y):
        p = px[x, y]
        return max(abs(p[i] - bg[i]) for i in range(3)) > TOLERANCE

    def edge(rng, probe):
        """First line in `rng` holding any pixel that is not the margin."""
        for i in rng:
            if any(differs(*probe(i, j)) for j in range(0, probe.span, 3)):
                return i
        return None

    def cols(i, j):
        return (i, j)
    cols.span = h

    def rows(i, j):
        return (j, i)
    rows.span = w

    left = edge(range(w), cols)
    right = edge(range(w - 1, -1, -1), cols)
    top = edge(range(h), rows)
    bottom = edge(range(h - 1, -1, -1), rows)
    if None in (left, right, top, bottom):
        return (0, 0, w, h)
    return (left, top, right + 1, bottom + 1)


def to_ratio(box, size, ratio=2 / 3):
    """Grow the box to exactly `ratio`, staying inside the image."""
    left, top, right, bottom = box
    w, h = right - left, bottom - top
    if w / h > ratio:
        h = round(w / ratio)
    else:
        w = round(h * ratio)
    cx, cy = (left + right) / 2, (top + bottom) / 2
    left = round(cx - w / 2)
    top = round(cy - h / 2)
    # Slide back inside the canvas rather than clipping the frame off one side.
    left = max(0, min(left, size[0] - w))
    top = max(0, min(top, size[1] - h))
    return (left, top, left + w, top + h)


def main():
    if len(sys.argv) != 3:
        print(__doc__.strip())
        return 1
    src, slug = Path(sys.argv[1]).expanduser(), sys.argv[2]
    im = Image.open(src)
    box = to_ratio(card_box(im), im.size)
    card = im.crop(box).convert('RGB')

    (CARDS / 'thumbs').mkdir(parents=True, exist_ok=True)
    card.resize(FULL, Image.LANCZOS).save(CARDS / f'{slug}.jpg', quality=88, optimize=True)
    card.resize(THUMB, Image.LANCZOS).save(CARDS / 'thumbs' / f'{slug}.jpg', quality=86, optimize=True)
    print(f'{slug}: cropped {im.size} -> {box} ({box[2] - box[0]}x{box[3] - box[1]})')
    return 0


if __name__ == '__main__':
    sys.exit(main())
