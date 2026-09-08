"""Product Portfolio functional check: reports menu, row menu, brand switch.

  python3 scripts/_pp_func.py [light|dark]
"""
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
URL = "http://127.0.0.1:8765/pages/product-portfolio.html"

AUTH = """
try {
  Object.defineProperty(window.screen, 'width', { get: function(){ return 1920; } });
} catch (e) {}
window.__errs = [];
window.addEventListener('error', function (e) {
  window.__errs.push(String(e.message || '') + ' @' + (e.lineno || 0));
});
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
""" % (THEME, THEME)

VIS = """(function(sel){
  var n = document.querySelector(sel);
  if (!n) return 'missing';
  if (n.hasAttribute('hidden')) return 'hidden-attr';
  var r = n.getBoundingClientRect();
  var cs = getComputedStyle(n);
  return (r.width>0 && r.height>0 && cs.visibility!=='hidden' && cs.display!=='none')
    ? 'visible ' + Math.round(r.width) + 'x' + Math.round(r.height)
      + ' @' + Math.round(r.x) + ',' + Math.round(r.y)
    : 'not-visible';
})"""

fails = []


def ok(cond, msg):
    print(("  ok    " if cond else "  FAIL  ") + msg)
    if not cond:
        fails.append(msg)


b = Browser(port=9421, width=1600, height=1000, out="screenshots/_diag")
try:
    b.on_new_document(AUTH)
    b.goto(URL, ready="document.readyState==='complete'"
                      " && document.querySelectorAll('.pf-trow').length>0",
           timeout=45, settle=3.0)
    print("theme=%s" % THEME)

    rows = b.js("document.querySelectorAll('.pf-trow').length")
    ok(rows >= 70, "all product rows render across the views (%s)" % rows)

    # Reports button on the first claimed row.
    b.js("document.querySelector('.pf-table--claimed .pf-trow .pf-reports-btn').click()")
    time.sleep(0.5)
    state = b.js("(%s)('#pf-shared-reports-pop')" % VIS)
    ok(str(state).startswith("visible"), "the shared Reports menu opens: %s" % state)
    parent = b.js("(function(){var p=document.getElementById('pf-shared-reports-pop');"
                  "return p&&p.parentElement?p.parentElement.tagName:'?'})()")
    ok(parent == "BODY", "it is portalled to <body>, not inside the flex row (%s)" % parent)
    items = b.js("document.querySelectorAll('#pf-shared-reports-pop .pf-module-menu-item').length")
    ok(items == 4, "it carries all four report items (%s)" % items)
    wired = b.js("document.querySelectorAll('#pf-shared-reports-pop [data-pf-report]').length")
    ok(wired == 2, "the two live reports are wired to the handler (%s)" % wired)
    b.shot("pp-func__reports__%s" % THEME)

    b.js("document.body.click()")
    time.sleep(0.3)

    # Row kebab.
    b.js("document.querySelector('.pf-table--claimed .pf-trow .pf-rowmenu-btn').click()")
    time.sleep(0.5)
    kebab = b.js("(%s)('.pf-rowmenu:not([hidden])')" % VIS)
    ok(str(kebab).startswith("visible"), "the row three-dot menu opens (%s)" % kebab)
    b.js("document.body.click()")
    time.sleep(0.3)

    # Brand switch.
    before = b.text("#pf-brand-name")
    b.js("document.getElementById('pf-brand-chip').click()")
    time.sleep(0.4)
    b.js("(function(){var o=document.querySelectorAll('#pf-brand-opts [role=option],"
         " #pf-brand-opts .pf-brand-opt');if(o[1])o[1].click();})()")
    time.sleep(1.6)
    after = b.text("#pf-brand-name")
    total = b.text(".pf-stat-num")
    ok(before != after, "the brand switches (%s -> %s)" % (before, after))
    ok(bool(total and total.strip()), "the scorecards refill for that brand (All = %s)" % total)
    b.shot("pp-func__brand__%s" % THEME)

    errs = b.js("JSON.stringify((window.__errs||[]).slice(0,5))")
    ok(errs == "[]", "no page errors: %s" % errs)
finally:
    b.close()

print("\n%s" % ("all checks passed" if not fails else "%d FAILED" % len(fails)))
sys.exit(1 if fails else 0)
