"""One-shot build step: splice the product-comparison compare engine (CSS + JS)
into wiseai.html verbatim, so the side-pane board runs the exact same engine.
Idempotent: bails if the port markers are already present."""
import os

DIR = os.path.join(os.path.dirname(__file__), '..', 'pages')
SRC = os.path.join(DIR, 'product-comparison.html')
DST = os.path.join(DIR, 'wiseai.html')

with open(SRC, encoding='utf-8') as f:
    src_lines = f.read().split('\n')

# 1-indexed inclusive ranges
css_block = '\n'.join(src_lines[2129 - 1:3480])
js_block = '\n'.join(src_lines[11064 - 1:14374])

with open(DST, encoding='utf-8') as f:
    dst = f.read()

CSS_MARKER = '/* ===== PORTED COMPARE ENGINE CSS (from product-comparison.html) ===== */'
JS_MARKER = '/* ===== PORTED COMPARE ENGINE JS (from product-comparison.html) ===== */'

if CSS_MARKER in dst or JS_MARKER in dst:
    print('Port markers already present - nothing to do.')
    raise SystemExit(0)

css_anchor = ('    @media (prefers-reduced-motion: reduce) {\n'
              '      .wa-cmp-gauge-arc, .wa-cmp-bar-fill { transition-duration: 0.01ms; }\n'
              '    }\n  </style>')
if css_anchor not in dst:
    raise SystemExit('CSS anchor not found')
css_insert = ('    @media (prefers-reduced-motion: reduce) {\n'
              '      .wa-cmp-gauge-arc, .wa-cmp-bar-fill { transition-duration: 0.01ms; }\n'
              '    }\n\n    ' + CSS_MARKER + '\n' + css_block + '\n  </style>')
dst = dst.replace(css_anchor, css_insert)

js_anchor = '  </script>\n</body>'
if js_anchor not in dst:
    raise SystemExit('JS anchor not found')
js_insert = ('  </script>\n\n  <script>\n  ' + JS_MARKER + '\n' + js_block + '\n  </script>\n</body>')
dst = dst.replace(js_anchor, js_insert)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(dst)

print('Ported CSS (%d lines) and JS (%d lines) into wiseai.html' % (
    len(css_block.split('\n')), len(js_block.split('\n'))))
