"""Hold every stacked row-card in the app to the three placement rules.

On a phone the rows of a data table become cards, and a card puts its parts in
fixed places:

  1. the ⋮ is flush with the card's right edge, on the card's FIRST line, so the
     product or company name it belongs to sits beside it and not under it;
  2. it never overlaps that name;
  3. a control that says what it does in words sits centred at the foot, and an
     arrowed link trails the foot on the right.

This drives the real pages at 430px and the table specimens on the analytics
report at its Mobile preset, then reports each card that breaks one.

Usage:  python3 scripts/_mobile_card_audit.py [light|dark]
"""
import sys, time, json
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from _cdp import Browser

THEME = sys.argv[1].lower() if len(sys.argv) > 1 and sys.argv[1].lower() in ('light', 'dark') else 'light'

PAGES = ['organizations', 'user-management', 'teams', 'quick-invite', 'audit-queue',
         'non-upf-dashboard', 'invoices', 'product-portfolio', 'verification',
         'ingredient-browser', 'api-keys', 'alerts', 'reformulation',
         'report-guiding-stars', 'ai-dashboard']

# Every row shape in the app, so the audit does not quietly skip a table.
ROW_SEL = ('.adm-trow, .inv-trow, .pf-trow, .ma-row, .rtbl-grow, '
           'table.rtbl.rtbl-cards tbody > tr')

AUDIT = """(function(){
  var EDGE = 16;      /* px of slack against the card's right edge */
  var CENTRE = 14;    /* px of slack on a centred control */
  var out = [];
  var rows = document.querySelectorAll(%s);
  Array.prototype.forEach.call(rows, function (row, i) {
    var rb = row.getBoundingClientRect();
    if (!rb.width || !rb.height) return;
    var stacked = rb.height > 90 || row.classList.contains('rtbl-grow');
    var cs = getComputedStyle(row);
    if (cs.display === 'grid' && cs.gridTemplateColumns.split(' ').length > 3) stacked = false;
    if (!stacked) return;

    var kebab = row.querySelector('[class*="rowmenu"] button, .panel-more-btn, .adm-icon-btn[aria-haspopup]');
    if (!kebab) {
      var glyphs = row.querySelectorAll('.material-symbols-outlined');
      for (var g = 0; g < glyphs.length; g++) {
        var t = (glyphs[g].textContent || '').trim();
        if (t === 'more_vert' || t === 'more_horiz') {
          kebab = glyphs[g].closest('button') || glyphs[g]; break;
        }
      }
    }
    var bad = [];
    var kb = null;
    if (kebab) {
      kb = kebab.getBoundingClientRect();
      if (rb.right - kb.right > EDGE) bad.push('kebab not flush right (' +
        Math.round(rb.right - kb.right) + 'px in)');
      if (kb.top - rb.top > 26) bad.push('kebab not on the first line (' +
        Math.round(kb.top - rb.top) + 'px down)');
    }

    /* Overlap: the ⋮ against every other laid-out box in the card. */
    if (kb) {
      var parts = row.querySelectorAll('a, img, .adm-idcell-name, .pf-pname, .attb-stack-t, .inv-num');
      Array.prototype.forEach.call(parts, function (p) {
        if (kebab.contains(p) || p.contains(kebab)) return;
        var pr = p.getBoundingClientRect();
        if (!pr.width || !pr.height) return;
        if (pr.left < kb.right - 1 && pr.right > kb.left + 1 &&
            pr.top < kb.bottom - 1 && pr.bottom > kb.top + 1) {
          bad.push('kebab overlaps "' + (p.textContent||p.alt||'img').replace(/\\s+/g,' ').trim().slice(0,20) + '"');
        }
      });
    }

    /* Written controls: centred at the foot, or right-hand if arrowed. */
    var seen = {};
    var ctrls = row.querySelectorAll('button, a[href]');
    Array.prototype.forEach.call(ctrls, function (c) {
      var txt = (c.textContent || '').replace(/\\s+/g, ' ').trim();
      var glyph = c.querySelector('.material-symbols-outlined');
      if (glyph) txt = txt.replace((glyph.textContent||'').trim(), '').trim();
      if (!txt) return;                       /* icon-only: not an action */
      var cb = c.getBoundingClientRect();
      if (!cb.width) return;
      if (cb.top - rb.top < rb.height * 0.5) return;   /* inline in a field */
      /* A run of chips is centred as a run, not one by one — so measure the
         box that holds them against the card. */
      var holder = c.parentElement;
      var many = holder.querySelectorAll('button, a[href]').length > 1;
      var box = (many ? holder : c).getBoundingClientRect();
      var name = many ? 'the foot controls' : '"' + txt.slice(0, 18) + '"';
      var off = ((box.left - rb.left) - (rb.right - box.right)) / 2;
      if (Math.abs(off) > CENTRE) {
        if (many && seen[holder.className]) return;
        seen[holder.className] = 1;
        bad.push(name + ' at the foot is not centred (' + Math.round(off) + 'px off)');
      }
    });

    if (bad.length) out.push('  row ' + i + ' [' + row.className.slice(0, 40) + ']: ' + bad.join('; '));
  });
  return out.length ? out.join('\\n') : '  ok (' + rows.length + ' rows)';
})()""" % json.dumps(ROW_SEL)

b = Browser(port=9357, width=430, height=1000, out='/tmp/cardaudit')
b.on_new_document("""
try {
  localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Arthur Krupsky',
    email:'akrupsky@wisecode.ai',title:'Product Intelligence Lead',org:'WISE Foods',
    initials:'AK',at:new Date().toISOString()}));
  localStorage.setItem('wise-theme', %r);
  localStorage.setItem('chat-theme', %r);
  localStorage.setItem('wise-walkthrough', JSON.stringify({v:1,completed:true,dismissed:true,
    doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));
} catch (e) {}
""" % (THEME, THEME))

fails = 0
for name in PAGES:
    b.goto('http://localhost:8765/pages/%s.html' % name, settle=4.0)
    res = b.js(AUDIT)
    print(name)
    print(res)
    if 'ok (' not in res:
        fails += 1

# The analytics report carries a specimen of every table in the app, so one
# pass at its Mobile preset covers the whole catalog in one place.
b.js("try{localStorage.setItem('az-palette-open','0');"
     "localStorage.removeItem('az-palette-pos')}catch(e){}")
b.goto('http://localhost:8765/pages/analytics-types.html',
       ready="!!document.getElementById('attb-nud')", settle=8.0)
for _ in range(10):
    b.js("(function(){var n=document.getElementById('az-palette-launch');"
         "if(n&&!n.hidden)n.click();})()")
    time.sleep(0.6)
    b.js("(function(){var n=document.querySelector('.azp-size[data-azp-size=\"s\"]');"
         "if(n)n.click();})()")
    time.sleep(1.6)
    if b.js("document.body.getAttribute('data-az-chart-size')") == 's':
        break
b.js("(function(){var n=document.querySelector('.azp-close');if(n)n.click();})()")
time.sleep(2.0)
res = b.js(AUDIT)
print('analytics-types (%d specimens)' % (b.js("document.querySelectorAll('.attb-card').length") or 0))
print(res)
if 'ok (' not in res:
    fails += 1

print('\n== %d page(s) with a card out of place ==' % fails)
b.close()
