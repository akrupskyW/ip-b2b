"""Check that "Clearer reading" is an Admin row in the chat ⋯ menu.

Opens the WISEcodeAI chat's three-dot menu on wiseai.html with Internal admins
on and again with it off, prints whether the row is badged and visible, and
shoots the menu both ways.

  python3 scripts/_clearer_reading_admin_probe.py [light|dark]
"""
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"

ROWS = """(function(){
  var out = [];
  document.querySelectorAll('[data-sc="ollama-toggle"]').forEach(function(el){
    var cs = getComputedStyle(el);
    var pop = el.closest('.topbar-popover');
    out.push({
      admin_class: el.classList.contains('topbar-menu-item--admin'),
      badge: !!el.querySelector('.topbar-menu-badge'),
      visible: cs.display !== 'none' && el.getClientRects().length > 0,
      pop: pop ? (pop.id || pop.className) : 'no-popover',
      pop_open: pop ? !pop.classList.contains('hidden') : null,
      group: (el.closest('.sc-menu-group')||{}).className || 'ungrouped',
      text: el.textContent.replace(/\\s+/g,' ').trim()
    });
  });
  return JSON.stringify(out, null, 1);
})()"""

FIND_BTN = """(function(){
  var pop = document.querySelector('[data-sc="ollama-toggle"]');
  pop = pop && pop.closest('.topbar-popover');
  var wrap = pop && (pop.closest('.panel-more-wrap') || pop.parentElement);
  var b = wrap && wrap.querySelector('.panel-more-btn, [aria-haspopup="menu"]');
  if (!b) return null;
  b.scrollIntoView({block:'center'});
  var r = b.getBoundingClientRect();
  return [r.left + r.width/2, r.top + r.height/2];
})()"""

b = Browser(port=9376 if THEME == "dark" else 9375, width=1600, height=1050, out=OUT)
b.cmd("Runtime.disable")
try:
    for admin in ("1", "0"):
        b.on_new_document(
            "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
            "localStorage.setItem('wise-authed','1');"
            "localStorage.setItem('wise-admin-ui','%s');"
            "localStorage.setItem('wise:chat-ollama-on','1');"
            "localStorage.setItem('wise-theme','%s');"
            "localStorage.setItem('chat-theme','%s');}catch(e){}" % (admin, THEME, THEME)
        )
        b.goto(URL, ready="!!document.querySelector('.sc-composer')", settle=3.0)
        xy = b.js(FIND_BTN)
        print("admin=%s trigger:" % admin, xy)
        if xy:
            b.click(xy[0], xy[1])
            time.sleep(1.5)
        print("admin=%s ->" % admin, b.js(ROWS))
        b.js("(function(){var el=document.querySelector('[data-sc=\"ollama-toggle\"]')"
             "||document.querySelector('.sc-menu-group--activity, .sc-menu-group--motion');"
             "if(el)el.scrollIntoView({block:'center'})})()")
        time.sleep(0.6)
        print("  shot " + b.shot("clearer-admin__%s__%s" % (
            "on" if admin == "1" else "off", THEME)))
finally:
    b.close()
