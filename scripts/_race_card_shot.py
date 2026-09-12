"""Shoot the welcome rail's chart cards on wiseai.html, race card in frame.

Scrolls the overview rail to the new "Code race" card, lets the runners and
count-ups settle, then clips the donut / pillars / race trio in the given
theme. Prints the measured runner positions so a bug that never left the
start line is visible in the log.
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

SCROLL = r"""
(function(){
  var card = document.querySelector('.ws-scorecard--chart-race');
  if (!card) return false;
  var rail = card.closest('.ws-scorecards');
  if (rail) rail.scrollLeft = Math.max(0, card.offsetLeft - rail.offsetLeft - 300);
  card.scrollIntoView({ block: 'center' });
  return true;
})()
"""

STATE = r"""
(function(){
  var card = document.querySelector('.ws-scorecard--chart-race');
  if (!card) return { card: false };
  var runners = Array.from(card.querySelectorAll('.ws-sc-race-runner'));
  var imgs = Array.from(card.querySelectorAll('.ws-sc-race-bug img'));
  var r = card.getBoundingClientRect();
  return {
    card: true,
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    overflow: Math.round(card.scrollHeight - card.clientHeight),
    lefts: runners.map(function(n){ return n.style.left || '(unset)'; }),
    nums: Array.from(card.querySelectorAll('.ws-sc-race-num'))
      .map(function(n){ return n.textContent.trim(); }),
    imgsOk: imgs.filter(function(i){ return i.complete && i.naturalWidth > 0; }).length,
    imgsTotal: imgs.length,
    errs: (window.__errs || []).join(' || ')
  };
})()
"""

CLIP = r"""
(function(){
  var cards = Array.from(document.querySelectorAll('.ws-scorecard--chart'));
  if (!cards.length) return null;
  var l = 1e9, t = 1e9, rt = -1e9, b = -1e9;
  cards.forEach(function(c){
    var r = c.getBoundingClientRect();
    l = Math.min(l, r.left); t = Math.min(t, r.top);
    rt = Math.max(rt, r.right); b = Math.max(b, r.bottom);
  });
  return { x: l - 14, y: t - 14, w: (rt - l) + 28, h: (b - t) + 28 };
})()
"""


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


b = Browser(port=9438 if THEME == "dark" else 9437,
            width=1700, height=1050, out="/tmp/wise-race-card")
b.cmd("Runtime.disable")
try:
    b.on_new_document(
        "window.__errs=[];addEventListener('error',function(e){"
        "__errs.push((e.message||'')+' @ '+(e.filename||'')+':'+(e.lineno||''))});"
        "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
        "localStorage.setItem('wise-authed','1');"
        "localStorage.setItem('wise-theme','%s');"
        "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME)
    )
    b.goto(URL, ready="!!document.querySelector('.ws-scorecard')", settle=3.0)
    print("  dark:", b.js("document.documentElement.classList.contains('dark')"))
    print("  scrolled:", b.js(SCROLL))
    time.sleep(3.0)
    print("  state:", json.dumps(b.js(STATE), indent=2))
    rect = b.js(CLIP)
    if rect:
        print("  shot", clip_shot(b, "race-card__rail__%s" % THEME, rect))
finally:
    b.close()
