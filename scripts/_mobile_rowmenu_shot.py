"""Shoot the row-menu tables on a phone-width viewport.

Every surface that stacks its rows into cards and carries a ⋮ (or a row button),
captured at 430px so the card layout is the one on screen. Prints, per page,
where each card put its ⋮ and its buttons.

Usage:  python3 scripts/_mobile_rowmenu_shot.py [light|dark] [page-substring ...]
"""
import sys, time, json
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from _cdp import Browser

PAGES = [
    ('organizations', '.adm-trow'),
    ('user-management', '.adm-trow'),
    ('teams', '.adm-trow'),
    ('quick-invite', '.adm-trow'),
    ('audit-queue', '.adm-trow'),
    ('non-upf-dashboard', '.adm-trow'),
    ('invoices', '.inv-trow'),
    ('product-portfolio', '.pf-trow'),
    ('verification', '.pf-trow'),
    ('marketing-assets', '.ma-row'),
    ('ingredient-browser', '.ib-trow'),
    ('api-keys', '.wmod-trow'),
    ('alerts', '.wmod-trow'),
]

args = [a.lower() for a in sys.argv[1:]]
THEME = args.pop(0) if args and args[0] in ('light', 'dark') else 'light'
# A width argument shoots the same survey wide, to prove the row layout the
# cards replace is still intact.
WIDTH = int(args.pop(0)) if args and args[0].isdigit() else 430
want = args
TAG = 'mobile' if WIDTH <= 640 else 'wide'
OUT = '/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag'

b = Browser(port=9356, width=WIDTH, height=1000, out=OUT)
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

REPORT = """(function(){
  var row = document.querySelector(%s);
  if (!row) return 'no row';
  var rb = row.getBoundingClientRect();
  function at(el){ var r = el.getBoundingClientRect();
    return Math.round(r.left-rb.left)+','+Math.round(r.top-rb.top)
      +' '+Math.round(r.width)+'x'+Math.round(r.height); }
  var kebab = row.querySelector('[class*="rowmenu"], .panel-more-btn');
  var btn = row.querySelector('button:not([class*="rowmenu"]):not([class*="check"]), a[href]');
  return JSON.stringify({
    row: Math.round(rb.width)+'x'+Math.round(rb.height),
    stacked: !!(row.className.indexOf('rtbl-grow')>=0) ||
      getComputedStyle(row).flexWrap === 'wrap' || getComputedStyle(row).display === 'flex',
    cls: row.className,
    kebab: kebab ? at(kebab) : null,
    control: btn ? (btn.textContent||'').replace(/\\s+/g,' ').trim().slice(0,18)+' @ '+at(btn) : null
  });
})()"""

for name, sel in PAGES:
    if want and not any(w in name for w in want):
        continue
    b.goto('http://localhost:8765/pages/%s.html' % name,
           ready="!!document.querySelector(%s)" % json.dumps(sel), settle=3.5)
    # The tables sit well below the fold on a phone — put the first row on
    # screen before measuring or shooting it.
    b.js("(function(){var r=document.querySelector(%s);"
         "if(r)r.scrollIntoView({block:'start',behavior:'auto'});})()" % json.dumps(sel))
    time.sleep(1.4)
    print('%-20s %s' % (name, b.js(REPORT % json.dumps(sel))))
    b.shot('%s-rows__%s__%s' % (TAG, name, THEME))

b.close()
