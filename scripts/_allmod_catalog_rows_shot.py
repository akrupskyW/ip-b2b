"""Screenshot All Modules Component Library rows + Output chips portrait.

  python3 scripts/_allmod_catalog_rows_shot.py [light|dark]
"""
import base64
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/all-modules.html#mi-components"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"

OPEN_LIB = r"""
(async function () {
  var sec = document.getElementById('mi-components');
  if (!sec) return 'no-section';
  var head = sec.querySelector(':scope > .mi-module-head');
  if (sec.classList.contains('is-collapsed') && head) head.click();
  for (var i = 0; i < 40; i++) {
    if (document.querySelector('[data-ds-comp]')) break;
    await new Promise(function (r) { setTimeout(r, 250); });
  }
  return document.querySelectorAll('[data-ds-comp]').length + ' cards';
})()
"""

SCROLL_TO = r"""
(function(name){
  var card = document.querySelector('[data-comp-name="'+name+'"]');
  if (!card) return null;
  var sc = document.getElementById('agent-main-scroll') || card.closest('.agent-main-scroll');
  if (sc) {
    var c = card.getBoundingClientRect();
    var s = sc.getBoundingClientRect();
    sc.scrollTop += (c.top - s.top) - 12;
  }
  var r = card.getBoundingClientRect();
  return { x: Math.max(0, r.left - 8), y: Math.max(0, r.top - 8),
           w: Math.min(r.width + 16, window.innerWidth - Math.max(0, r.left - 8)),
           h: Math.min(r.height + 16, window.innerHeight - Math.max(0, r.top - 8), 1600) };
})
"""

RANGE_RECT = r"""
(function(first, last){
  var a = document.querySelector('[data-comp-name="'+first+'"]');
  var b = document.querySelector('[data-comp-name="'+last+'"]');
  if (!a || !b) return null;
  var sc = document.getElementById('agent-main-scroll') || a.closest('.agent-main-scroll');
  if (sc) {
    var c = a.getBoundingClientRect();
    var s = sc.getBoundingClientRect();
    sc.scrollTop += (c.top - s.top) - 12;
  }
  var ra = a.getBoundingClientRect();
  var rb = b.getBoundingClientRect();
  var top = Math.min(ra.top, rb.top);
  var bottom = Math.max(ra.bottom, rb.bottom);
  var left = Math.min(ra.left, rb.left);
  var right = Math.max(ra.right, rb.right);
  return { x: Math.max(0, left - 8), y: Math.max(0, top - 8),
           w: Math.min(right - left + 16, window.innerWidth - Math.max(0, left - 8)),
           h: Math.min(bottom - top + 16, window.innerHeight - Math.max(0, top - 8), 1600) };
})
"""

OPEN_CARD = r"""
(function(name){
  var card = document.querySelector('[data-comp-name="'+name+'"]');
  if (!card) return 'no-card';
  if (card.classList.contains('is-collapsed')) {
    var ch = card.querySelector(':scope > .dsc-card-head');
    if (ch) ch.click();
  }
  return card.classList.contains('is-collapsed') ? 'still-collapsed' : 'open';
})
"""

PROBE = r"""
(function(){
  var cards = Array.from(document.querySelectorAll('[data-ds-comp]'));
  var sample = cards.slice(0, 8).map(function(c){
    return {
      name: c.dataset.compName,
      cls: !!c.querySelector('.dsc-class'),
      lede: (c.querySelector('.dsc-lede') || {}).textContent || '',
      portrait: c.querySelectorAll('.sc-surface-card--portrait').length
    };
  });
  var out = cards.find(function(c){ return c.dataset.compName === 'Output chips'; });
  return {
    cards: cards.length,
    withClass: cards.filter(function(c){ return c.querySelector('.dsc-class'); }).length,
    withLede: cards.filter(function(c){ return c.querySelector('.dsc-lede'); }).length,
    gold: document.querySelectorAll('.dash-score-toast--gold:not([hidden])').length,
    goldMi: document.querySelectorAll('.dash-score-toast--mi:not([hidden])').length,
    sample: sample,
    outPortrait: out ? out.querySelectorAll('.sc-surface-card--portrait').length : -1
  };
})()
"""


def shot(b, clip, name):
    os.makedirs(OUT, exist_ok=True)
    res = b.cmd("Page.captureScreenshot", {"format": "png", "clip": {
        "x": clip["x"], "y": clip["y"], "width": clip["w"], "height": clip["h"], "scale": 2}})
    path = os.path.join(OUT, "allmod-catalog__%s__%s.png" % (name, THEME))
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(res["result"]["data"]))
    print("shot", path)
    return path


def main():
    b = Browser(port=9411, width=1440, height=1400, out=OUT)
    try:
        dark = "document.documentElement.classList.add('dark');" if THEME == "dark" else ""
        b.on_new_document(
            "try{localStorage.clear();"
            "localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,name:'Arthur Krupsky',"
            "email:'akrupsky@wisecode.ai',initials:'AK'}));"
            "localStorage.setItem('wise-theme','%s');"
            "localStorage.setItem('chat-theme','%s');}catch(e){}"
            "%s" % (THEME, THEME, dark))
        b.goto(URL, ready="document.readyState==='complete'", timeout=60.0, settle=2.0)
        for _ in range(45):
            time.sleep(0.4)
            if b.js("!!document.getElementById('mi-components')"):
                break
        print("open lib:", b.js(OPEN_LIB))
        time.sleep(1.4)
        print("probe:", b.js(PROBE))
        r = b.js(RANGE_RECT + '("Dashboard card","Form fields")')
        print("rows rect:", r)
        if r:
            shot(b, r, "rows")
        print("open output chips:", b.js(OPEN_CARD + '("Output chips")'))
        time.sleep(0.8)
        b.js(r"""
        (function(){
          var card = document.querySelector('[data-comp-name="Output chips"]');
          var rail = card && card.querySelector('.sc-surface-rail');
          var sc = document.getElementById('agent-main-scroll');
          if (!rail || !sc) return false;
          var c = rail.getBoundingClientRect();
          var s = sc.getBoundingClientRect();
          sc.scrollTop += (c.top - s.top) - 80;
          return true;
        })()
        """)
        time.sleep(0.3)
        r2 = b.js(r"""
        (function(){
          var card = document.querySelector('[data-comp-name="Output chips"]');
          if (!card) return null;
          var r = card.getBoundingClientRect();
          return { x: Math.max(0, r.left - 8), y: Math.max(0, r.top - 8),
                   w: Math.min(r.width + 16, window.innerWidth - Math.max(0, r.left - 8)),
                   h: Math.min(r.height + 16, window.innerHeight - Math.max(0, r.top - 8), 1600) };
        })()
        """)
        print("out rect:", r2)
        if r2:
            shot(b, r2, "output-chips")
        print("probe after open:", b.js(PROBE))
    finally:
        b.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
