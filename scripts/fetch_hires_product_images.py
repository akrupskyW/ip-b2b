#!/usr/bin/env python3
"""Replace the low-resolution product photos in assets/ with full-resolution
originals from Open Food Facts.

Background
----------
scripts/fetch_helix_foods.py originally populated assets/helix/ by downloading
Open Food Facts' *400px* front-image variant. OFF also serves the original
upload for the same product, usually 1000-3000px. This script re-fetches every
product that carries a UPC in the js/wiseai-chat.js PRODUCTS roster and swaps in
the largest image OFF holds.

Safety
------
* A file is replaced ONLY if the new image has strictly more pixels.
* Every original is copied to assets/_lowres_originals/<same path> first.
* Bytes are written unmodified when the format already matches the file
  extension; otherwise the image is re-encoded so the extension stays honest
  (noted in the report).
* Nothing outside assets/ is touched, and no .html/.js/.css file is modified,
  so filenames and every reference to them stay exactly as they are.

Usage
-----
    python3 scripts/fetch_hires_product_images.py              # apply
    python3 scripts/fetch_hires_product_images.py --dry-run    # report only
    python3 scripts/fetch_hires_product_images.py --only helix # limit by path

Writes scripts/hires_image_report.json and prints a before/after table.
Requires: requests, pillow.
"""
from __future__ import annotations

import argparse
import io
import json
import re
import shutil
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

try:
    import requests
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit('Missing dependencies. Run: pip3 install requests pillow')

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
BACKUP = ASSETS / '_lowres_originals'
ROSTER_JS = ROOT / 'js' / 'wiseai-chat.js'
REPORT = ROOT / 'scripts' / 'hires_image_report.json'

# Open Food Facts asks for a descriptive User-Agent with a contact address.
UA = 'WISEcode-ip3-hires/1.0 (contact: akrupsky@wisecode.ai)'
API = 'https://world.openfoodfacts.org/api/v2/product/{code}.json'
FIELDS = 'code,product_name,brands,selected_images,images'

SESSION = requests.Session()
SESSION.headers['User-Agent'] = UA

ENTRY_RE = re.compile(
    r"\{\s*img:\s*'((?:[^'\\]|\\.)*)'\s*,"
    r"\s*name:\s*'((?:[^'\\]|\\.)*)'\s*,"
    r"\s*brand:\s*'((?:[^'\\]|\\.)*)'"
    r"(?:\s*,\s*upc:\s*'((?:[^'\\]|\\.)*)')?"
)
SIZE_RE = re.compile(r'\.(100|200|400|full)\.(jpg|jpeg|png|webp)$', re.I)
EXT_FORMAT = {'.jpg': 'JPEG', '.jpeg': 'JPEG', '.png': 'PNG', '.webp': 'WEBP'}


def unescape(s: str) -> str:
    return s.replace("\\'", "'").replace('\\"', '"').replace('\\\\', '\\')


def read_roster() -> list[dict]:
    src = ROSTER_JS.read_text(encoding='utf-8')
    items, seen = [], set()
    for img, name, brand, upc in ENTRY_RE.findall(src):
        img = unescape(img)
        if img in seen:
            continue
        seen.add(img)
        items.append({
            'img': img,
            'name': unescape(name),
            'brand': unescape(brand),
            'upc': re.sub(r'\D', '', upc or ''),
        })
    return items


def measure(path: Path) -> tuple[int, int, int]:
    """(width, height, bytes) for an existing image, zeros if unreadable."""
    if not path.exists():
        return 0, 0, 0
    size = path.stat().st_size
    try:
        with Image.open(path) as im:
            return im.size[0], im.size[1], size
    except Exception:
        return 0, 0, size


def code_variants(code: str) -> list[str]:
    """The roster stores display UPC-A; OFF may key the same product as EAN-13."""
    out = [code]
    if len(code) == 12:
        out.append('0' + code)
    if len(code) == 13 and code.startswith('0'):
        out.append(code[1:])
    stripped = code.lstrip('0')
    if stripped and stripped not in out:
        out.append(stripped)
    return out


def lookup(code: str, retries: int = 3):
    for candidate in code_variants(code):
        for attempt in range(retries):
            try:
                r = SESSION.get(API.format(code=candidate),
                                params={'fields': FIELDS}, timeout=30)
            except requests.RequestException:
                time.sleep(1.5 * (attempt + 1))
                continue
            if r.status_code == 429:
                time.sleep(5 * (attempt + 1))
                continue
            if r.status_code != 200:
                break
            try:
                payload = r.json()
            except ValueError:
                break
            if payload.get('status') == 1 and payload.get('product'):
                return candidate, payload['product']
            break
    return None, None


def candidate_urls(product: dict) -> list[str]:
    """Front-image URLs to try, biggest-first."""
    urls: list[str] = []
    display = ((product.get('selected_images') or {}).get('front') or {}).get('display') or {}

    # The selected, cropped/rotated front image at original resolution.
    for url in display.values():
        if url:
            urls.append(SIZE_RE.sub(lambda m: f'.full.{m.group(2)}', url))

    # Raw uploads, which are sometimes larger than the selected crop.
    base = None
    for url in display.values():
        m = re.match(r'(https://images\.openfoodfacts\.org/images/products/.+?/)front_', url or '')
        if m:
            base = m.group(1)
            break
    if base:
        images = product.get('images') or {}
        raw = [k for k in images if k.isdigit()]

        def area(key: str) -> int:
            full = ((images[key].get('sizes') or {}).get('full') or {})
            try:
                return int(full.get('w') or 0) * int(full.get('h') or 0)
            except (TypeError, ValueError):
                return 0

        for key in sorted(raw, key=area, reverse=True)[:3]:
            urls.append(f'{base}{key}.jpg')

    # Last resort: whatever variant OFF gave us.
    urls.extend(u for u in display.values() if u)

    deduped, seen = [], set()
    for u in urls:
        if u not in seen:
            seen.add(u)
            deduped.append(u)
    return deduped


