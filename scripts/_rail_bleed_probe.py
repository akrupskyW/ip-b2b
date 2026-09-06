"""Measure the output carousel's bleed against the chat module edges.

Drives the atlas turn on wiseai.html, waits for the rail to build, and prints
the left/right gap between the rail and the chat body, plus the widths the
bleed maths is built on, at several chat widths.
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
THEME = "light"

MEASURE = r"""
(function(){
  var rail = document.querySelector('.sc-line-body > .sc-surface-rail--bleed');
  if (!rail) return { rail: false };
  var body = rail.closest('.sc-body');
  var area = rail.closest('.chat-messages-area');
  var line = rail.closest('.sc-line');
  var r = rail.getBoundingClientRect();
  var b = body.getBoundingClientRect();
  var a = area.getBoundingClientRect();
  var cs = getComputedStyle(area);
  var cards = rail.querySelectorAll('.sc-surface-slot, .sc-surface-card');
  var lineBody = rail.closest('.sc-line-body');
  var lb = lineBody.getBoundingClientRect();
  var first = cards[0] && cards[0].getBoundingClientRect();
  var last = cards[cards.length - 1] && cards[cards.length - 1].getBoundingClientRect();
  var round = function(n){ return Math.round(n * 100) / 100; };
  return {
    rail: true,
    bodyW: round(b.width),
    areaClientW: area.clientWidth,
    areaOffsetW: area.offsetWidth,
    scrollbar: area.offsetWidth - area.clientWidth,
    areaPadL: cs.paddingLeft, areaPadR: cs.paddingRight,
    railPadVar: getComputedStyle(rail).getPropertyValue('--sc-rail-pad').trim(),
    railW: round(r.width),
    railScrollW: rail.scrollWidth,
    gapLeft: round(r.left - b.left),
    gapRight: round(b.right - r.right),
    lineOverflowsRight: round(line.getBoundingClientRect().right - b.right),
    areaHasHScroll: area.scrollWidth - area.clientWidth,
    firstCardLeftGap: first ? round(first.left - b.left) : null,
    /* The one that matters: 0 means the first card starts under the answer's
       own first character rather than out at the module edge. */
    firstCardVsText: first ? round(first.left - lb.left) : null,
    lastCardRightGap: last ? round(b.right - last.right) : null,
    railScrolledTo: rail.scrollLeft,
    railMaxScroll: rail.scrollWidth - rail.clientWidth,
    /* Anything sticking out past the transcript's own scroll box. */
    overflowers: Array.from(area.querySelectorAll('*')).filter(function(el){
      var q = el.getBoundingClientRect();
      return q.width && q.right > a.right + 0.5;
    }).slice(0, 6).map(function(el){
      return el.className + ' +' + round(el.getBoundingClientRect().right - a.right);
    }),
  };
})()
"""

b = Browser(width=1700, height=1000, out="/tmp/wise-rail")
try:
    b.on_new_document(
        "try{localStorage.setItem('wise-auth','1');localStorage.setItem('wise-authed','1');"
        "localStorage.setItem('wise-theme','%s');localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME)
    )
    b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)
    b.js("(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip'))"
         ".find(function(c){return /Intervention Atlas/i.test(c.textContent)});if(n)n.click()})()")
    for _ in range(60):
        time.sleep(1.0)
        if b.js("!!document.querySelector('.sc-surface-rail--bleed .sc-surface-card')"):
            break
    time.sleep(6.0)

    def report(tag):
        m = b.js(MEASURE) or {}
        print("%-22s bodyW=%-6s pad=%-6s gapL=%-7s gapR=%-7s card0=%-5s vsText=%-5s hscroll=%s %s" % (
            tag, m.get("bodyW"), m.get("areaPadL"), m.get("gapLeft"), m.get("gapRight"),
            m.get("firstCardLeftGap"), m.get("firstCardVsText"),
            m.get("areaHasHScroll"), m.get("overflowers")))

    report("compact on / single")
    b.js("document.documentElement.classList.remove('chat-compact')")
    time.sleep(0.6)
    report("compact off / single")
    b.js("document.documentElement.classList.add('chat-compact')")
    # Widen the chat module itself so the transcript hits its reading-column cap.
    b.js("(function(){var c=document.querySelector('.sc-card, #wa-chat');"
         "if(c)c.style.cssText+=';flex:1 1 100% !important;width:auto !important;max-width:none !important';})()")
    time.sleep(1.5)
    report("compact on / wide")
    b.js("document.documentElement.classList.remove('chat-compact')")
    time.sleep(0.6)
    report("compact off / wide")
    b.js("document.documentElement.classList.add('chat-compact')")
    time.sleep(0.4)

    b.js("(function(){var r=document.querySelector('.sc-surface-rail--bleed');"
         "if(r)r.scrollIntoView({block:'center'});})()")
    time.sleep(0.6)
    print(b.shot("rail-bleed"))
finally:
    b.close()
