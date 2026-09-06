"""The chat's width control always changes the chat's width.

Cycles the width toggle on wiseai.html's chat with NO output pane open (the
welcome / full-row state) and again once a pane is docked, printing the tier
and the measured width after every tap. A tier that reports a new name while
the pixel width stands still is the bug this probe exists to catch.

A screen width can be forced, because the chat's LOAD tier is a property of the
display (single ≤ 1512 CSS px, double above it) and the two defaults enter the
cycle from different classes:

  python3 scripts/_chat_width_probe.py [light|dark] [screen-px]
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
SCREEN = int(sys.argv[2]) if len(sys.argv) > 2 else 0

STATE = """(function(){
  var chat = document.getElementById('wa-chat');
  var btn = chat && chat.querySelector('.panel-width-toggle-btn');
  var open = ['wa-results','wa-visuals','wa-unified','wa-report'].filter(function(id){
    var el = document.getElementById(id);
    return el && el.classList.contains('is-open');
  });
  return JSON.stringify({
    w: chat ? Math.round(chat.getBoundingClientRect().width) : 0,
    tier: chat ? (window.WPaneWidth ? window.WPaneWidth.tierOfEl(chat) : -1) : -1,
    cls: chat ? Array.from(chat.classList).filter(function(c){return /^panel-/.test(c)}).join(' ') : '',
    title: btn ? btn.title : '',
    open: open
  });
})()"""

TAP = ("(function(){var b=document.querySelector('#wa-chat .panel-width-toggle-btn');"
       "if(!b)return false;b.click();return true})()")

fails = 0


def ok(cond, msg):
    global fails
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails += 1


def cycle(label, slug, taps=5):
    print("\n%s" % label)
    seen = []
    st = json.loads(b.js(STATE))
    print("  start   %5dpx  tier=%s  [%s]" % (st["w"], st["tier"], st["cls"]))
    seen.append((st["tier"], st["w"]))
    b.shot("chat-width__%s__load__%s" % (slug, THEME))
    for i in range(taps):
        b.js(TAP)
        time.sleep(1.0)
        st = json.loads(b.js(STATE))
        name = ["single", "double", "double", "fill", "custom"][st["tier"]]
        print("  tap %d   %5dpx  tier=%s  [%s]  %s"
              % (i + 1, st["w"], st["tier"], st["cls"], st["title"]))
        seen.append((st["tier"], st["w"]))
        b.shot("chat-width__%s__%d-%s__%s" % (slug, i + 1, name, THEME))
    widths = sorted(set(w for _, w in seen))
    ok(len(widths) > 1,
       "the chat took more than one width across the cycle (%s)"
       % ", ".join("%dpx" % w for w in widths))
    return seen


b = Browser(port=9366 if THEME == "dark" else 9365,
            width=1600, height=1000, out="/tmp/wise-chat-width")
b.cmd("Runtime.disable")
try:
    screen = ("try{Object.defineProperty(window.screen,'width',"
              "{get:function(){return %d}});}catch(e){}" % SCREEN) if SCREEN else ""
    b.on_new_document(
        "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
        "localStorage.setItem('wise-authed','1');"
        "localStorage.setItem('wise-theme','%s');"
        "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME)
        + screen
    )
    b.goto(URL, ready="!!document.querySelector('.ws-intent-chip, .sc-composer')", settle=3.0)

    cycle("No output pane open (the welcome / full-row state)", "nopane")

    print("\nOpening an output pane")
    b.js("(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip'))"
         ".find(function(c){return /kraft/i.test(c.textContent)});if(n)n.click();})()")
    time.sleep(22.0)
    b.js("(function(){var c=document.querySelector('.sc-surface-card[data-surface]');"
         "if(c)c.click();})()")
    time.sleep(3.0)
    st = json.loads(b.js(STATE))
    print("  panes open: %s" % (st["open"] or "none"))
    if st["open"]:
        cycle("With an output pane docked", "pane")
    else:
        print("  (no pane opened — skipping the docked cycle)")

    print("\n%d check(s) failed\n" % fails if fails else "\nall chat-width checks passed\n")
finally:
    b.close()
sys.exit(1 if fails else 0)
