"""Read the output module's three-dot menu.

Drives one turn on wiseai.html, taps the output card so the module opens, then
opens that module's ⋯ and prints every row it offers plus a shot of the menu.

  python3 scripts/_pane_menu_probe.py [intent] [light|dark]
"""
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
INTENT = sys.argv[1] if len(sys.argv) > 1 else "atlas"
THEME = sys.argv[2] if len(sys.argv) > 2 else "light"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"

# While open, the pane's menu popover is portaled onto <body>
# (js/popover-layer.js), so find it by content, not as a child of its wrap.
POP = """(function(){
  return Array.from(document.querySelectorAll('.topbar-popover'))
    .find(function(p){ return p.querySelector('[data-pane-act="close"]') &&
      !p.classList.contains('hidden'); }) ||
    document.querySelector('[data-pane-more="unified"] .topbar-popover');
})()"""

ROWS = """(function(){
  var pop = %s;
  if (!pop) return 'NO POPOVER';
  return Array.from(pop.querySelectorAll('.topbar-menu-item'))
    .map(function(n){ return (n.hidden ? '[hidden] ' : '') +
      n.textContent.replace(/\\s+/g,' ').trim(); }).join(' | ');
})()""" % POP

b = Browser(port=9366 if THEME == "dark" else 9365, width=1600, height=1000, out=OUT)
b.cmd("Runtime.disable")
try:
    b.on_new_document(
        "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
        "localStorage.setItem('wise-authed','1');"
        "localStorage.setItem('wise-admin-ui','1');"
        "localStorage.setItem('wise-theme','%s');"
        "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME)
    )
    b.goto(URL, ready="!!document.querySelector('.ws-intent-chip, .sc-composer')", settle=3.0)
    print("menu rows at rest:", b.js(ROWS))

    b.js("(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip'))"
         ".find(function(c){return /%s/i.test(c.textContent)});if(n)n.click()})()" % INTENT)
    time.sleep(26.0)
    b.js("(function(){var c=document.querySelector('.sc-surface-card[data-surface]');"
         "if(c)c.click()})()")
    time.sleep(3.0)
    print("open pane:", b.js(
        "(document.querySelector('.wa-pane.is-open')||{}).id || 'none'"))
    print("blocks:", b.js("document.querySelectorAll('.wa-pane-body .wa-block').length"))

    xy = b.js("(function(){var n=document.querySelector('[data-pane-more=\\'unified\\'] .panel-more-btn');"
              "if(!n)return null;var r=n.getBoundingClientRect();"
              "return [r.left+r.width/2, r.top+r.height/2]})()")
    if not xy:
        raise SystemExit("no three-dot on the unified pane")
    b.click(xy[0], xy[1])
    time.sleep(0.8)
    print("menu open:", b.js("!(%s).classList.contains('hidden')" % POP))
    print("menu rows:", b.js(ROWS))
    print("  shot " + b.shot("pane-menu__%s__%s" % (INTENT.split()[0].lower(), THEME)))
finally:
    b.close()
