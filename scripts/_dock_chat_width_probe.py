"""A page hosting the shared WISEcodeAI dock opens it at its screen-default width.

The chat's load tier is a property of the display (single ≤ 1512 CSS px, double
above it). This drives the page at both defaults and prints the tier the dock
claims next to the width it actually measures — a dock that reports "double"
while the pixels stand still is the bug this probe exists to catch, and it is
what a page-local width pin does to the shared tier rules.

  python3 scripts/_dock_chat_width_probe.py [light|dark] [page.html]
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
PAGE = sys.argv[2] if len(sys.argv) > 2 else "conversation-library.html"
SLUG = PAGE.replace(".html", "")
URL = "http://127.0.0.1:8099/pages/" + PAGE

STATE = """(function(){
  var d = document.getElementById('wiseai-dock-panel');
  var btn = d && d.querySelector('.panel-width-toggle-btn');
  return JSON.stringify({
    w: d ? Math.round(d.getBoundingClientRect().width) : 0,
    tier: d ? (window.WPaneWidth ? window.WPaneWidth.tierOfEl(d) : -1) : -1,
    cls: d ? Array.from(d.classList).filter(function(c){return /^panel-/.test(c)}).join(' ') : '',
    title: btn ? btn.title : '',
    screen: window.screen.width
  });
})()"""

TAP = ("(function(){var b=document.querySelector('#wiseai-dock-panel .panel-width-toggle-btn');"
       "if(!b)return false;b.click();return true})()")

EXPECT = {1280: 380, 1728: 580}
fails = 0

for screen_px, want in EXPECT.items():
    b = Browser(port=9376 if THEME == "dark" else 9375,
                width=1600, height=1000, out="/tmp/wise-lib-width")
    b.cmd("Runtime.disable")
    try:
        b.on_new_document(
            "try{localStorage.clear();"
            "localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,name:'Demo User'}));"
            "localStorage.setItem('wise-theme','%s');"
            "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME)
            + "try{Object.defineProperty(window.screen,'width',"
              "{get:function(){return %d}});}catch(e){}" % screen_px
        )
        b.goto(URL, ready="!!document.getElementById('wiseai-dock-panel')", settle=3.5)
        st = json.loads(b.js(STATE))
        good = st["w"] == want
        fails += 0 if good else 1
        print("\nscreen %dpx  ->  want %dpx" % (screen_px, want))
        print(("  ok   " if good else "  FAIL ") +
              "load  %5dpx  tier=%s  [%s]  %s" % (st["w"], st["tier"], st["cls"], st["title"]))
        b.shot("%s-width__%d__load__%s" % (SLUG, screen_px, THEME))

        widths = [st["w"]]
        for i in range(4):
            b.js(TAP)
            time.sleep(0.9)
            st = json.loads(b.js(STATE))
            print("  tap %d %5dpx  tier=%s  [%s]" % (i + 1, st["w"], st["tier"], st["cls"]))
            widths.append(st["w"])
        moved = len(set(widths)) > 1
        fails += 0 if moved else 1
        print(("  ok   " if moved else "  FAIL ") + "the control moved the dock (%s)"
              % ", ".join("%dpx" % w for w in sorted(set(widths))))
    finally:
        b.close()

print("\n%d check(s) failed\n" % fails if fails else "\nall %s chat-width checks passed\n" % SLUG)
sys.exit(1 if fails else 0)
