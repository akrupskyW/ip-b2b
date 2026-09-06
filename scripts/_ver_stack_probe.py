"""Capture the transcript output carousel once an output has been re-done.

Drives the Intervention Atlas turn on wiseai.html, re-runs it so every output
grows a second version, then crops a shot of the rail in both themes and prints
the markup of the first stacked card.
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

RAIL_RECT = r"""
(function(){
  var rails = Array.from(document.querySelectorAll('.sc-line-body > .sc-surface-rail'));
  var rail = rails.filter(function(r){ return r.querySelector('.sc-surface-stack'); }).pop() || rails.pop();
  if (!rail) return null;
  rail.scrollIntoView({ block: 'center' });
  var r = rail.getBoundingClientRect();
  return { x: r.left - 8, y: r.top - 8, w: r.width + 16, h: r.height + 16 };
})()
"""

CARD_HTML = r"""
(function(){
  var slots = Array.from(document.querySelectorAll('.sc-surface-rail .sc-surface-slot'));
  var slot = slots.find(function(s){ return s.querySelector('[data-surface-ver]'); }) || slots[0];
  return slot ? slot.outerHTML : null;
})()
"""


GEOM = r"""
(function(){
  var rails = Array.from(document.querySelectorAll('.sc-line-body > .sc-surface-rail'));
  var rail = rails.filter(function(r){ return r.querySelector('.sc-surface-stack'); }).pop() || rails.pop();
  if (!rail) return null;
  var body = rail.closest('.sc-body');
  var b = body.getBoundingClientRect();
  var round = function(n){ return Math.round(n * 10) / 10; };
  var slots = Array.from(rail.querySelectorAll('.sc-surface-slot')).slice(0, 3).map(function(s){
    var sr = s.getBoundingClientRect();
    return {
      slot: [round(sr.width), round(sr.height)],
      cards: Array.from(s.querySelectorAll('.sc-surface-card')).map(function(c){
        var cr = c.getBoundingClientRect();
        return { v: c.getAttribute('data-ver'), w: round(cr.width), h: round(cr.height),
                 x: round(cr.left - sr.left), y: round(cr.top - sr.top) };
      }),
    };
  });
  var over = Array.from(rail.querySelectorAll('.sc-surface-card')).filter(function(c){
    var cr = c.getBoundingClientRect();
    return cr.left < b.left - 0.5 || cr.right > b.right + 0.5;
  }).length;
  return { slots: slots, railScrollW: rail.scrollWidth, railW: round(rail.getBoundingClientRect().width),
           cardsOutsideBody: over };
})()
"""


OPENED = r"""
(function(){
  var open = ['wa-results','wa-visuals','wa-unified','wa-report'].filter(function(id){
    var el = document.getElementById(id); return el && el.classList.contains('is-open');
  });
  var slide = document.querySelector('.wa-pane-body.is-carousel > .wa-block.is-active')
    || document.querySelector('.wa-pane-body > .wa-block.is-active');
  var active = Array.from(document.querySelectorAll('.sc-surface-card.is-active'))
    .map(function(c){ return c.getAttribute('data-ver'); });
  return { open: open, slideVer: slide && slide.getAttribute('data-slide-ver'),
           activeCards: active };
})()
"""


def clip_shot(b, name, rect):
    r = b.cmd("Page.captureScreenshot", {
        "format": "png",
        "clip": {"x": rect["x"], "y": rect["y"], "width": rect["w"],
                 "height": rect["h"], "scale": 2},
    })
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ".png")
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(r["result"]["data"]))
    return path


def run(theme, tag):
    b = Browser(port=9377, width=1700, height=1000, out="/tmp/wise-ver")
    try:
        b.on_new_document(
            "try{localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,name:'Demo User',"
            "email:'demo@wisealliance.com',initials:'DU'}));"
            "localStorage.setItem('wise-theme','%s');localStorage.setItem('chat-theme','%s');}catch(e){}"
            "%s" % (theme, theme,
                    "document.documentElement.classList.add('dark');" if theme == "dark" else "")
        )
        b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)

        def atlas():
            b.js("(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip'))"
                 ".find(function(c){return /Intervention Atlas/i.test(c.textContent)});"
                 "if(n)n.click()})()")
            for _ in range(70):
                time.sleep(1.0)
                if b.js("!!document.querySelector('.sc-surface-rail .sc-surface-card')"):
                    break
            time.sleep(7.0)

        atlas()
        before = b.count(".sc-surface-rail .sc-surface-card")
        # Re-weighting the frontier re-runs every atlas panel under the same
        # version keys, so each output grows a second version.
        b.js("(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip,.chip'))"
             ".find(function(c){return /Re-weight the frontier/i.test(c.textContent)});"
             "if(n)n.click()})()")
        for _ in range(70):
            time.sleep(1.0)
            if b.count(".sc-surface-stack"):
                break
        time.sleep(8.0)
        print(tag, "cards before/after:", before,
              b.count(".sc-surface-rail .sc-surface-card"),
              "stacks:", b.count(".sc-surface-stack"),
              "vtags:", b.count(".sc-surface-vtag"))
        print(tag, "html:", json.dumps(b.js(CARD_HTML))[:900])
        print(tag, "geom:", json.dumps(b.js(GEOM)))
        rect = b.js(RAIL_RECT)
        if rect:
            time.sleep(0.8)
            print(tag, "shot:", clip_shot(b, "ver-stack__%s" % tag, rect))
            b.js("(function(){var s=document.querySelectorAll('.sc-surface-stack');"
                 "if(s[1])s[1].classList.add('is-hover');})()")
            time.sleep(1.0)
            rect2 = b.js(RAIL_RECT)
            print(tag, "hover shot:", clip_shot(b, "ver-stack-hover__%s" % tag, rect2 or rect))
            b.js("document.querySelectorAll('.sc-surface-stack').forEach(function(s){s.classList.remove('is-hover')})")
            # Tapping an earlier version card must open THAT version on the right.
            b.js("(function(){var c=document.querySelector('.sc-surface-rail .sc-surface-card.is-old[data-surface-ver]');"
                 "if(c)c.click();})()")
            time.sleep(3.0)
            print(tag, "after tapping v1:", json.dumps(b.js(OPENED)))
        else:
            print(tag, "no rail")
    finally:
        b.close()


if __name__ == "__main__":
    for theme in (sys.argv[1:] or ["light", "dark"]):
        run(theme, theme)
