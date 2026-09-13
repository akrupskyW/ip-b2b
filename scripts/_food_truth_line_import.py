#!/usr/bin/env python3
"""
_food_truth_line_import.py — bring the FOODTRUTH lookbook pages in from source.

The generator writes each page as a "Frame N.jpg". This maps those frames to
the slugs the transcript masonry uses, then writes the two sizes the grid
needs: the full file the viewer opens and the thumbnail the tile carries.

    python3 scripts/_food_truth_line_import.py [src_dir]
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets' / 'food-truth-line'
SRC = Path('~/Desktop/_clothing-line').expanduser()

FULL_EDGE = 1600
THUMB_EDGE = 640

# slug -> source frame number. Titles live with the campaign module.
FRAMES = [
    ('kids-accessories-cream', 10),
    ('kids-knits', 11),
    ('kids-accessories-color', 12),
    ('kids-street', 13),
    ('kids-smart', 14),
    ('kids-beach-adventures', 15),
    ('beach-lockup', 16),
    ('kids-graphic-think-wise', 17),
    ('kids-graphic-be-kindly', 18),
    ('kids-graphic-stay-wise', 19),
    ('kids-swim-prints', 20),
    ('adult-everyday', 21),
    ('family-lockup', 22),
    ('dress-owl-paisley', 23),
    ('tuxedo-owl-jacquard', 24),
    ('suit-navy-house', 25),
    ('gown-evening', 26),
    ('adult-graphic-owl-face', 27),
    ('adult-graphic-be-wise', 28),
]


def fit(im, edge):
    w, h = im.size
    if max(w, h) <= edge:
        return im
    if w >= h:
        return im.resize((edge, max(1, round(h * edge / w))), Image.LANCZOS)
    return im.resize((max(1, round(w * edge / h)), edge), Image.LANCZOS)


def main():
    src_dir = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else SRC
    (DEST / 'thumbs').mkdir(parents=True, exist_ok=True)
    missing = []
    for slug, n in FRAMES:
        src = src_dir / f'Frame {n}.jpg'
        if not src.exists():
            missing.append(f'{slug} (Frame {n})')
            continue
        im = Image.open(src).convert('RGB')
        full = fit(im, FULL_EDGE)
        thumb = fit(im, THUMB_EDGE)
        full.save(DEST / f'{slug}.jpg', quality=86, optimize=True)
        thumb.save(DEST / 'thumbs' / f'{slug}.jpg', quality=84, optimize=True)
        print(f'{slug}: {full.size[0]}x{full.size[1]}  thumb {thumb.size[0]}x{thumb.size[1]}')
    if missing:
        print('MISSING: ' + ', '.join(missing))
        return 1
    print(f'{len(FRAMES)} lookbook pages imported')
    return 0


if __name__ == '__main__':
    sys.exit(main())