def download_best(urls: list[str]):
    best = None
    for url in urls:
        try:
            r = SESSION.get(url, timeout=60)
            if r.status_code != 200 or len(r.content) < 3000:
                continue
            with Image.open(io.BytesIO(r.content)) as im:
                im.load()
                w, h, fmt = im.size[0], im.size[1], im.format
        except Exception:
            continue
        if best is None or w * h > best['w'] * best['h']:
            best = {'w': w, 'h': h, 'fmt': fmt, 'blob': r.content, 'url': url}
        if best and max(best['w'], best['h']) >= 1500:
            break
    return best


def process(item: dict, apply_changes: bool) -> dict:
    rel = item['img']
    dest = ASSETS / rel
    cw, ch, cb = measure(dest)
    row = {
        'img': rel, 'brand': item['brand'], 'name': item['name'], 'upc': item['upc'],
        'before': f'{cw}x{ch}' if cw else 'missing', 'before_bytes': cb,
    }

    if not item['upc']:
        row['status'] = 'no_upc_in_roster'
        return row
    if not dest.exists():
        row['status'] = 'file_missing_on_disk'
        return row

    code, product = lookup(item['upc'])
    if not product:
        row['status'] = 'not_found_on_off'
        return row
    row['off_code'] = code
    row['off_name'] = product.get('product_name')
    row['off_brands'] = product.get('brands')

    best = download_best(candidate_urls(product))
    if not best:
        row['status'] = 'no_usable_image_on_off'
        return row

    row['after'] = f"{best['w']}x{best['h']}"
    row['source_url'] = best['url']

    if best['w'] * best['h'] <= cw * ch:
        row['status'] = 'kept_existing_off_not_larger'
        return row

    row['gain'] = round((best['w'] * best['h']) / max(cw * ch, 1), 1)
    if not apply_changes:
        row['status'] = 'would_replace'
        return row

    backup = BACKUP / rel
    backup.parent.mkdir(parents=True, exist_ok=True)
    if not backup.exists():
        shutil.copy2(dest, backup)

    want = EXT_FORMAT.get(dest.suffix.lower())
    if want and best['fmt'] != want:
        # Keep the extension truthful rather than renaming the file.
        with Image.open(io.BytesIO(best['blob'])) as im:
            if want == 'JPEG' and im.mode in ('RGBA', 'LA', 'P'):
                im = im.convert('RGB')
            buf = io.BytesIO()
            if want == 'JPEG':
                im.save(buf, 'JPEG', quality=95, subsampling=0, optimize=True)
            elif want == 'PNG':
                im.save(buf, 'PNG', optimize=True)
            else:
                im.save(buf, want, quality=95)
        blob = buf.getvalue()
        row['reencoded_to'] = want
    else:
        blob = best['blob']

    dest.write_bytes(blob)
    row['after_bytes'] = len(blob)
    row['status'] = 'replaced'
    return row


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true',
                    help='report what would change without writing files')
    ap.add_argument('--only', default='',
                    help='substring filter on the asset path, e.g. helix or portfolio')
    ap.add_argument('--workers', type=int, default=4,
                    help='parallel lookups (keep modest; OFF is a volunteer service)')
    args = ap.parse_args()

    items = read_roster()
    if args.only:
        items = [i for i in items if args.only in i['img']]
    if not items:
        print('No roster entries matched.')
        return 1

    print(f'{len(items)} roster entries; '
          f'{sum(1 for i in items if i["upc"])} carry a UPC.')
    print('Dry run — nothing will be written.\n' if args.dry_run else
          f'Originals are copied to {BACKUP.relative_to(ROOT)} before replacement.\n')

    apply_changes = not args.dry_run
    rows: list[dict] = []
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
        for row in pool.map(lambda i: process(i, apply_changes), items):
            rows.append(row)
            flag = {'replaced': '++', 'would_replace': ' ~'}.get(row['status'], '  ')
            print(f'{flag} {row["img"]:<64} {row["before"]:>10} -> '
                  f'{row.get("after", "-"):<10} {row["status"]}')

    REPORT.write_text(json.dumps(rows, indent=1), encoding='utf-8')

    from collections import Counter
    tally = Counter(r['status'] for r in rows)
    print('\nSummary')
    for status, n in tally.most_common():
        print(f'  {n:>4}  {status}')
    changed = [r for r in rows if r['status'] in ('replaced', 'would_replace')]
    if changed:
        avg = sum(r.get('gain', 0) for r in changed) / len(changed)
        print(f'\n{len(changed)} images upgraded, {avg:.0f}x more pixels on average.')
    print(f'Report: {REPORT.relative_to(ROOT)}')
    if apply_changes and any(r['status'] == 'replaced' for r in rows):
        print('\nReview with:  git diff --stat assets/')
        print('Revert all:   git checkout -- assets/   '
              '(or restore from assets/_lowres_originals/)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
