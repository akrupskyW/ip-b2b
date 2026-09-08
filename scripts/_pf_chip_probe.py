"""Do the portfolio's intent chips actually do anything?

pfChipGo() looks its target up on window and silently returns when it is not
there, so a chip whose function was never exported reads as a dead tap. This
lists every chip the page can offer, says whether its target is reachable, then
switches to the in-chat product view and re-checks the chips offered there.

  python3 scripts/_pf_chip_probe.py [light|dark]
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
URL = "http://127.0.0.1:8765/pages/product-portfolio.html"

AUTH = """
try { Object.defineProperty(window.screen, 'width', { get: function(){ return 1920; } }); } catch (e) {}
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

# Every onclick target the page can put on a chip, read straight off the DOM.
LIVE_CHIPS = """(function(){
  var out = [];
  document.querySelectorAll('#chat-messages .sc-reply-chips .chip,'
    + ' #chat-messages .sc-inline-chips .chip, .ws-intent-chip').forEach(function(c){
    var r = c.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return;          // on screen only
    var oc = c.getAttribute('onclick') || '';
    var m = oc.match(/pfChipGo\\(this,\\s*'([^']+)'\\)/) || oc.match(/^\\s*([A-Za-z_$][\\w$]*)\\s*\\(/);
    var fn = m ? m[1] : null;
    out.push({
      label: (c.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 34),
      fn: fn,
      onclick: oc.slice(0, 60),
      reachable: fn ? (typeof window[fn] === 'function') : null
    });
  });
  return JSON.stringify(out);
})()"""

b = Browser(port=9461, width=1600, height=1000, out="screenshots/_diag")
fails = []
try:
    b.on_new_document(AUTH)
    b.goto(URL, ready="document.readyState==='complete'"
                      " && document.querySelectorAll('.pf-trow').length>0",
           timeout=45, settle=3.0)

    print("== every function PF_CHIPS can target ==")
    table = json.loads(b.js("""(function(){
      var names = ['startBrowseProducts','startVerifyIngredients','startContinueVerification',
        'startActivateShields','startReviewDiscovered','startCompleteNeedsInfo','startViewClaimed',
        'startClaimProducts','startResolveIneligible','startAddProduct','startAddCatalogIntent',
        'goAddCatalog','startDownloadCatalogTemplate','startDownloadMarketing','goMarketingAssets',
        'startDownloadOnesheet','startDownloadShieldPack','startFilterPortfolio','startGuidingStars',
        'startNearMiss','startEasyWins'];
      return JSON.stringify(names.map(function(n){
        return { fn: n, reachable: typeof window[n] === 'function' };
      }));
    })()"""))
    dead = [r["fn"] for r in table if not r["reachable"]]
    for r in table:
        print("   %-32s %s" % (r["fn"], "ok" if r["reachable"] else "NOT ON WINDOW"))
    if dead:
        fails.append("%d chip targets unreachable" % len(dead))

    print("\n== welcome chips before any turn ==")
    for c in json.loads(b.js(LIVE_CHIPS)):
        print("   %-34s fn=%-28s %s" % (c["label"], c["fn"],
              "ok" if c["reachable"] else ("UNREACHABLE" if c["fn"] else "(inline)")))

    # Switch into the in-chat product card view.
    print("\n== switching to the in-chat product view ==")
    got = b.js("(function(){var c=[].slice.call(document.querySelectorAll('.ws-intent-chip'))"
               ".find(function(n){return /Browse products here/i.test(n.textContent)});"
               "if(!c)return false;c.click();return true})()")
    print("   clicked 'Browse products here': %s" % got)
    # Wait for the turn to actually finish: the answer streams, then the rails
    # are inserted, then the chips trail them.
    for _ in range(40):
        time.sleep(1.0)
        if b.js("document.querySelectorAll('#chat-messages [data-surface-rail]').length") > 0:
            break
    time.sleep(2.5)

    rails = b.js("document.querySelectorAll('#chat-messages [data-surface-rail]').length")
    cards = b.js("document.querySelectorAll('#chat-messages .sc-surface-slot').length")
    print("   product rails=%s  cards=%s" % (rails, cards))

    print("\n== chips offered in that view ==")
    live = json.loads(b.js(LIVE_CHIPS))
    if not live:
        print("   NONE — the transcript dead-ends with no chips")
        fails.append("no chips after the browse turn")
    for c in live:
        state = "ok" if c["reachable"] else ("UNREACHABLE" if c["fn"] else "(inline)")
        if c["fn"] and not c["reachable"]:
            fails.append("chip %r -> %s missing" % (c["label"], c["fn"]))
        print("   %-34s fn=%-28s %s" % (c["label"], c["fn"], state))

    print("\n   page errors: %s" % b.js("JSON.stringify((window.__errs||[]).slice(0,5))"))
    print("   %s" % b.shot("pf-chips__browse__%s" % THEME))
finally:
    b.close()

print("\n%s" % ("all chip targets reachable" if not fails else "PROBLEMS:\n  - " + "\n  - ".join(fails)))
