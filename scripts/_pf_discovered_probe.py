"""Drive the portfolio's Discovered table: columns, row ⋮ Remove, multi-select Remove.

Discovered carries no Data / Non-UPF Shield column, its per-row action is
Review & Claim, and Remove is reachable both from the row ⋮ and from the
selection bar the header checkbox raises.

  python3 scripts/_pf_discovered_probe.py [light|dark]
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
  localStorage.removeItem('wise-portfolio-removed');
  localStorage.removeItem('wise-portfolio-claimed');
  localStorage.setItem('wise-theme', '%s');
  localStorage.setItem('chat-theme', '%s');
} catch (e) {}
""" % (THEME, THEME)

fails = []


def ok(cond, msg):
    print(("  ok    " if cond else "  FAIL  ") + msg)
    if not cond:
        fails.append(msg)


def open_board(b):
    b.on_new_document(AUTH)
    b.goto(URL, ready="document.readyState==='complete'"
                      " && document.querySelectorAll('.pf-trow').length>0",
           timeout=45, settle=2.5)
    b.js("startReviewDiscovered()")
    for _ in range(40):
        time.sleep(0.8)
        if b.js("!!document.querySelector('#portfolio-panel.pf-open')"):
            break
    time.sleep(3.0)
    b.js("""(function(){
      var v=document.getElementById('pf-view-discovered');
      if(v) v.scrollIntoView({block:'start'});
    })()""")
    time.sleep(1.2)


