"""Click everything in the portfolio's in-chat product view and report what responds.

The cards in that view are cloneNode copies of the board's rows, moved into the
transcript, so anything wired to the board rather than to the document stops
working once the board is closed. This drives each control and each trailing
intent chip for real.

  python3 scripts/_pf_browse_interact.py [light|dark]
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

fails = []


def ok(cond, msg):
    print(("  ok    " if cond else "  FAIL  ") + msg)
    if not cond:
        fails.append(msg)


def enter_browse(b):
    b.on_new_document(AUTH)
    b.goto(URL, ready="document.readyState==='complete'"
                      " && document.querySelectorAll('.pf-trow').length>0",
           timeout=45, settle=3.0)
    b.js("startBrowseProducts()")
    for _ in range(40):
        time.sleep(1.0)
        if b.js("document.querySelectorAll('#chat-messages [data-surface-rail]').length") > 0:
            break
    time.sleep(2.5)


CARD = "#chat-messages .sc-surface-slot .pf-trow"

b = Browser(port=9471, width=1600, height=1000, out="screenshots/_diag")
try:
    enter_browse(b)
    print("theme=%s   rails=%s cards=%s" % (
        THEME,
        b.js("document.querySelectorAll('#chat-messages [data-surface-rail]').length"),
        b.js("document.querySelectorAll('#chat-messages .sc-surface-slot').length")))

    print("\n-- controls inside the cloned product cards --")

    # 1. Row checkbox.
    b.js("document.querySelector('%s .vf-check[data-pf=\\'toggle-row\\']').click()" % CARD)
    time.sleep(0.6)
    pressed = b.js("document.querySelector('%s .vf-check[data-pf=\\'toggle-row\\']')"
                   ".getAttribute('aria-pressed')" % CARD)
    sel = b.js("document.querySelectorAll('#chat-messages .sc-surface-slot .pf-trow.is-selected').length")
    ok(pressed == "true", "a card checkbox selects the product (aria-pressed=%s, selected rows=%s)"
       % (pressed, sel))

    # 2. Rail "Select all".
    b.js("document.querySelector('#chat-messages [data-pf=\\'toggle-all\\'][data-pf-rail]').click()")
    time.sleep(0.8)
    allsel = b.js("""(function(){
      var lead=document.querySelector('#chat-messages [data-pf="toggle-all"][data-pf-rail]');
      var seg=lead.getAttribute('data-pf-rail');
      var rows=document.querySelectorAll('#chat-messages .pf-trow[data-pf-seg="'+seg+'"]');
      var on=document.querySelectorAll('#chat-messages .pf-trow[data-pf-seg="'+seg+'"].is-selected');
      return on.length+'/'+rows.length+' pressed='+lead.getAttribute('aria-pressed');
    })()""")
    ok("/" in str(allsel) and not str(allsel).startswith("0/"),
       "the rail's Select all selects that section (%s)" % allsel)

    # 3. Row three-dot.
    b.js("document.body.click()")
    time.sleep(0.3)
    b.js("document.querySelector('%s .pf-rowmenu-btn').click()" % CARD)
    time.sleep(0.7)
    items = b.js("""(function(){
      return [].slice.call(document.querySelectorAll('.pf-rowmenu-item'))
        .filter(function(n){var r=n.getBoundingClientRect();return r.width>0&&r.height>0;}).length;
    })()""")
    ok(items >= 3, "a card's three-dot menu opens (%s visible items)" % items)

    # 4. Reports icon.
    b.js("document.body.click()")
    time.sleep(0.3)
    hasrep = b.js("!!document.querySelector('%s .pf-reports-btn')" % CARD)
    if hasrep:
        b.js("document.querySelector('%s .pf-reports-btn').click()" % CARD)
        time.sleep(0.7)
        vis = b.js("""(function(){var p=document.getElementById('pf-shared-reports-pop');
          if(!p||p.hasAttribute('hidden'))return 'closed';
          var r=p.getBoundingClientRect();return (r.width>0&&r.height>0)?'open '+Math.round(r.width)+'x'+Math.round(r.height):'closed';})()""")
        ok(str(vis).startswith("open"), "a card's Reports icon opens the menu (%s)" % vis)
        b.js("document.body.click()")
    else:
        print("  --    no Reports icon on this card (claimed-only control)")

    # 5. Status chips + the card's action button are links / buttons with real targets.
    info = json.loads(b.js("""(function(){
      function look(sel){
        var n=document.querySelector(sel);
        if(!n) return null;
        return { tag:n.tagName, href:n.getAttribute('href')||'', onclick:(n.getAttribute('onclick')||'').slice(0,50),
                 text:(n.textContent||'').replace(/\\s+/g,' ').trim().slice(0,30) };
      }
      return JSON.stringify({
        action: look('#chat-messages .sc-surface-slot .pf-col-action a, #chat-messages .sc-surface-slot .pf-col-action button'),
        chip:   look('#chat-messages .sc-surface-slot .pf-chip--attest, #chat-messages .sc-surface-slot .pf-chip--prequal'),
        verify: look('#chat-messages .sc-surface-slot .pf-verify-link, #chat-messages .sc-surface-slot a[href*="add-product"], #chat-messages .sc-surface-slot a[href*="view-product"]')
      });
    })()"""))
    for k, v in info.items():
        if v:
            print("  --    card %s control %r (tag=%s href=%r)"
                  % (k, v["text"], v["tag"], v["href"][:40]))

    # A status chip is a <button> with no href, so the only way to know it does
    # anything is to click it and see whether the page moves.
    for sel, name in ((".pf-chip--attest", "Pending Attestation"),
                      (".pf-chip--prequal", "Pre-qualified"),
                      (".pf-chip--verify", "Verify ingredients"),
                      (".pf-row-act--verify", "Verify ingredients action"),
                      (".pf-row-act--complete", "Complete data action")):
        # Each of these navigates, so the view has to be rebuilt before the
        # presence check as well as before the click.
        enter_browse(b)
        present = b.js("!!document.querySelector('#chat-messages .sc-surface-slot %s')" % sel)
        if not present:
            print("  --    card chip %-22s not present in this view" % name)
            continue
        before = b.js("location.pathname + location.search")
        b.js("document.querySelector('#chat-messages .sc-surface-slot %s').click()" % sel)
        time.sleep(3.0)
        after = b.js("location.pathname + location.search")
        ok(after != before,
           "card chip %-22s -> %s" % (name, after.split("/")[-1][:58] if after != before
                                      else "NOTHING HAPPENED (dead tap)"))

    print("\n   page errors so far: %s" % b.js("JSON.stringify((window.__errs||[]).slice(0,5))"))
    print("   %s" % b.shot("pf-browse__cards__%s" % THEME))

    # 6. Each trailing intent chip, one page load at a time (several navigate).
    print("\n-- the trailing intent chips, each clicked for real --")
    enter_browse(b)
    chips = json.loads(b.js("""(function(){
      return JSON.stringify([].slice.call(
        document.querySelectorAll('#chat-messages .sc-reply-chips .chip'))
        .map(function(c){ return (c.textContent||'').replace(/\\s+/g,' ').trim(); }));
    })()"""))
    print("   offered: %s" % chips)

    for label in chips:
        enter_browse(b)
        before = b.js("JSON.stringify({p:location.pathname,"
                      "lines:document.querySelectorAll('#chat-messages .sc-line-wiseai').length,"
                      "rails:document.querySelectorAll('#chat-messages [data-surface-rail]').length})")
        clicked = b.js("""(function(){
          var c=[].slice.call(document.querySelectorAll('#chat-messages .sc-reply-chips .chip'))
            .find(function(n){return n.textContent.replace(/\\s+/g,' ').trim()===%s});
          if(!c) return false; c.click(); return true;
        })()""" % json.dumps(label))
        time.sleep(6.0)
        after = b.js("JSON.stringify({p:location.pathname,"
                     "lines:document.querySelectorAll('#chat-messages .sc-line-wiseai').length,"
                     "rails:document.querySelectorAll('#chat-messages [data-surface-rail]').length,"
                     "pane:!!document.querySelector('#portfolio-panel.pf-open'),"
                     "errs:(window.__errs||[]).slice(0,3)})")
        bj, aj = json.loads(before), json.loads(after)
        moved = (bj["p"] != aj["p"]) or (aj["lines"] > bj["lines"]) or aj.get("pane")
        ok(bool(clicked) and moved,
           "%-34s -> %s" % (label, "navigated to " + aj["p"] if bj["p"] != aj["p"]
                            else ("board opened" if aj.get("pane")
                                  else ("replied (%d->%d lines)" % (bj["lines"], aj["lines"])
                                        if aj["lines"] > bj["lines"] else "NOTHING HAPPENED"))))
        if aj.get("errs"):
            print("          errors: %s" % aj["errs"])
finally:
    b.close()

print("\n%s" % ("everything in the product view responds"
                if not fails else "PROBLEMS:\n  - " + "\n  - ".join(fails)))
sys.exit(1 if fails else 0)
