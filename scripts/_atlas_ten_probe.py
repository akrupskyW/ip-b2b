"""Confirm the Food Intervention Atlas turn posts ten output chips.

Drives the atlas intent on wiseai.html, waits for the rail, and checks:
the lead says ten, ten portrait chips landed, and tapping one of the
Results chips (the closing read) is what opens the module.
"""
import base64
import json
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
WAIT_S = float(sys.argv[2]) if len(sys.argv) > 2 else 90.0

STATE = r"""
(function(){
  var host = document.querySelector('[id$="-messages"]');
  var lead = host && host.querySelector('.sc-surface-rail-lead');
  var cards = host ? Array.from(host.querySelectorAll('.sc-surface-card[data-surface]')) : [];
  var titles = cards.map(function(c){
    var t = c.querySelector('.sc-surface-title');
    return t ? t.textContent.replace(/\s+/g, ' ').trim() : '';
  });
  var open = ['wa-results','wa-visuals','wa-unified','wa-report'].filter(function(id){
    var el = document.getElementById(id);
    return el && el.classList.contains('is-open');
  });
  return {
    lead: lead ? lead.textContent.replace(/\s+/g, ' ').trim() : '',
    cards: cards.length,
    portrait: host ? host.querySelectorAll('.sc-surface-card--portrait[data-surface]').length : 0,
    titles: titles,
    open: open,
    chips: host ? host.querySelectorAll('.sc-inline-chips .chip, .sc-reply-chips .chip').length : 0
  };
})()
"""

RAIL_RECT = r"""
(function(){
  var lead = document.querySelector('.sc-surface-rail-lead');
  var rail = document.querySelector('.sc-line-body > .sc-surface-rail');
  if (!rail) return null;
  (lead || rail).scrollIntoView({ block: 'center' });
  var a = (lead || rail).getBoundingClientRect();
  var b = rail.getBoundingClientRect();
  var top = Math.min(a.top, b.top) - 10;
  var left = Math.min(a.left, b.left) - 10;
  var right = Math.max(a.right, b.right) + 10;
  var bottom = Math.max(a.bottom, b.bottom) + 10;
  return { x: left, y: top, w: right - left, h: bottom - top };
})()
"""

fails = 0


def ok(cond, msg):
    global fails
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails += 1


def clip_shot(b, name, rect):
    r = b.cmd("Page.captureScreenshot", {
        "format": "png",
        "clip": {"x": max(0, rect["x"]), "y": max(0, rect["y"]),
                 "width": max(1, rect["w"]), "height": max(1, rect["h"]),
                 "scale": 2},
    })
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ".png")
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(r["result"]["data"]))
    return path


b = Browser(port=9388 if THEME == "dark" else 9387,
            width=1700, height=1000, out="/tmp/wise-atlas-ten")
b.cmd("Runtime.disable")
try:
    b.on_new_document(
        "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
        "localStorage.setItem('wise-authed','1');"
        "localStorage.setItem('wise-theme','%s');"
        "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME)
    )
    b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)
    dark = b.js("document.documentElement.classList.contains('dark')")
    ok(bool(dark) == (THEME == "dark"), "loaded in %s mode" % THEME)

    clicked = b.js(
        "(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip'))"
        ".find(function(c){return /Intervention Atlas/i.test(c.textContent)});"
        "if(!n)return false;n.click();return true})()"
    )
    ok(clicked, "clicked the Food Intervention Atlas chip")

    after = {"cards": 0, "lead": "", "titles": [], "open": [], "chips": 0, "portrait": 0}
    deadline = time.time() + WAIT_S
    while time.time() < deadline:
        time.sleep(1.0)
        after = b.js(STATE) or after
        print("  %4.0fs  cards=%s  lead=%r  open=%s  chips=%s"
              % (WAIT_S - (deadline - time.time()), after.get("cards"),
                 after.get("lead"), after.get("open") or "-", after.get("chips")))
        if after.get("cards", 0) >= 10 and after.get("chips", 0) > 0:
            break

    print("titles:", json.dumps(after.get("titles"), indent=2))
    ok(after.get("cards") == 10, "ten output chips landed (got %s)" % after.get("cards"))
    ok(after.get("portrait") == 10, "all ten are portrait chips (got %s)" % after.get("portrait"))
    ok("10 outputs" in (after.get("lead") or ""),
       "the lead names ten outputs (%r)" % after.get("lead"))
    ok(not after.get("open"), "every pane stayed shut (%s)" % (after.get("open") or "none"))
    titles = after.get("titles") or []
    for needle in ("opportunity map", "matrix", "Causal", "Population",
                   "Financial", "frontier", "Strongest", "foods across",
                   "% Share", "References"):
        ok(any(needle.lower() in t.lower() for t in titles),
           "chip present: %s" % needle)

    rect = b.js(RAIL_RECT)
    if rect:
        print("  shot", clip_shot(b, "atlas-ten__%s" % THEME, rect))
    else:
        print("  shot", b.shot("atlas-ten__%s" % THEME))
        os.makedirs(OUT, exist_ok=True)

    # Tapping the closing-read chip (7th) must open Results.
    b.js("(function(){var cards=document.querySelectorAll('.sc-surface-card[data-surface]');"
         "if(cards[6])cards[6].click();})()")
    time.sleep(2.5)
    opened = b.js(STATE) or {}
    print("after tap:", json.dumps({k: opened.get(k) for k in ("open", "cards")}))
    ok(bool(opened.get("open")), "tapping the closing-read chip opens a pane (%s)"
       % (opened.get("open") or "none"))

    print("\n%d check(s) failed\n" % fails if fails else "\nall atlas-ten checks passed\n")
finally:
    b.close()
sys.exit(1 if fails else 0)
