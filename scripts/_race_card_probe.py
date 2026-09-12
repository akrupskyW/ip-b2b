"""Click the welcome rail's "Code race" card and check the turn it drives.

The card is a question card, so tapping it must post the ask, play the
comparison answer, close on intent chips, and leave every output pane shut
until the member taps an output chip.
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
WAIT_S = float(sys.argv[2]) if len(sys.argv) > 2 else 120.0

STATE = r"""
(function(){
  var host = document.querySelector('[id$="-messages"]');
  var open = ['wa-results','wa-visuals','wa-unified','wa-report'].filter(function(id){
    var el = document.getElementById(id);
    return el && el.classList.contains('is-open');
  });
  var chat = document.querySelector('.wa-chat');
  return {
    you: host ? host.querySelectorAll('.sc-line-you').length : 0,
    ask: host && host.querySelector('.sc-line-you')
      ? host.querySelector('.sc-line-you').textContent.replace(/\s+/g,' ').trim().slice(0, 90) : '',
    cards: host ? host.querySelectorAll('.sc-surface-card[data-surface]').length : 0,
    titles: host ? Array.from(host.querySelectorAll('.sc-surface-title'))
      .map(function(t){ return t.textContent.replace(/\s+/g,' ').trim(); }) : [],
    chips: host ? host.querySelectorAll('.sc-inline-chips .chip, .sc-reply-chips .chip').length : 0,
    open: open,
    chatW: chat ? Math.round(chat.getBoundingClientRect().width) : 0,
    errs: (window.__errs || []).join(' || ')
  };
})()
"""

fails = 0


def ok(cond, msg):
    global fails
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails += 1


b = Browser(port=9440 if THEME == "dark" else 9439,
            width=1700, height=1050, out="/tmp/wise-race-probe")
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

    before = b.js(STATE) or {}
    print("  chat width at rest:", before.get("chatW"))

    ok(b.js("!!document.querySelector('.ws-scorecard--chart-race')"),
       "the race card is on the rail")
    ok(b.js("document.querySelectorAll('.ws-scorecard--chart').length === 3"),
       "three chart cards on the rail")
    ok(b.js("!!document.querySelector('.ws-scorecard--chart-upf .dash-donut-arc')"),
       "the donut card still renders")
    ok(b.js("!!document.querySelector('.ws-scorecard--chart-pillars .ws-sc-pillar-fill')"),
       "the pillars card still renders")
    ok(b.js("/granola/i.test(document.querySelector('.ws-scorecard--chart-race')"
            ".getAttribute('aria-label') || '')"),
       "the card names itself for a screen reader")
    ok(b.js("/Code race across/.test(document.querySelector('.ws-sc-chart--race')"
            ".getAttribute('aria-label') || '')"),
       "the chart names its codes and products")

    ok(b.js("(function(){var c=document.querySelector('.ws-scorecard--chart-race');"
            "if(!c)return false;c.click();return true})()"), "clicked the race card")

    after = before
    deadline = time.time() + WAIT_S
    while time.time() < deadline:
        time.sleep(1.0)
        after = b.js(STATE) or after
        if after.get("cards", 0) > 0 and after.get("chips", 0) > 0:
            break
    print("  state:", json.dumps(after, indent=2))

    ok(after.get("you", 0) >= 1, "the ask posted in the transcript")
    ok("compare" in (after.get("ask") or "").lower(), "the ask is the comparison ask")
    ok(after.get("cards", 0) >= 1, "the turn surfaced an output chip")
    ok(any("comparison" in t.lower() for t in after.get("titles") or []),
       "the output is the product comparison (%s)" % (after.get("titles") or []))
    ok(not after.get("open"), "every pane stayed shut (%s)" % (after.get("open") or "none"))
    ok(after.get("chatW") == before.get("chatW"),
       "chat never resized (%s -> %s)" % (before.get("chatW"), after.get("chatW")))
    ok(after.get("chips", 0) > 0, "the turn closed on intent chips")
    ok(not after.get("errs"), "no page errors (%s)" % (after.get("errs") or "none"))

    b.js("(function(){var c=document.querySelector('.sc-surface-card[data-surface]');"
         "if(c)c.click();})()")
    time.sleep(3.0)
    opened = b.js(STATE) or {}
    ok(bool(opened.get("open")),
       "tapping the output chip opens the module (%s)" % (opened.get("open") or "none"))
    print("  shot", b.shot("race-card__compare__%s" % THEME))

    print("\n%d check(s) failed\n" % fails if fails else "\nall race-card checks passed\n")
finally:
    b.close()
sys.exit(1 if fails else 0)
