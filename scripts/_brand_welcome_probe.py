"""Drive the "Welcome!" chip on wiseai.html and check its brand overview.

Confirms the turn posts eight output chips into one rail, that every pane
stayed shut while they arrived, and that tapping a chip is what opens the
output module. Shoots the rail and the opened chart in the given theme.
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
WAIT_S = float(sys.argv[2]) if len(sys.argv) > 2 else 120.0

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
  var chat = document.querySelector('.wa-chat');
  return {
    lead: lead ? lead.textContent.replace(/\s+/g, ' ').trim() : '',
    cards: cards.length,
    rails: host ? host.querySelectorAll('.sc-surface-rail').length : 0,
    portrait: host ? host.querySelectorAll('.sc-surface-card--portrait[data-surface]').length : 0,
    titles: titles,
    open: open,
    chatW: chat ? Math.round(chat.getBoundingClientRect().width) : 0,
    chips: host ? host.querySelectorAll('.sc-inline-chips .chip, .sc-reply-chips .chip').length : 0,
    errs: (window.__errs || []).join(' || ')
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


b = Browser(port=9398 if THEME == "dark" else 9397,
            width=1700, height=1050, out="/tmp/wise-brand-welcome")
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
    b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)
    dark = b.js("document.documentElement.classList.contains('dark')")
    ok(bool(dark) == (THEME == "dark"), "loaded in %s mode" % THEME)

    before_w = (b.js(STATE) or {}).get("chatW")
    print("  chat width at rest:", before_w)

    # The chip's textContent leads with the Material Symbols ligature
    # ("waving_hand"), so this must not be anchored to the start.
    clicked = b.js(
        "(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip'))"
        ".find(function(c){return /Welcome!/i.test(c.textContent)});"
        "if(!n)return false;n.click();return true})()"
    )
    ok(clicked, "clicked the Welcome! chip")

    after = {"cards": 0, "lead": "", "titles": [], "open": [], "chips": 0}
    deadline = time.time() + WAIT_S
    while time.time() < deadline:
        time.sleep(1.0)
        after = b.js(STATE) or after
        print("  %4.0fs  cards=%s  rails=%s  open=%s  chips=%s  w=%s"
              % (WAIT_S - (deadline - time.time()), after.get("cards"),
                 after.get("rails"), after.get("open") or "-",
                 after.get("chips"), after.get("chatW")))
        if after.get("cards", 0) >= 8 and after.get("chips", 0) > 0:
            break

    print("titles:", json.dumps(after.get("titles"), indent=2))
    ok(after.get("cards") == 8, "eight output chips landed (got %s)" % after.get("cards"))
    ok(after.get("rails") == 1, "all eight sit in ONE rail (got %s)" % after.get("rails"))
    ok(after.get("portrait") == 8, "all eight are portrait chips (got %s)" % after.get("portrait"))
    ok("8 outputs" in (after.get("lead") or ""),
       "the lead names eight outputs (%r)" % after.get("lead"))
    ok(not after.get("open"), "every pane stayed shut (%s)" % (after.get("open") or "none"))
    ok(after.get("chatW") == before_w,
       "chat never resized (%s -> %s)" % (before_w, after.get("chatW")))
    ok(after.get("chips", 0) > 0, "the turn closed on intent chips (%s)" % after.get("chips"))
    ok(not after.get("errs"), "no page errors (%s)" % (after.get("errs") or "none"))

    titles = after.get("titles") or []
    for needle in ("at a glance", "portfolio", "Processing mix", "GRAS coverage",
                   "pillars", "Processing-driving", "Health outcomes",
                   "what to do about it"):
        ok(any(needle.lower() in t.lower() for t in titles),
           "chip present: %s" % needle)

    rect = b.js(RAIL_RECT)
    if rect:
        print("  shot", clip_shot(b, "brand-welcome__rail__%s" % THEME, rect))

    # Open each of the eight in turn and shoot it, so every output gets looked at.
    names = ["glance", "portfolio", "upf", "gras", "pillars", "ingredients",
             "outcomes", "actions"]
    for i, name in enumerate(names):
        b.js("(function(){var c=document.querySelectorAll('.sc-surface-card[data-surface]');"
             "if(c[%d])c[%d].click();})()" % (i, i))
        time.sleep(3.5)
        if i == 0:
            opened = b.js(STATE) or {}
            ok(bool(opened.get("open")),
               "tapping a chip opens a pane (%s)" % (opened.get("open") or "none"))
        b.js("(function(){var p=document.querySelector('.wa-pane.is-open .wa-pane-body');"
             "if(p)p.scrollTop=0;})()")
        time.sleep(0.4)
        print("  shot", b.shot("brand-welcome__%d-%s__%s" % (i + 1, name, THEME)))
        if name == "pillars":
            bars = b.js("(function(){return document.querySelectorAll("
                        "'.wa-pane.is-open .dash-ws-health-fill').length})()")
            ok((bars or 0) >= 15, "the pillar metric bars rendered (%s)" % bars)
        if name in ("upf", "gras"):
            arcs = b.js("(function(){return Array.from(document.querySelectorAll("
                        "'.wa-pane.is-open .dash-donut-arc'))"
                        ".filter(function(p){return (p.getAttribute('d')||'').length>10}).length})()")
            ok((arcs or 0) >= 4, "the %s donut arcs swept in (%s)" % (name, arcs))
        if name == "portfolio":
            rows = b.js("(function(){return document.querySelectorAll("
                        "'.wa-pane.is-open .wa-trow').length})()")
            ok((rows or 0) >= 8, "the portfolio table rendered rows (%s)" % rows)

    # Every follow-up chip must answer AND surface its own output, so the
    # transcript never dead-ends on a generic reply.
    print("live chips:", json.dumps(b.js(
        "Array.from(document.querySelectorAll("
        "'.sc-inline-chips .chip, .sc-reply-chips .chip'))"
        ".map(function(c){return c.textContent.replace(/\\s+/g,' ').trim()})"
    ), indent=2))
    for label, needle in (("coverage gap", "what to do about it"),
                          ("flagged ingredients", "Processing-driving"),
                          ("15 pillar metrics", "pillars"),
                          ("Anti-Inflammatory", "Health outcomes")):
        before = (b.js(STATE) or {}).get("cards", 0)
        hit = b.js(
            "(function(){var n=Array.from(document.querySelectorAll("
            "'.sc-inline-chips .chip, .sc-reply-chips .chip'))"
            ".find(function(c){return /%s/i.test(c.textContent)});"
            "if(!n)return false;n.click();return true})()" % label.replace(" ", "\\s+")
        )
        ok(hit, "found the %r follow-up chip" % label)
        if not hit:
            continue
        st = {}
        deadline = time.time() + 60
        while time.time() < deadline:
            time.sleep(1.0)
            st = b.js(STATE) or {}
            if st.get("cards", 0) > before and st.get("chips", 0) > 0:
                break
        titles = st.get("titles") or []
        ok(st.get("cards", 0) > before,
           "%r surfaced a new output (%s -> %s)" % (label, before, st.get("cards")))
        ok(any(needle.lower() in t.lower() for t in titles[before:]),
           "%r surfaced %s" % (label, needle))
        ok(st.get("chips", 0) > 0, "%r closed on intent chips" % label)

    print("errors:", b.js("(window.__errs||[]).join(' || ')") or "none")
    print("\n%d check(s) failed\n" % fails if fails else "\nall brand-welcome checks passed\n")
finally:
    b.close()
sys.exit(1 if fails else 0)
