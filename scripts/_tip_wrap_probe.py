"""A long hover label wraps instead of running off the page.

Chart cells carry a full sentence in `data-tip` — the intervention, the
dimension, the score and what a low score means. The shared hover card is one
nowrap line, so on a matrix cell that sentence stretched the card past the
width of the window and the end of it was unreadable.

Drives a real turn on wiseai.html, opens the score matrix, hovers a cell, and
prints the card's measured box: how wide it is, how many lines it wrapped to,
and whether it stayed inside the viewport. Then does the same on a short
top-bar icon label, which must still be a single line.

  python3 scripts/_tip_wrap_probe.py [light|dark]
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
CAP = 380

TIP = """(function(){
  var t = document.getElementById('lir-tooltip');
  if (!t) return JSON.stringify({ up: false });
  var r = t.getBoundingClientRect();
  var cs = getComputedStyle(t);
  var lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
  return JSON.stringify({
    up: t.classList.contains('lir-tip-visible'),
    w: Math.round(r.width), h: Math.round(r.height),
    left: Math.round(r.left), right: Math.round(r.right),
    lines: Math.max(1, Math.round((r.height - parseFloat(cs.paddingTop)
      - parseFloat(cs.paddingBottom)) / lh)),
    wrap: cs.whiteSpace,
    chars: (t.textContent || '').length,
    vw: window.innerWidth
  });
})()"""

fails = 0


def ok(cond, msg):
    global fails
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails += 1


def hover(b, selector, nth=0):
    """Move the real pointer onto an element and read the card back."""
    box = b.js(
        "(function(){var n=document.querySelectorAll(%s)[%d];if(!n)return '';"
        "n.scrollIntoView({block:'center',inline:'center'});"
        "var r=n.getBoundingClientRect();"
        "var x=r.left+r.width/2, y=r.top+r.height/2;"
        "var hit=document.elementFromPoint(x,y);"
        "return JSON.stringify({x:x,y:y,hit:!!(hit&&(hit===n||n.contains(hit))),"
        "txt:(n.textContent||'').trim(),tip:n.getAttribute('data-tip')||''});})()"
        % (json.dumps(selector), nth))
    if not box:
        return None, None
    box = json.loads(box)
    b.cmd("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": 4, "y": 4})
    time.sleep(0.2)
    b.cmd("Input.dispatchMouseEvent", {"type": "mouseMoved",
                                       "x": box["x"], "y": box["y"]})
    time.sleep(0.5)
    tip = json.loads(b.js(TIP))
    if not tip["up"]:
        # Headless Chrome can swallow a bare pointer move over a freshly
        # inserted node; the card's listener is delegated, so send the event
        # the same way the browser would.
        b.js("(function(){var n=document.querySelectorAll(%s)[%d];if(!n)return;"
             "n.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));})()"
             % (json.dumps(selector), nth))
        time.sleep(0.4)
        tip = json.loads(b.js(TIP))
    return box, tip


b = Browser(port=9366 if THEME == "dark" else 9365,
            width=1600, height=1000, out="/tmp/wise-tip-wrap")
b.cmd("Runtime.disable")
try:
    b.on_new_document(
        "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
        "localStorage.setItem('wise-authed','1');"
        "localStorage.setItem('wise-theme','%s');"
        "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME)
    )
    b.goto(URL, ready="!!document.querySelector('.ws-intent-chip, .sc-composer')",
           settle=3.0)
    ok(bool(b.js("document.documentElement.classList.contains('dark')"))
       == (THEME == "dark"), "the page loaded in %s mode" % THEME)

    print("\nDriving the intervention atlas")
    if not b.js("(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip'))"
                ".find(function(c){return /atlas/i.test(c.textContent)});"
                "if(!n)return false;n.click();return true})()"):
        raise SystemExit("no atlas intent chip on the welcome screen")

    deadline = time.time() + 40
    while time.time() < deadline:
        time.sleep(1.0)
        if b.js("(function(){return Array.from(document.querySelectorAll("
                "'.sc-surface-card[data-surface]')).some(function(c){"
                "return /matri/i.test(c.textContent||'')})})()"):
            break
    ok(b.js("document.querySelectorAll('.sc-surface-card[data-surface]').length") > 0,
       "the turn posted its output cards")

    b.js("(function(){var c=Array.from(document.querySelectorAll("
         "'.sc-surface-card[data-surface]')).find(function(n){"
         "return /matri/i.test(n.textContent||'')});if(c)c.click();})()")
    time.sleep(3.0)

    # The pane is a carousel of the turn's outputs. Walk it to the slide the
    # matrix is actually on, so the cell hovered below is one a member could
    # reach with a real pointer.
    LIVE = """(function(){
      var c = Array.from(document.querySelectorAll('.atl-mx-cell[data-tip]'));
      for (var i = 0; i < c.length; i++) {
        var r = c[i].getBoundingClientRect();
        if (r.width > 4 && r.top > 0 && r.bottom < window.innerHeight) {
          var hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (hit && (hit === c[i] || c[i].contains(hit))) return true;
        }
      }
      return false;
    })()"""
    STEP = ("(function(d){var a=document.querySelectorAll("
            "'.wa-pane.is-open .wa-pane-nav-arrow');if(!a.length)return false;"
            "var b=a[d<0?0:a.length-1];if(b.disabled)return false;b.click();return true})(%d)")
    for _ in range(12):
        if b.js(LIVE):
            break
        if not b.js(STEP % -1):
            break
        time.sleep(0.5)
    for _ in range(12):
        if b.js(LIVE):
            break
        if not b.js(STEP % 1):
            break
        time.sleep(0.6)

    cells = b.js("document.querySelectorAll('.atl-mx-cell[data-tip]').length")
    ok(cells > 0, "the score matrix is on screen (%s cells)" % cells)
    ok(bool(b.js(LIVE)), "and a cell of it is under the pointer's reach")
    if not cells:
        raise SystemExit("no matrix cells to hover")

    print("\nHovering a matrix cell")
    # A visible cell whose own sentence is long enough to need more than one line.
    idx = b.js("""(function(){
      var c = Array.from(document.querySelectorAll('.atl-mx-cell[data-tip]'));
      for (var i = 0; i < c.length; i++) {
        if ((c[i].getAttribute('data-tip') || '').length < 150) continue;
        var r = c[i].getBoundingClientRect();
        if (r.width < 4 || r.top < 0 || r.bottom > window.innerHeight) continue;
        var hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (hit && (hit === c[i] || c[i].contains(hit))) return i;
      }
      return -1;
    })()""")
    box, tip = hover(b, ".atl-mx-cell[data-tip]", max(idx, 0))
    print("  cell reads %r, tip is %d chars" % (box["txt"], len(box["tip"])))
    print("  card: %s" % tip)
    ok(box["hit"], "the cell is hit-testable where the pointer landed")
    ok(tip["up"], "the card opened")
    ok(tip["w"] <= CAP, "it is %dpx wide, within the %dpx cap" % (tip["w"], CAP))
    ok(tip["lines"] > 1, "and wrapped onto %d lines" % tip["lines"])
    ok(tip["left"] >= 0 and tip["right"] <= tip["vw"],
       "landing inside the window (%d \u2192 %d of %d)"
       % (tip["left"], tip["right"], tip["vw"]))
    print("  shot " + b.shot("tip-wrap__matrix__%s" % THEME))

    print("\nA short icon label is still one line")
    short = b.js(
        "(function(){var sels=['.panel-width-toggle-btn','.sc-send','.lir-btn',"
        "'.topbar-appearance-btn'];for(var i=0;i<sels.length;i++){"
        "var n=document.querySelector(sels[i]);"
        "if(n&&n.getBoundingClientRect().width>4)return sels[i]}return ''})()")
    print("  using %r" % short)
    box, tip = hover(b, short) if short else (None, None)
    if box:
        print("  card: %s" % tip)
        ok(tip["up"], "the card opened")
        ok(tip["lines"] == 1, "on a single line")
        ok(tip["w"] < CAP, "at its natural %dpx, not padded to the cap" % tip["w"])
        print("  shot " + b.shot("tip-wrap__icon__%s" % THEME))
    else:
        print("  (no appearance control on this page state \u2014 skipped)")

    print("\n%d check(s) failed\n" % fails if fails
          else "\nall hover-card wrap checks passed\n")
finally:
    b.close()
sys.exit(1 if fails else 0)
