"""Shoot the output module after it has been narrowed to a phone width.

Drives an intent on wiseai.html, opens the output module, pins it to a narrow
width the way a drag does, and clips a shot of the module for each named slide
so the collapsed layouts can be read.

  python3 scripts/_pane_narrow_shot.py [light|dark] [width] [cases]

`cases` is an optional comma-separated subset of atlas,ingredients,kpis,report.
"""
import base64
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
WIDTH = int(sys.argv[2]) if len(sys.argv) > 2 else 380
CASES = (sys.argv[3].split(",") if len(sys.argv) > 3
         else ["atlas", "ingredients", "kpis", "report"])

PIN = """(function(w){
  var p = document.querySelector('.wa-pane.is-open');
  if (!p) return null;
  p.style.setProperty('flex', '0 0 ' + w + 'px', 'important');
  p.style.setProperty('width', w + 'px', 'important');
  p.style.setProperty('max-width', 'none', 'important');
  p.style.setProperty('min-width', '0', 'important');
  return p.id;
})(%d)"""

RECT = """(function(){
  var p = document.querySelector('.wa-pane.is-open');
  if (!p) return null;
  var r = p.getBoundingClientRect();
  return { x: Math.max(0, r.left - 6), y: Math.max(0, r.top - 6),
           w: r.width + 12, h: Math.min(r.height + 12, window.innerHeight - r.top + 6) };
})()"""

SCROLL = """(function(sel){
  var body = document.querySelector('.wa-pane.is-open .wa-pane-body');
  var slide = body && (body.querySelector('.wa-block.is-active') || body);
  var t = slide && slide.querySelector(sel);
  if (!body || !t) return false;
  body.scrollTop = Math.max(0, t.getBoundingClientRect().top - body.getBoundingClientRect().top
    + body.scrollTop - 12);
  return true;
})(%s)"""


def clip(b, name):
    name = "%s__%dpx" % (name, WIDTH)
    r = b.js(RECT)
    if not r:
        print("  no open module for " + name)
        return
    res = b.cmd("Page.captureScreenshot", {"format": "png", "clip": {
        "x": r["x"], "y": r["y"], "width": r["w"], "height": r["h"], "scale": 2}})
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ".png")
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(res["result"]["data"]))
    print("  shot " + path)


def run_intent(b, pattern, waits=26.0, open_card="first", ready=None):
    ready = ready or "!!document.querySelector('.sc-surface-card[data-surface]')"
    b.js("(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip,.chip'))"
         ".find(function(c){return /%s/i.test(c.textContent)});if(n)n.click()})()" % pattern)
    for _ in range(int(waits)):
        time.sleep(1.0)
        if b.js(ready):
            break
    time.sleep(8.0)
    if open_card == "none":
        return
    b.js("(function(){var c=document.querySelectorAll('.sc-surface-card[data-surface]');"
         "if(c.length)c[%s].click();})()"
         % ("0" if open_card == "first" else "c.length-1"))
    time.sleep(3.0)


HAS_IN_SLIDE = ("(function(sel){var s=document.querySelector("
                "'.wa-pane.is-open .wa-block.is-active');"
                "return !!(s && s.querySelector(sel))})(%s)")


def shoot_targets(b, targets, scoped=True):
    """Scroll to each target that is on the active slide and clip the module."""
    for sel, name in targets:
        if scoped and not b.js(HAS_IN_SLIDE % sel):
            continue
        if not b.js(SCROLL % sel):
            print("  no " + name)
            continue
        time.sleep(0.8)
        clip(b, "narrowout__%s__%s" % (name, THEME))


def case_atlas(b):
    """The consequence ledger (a real table) and the heat matrix."""
    b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)
    run_intent(b, "Intervention Atlas", 50)
    print("pinned:", b.js(PIN % WIDTH))
    time.sleep(2.0)
    for i in range(10):
        title = b.js("(function(){var h=document.querySelector("
                     "'.wa-pane.is-open .wa-block.is-active .atl-panel-title,"
                     " .wa-pane.is-open .wa-block.is-active .wa-report-title');"
                     "return h?h.textContent.slice(0,44):null})()")
        print("  slide %d %s" % (i + 1, title or ""))
        shoot_targets(b, (('".atl-fin"', "ledger"), ('".atl-matrix"', "matrix")))
        if not b.js("(function(){var n=document.querySelector("
                    "'.wa-pane.is-open [data-nav=\"next\"]');"
                    "if(!n)return false;n.click();return true})()"):
            break
        time.sleep(1.0)


def case_ingredients(b):
    """A grid faux-table carrying a 720px floor."""
    b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)
    run_intent(b, "Artificial sweeteners by PL")
    print("pinned:", b.js(PIN % WIDTH))
    time.sleep(2.0)
    shoot_targets(b, (('".wa-ib"', "ingredients"),), scoped=False)


def case_kpis(b):
    """A three-across KPI grid."""
    b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)
    run_intent(b, "Top 3 brands")
    print("pinned:", b.js(PIN % WIDTH))
    time.sleep(2.0)
    shoot_targets(b, (('".wa-ov-kpis"', "kpis"),), scoped=False)


def case_report(b):
    """The formal report: labelled prose rows and its widest tables."""
    b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)
    run_intent(b, "Intervention Atlas", 50, open_card="none")
    run_intent(b, "formal scientific report", 60, open_card="last",
               ready="!!document.querySelector('.wa-pane .wa-report')")
    print("pinned:", b.js(PIN % WIDTH),
          b.js("(function(){var p=document.querySelector('.wa-pane.is-open');"
               "return p?p.id+' report='+p.querySelectorAll('.wa-report').length:null})()"))
    time.sleep(2.0)
    shoot_targets(b, (('".atl-def"', "reportdefs"), ('".atl-fin"', "reporttable")),
                  scoped=False)


def case_myfoods(b):
    """A grid faux-table whose columns are all flexible."""
    b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)
    run_intent(b, "Super Ultra-Processed")
    print("pinned:", b.js(PIN % WIDTH))
    time.sleep(2.0)
    shoot_targets(b, (('".wa-ffui"', "myfoods"),), scoped=False)


CASE_FNS = {"atlas": case_atlas, "ingredients": case_ingredients,
            "kpis": case_kpis, "report": case_report, "myfoods": case_myfoods}


def main():
    b = Browser(port=9393, width=1700, height=1050, out=OUT)
    b.cmd("Runtime.disable")
    try:
        b.on_new_document(
            "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
            "localStorage.setItem('wise-authed','1');"
            "localStorage.setItem('wise-theme','%s');"
            "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME))
        for name in CASES:
            fn = CASE_FNS.get(name.strip())
            if not fn:
                print("unknown case " + name)
                continue
            print("== %s ==" % name)
            fn(b)
    finally:
        b.close()


if __name__ == "__main__":
    main()
