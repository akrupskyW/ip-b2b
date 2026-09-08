"""Sweep screen widths and report the chat's tier on load.

The chat is meant to open single at <=1512 CSS px and double above it. This
loads the page once per width and prints what actually landed, plus anything
that touched the width after the initial apply.

  python3 scripts/_pp_width_sweep.py [page]
"""
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

PAGE = sys.argv[1] if len(sys.argv) > 1 else "product-portfolio"
URL = "http://127.0.0.1:8765/pages/%s.html" % PAGE
WIDTHS = [1440, 1512, 1513, 1536, 1600, 1680, 1728, 1920, 2560, 3440]

AUTH_T = """
try {
  Object.defineProperty(window.screen, 'width', { get: function(){ return %d; } });
} catch (e) {}
window.__wideLog = [];
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
  localStorage.setItem('wise-theme', 'light');
  localStorage.setItem('chat-theme', 'light');
} catch (e) {}
/* Record every class change on the chat shell so a late writer is visible. */
document.addEventListener('DOMContentLoaded', function () {
  var s = document.getElementById('chat-shell');
  if (!s) return;
  new MutationObserver(function (recs) {
    recs.forEach(function (r) {
      window.__wideLog.push(Math.round(performance.now()) + ':' +
        (r.target.classList.contains('panel-fill') ? 'fill'
         : r.target.classList.contains('panel-custom') ? 'custom'
         : r.target.classList.contains('panel-wide') ? 'wide' : 'single'));
    });
  }).observe(s, { attributes: true, attributeFilter: ['class'] });
});
"""

READ = """(function(){
  var s = document.getElementById('chat-shell');
  if (!s) return 'MISSING';
  var tier = window.WPaneWidth ? window.WPaneWidth.tierOfEl(s) : -1;
  var log = (window.__wideLog||[]);
  var squashed = [];
  log.forEach(function(x){ var v=x.split(':')[1];
    if (!squashed.length || squashed[squashed.length-1].split(':')[1] !== v) squashed.push(x); });
  return JSON.stringify({
    tier: tier,
    w: Math.round(s.getBoundingClientRect().width),
    userSet: document.documentElement.getAttribute('data-chat-width-user-set'),
    modUserSet: s.getAttribute('data-width-user-set'),
    defaultDouble: document.documentElement.classList.contains('chat-default-double'),
    log: squashed.slice(-6)
  });
})()"""

b = Browser(port=9397, width=1600, height=900, out="screenshots/_diag")
print("page=%s   expect: <=1512 -> tier 0 / 380px,  >1512 -> tier 1 / 580px" % PAGE)
try:
    for w in WIDTHS:
        b.on_new_document(AUTH_T % w)
        b.goto(URL, ready="document.readyState==='complete'", timeout=45, settle=2.5)
        print("  screen=%-5d %s" % (w, b.js(READ)))
finally:
    b.close()
