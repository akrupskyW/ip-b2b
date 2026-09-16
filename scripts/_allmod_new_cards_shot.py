"""Open every card added to the Component Library this pass and shoot it.

Checks that each new card is in the catalog, that its demo renders, and that
the three lazily-hydrated specimens (gallery, character bible, inline film)
actually finish loading out of the campaign packs.

  python3 scripts/_allmod_new_cards_shot.py [light|dark]
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

NEW_CARDS = [
    ("Transcript gallery", "gallery"),
    ("Character bible", "bible"),
    ("Inline film", "film"),
    ("People in chat", "people"),
    ("Outputs in the thread", "outmode"),
    ("Spent chip rows", "spentchips"),
    ("Product lifecycle banner", "lifecycle"),
]

OPEN_LIB = r"""
(async function () {
  var sec = document.getElementById('mi-components');
  if (!sec) return 'no-section';
  var head = sec.querySelector(':scope > .mi-module-head');
  if (sec.classList.contains('is-collapsed') && head) head.click();
  for (var i = 0; i < 60; i++) {
    if (document.querySelector('[data-ds-comp]')) break;
    await new Promise(function (r) { setTimeout(r, 250); });
  }
  return document.querySelectorAll('[data-ds-comp]').length + ' cards';
})()
"""

OPEN_CARD = r"""
(function(name){
  var card = document.querySelector('[data-comp-name="'+name+'"]');
  if (!card) return 'MISSING';
  if (card.classList.contains('is-collapsed')) {
    var ch = card.querySelector(':scope > .dsc-card-head');
    if (ch) ch.click();
  }
  return card.classList.contains('is-collapsed') ? 'still-collapsed' : 'open';
})
"""

CARD_STATE = r"""
(function(name){
  var card = document.querySelector('[data-comp-name="'+name+'"]');
  if (!card) return { missing: true };
  var body = card.querySelector(':scope > .dsc-card-body');
  return {
    lede: !!card.querySelector('.dsc-lede'),
    note: !!card.querySelector('.dsc-note'),
    used: !!card.querySelector('.dsc-used, .dsc-used-row, .dsc-refs'),
    bodyChars: body ? body.textContent.trim().length : 0,
    tiles: card.querySelectorAll('.sc-mgrid-item').length,
    grids: card.querySelectorAll('.sc-mgrid').length,
    packed: card.querySelectorAll('.sc-mgrid-grid > .sc-mgrid-item[style*="span"]').length,
    bible: card.querySelectorAll('.wcb-card').length,
    film: card.querySelectorAll('.sc-inline-film-media').length,
    railFoot: card.querySelectorAll('.sc-mgrid-count').length,
    waiting: card.querySelectorAll('[data-gallery-demo] .dsc-empty').length,
    brokenImg: Array.from(card.querySelectorAll('img')).filter(function(i){
      return i.complete && i.naturalWidth === 0; }).length
  };
})
"""

CLIP = r"""
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
           h: Math.min(r.height + 16, window.innerHeight - Math.max(0, r.top - 8), 1800) };
})
"""


def shot(b, clip, name):
    os.makedirs(OUT, exist_ok=True)
    res = b.cmd("Page.captureScreenshot", {"format": "png", "clip": {
        "x": clip["x"], "y": clip["y"], "width": clip["w"],
        "height": clip["h"], "scale": 2}})
    path = os.path.join(OUT, "allmod-new__%s__%s.png" % (name, THEME))
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(res["result"]["data"]))
    print("  shot", path)
    return path


def main():
    b = Browser(port=9413, width=1440, height=1500, out=OUT)
    bad = []
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
        time.sleep(1.2)

        for name, stem in NEW_CARDS:
            state = b.js(OPEN_CARD + '("%s")' % name)
            print("%-26s %s" % (name, state))
            if state == "MISSING":
                bad.append("%s: not in catalog" % name)
                continue
            # The lazily-hydrated specimens need the campaign packs to land.
            for _ in range(30):
                time.sleep(0.4)
                st = b.js(CARD_STATE + '("%s")' % name)
                if not st.get("waiting"):
                    break
            time.sleep(1.0)
            st = b.js(CARD_STATE + '("%s")' % name)
            print("   ", st)
            if st.get("waiting"):
                bad.append("%s: specimen never hydrated" % name)
            if st.get("bodyChars", 0) < 40:
                bad.append("%s: demo body is empty" % name)
            if not st.get("note"):
                bad.append("%s: no note" % name)
            if not st.get("lede"):
                bad.append("%s: no lede" % name)
            if st.get("brokenImg"):
                bad.append("%s: %d broken images" % (name, st["brokenImg"]))
            clip = b.js(CLIP + '("%s")' % name)
            time.sleep(0.4)
            if clip:
                shot(b, clip, stem)
            # Leave it closed so the next card lands near the top of the scroller.
            b.js(OPEN_CARD + '("%s")' % name)
            time.sleep(0.3)
    finally:
        b.close()
    print("\n=== %s ===" % THEME.upper())
    if bad:
        for line in bad:
            print("FAIL", line)
        return 1
    print("all new cards present, hydrated, and captured")
    return 0


if __name__ == "__main__":
    sys.exit(main())
