#!/usr/bin/env python3
"""Fetch unique food product photos for the WISEcodeAI welcome-helix animation.

Pulls popular products from Open Food Facts (sorted by scan count), keeps only
US/Canada-barcoded items (EAN-13 leading 0 → UPC-A space) that have a front
photo, an ASCII English name, and a brand, downloads each 400px front image
into assets/helix/, and emits a JS snippet of PRODUCTS entries with the
name / brand / UPC the hover card needs.
"""
import json
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'assets' / 'helix'
OUT_DIR.mkdir(parents=True, exist_ok=True)

UA = {'User-Agent': 'WISE-Demo/1.0 (contact: demo@wise.example)'}
TARGET = int(sys.argv[1]) if len(sys.argv) > 1 else 100

def get(url, retries=3):
    for i in range(retries):
        r = subprocess.run(
            ['curl', '-sfL', '--max-time', '40', '-H', f'User-Agent: {UA["User-Agent"]}', url],
            capture_output=True)
        if r.returncode == 0 and r.stdout:
            return r.stdout
        if i == retries - 1:
            raise RuntimeError(f'curl failed ({r.returncode}) for {url}')
        time.sleep(2 * (i + 1))

def slugify(name, brand):
    s = re.sub(r'[^a-z0-9]+', '-', (brand + '-' + name).lower()).strip('-')
    return s[:60] or 'item'

NON_EN = re.compile(
    r'\b(au|aux|de|des|du|la|le|les|et|sans|avec|saveur|confiture|moutarde|'
    r'pain|lait|beurre|fromage|sucre|fraise|citron|mangue|pommes|huile|'
    r'entier|naturel|negro|cacao|leche|galletas|con)\b', re.I)

def looks_english(s):
    if not s:
        return False
    try:
        s.encode('ascii')
    except UnicodeEncodeError:
        return False
    return not NON_EN.search(s)

def upc_display(code):
    # 12-digit UPC-A (or EAN-13 with a leading 0) → the familiar UPC grouping;
    # other EAN-13 codes are left as-is.
    c = code[1:] if len(code) == 13 and code.startswith('0') else code
    if len(c) == 12:
        return f'{c[0]} {c[1:6]} {c[6:11]} {c[11]}'
    return code

seen_names = set()
brand_count = {}
picked = []
page = 1
while len(picked) < TARGET and page <= 60:
    url = ('https://search.openfoodfacts.org/search'
           '?q=countries_tags:%22en:united-states%22%20lang:en'
           '&fields=code,product_name,brands,image_front_url'
           f'&page_size=100&page={page}&sort_by=-unique_scans_n')
    data = json.loads(get(url))
    hits = data.get('hits', [])
    if not hits:
        break
    for p in hits:
        code = p.get('code') or ''
        name = (p.get('product_name') or '').strip()
        brands = p.get('brands') or []
        if isinstance(brands, str):
            brands = [brands]
        brand = (brands[0] if brands else '').strip()
        img = p.get('image_front_url') or ''
        if len(picked) >= TARGET:
            break
        if not (code.isdigit() and len(code) in (12, 13)):
            continue
        # Store-internal (2…) prefixes and obvious sequential test codes.
        if code.lstrip('0').startswith('2') or code in ('5012345678900', '1234567890128'):
            continue
        if not img or not name or not brand:
            continue
        if not looks_english(name) or not looks_english(brand):
            continue
        if len(name) < 3 or len(name) > 60:
            continue
        nkey = re.sub(r'[^a-z0-9]+', ' ', name.lower()).strip()
        if nkey in seen_names:
            continue
        bkey = brand.lower()
        if brand_count.get(bkey, 0) >= 2:
            continue
        seen_names.add(nkey)
        brand_count[bkey] = brand_count.get(bkey, 0) + 1
        picked.append({'code': code, 'name': name, 'brand': brand, 'img': img})
    print(f'page {page}: total picked {len(picked)}', flush=True)
    page += 1
    time.sleep(0.4)

entries = []
for i, p in enumerate(picked):
    slug = slugify(p['name'], p['brand'])
    ext = '.jpg' if '.jpg' in p['img'] else '.png'
    fname = f'{slug}{ext}'
    dest = OUT_DIR / fname
    if not dest.exists():
        try:
            blob = get(p['img'])
        except Exception as e:
            print(f'  SKIP (download failed): {p["brand"]} {p["name"]}: {e}', flush=True)
            continue
        if not blob or len(blob) < 2000:
            print(f'  SKIP (empty/tiny): {p["brand"]} {p["name"]}', flush=True)
            continue
        dest.write_bytes(blob)
    entries.append({**p, 'file': fname})
    if (i + 1) % 10 == 0:
        print(f'downloaded {i + 1}/{len(picked)}', flush=True)
    time.sleep(0.15)

def js_str(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"

lines = []
for e in entries:
    lines.append('      { img: %s, name: %s, brand: %s, upc: %s },' % (
        js_str('helix/' + e['file']), js_str(e['name']),
        js_str(e['brand']), js_str(upc_display(e['code']))))

snippet = ROOT / 'scripts' / 'helix_products_snippet.js'
snippet.write_text('\n'.join(lines) + '\n')
print(f'\nWrote {len(entries)} entries → {snippet}')
print(f'Images in {OUT_DIR}')
