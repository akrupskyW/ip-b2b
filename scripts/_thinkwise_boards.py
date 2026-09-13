#!/usr/bin/env python3
"""Bring the member's own campaign boards into the Wise Walk asset folder.

The five frames are contact sheets — several executions to a sheet — shot at
12081x8054. They are the art the campaign was approved from, so they ship
alongside the generated pieces rather than only acting as a style reference.

Dense sheets need more pixels than a single execution does: four panels at
1280 wide leaves each one too small to read the tagline. These land at 1800
wide, with the usual half-size thumb beside them.
"""

import os

from PIL import Image

Image.MAX_IMAGE_PIXELS = None

SRC = "/Users/aeykay/Desktop/_campaigns2"
DST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "assets", "think-wise")
FULL_W = 1800

# Each sheet, named for what is actually on it.
BOARDS = [
    ("Frame 8.jpg", "board-store-murals.jpg"),
    ("Frame 6.jpg", "board-neighbourhood-murals.jpg"),
    ("Frame 7.jpg", "board-park-and-street.jpg"),
    ("Frame 5.jpg", "board-park-installation.jpg"),
    ("Frame 9.jpg", "board-city-walls.jpg"),
]


def main():
    thumbs = os.path.join(DST, "thumbs")
    os.makedirs(thumbs, exist_ok=True)
    for src_name, out_name in BOARDS:
        src = os.path.join(SRC, src_name)
        im = Image.open(src)
        im = im.convert("RGB")
        w, h = im.size
        full_h = int(round(FULL_W * h / w))
        full = im.resize((FULL_W, full_h), Image.LANCZOS)
        full.save(os.path.join(DST, out_name), "JPEG", quality=88, optimize=True,
                  progressive=True)
        thumb = full.resize((FULL_W // 2, full_h // 2), Image.LANCZOS)
        thumb.save(os.path.join(thumbs, out_name), "JPEG", quality=82,
                   optimize=True, progressive=True)
        print("  %-28s %5dx%-5d  from %dx%d" % (out_name, FULL_W, full_h, w, h))
    print("\n%d boards -> %s" % (len(BOARDS), DST))


if __name__ == "__main__":
    main()
