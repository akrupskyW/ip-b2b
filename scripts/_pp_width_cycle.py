"""Product Portfolio: does the chat width control actually move the chat?

The portfolio board opens on load, which puts #modules-row into report-mode, and
that rule pins #chat-shell to 380px with !important. Only .panel-wide has an
override, so this walks the whole single -> double -> triple -> fill -> custom
cycle and prints the measured width after every tap.

  python3 scripts/_pp_width_cycle.py [light|dark] [screen-width]
"""
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
SCREEN_W = int(sys.argv[2]) if len(sys.argv) > 2 else 1920
URL = "http://127.0.0.1:8765/pages/product-portfolio.html"

AUTH = """
try {
  Object.defineProperty(window.screen, 'width', { get: function(){ return %d; } });
} catch (e) {}
try {
  localStorage.setItem('wise-auth', JSON.stringify({
    loggedIn: true, name: 'Demo', email: 'd@x.com', initials: 'DU',
    at: new Date().toISOString()
  }));
  localStorage.setItem('wise-authed', '1');
  localStorage.setItem('wise-walkthrough', JSON.stringify({
    v: 1, completed: true, dismissed: true, doneSteps: ['*'],
    skippedGroups: [], screensSeen: { '*': true }, cursor: ''
  }));
  localStorage.setItem('wise-theme', '%s');
  localStorage.setItem('chat-theme', '%s');
} catch (e) {}
""" % (SCREEN_W, THEME, THEME)

READ = """(function(){
  var s = document.getElementById('chat-shell');
  if (!s) return 'no chat-shell';
  var tier = window.WPaneWidth ? window.WPaneWidth.tierOfEl(s)
           : (s.classList.contains('panel-custom') ? 4
             : s.classList.contains('panel-fill') ? 3
             : s.classList.contains('panel-triple') ? 2
             : s.classList.contains('panel-wide') ? 1 : 0);
  return tier + '  w=' + Math.round(s.getBoundingClientRect().width)
       + '  [' + s.className + ']';
})()"""

b = Browser(port=int(__import__("os").environ.get("CDP_PORT","9394")), width=1600, height=900, out="screenshots/_diag")
try:
    b.on_new_document(AUTH)
    b.goto(URL, ready="document.readyState==='complete'"
                      " && document.querySelectorAll('.pf-trow').length>0",
           timeout=45, settle=3.0)
    print("screen=%d theme=%s  report-mode=%s" % (
        SCREEN_W, THEME,
        b.js("document.getElementById('modules-row').classList.contains('report-mode')")))
    print("  on load        tier=%s" % b.js(READ))
    for i in range(5):
        ok = b.js("(function(){var n=document.getElementById('wiseai-width-btn');"
                  "if(!n)return false;n.click();return true})()")
        if not ok:
            print("  no #wiseai-width-btn")
            break
        time.sleep(0.6)
        print("  after tap %d    tier=%s" % (i + 1, b.js(READ)))
finally:
    b.close()
