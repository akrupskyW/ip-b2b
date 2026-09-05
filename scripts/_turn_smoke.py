"""Smoke a turn on every page that hosts a chat module.

Clicks the first intent chip, waits, and reports whether an answer landed, the
closing chips arrived last in the thread, and whether anything hit the console.
Used to confirm the shared turn-stage gates did not strand a turn on a surface
other than wiseai.html.
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

BASE = "http://127.0.0.1:8099/pages/"
PAGES = sys.argv[1:] or [
    "wiseai.html", "add-product.html", "reformulation.html",
    "non-upf-dashboard.html", "all-modules.html", "product-portfolio.html",
]

PROBE = r"""
(function(){
  window.__err = [];
  window.addEventListener('error', function(e){ window.__err.push(String(e.message)); });
  window.addEventListener('unhandledrejection', function(e){ window.__err.push('reject: ' + e.reason); });
})()
"""

STATE = r"""
(function(){
  var h = document.querySelector('[id$="-messages"]') || document.querySelector('.sc-messages');
  if (!h) return { host: false };
  var chips = h.querySelector('.sc-inline-chips, .sc-reply-chips');
  return {
    host: true,
    you: h.querySelectorAll('.sc-line-you').length,
    answers: h.querySelectorAll('.sc-line-wiseai:not(.sc-line-typing)').length,
    stillThinking: !!h.querySelector('.sc-line-typing'),
    chips: !!chips,
    chipsLast: !!chips && h.lastElementChild === chips,
    errors: window.__err || [],
  };
})()
"""

b = Browser(width=1500, height=950, out="/tmp/wise-smoke")
try:
    b.on_new_document(
        "try{localStorage.setItem('wise-auth','1');localStorage.setItem('wise-authed','1');}catch(e){}"
        + PROBE
    )
    for pg in PAGES:
        b.goto(BASE + pg, ready="!!document.querySelector('.ws-intent-chip, .sc-reply-chips .chip')", settle=2.5)
        b.js(PROBE)
        clicked = b.js(
            "(function(){var all=Array.from(document.querySelectorAll("
            "'.ws-intent-chip:not(.ws-intent-chip--askhelp):not([data-chip-more])'));"
            "var n=all.find(function(c){return !/upload|photo|scan|connect|tour/i.test(c.textContent)})||all[0];"
            "if(!n)return null;var t=n.textContent.trim();n.click();return t})()"
        )
        time.sleep(26)
        st = b.js(STATE) or {}
        print("%-26s chip=%-34s %s" % (pg, str(clicked)[:34], json.dumps(st)))
finally:
    b.close()