b = Browser(port=9473, width=1600, height=1000, out="screenshots/_diag")
try:
    open_board(b)

    print("theme=%s" % THEME)
    print("\n-- columns --")
    cols = json.loads(b.js("""(function(){
      function keys(sel){
        return [].slice.call(document.querySelectorAll(sel)).map(function(n){
          return (n.className.match(/pf-col-[a-z]+/)||[''])[0];
        });
      }
      var row=document.querySelector('#pf-view-discovered .pf-table--discovered .pf-trow');
      return JSON.stringify({
        head: keys('#pf-view-discovered .pf-table--discovered .pf-thead .pf-th'),
        row: row ? [].slice.call(row.children).map(function(n){
          return (n.className.match(/pf-col-[a-z]+/)||[''])[0]; }) : [],
        headLabels: [].slice.call(document.querySelectorAll(
          '#pf-view-discovered .pf-table--discovered .pf-thead .pf-th'))
          .map(function(n){ return (n.textContent||'').replace(/\\s+/g,' ').trim(); }),
        tracks: getComputedStyle(document.querySelector(
          '#pf-view-discovered .pf-table--discovered .pf-thead')).gridTemplateColumns
      });
    })()"""))
    print("   head: %s" % cols["head"])
    print("   row:  %s" % cols["row"])
    print("   labels: %s" % cols["headLabels"])
    print("   tracks: %s" % cols["tracks"])
    ok("pf-col-data" not in cols["head"] and "pf-col-shield" not in cols["head"],
       "no Data / Non-UPF Shield header on Discovered")
    ok("pf-col-data" not in cols["row"] and "pf-col-shield" not in cols["row"],
       "no Data / Non-UPF Shield cell on a Discovered row")
    ok(cols["row"] == cols["head"],
       "row cells line up with the header, one per track")
    ok(len(cols["tracks"].split()) == len(cols["head"]),
       "the grid declares exactly as many tracks as there are columns")
    ok("pf-col-product" in cols["row"] and "pf-col-updated" in cols["row"],
       "Product (name + UPC) and Updated / Last edited are kept")
    ok(bool(b.js("!!document.querySelector('#pf-view-discovered .pf-row-act--claim')")),
       "every row keeps Review & Claim as its main action")

    print("\n-- the row three-dot --")
    b.js("document.querySelector('#pf-view-discovered .pf-trow .pf-rowmenu-btn').click()")
    time.sleep(0.8)
    LABELS = """(function(){
      return JSON.stringify([].slice.call(document.querySelectorAll('.pf-rowmenu-item'))
        .filter(function(n){var r=n.getBoundingClientRect();return r.width>0&&r.height>0;})
        .map(function(n){
          var c=n.cloneNode(true);
          [].slice.call(c.querySelectorAll('.material-symbols-outlined')).forEach(function(g){g.remove();});
          return (c.textContent||'').replace(/\\s+/g,' ').trim();
        }));
    })()"""
    items = json.loads(b.js(LABELS))
    print("   items: %s" % items)
    ok([i.lower() for i in items] == ["remove product"],
       "the row ⋮ offers Remove product and nothing else (%s)" % items)
    print("   %s" % b.shot("pf-discovered__rowmenu__%s" % THEME))
    b.js("document.body.click()")
    time.sleep(0.4)

    name0 = b.text("#pf-view-discovered .pf-trow .pf-pname")
    n_before = b.count("#pf-view-discovered .pf-trow")
    b.js("document.querySelector('#pf-view-discovered .pf-trow .pf-rowmenu-btn').click()")
    time.sleep(0.7)
    b.js("""(function(){
      var it=[].slice.call(document.querySelectorAll('.pf-rowmenu-item'))
        .find(function(n){
          var c=n.cloneNode(true);
          [].slice.call(c.querySelectorAll('.material-symbols-outlined')).forEach(function(g){g.remove();});
          return /^\\s*Remove product\\s*$/i.test((c.textContent||'').replace(/\\s+/g,' '));
        });
      if(it) it.click();
    })()""")
    time.sleep(3.0)
    n_after = b.count("#pf-view-discovered .pf-trow")
    ok(n_after == n_before - 1,
       "Remove drops that one row (%s -> %s rows, %r)" % (n_before, n_after, name0))
    ok(name0 not in (b.js("""(function(){
        return [].slice.call(document.querySelectorAll('#pf-view-discovered .pf-pname'))
          .map(function(n){return n.textContent.trim();}).join('|');
      })()""") or "").split("|"), "the removed product is gone from the list")

    print("\n-- the header checkbox + selection bar --")
    open_board(b)
    b.js("document.querySelector('#pf-view-discovered [data-pf=\\'toggle-all\\']').click()")
    time.sleep(0.8)
    bar = json.loads(b.js("""(function(){
      var bar=document.getElementById('pf-selbar-discovered');
      var r=bar?bar.getBoundingClientRect():{width:0,height:0};
      return JSON.stringify({
        hidden: !bar || bar.hasAttribute('hidden'),
        box: Math.round(r.width)+'x'+Math.round(r.height),
        count: bar?(bar.querySelector('.pf-selbar-count')||{}).textContent:'',
        selected: document.querySelectorAll('#pf-view-discovered .pf-trow.is-selected').length,
        rows: document.querySelectorAll('#pf-view-discovered .pf-trow').length,
        shown: [].slice.call(document.querySelectorAll('#pf-view-discovered .pf-trow'))
          .filter(function(r){ return !r.classList.contains('wtp-clip') &&
            !r.classList.contains('pf-row-hidden'); }).length
      });
    })()"""))
    print("   bar: %s" % bar)
    ok(not bar["hidden"] and bar["box"] != "0x0",
       "ticking the header checkbox raises the selection bar (%s)" % bar["box"])
    ok(bar["selected"] == bar["shown"] and bar["shown"] > 0,
       "select all selects every row on the page (%s/%s)" % (bar["selected"], bar["shown"]))
    ok(str(bar["shown"]) in str(bar["count"]), "the bar counts the selection (%r)" % bar["count"])
    print("   %s" % b.shot("pf-discovered__selbar__%s" % THEME))

    pinned = json.loads(b.js("""(function(){
      var body=document.getElementById('pf-body');
      body.scrollTop = body.scrollTop + 320;
      var bar=document.getElementById('pf-selbar-discovered');
      var head=document.querySelector('#pf-view-discovered .pf-thead');
      var b1=bar.getBoundingClientRect(), h1=head.getBoundingClientRect();
      var bb=body.getBoundingClientRect();
      return JSON.stringify({
        barTop: Math.round(b1.top), barBottom: Math.round(b1.bottom),
        headTop: Math.round(h1.top), bodyTop: Math.round(bb.top),
        bodyBottom: Math.round(bb.bottom)
      });
    })()"""))
    time.sleep(0.8)
    print("   scrolled: %s" % pinned)
    ok(pinned["barTop"] >= pinned["bodyTop"] - 2 and pinned["barBottom"] <= pinned["bodyBottom"],
       "the bar stays on screen once the list is scrolled")
    ok(pinned["headTop"] >= pinned["barBottom"] - 2,
       "the column header sits below the bar rather than under it")
    print("   %s" % b.shot("pf-discovered__selbar-scrolled__%s" % THEME))

    rows_before = bar["rows"]
    picked = bar["selected"]
    seg_before = b.text("#pf-seg-discovered .pf-stat-num")
    b.js("document.querySelector('#pf-selbar-discovered [data-pf=\\'remove-selected\\']').click()")
    time.sleep(12.0)
    left = b.count("#pf-view-discovered .pf-trow")
    seg_after = b.text("#pf-seg-discovered .pf-stat-num")
    bar_gone = b.js("document.getElementById('pf-selbar-discovered').hasAttribute('hidden')")
    ok(left == rows_before - picked,
       "Remove drops every selected row at once (%s -> %s rows, %s picked)"
       % (rows_before, left, picked))
    ok(bar_gone, "the bar stands down once nothing is selected")
    ok(str(seg_after) == str(int(seg_before) - picked),
       "the Discovered score card follows the removal (%s -> %s)" % (seg_before, seg_after))
    said = b.js("""(function(){
      var l=document.querySelectorAll('#chat-messages .sc-line-wiseai');
      return l.length?(l[l.length-1].textContent||'').replace(/\\s+/g,' ').trim().slice(0,180):'';
    })()""")
    ok("Removed" in (said or ""), "WISEcodeAI reports the bulk removal: %r" % said)

    print("\n-- Guiding Stars mode still lines up --")
    open_board(b)
    b.js("""(function(){
      if (typeof pfToggleStars === 'function') pfToggleStars();
      else document.getElementById('pf-stars-toggle')?.click();
    })()""")
    time.sleep(2.0)
    gs = json.loads(b.js("""(function(){
      var row=document.querySelector('#pf-view-discovered .pf-table--discovered .pf-trow');
      var head=document.querySelector('#pf-view-discovered .pf-table--discovered .pf-thead');
      return JSON.stringify({
        heads: head.querySelectorAll('.pf-th').length,
        cells: row?row.children.length:0,
        tracks: getComputedStyle(head).gridTemplateColumns.split(' ').length,
        on: !!document.querySelector('#portfolio-panel.pf-stars-on')
      });
    })()"""))
    print("   stars: %s" % gs)
    if gs["on"]:
        ok(gs["heads"] == gs["cells"] == gs["tracks"],
           "stars-on grid matches the column count (%s heads / %s cells / %s tracks)"
           % (gs["heads"], gs["cells"], gs["tracks"]))
    else:
        print("  --    could not turn Guiding Stars on in this run")
    print("   %s" % b.shot("pf-discovered__stars__%s" % THEME))

    print("\n   page errors: %s" % b.js("JSON.stringify((window.__errs||[]).slice(0,5))"))
    open_board(b)
    print("   %s" % b.shot("pf-discovered__table__%s" % THEME))
finally:
    b.close()

print("\n%s" % ("the Discovered table matches the notes"
                if not fails else "PROBLEMS:\n  - " + "\n  - ".join(fails)))
sys.exit(1 if fails else 0)
