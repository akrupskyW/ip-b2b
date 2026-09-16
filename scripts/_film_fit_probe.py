"""Does a film fill the Output pane, at every width the pane can be?

A film is the one output that is a real <video> rather than markup the pane
already knows how to size. It has an intrinsic size (1280x720), so unlike a
chart or a table it will happily draw at that size and spill out of — or sit
short of — the box it was written into.

This drives the campaign turn on wiseai.html, opens the teaser by its output
chip, then measures the film against the pane's own content box at a run of
module widths, narrow to wide. A film that fits reads 0 on both insets, has no
horizontal overflow, and keeps its 16:9 shape.

  python3 scripts/_film_fit_probe.py [light|dark]
"""
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
WAIT_S = 180.0

# The film measured against the box it was written into. `padW` is the pane's
# content width — the width an output is supposed to fill — so insets of 0/0
# mean the film reaches both edges of the reading area.
FIT = r"""
(function(){
  var body = ['wa-unified','wa-visuals','wa-results','wa-report']
    .map(function(id){ return document.getElementById(id + '-body'); })
    .find(function(el){ return el && el.querySelector('.sc-inline-film-media'); });
  if (!body) return { found: false };
  /* The pane is a carousel, so only the active slide is drawn — measure the
     film the member is actually looking at, not a hidden one. */
  var v = Array.from(body.querySelectorAll('.sc-inline-film-media'))
    .find(function(el){ return el.getBoundingClientRect().height > 0; });
  if (!v) return { found: false, slides: body.querySelectorAll('.wa-block').length };
  var cs = getComputedStyle(body);
  var bb = body.getBoundingClientRect();
  var padL = parseFloat(cs.paddingLeft) || 0;
  var padR = parseFloat(cs.paddingRight) || 0;
  var vb = v.getBoundingClientRect();
  var vs = getComputedStyle(v);
  return {
    found: true,
    padW: Math.round(bb.width - padL - padR),
    filmW: Math.round(vb.width),
    filmH: Math.round(vb.height),
    insetL: Math.round(vb.left - (bb.left + padL)),
    insetR: Math.round((bb.right - padR) - vb.right),
    ratio: vb.height ? Math.round((vb.width / vb.height) * 100) / 100 : 0,
    overflow: Math.round(body.scrollWidth - body.clientWidth),
    width: vs.width, cssRatio: vs.aspectRatio, radius: vs.borderTopLeftRadius
  };
})()
"""

fails = 0


def ok(cond, msg):
    global fails
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails += 1


def to_film_slide(b):
    """Step the pane's carousel along until the film is the slide on screen."""
    for _ in range(6):
        if (b.js(FIT) or {}).get("found"):
            return True
        b.js("(function(){var p=document.querySelector('.wa-pane.is-open');if(!p)return;"
             "var n=p.querySelector('[data-carousel-next],.wa-carousel-next,"
             ".wa-pane-next,[aria-label*=\"Next\" i]');if(n)n.click();})()")
        time.sleep(0.7)
    return False


def main():
    os.makedirs(OUT, exist_ok=True)
    b = Browser(width=1512, height=980, out=OUT)
    b.cmd("Runtime.disable")
    try:
        b.on_new_document(
            "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
            "localStorage.setItem('wise-authed','1');"
            "localStorage.setItem('wise-theme','%s');"
            "localStorage.setItem('wise:output-mode','cards');"
            "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME)
        )
        b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)

        ok(b.js("(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip'))"
                ".find(function(c){return /marketing campaign/i.test(c.textContent)});"
                "if(!n)return false;n.scrollIntoView({block:'center'});n.click();return true})()"),
           "clicked Generate a marketing campaign")

        deadline = time.time() + WAIT_S
        cards = 0
        while time.time() < deadline:
            time.sleep(1.5)
            cards = b.js("document.querySelectorAll("
                         "'[id$=\"-messages\"] .sc-surface-card[data-surface]').length") or 0
            if cards >= 4:
                break
        ok(cards >= 4, "the turn surfaced its outputs (got %s)" % cards)

        hit = b.js(
            "(function(){var c=Array.from(document.querySelectorAll("
            "'[id$=\"-messages\"] .sc-surface-card[data-surface]'))"
            ".find(function(x){return /teaser/i.test(x.textContent)});"
            "if(!c)return '';c.scrollIntoView({block:'center'});c.click();return '1';})()")
        ok(bool(hit), "tapped the teaser output chip")
        time.sleep(1.6)

        ok(to_film_slide(b), "the film is the slide on screen")
        print("  rest   ", b.js(FIT) or {})

        # Narrow the window in stages: the pane is a flex child of the modules
        # row, so the viewport is the honest way to squeeze it.
        for w in (1512, 1180, 980, 820, 680):
            b.cmd("Emulation.setDeviceMetricsOverride",
                  {"width": w, "height": 980, "deviceScaleFactor": 1, "mobile": False})
            time.sleep(0.9)
            f = b.js(FIT) or {}
            if not f.get("found") and to_film_slide(b):
                f = b.js(FIT) or {}
            print("  %4dpx  %s" % (w, f))
            if not f.get("found"):
                ok(False, "film missing at %dpx" % w)
                continue
            ok(abs(f.get("insetL", 99)) <= 2 and abs(f.get("insetR", 99)) <= 2,
               "%dpx: fills the pane (insets %s / %s, %spx of %spx)"
               % (w, f.get("insetL"), f.get("insetR"), f.get("filmW"), f.get("padW")))
            ok((f.get("overflow") or 0) <= 1,
               "%dpx: nothing spills sideways (%s)" % (w, f.get("overflow")))
            ok(abs((f.get("ratio") or 0) - 1.78) < 0.05,
               "%dpx: still 16:9 (%s)" % (w, f.get("ratio")))
            print("    shot", b.shot("filmfit__%dpx__%s" % (w, THEME)))

        b.cmd("Emulation.clearDeviceMetricsOverride")
    finally:
        b.close()
    print("\n%s (%d failing)" % ("PASS" if not fails else "FAIL", fails))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
