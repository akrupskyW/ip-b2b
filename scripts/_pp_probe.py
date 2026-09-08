"""Product Portfolio: is the table reachable, and is the chat at its screen tier?

  python3 scripts/_pp_probe.py [light|dark] [viewport-height]

Reports the chat width against the screen default tier, and whether the claimed
product table is inside the portfolio body's scrollable range.
"""
import json
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
VH = int(sys.argv[2]) if len(sys.argv) > 2 else 900
# Headless Chrome reports screen.width as 800 no matter the --window-size, so the
# screen tier has to be forced to reproduce a real desktop display.
SCREEN_W = int(sys.argv[3]) if len(sys.argv) > 3 else 0
URL = "http://127.0.0.1:8765/pages/product-portfolio.html"

AUTH = """
try {
  if (%d > 0) Object.defineProperty(window.screen, 'width', { get: function(){ return %d; } });
} catch (e) {}
window.__errs = [];""" % (SCREEN_W, SCREEN_W) + """
window.addEventListener('error', function (e) {
  window.__errs.push(String(e.message || '') + ' @ ' + String(e.filename || '') + ':' + (e.lineno || 0));
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

STATE = """(function(){
  function box(el){ if(!el) return null; var r=el.getBoundingClientRect();
    return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; }
  var shell = document.getElementById('chat-shell');
  var body  = document.getElementById('pf-body');
  var tbl   = document.querySelector('.pf-table--claimed');
  var rows  = document.querySelectorAll('.pf-table--claimed .pf-trow');
  var vis = 0, firstVisible = null;
  if (body) {
    var br = body.getBoundingClientRect();
    for (var i=0;i<rows.length;i++){
      var rr = rows[i].getBoundingClientRect();
      if (rr.height > 0 && rr.bottom > br.top && rr.top < br.bottom) {
        vis++;
        if (!firstVisible) firstVisible = (rows[i].textContent||'').replace(/\\s+/g,' ').trim().slice(0,44);
      }
    }
  }
  var pop = document.getElementById('pf-shared-reports-pop');
  return JSON.stringify({
    screenW: (window.screen && window.screen.width) || 0,
    innerW: window.innerWidth,
    wantTier: typeof window.wiseDefaultChatTier === 'function' ? window.wiseDefaultChatTier() : null,
    shellClasses: shell ? shell.className : null,
    shellBox: box(shell),
    reportMode: !!(document.getElementById('modules-row')||{}).classList
                 && document.getElementById('modules-row').classList.contains('report-mode'),
    pfOpen: !!(document.getElementById('portfolio-panel')||{}).classList
             && document.getElementById('portfolio-panel').classList.contains('pf-open'),
    bodyBox: box(body),
    bodyScrollH: body ? body.scrollHeight : 0,
    bodyClientH: body ? body.clientHeight : 0,
    bodyOverflowY: body ? getComputedStyle(body).overflowY : null,
    tableBox: box(tbl),
    rowsTotal: rows.length,
    rowsInView: vis,
    firstVisibleRow: firstVisible,
    popParent: pop ? (pop.parentElement && pop.parentElement.tagName
                      + '#' + (pop.parentElement.id||'')) : 'MISSING',
    errs: (window.__errs||[]).slice(0,6)
  });
})()"""

b = Browser(port=9391 if THEME == "light" else 9392, width=1600, height=VH,
            out="screenshots/_diag")
try:
    b.on_new_document(AUTH)
    b.goto(URL, ready="document.readyState==='complete'"
                      " && document.querySelectorAll('.pf-trow').length>0",
           timeout=45, settle=3.0)
    st = json.loads(b.js(STATE))
    print("theme=%s viewport_h=%d" % (THEME, VH))
    for k in ("screenW", "innerW", "wantTier", "shellClasses", "shellBox",
              "reportMode", "pfOpen", "bodyBox", "bodyScrollH", "bodyClientH",
              "bodyOverflowY", "tableBox", "rowsTotal", "rowsInView",
              "firstVisibleRow", "popParent", "errs"):
        print("  %-16s %s" % (k, st.get(k)))
    print(b.shot("pp-probe__%s__%dh" % (THEME, VH)))
finally:
    b.close()
