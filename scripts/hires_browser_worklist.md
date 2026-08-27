# High-res image worklist — items Open Food Facts cannot serve

These need sourcing from a retailer or the brand directly (Amazon / Target /
brand press kit). Everything with a UPC in the `wiseai-chat.js` roster is handled
by `scripts/fetch_hires_product_images.py` instead — don't duplicate that work here.

Target: replace in place, same filename, maximum available resolution.

## A. Product packshots — retailer listings are the right source (13)

| File | Current | Product to find |
|---|---|---|
| `compare/sug_bearnaked.jpg` | 184x400 | Bear Naked Fruit & Nut Granola |
| `compare/sug_bobs.jpg` | 184x400 | Bob's Red Mill Honey Oat Granola |
| `compare/sug_chosen.jpg` | 300x400 | Chosen Foods Avocado Dip |
| `compare/sug_lara.jpg` | 185x400 | Larabar Fruit & Nut Bar |
| `compare/sug_michele.jpg` | 205x400 | Michele's Original Granola |
| `compare/sug_primal.jpg` | 300x400 | Primal Kitchen Ranch Dip |
| `compare/sug_purely.jpg` | 300x400 | Purely Elizabeth Ancient Grain Granola |
| `compare/sug_rxbar.jpg` | 210x400 | RXBAR Chocolate Sea Salt |
| `compare/sug_sabra.jpg` | 185x400 | Sabra Classic Hummus |
| `compare/sug_siete.jpg` | 242x400 | Siete Cashew Queso |
| `compare/sug_wholly.jpg` | 228x400 | Wholly Guacamole Classic |
| `compare/cascadian.jpg` | 246x400 | Cascadian Farm Vanilla Almond cereal |
| `compare/w365.jpg` | 592x1280 | 365 Organic Almond Granola (Whole Foods) |

## B. Brand marks, not packshots — press kit or SVG, not a retailer (11)

These are `entities` in the comparison data, so a logo is wanted, not a package.
Prefer SVG (the repo already has `kraft.svg`, `daiya.svg`, `w365brand.svg`).

| File | Current | Brand |
|---|---|---|
| `compare/banza.png` | 96x96 | Banza |
| `compare/amys.png` | 192x192 | Amy's Kitchen |
| `compare/annies.png` | 192x192 | Annie's |
| `compare/crackerbarrel.png` | 192x192 | Cracker Barrel |
| `compare/chefboyardee.png` | 213x130 | Chef Boyardee |
| `compare/barilla.png` | 256x256 | Barilla |
| `compare/velveeta.png` | 256x256 | Velveeta |
| `compare/simpletruth.png` | 256x256 | Simple Truth (Kroger) |
| `compare/moderntable.png` | 256x256 | Modern Table |
| `compare/chickapea.png` | 512x268 | Chickapea |
| `compare/raos.png` | 512x268 | Rao's Homemade |

## C. No UPC in the roster — need the UPC or the brand's own photo (7)

| File | Current | Product |
|---|---|---|
| `portfolio/apple_cinnamon_muffins.png` | 96x96 | Flax4Life Apple Cinnamon Muffins 4ct |
| `portfolio/carrot_raisin_muffins.png` | 96x96 | Flax4Life Carrot Raisin Muffins 4ct |
| `portfolio/chocolate_brownies.png` | 96x96 | Flax4Life Chocolate Brownies 12ct |
| `portfolio/dark_cherry_brownies.png` | 96x96 | Flax4Life Mini Dark Cherry Brownie Flax Muffins |
| `portfolio/vegan_blueberry_mini.png` | 96x96 | Flax4Life Vegan Blueberry Mini Muffins |
| `verification/ns-powdered-vitamin-eggs.png` | 600x600 | Nutrient Survival Powdered Vitamin Eggs |
| `verification/ns-powdered-vitamin-potato.png` | 600x600 | Nutrient Survival Powdered Vitamin Potato |

Note on C: the six 2000x2000 Nutrient Survival siblings look rendered rather than
photographed. If they are, matching that look matters more than raw resolution —
regenerating these two beats sourcing a real photo that won't match.

## Useful CDN size handles

- Amazon: the image id carries a size token — `..._SL1600_.jpg`. Strip the token
  entirely (`..../I/<id>.jpg`) for the largest stored original.
- Target (scene7): append `?wid=1200&hei=1200&fmt=webp` — raise `wid` until it stops growing.
- Instagram: brand feeds are compressed and usually cropped square; treat as a
  last resort behind the brand's own media kit.
