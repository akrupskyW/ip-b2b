"""A transcript only moves forward.

Drives a real chat far enough to leave a chip row behind, then checks that
every row above the newest one is disabled and that clicking backwards into
one does nothing. Shoots the thread in the theme it was asked for.

  python3 scripts/_chip_lock_probe.py [page] [light|dark]
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

PAGE = sys.argv[1] if len(sys.argv) > 1 else "view-product"
THEME = sys.argv[2] if len(sys.argv) > 2 else "light"
URL = "http://127.0.0.1:8099/pages/%s.html" % PAGE

ROW_SEL = ".sc-reply-chips, .sc-inline-chips, .gs-chips-inline, .rf-chips-inline"

ROWS = """(function(){
  var t = document.querySelector('.chat-messages-area, #chat-messages');
  if (!t) return JSON.stringify([]);
  return JSON.stringify([].slice.call(t.querySelectorAll('%s')).map(function(r){
    var chips = [].slice.call(r.querySelectorAll('.chip, .ws-intent-chip, .gs-chip'));
    return {
      cls: r.className,
      spent: r.hasAttribute('data-chips-spent'),
      chips: chips.length,
      dead: chips.filter(function(c){
        return c.disabled || c.getAttribute('aria-disabled') === 'true';
      }).length,
      pointer: chips.length ? getComputedStyle(chips[0]).pointerEvents : ''
    };
  }));
})()""" % ROW_SEL

TAP_LIVE = """(function(){
  var t = document.querySelector('.chat-messages-area, #chat-messages');
  var rows = [].slice.call(t.querySelectorAll('%s')).filter(function(r){
    return !r.hasAttribute('data-chips-spent');
  });
  var row = rows[rows.length - 1];
  /* Nothing in the thread yet — start it from the welcome grid, the way a
     member would. */
  var chip = row
    ? row.querySelector('.chip:not([aria-disabled="true"])')
    : document.querySelector('.ws-chips .ws-intent-chip:not([aria-disabled="true"]):not(.ws-intent-chip--askhelp), .sc-welcome .chip:not([aria-disabled="true"])');
  if (!chip) return 'no live chip';
  var label = chip.textContent.replace(/\\s+/g, ' ').trim();
  chip.click();
  return label;
})()""" % ROW_SEL

TAP_SPENT = """(function(){
  var t = document.querySelector('.chat-messages-area, #chat-messages');
  var row = t.querySelector('[data-chips-spent]');
  if (!row) return 'no spent row';
  var chip = row.querySelector('.chip');
  if (!chip) return 'no chip';
  chip.click();
  return chip.textContent.replace(/\\s+/g, ' ').trim();
})()"""

fails = 0


def ok(cond, msg):
    global fails
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails += 1


b = Browser(port=9372 if THEME == "dark" else 9371,
            width=1500, height=1050, out="/tmp/wise-chip-lock")
b.cmd("Runtime.disable")
try:
    b.on_new_document(
        "try{localStorage.clear();"
        "localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,name:'Demo User',"
        "email:'demo@wisealliance.com',initials:'DU',at:new Date().toISOString()}));"
        "localStorage.setItem('wise-theme','%s');"
        "localStorage.setItem('chat-theme','%s');"
        "localStorage.setItem('wise-walkthrough',JSON.stringify({v:1,completed:true,"
        "dismissed:true,doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));"
        "}catch(e){}" % (THEME, THEME)
    )
    b.goto(URL, ready="!!document.querySelector('.chip, .ws-intent-chip')", settle=3.0)
    ok(bool(b.js("!!window.WiseChipLock")), "the shared chip lock loaded")
    ok(bool(b.js("document.documentElement.classList.contains('dark')"))
       == (THEME == "dark"), "the page loaded in %s mode" % THEME)

    print("\n  first tap:  %s" % b.js(TAP_LIVE))
    time.sleep(10)
    print("  second tap: %s" % b.js(TAP_LIVE))
    time.sleep(12)

    rows = json.loads(b.js(ROWS))
    print("")
    for i, r in enumerate(rows):
        print("  row %d  %-24s spent=%-5s chips=%-2s dead=%-2s pointer=%s"
              % (i, r["cls"], r["spent"], r["chips"], r["dead"], r["pointer"]))
    print("")
    spent = [r for r in rows if r["spent"]]
    live = [r for r in rows if not r["spent"]]
    ok(len(rows) >= 2, "the thread left more than one chip row behind")
    ok(len(spent) >= 1, "a row the member moved past is marked spent")
    ok(all(r["dead"] == r["chips"] and r["pointer"] == "none" for r in spent),
       "every chip in a spent row is disabled and takes no pointer")
    ok(len(live) >= 1, "the newest row is still live")
    ok(all(r["dead"] == 0 for r in live), "no chip in the live row is disabled")

    before = b.js("document.querySelectorAll('.sc-line').length")
    print("  backwards tap: %s" % b.js(TAP_SPENT))
    time.sleep(3)
    ok(b.js("document.querySelectorAll('.sc-line').length") == before,
       "clicking backwards into a spent row started nothing")

    b.js("var t=document.querySelector('.chat-messages-area, #chat-messages');"
         "if(t)t.scrollTop=t.scrollHeight")
    time.sleep(0.6)
    print("\n  shot: %s" % b.shot("chip-lock__%s__%s" % (PAGE, THEME)))
finally:
    b.close()

print("\n%s" % ("PASS" if not fails else "%d FAILED" % fails))
sys.exit(1 if fails else 0)
