#!/usr/bin/env python3
"""
_campaign_card_import.py — bring the Food Truth Wins deck in from the source art.

The generator writes every card already squared to the 2:3 the collector grid
uses, under a UUID filename, so importing is a rename plus the two sizes the
transcript needs: the full file the viewer opens and the thumbnail the grid
carries. The map below is the only place a UUID is tied to a card, and it is
read from the art itself — each card prints its own name, faction, role and
number on the front.

    python3 scripts/_campaign_card_import.py [src_dir]
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / 'assets' / 'wise-campaign' / 'cards'
SRC = Path('~/Desktop/_campaigns/_cards').expanduser()

FULL = (1024, 1536)
THUMB = (427, 640)

# slug -> the UUID stem the card was generated under. 01-12 are the original
# twelve; 13-24 are the cast dealt in behind them.
DECK = [
    ('agent-apple', '9edc90c2'),
    ('captain-carrot', '8b47e475'),
    ('dr-blueberry', '431a5c96'),
    ('lentil-legend', 'a07a0b15'),
    ('kiwi-key', 'cc531fc7'),
    ('professor-pear', '64e91661'),
    ('baron-bonbon', '21ab0c36'),
    ('madam-marshmallow', '38ec0594'),
    ('doctor-frosting', 'e524f0f0'),
    ('pretzel-plot', '8e2eb80c'),
    ('lord-licorice', 'f712d820'),
    ('count-cookie', '9b02248f'),
    ('agent-avocado', '3cc12a0a'),
    ('broccoli-beacon', '150a61cd'),
    ('quinoa-quest', '86b925c9'),
    ('taco-tactic', 'e023e2b1'),
    ('grape-guardian', '53c67858'),
    ('burger-bluff', 'ebbf2212'),
    ('pizza-phantom', 'ccd24e57'),
    ('donut-detour', 'e0b4b193'),
    ('soda-spin', 'b151c933'),
    ('coffee-cipher', '500e1ef6'),
    ('professor-puff', 'd16d7ecd'),
]


def main():
    src_dir = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else SRC
    (CARDS / 'thumbs').mkdir(parents=True, exist_ok=True)
    missing = []
    for slug, stem in DECK:
        # The generator sometimes wrote the same card twice ("... (1).png");
        # either copy is the same art, so take the plain one first.
        hits = sorted(src_dir.glob(stem + '*.png'), key=lambda p: len(p.name))
        if not hits:
            missing.append(slug)
            continue
        im = Image.open(hits[0]).convert('RGB')
        im.resize(FULL, Image.LANCZOS).save(CARDS / f'{slug}.jpg', quality=88, optimize=True)
        im.resize(THUMB, Image.LANCZOS).save(
            CARDS / 'thumbs' / f'{slug}.jpg', quality=86, optimize=True)
        print(f'{slug}: {hits[0].name}')
    # The deck is a mirror, not a pile: a card the artist has retired leaves
    # the repo too, or it keeps showing up in the grid long after it is gone.
    keep = {slug for slug, _ in DECK}
    for old in sorted(CARDS.glob('*.jpg')) + sorted((CARDS / 'thumbs').glob('*.jpg')):
        if old.stem not in keep:
            old.unlink()
            print(f'removed {old.parent.name}/{old.name}')
    if missing:
        print('MISSING: ' + ', '.join(missing))
        return 1
    print(f'{len(DECK)} cards imported')
    return 0


if __name__ == '__main__':
    sys.exit(main())
