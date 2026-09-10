"""Does every chart's text stay inside its own card, at every width?

Two surfaces, one measurement. For each chart card it walks every label the
chart paints and reports how far the worst one spills past the card's content
box, plus the label strings themselves so a doubled label ("ProcessedProcessed")
shows up as text rather than as a shrug.

  python3 scripts/_chart_text_fit_probe.py wiseai [light|dark]
      Drives the brands-by-UPF-label turn, opens the output, and measures every
      chart view the switcher offers (columns, bars, stacked, spider, parallel)
      at three viewport widths.

  python3 scripts/_chart_text_fit_probe.py atx [light|dark] [card-substring ...]
      Measures every chart specimen on analytics-types.html at each chart-size
      preset the size palette offers.
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

WHICH = sys.argv[1] if len(sys.argv) > 1 else "wiseai"
THEME = sys.argv[2] if len(sys.argv) > 2 else "light"
WANT = [a.lower() for a in sys.argv[3:]]
HOST = "http://127.0.0.1:8099"

# Chrome paints a glyph a fraction past its advance width, and a centred label
# on the last gridline legitimately kisses the plot edge. Only a real overrun
# is worth a line of output.
TOL = 2

MEASURE = r"""
(function(cardSel, leaves){
  var out = [];
  var SCROLLER = '.wa-tbl-wrap,.attb-wrap,.rtbl-wrap,.att-scroll,.dash-scroll';
  document.querySelectorAll(cardSel).forEach(function(card, ci){
    var r = card.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var cs = getComputedStyle(card);
    var box = { left: r.left + (parseFloat(cs.paddingLeft)||0),
                right: r.right - (parseFloat(cs.paddingRight)||0) };
    var worst = 0, who = '', labels = [];
    var pool = leaves ? card.querySelectorAll('*')
                      : card.querySelectorAll('text, tspan, .wa-chart-legend .k');
    pool.forEach(function(t){
      /* Only things that paint text themselves. */
      if (leaves && t.children.length) return;
      var txt = (t.getAttribute && t.getAttribute('data-axis-label'));
      if (txt == null) txt = (t.textContent || '').replace(/\s+/g,' ').trim();
      if (!txt) return;
      var q = t.getBoundingClientRect();
      if (!q.width || !q.height) return;
      var ts = getComputedStyle(t);
      if (ts.visibility === 'hidden' || ts.display === 'none' || ts.position === 'fixed') return;
      if (parseFloat(ts.opacity || '1') < 0.05) return;
      /* A scroller is allowed to hold something wider than itself, and text
         that has been told to ellipsis is not overflowing — it is trimmed. */
      if (t.closest(SCROLLER)) return;
      if (ts.textOverflow === 'ellipsis' || ts.overflow === 'hidden') return;
      /* Nor is text that some ancestor clips: it may sit outside the card in
         layout, but nothing of it is painted there. Only what actually reaches
         the screen outside the card counts. */
      var clipped = false;
      for (var a = t.parentElement; a && a !== card; a = a.parentElement) {
        var as = getComputedStyle(a);
        if (as.overflowX !== 'visible' || as.overflowY !== 'visible') { clipped = true; break; }
      }
      if (clipped) return;
      var over = Math.max(q.right - box.right, box.left - q.left);
      var path = '';
      if (over > 2) {
        var p = t, hops = [];
        for (var k = 0; k < 4 && p && p !== card; k++) {
          hops.push(p.tagName.toLowerCase()
            + (p.className ? '.' + String(p.className).split(' ').filter(Boolean)[0] : ''));
          p = p.parentElement;
        }
        path = hops.join(' < ') + ' | side=' + (q.right - box.right > box.left - q.left ? 'right' : 'left');
      }
      labels.push({ t: txt, over: Math.round(over), path: path });
      if (over > worst) { worst = over; who = txt; }
    });
    /* Two labels sharing the same pixels is its own kind of unreadable, so
       measure that as well as the spill. Only labels painted inside the same
       SVG are compared, and only across different <text> elements — the lines
       of one wrapped label are not colliding with each other. */
    var svgText = [];
    card.querySelectorAll('svg text, svg tspan').forEach(function(t){
      if (t.querySelector('tspan')) return;
      var q = t.getBoundingClientRect();
      if (!q.width || !q.height) return;
      var ts = getComputedStyle(t);
      if (ts.visibility === 'hidden' || parseFloat(ts.opacity || '1') < 0.05) return;
      var owner = t.closest('text') || t;
      svgText.push({ el: t, owner: owner, r: q,
                     t: (t.textContent||'').replace(/\s+/g,' ').trim() });
    });
    var collisions = [], worstHit = 0, hitPair = '';
    for (var a = 0; a < svgText.length; a++) {
      for (var bx = a + 1; bx < svgText.length; bx++) {
        if (svgText[a].owner === svgText[bx].owner) continue;
        var ra = svgText[a].r, rb = svgText[bx].r;
        var ow = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        var oh = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (ow <= 0.5 || oh <= 0.5) continue;
        var area = ow * oh;
        if (area < 8) continue;
        collisions.push({ a: svgText[a].t, b: svgText[bx].t, area: Math.round(area) });
        if (area > worstHit) {
          worstHit = area;
          hitPair = svgText[a].t + ' / ' + svgText[bx].t;
        }
      }
    }
    var head = card.querySelector('h1,h2,h3,h4,.att-card-title,.dash-card-title,'
      + '.att-title,.dash-title,.atx-title');
    out.push({ i: ci, id: card.id || '',
               name: (card.className||'').toString().split(' ')[0],
               head: head ? (head.textContent||'').replace(/\s+/g,' ').trim().slice(0,40) : '',
               w: Math.round(r.width), spill: Math.round(worst), who: who,
               hits: collisions.length, hitArea: Math.round(worstHit),
               hitPair: hitPair, labels: labels });
  });
  return JSON.stringify(out);
})(%s, %s)
"""


def measure(b, card_sel, leaves=False):
    return json.loads(b.js(MEASURE % (json.dumps(card_sel),
                                      "true" if leaves else "false")))


def report(tag, cards, show_labels=False):
    bad = 0
    for c in cards:
        flag = "  <<< SPILLS" if c["spill"] > TOL else ""
        if c["spill"] > TOL:
            bad += 1
        dupes = [L["t"] for L in c["labels"] if L["t"] and _doubled(L["t"])]
        if dupes:
            bad += 1
        if c.get("hits"):
            bad += 1
            flag = flag or "  <<< LABELS COLLIDE"
        print("  %-22s %-26s card=%-5s labels=%-3s spill=%-4s hits=%-3s %s%s"
              % ((c["id"] or c["name"])[:22], c.get("head", "")[:26], c["w"],
                 len(c["labels"]), c["spill"], c.get("hits", 0),
                 (c["who"] or c.get("hitPair") or "")[:26], flag))
        if c.get("hits"):
            print("      %d collision(s), worst %spx² : %s"
                  % (c["hits"], c["hitArea"], c.get("hitPair", "")[:60]))
        if dupes:
            print("      DOUBLED LABEL: " + " | ".join(d[:40] for d in dupes[:4]))
        if c["spill"] > TOL:
            for L in sorted(c["labels"], key=lambda x: -x["over"])[:6]:
                if L["over"] > TOL:
                    print("      +%-4s %-22s %s"
                          % (L["over"], (L["t"] or "")[:22], L.get("path", "")))
        if show_labels:
            print("      " + " · ".join((L["t"] or "")[:22] for L in c["labels"][:14]))
    print("  [%s] %d card(s), %d reporting a problem" % (tag, len(cards), bad))
    return bad


def _doubled(s):
    """"Minimally ProcessedMinimally Processed" and its unspaced twin."""
    n = len(s)
    if n < 8 or n % 2:
        return False
    half = n // 2
    return s[:half] == s[half:] or s[:half].replace(" ", "") == s[half:].replace(" ", "")


def force_width(b, px):
    b.cmd("Emulation.setDeviceMetricsOverride",
          {"width": px, "height": 1000, "deviceScaleFactor": 1, "mobile": False})
    time.sleep(2.0)


AUTH = ("try{localStorage.clear();"
        "localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,"
        "name:'Arthur Krupsky',email:'akrupsky@wisecode.ai',"
        "title:'Product Intelligence Lead',org:'WISE Foods',initials:'AK',"
        "at:new Date().toISOString()}));"
        "localStorage.setItem('wise-authed','1');"
        "localStorage.setItem('wise-theme','%s');"
        "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME))

fails = 0

if WHICH == "wiseai":
    ASK = "Break those brands down by WISEcode UPF label"
    b = Browser(port=9431, width=1600, height=1050, out="/tmp/wise-shots")
    b.cmd("Runtime.disable")
    try:
        b.on_new_document(AUTH)
        b.goto(HOST + "/pages/wiseai.html",
               ready="!!document.querySelector('.ws-intent-chip, .fl-input')", settle=3.0)
        b.js("(function(){var t=document.querySelector('.fl-input');t.focus();t.value=%s;"
             "t.dispatchEvent(new Event('input',{bubbles:true}));})()" % json.dumps(ASK))
        time.sleep(0.4)
        b.js("(function(){var s=document.querySelector('.sc-send');if(s)s.click();})()")
        for _ in range(30):
            time.sleep(1.0)
            if b.js("document.querySelectorAll('.sc-surface-card[data-surface]').length"):
                break
        b.js("(function(){var c=document.querySelector('.sc-surface-card[data-surface]');"
             "if(c)c.click();})()")
        for _ in range(15):
            time.sleep(1.0)
            if b.js("document.querySelectorAll('.wa-pane.is-open').length"):
                break
        time.sleep(2.0)
        modes = json.loads(b.js(
            "JSON.stringify(Array.from(document.querySelectorAll('.wa-pane [data-wa-chart-type]'))"
            ".map(function(x){return x.getAttribute('data-wa-chart-type')}))"))
        print("chart views offered:", modes)

        for px in (1600, 1180, 900):
            force_width(b, px)
            print("\n=== viewport %dpx ===" % px)
            for mode in modes:
                b.js("(function(){var n=document.querySelector("
                     "'.wa-pane [data-wa-chart-type=\"%s\"]');if(n)n.click();})()" % mode)
                time.sleep(2.2)
                cards = measure(b, ".wa-pane.is-open .wa-chart-card")
                print(" %s:" % mode)
                fails += report(mode, cards)
    finally:
        b.close()

else:
    SIZES = [("s", "Mobile 380"), ("t", "Tablet 820"), ("m", "Laptop 1280"), ("l", "Desktop full")]
    b = Browser(port=9432, width=1900, height=1250, out="/tmp/wise-shots")
    b.cmd("Runtime.disable")
    try:
        b.on_new_document(AUTH + "try{localStorage.setItem('az-palette-open','0');"
                                 "localStorage.removeItem('az-palette-pos');"
                                 "localStorage.setItem('wise-walkthrough',JSON.stringify("
                                 "{v:1,completed:true,dismissed:true,doneSteps:['*'],"
                                 "skippedGroups:[],screensSeen:{'*':true},cursor:''}));}catch(e){}")
        b.goto(HOST + "/pages/analytics-types.html",
               ready="document.querySelectorAll('.att-card, .attb-card').length > 4", settle=6.0)
        print("landed on:", b.js("location.pathname"),
              "· chart cards:", b.js("document.querySelectorAll('.att-card').length"))
        b.js("(function(){var s=document.getElementById('agent-main-scroll');"
             "if(s)s.scrollTo({top:s.scrollHeight,behavior:'auto'});})()")
        time.sleep(4.0)
        b.js("(function(){var s=document.getElementById('agent-main-scroll');"
             "if(s)s.scrollTo({top:0,behavior:'auto'});})()")
        time.sleep(1.5)

        for sid, label in SIZES:
            for _ in range(10):
                b.js("(function(){var b=document.getElementById('az-palette-launch');"
                     "if(b&&!b.hidden)b.click();})()")
                time.sleep(0.5)
                b.js("(function(){var n=document.querySelector"
                     "('.azp-size[data-azp-size=\"%s\"]');if(n)n.click();})()" % sid)
                time.sleep(1.5)
                if b.js("document.body.getAttribute('data-az-chart-size')") == sid:
                    break
            b.js("(function(){var n=document.querySelector('.azp-close');if(n)n.click();})()")
            time.sleep(1.5)
            frame = b.js("(function(){var d=document.querySelector('#agent-main-scroll .dash');"
                         "return d?Math.round(d.getBoundingClientRect().width):-1;})()")
            print("\n=== preset %s (%s) · report frame %spx ===" % (sid, label, frame))
            cards = measure(b, ".att-card, .attb-card, .dash-card, .inf-card, .cf-card",
                            leaves=True)
            if WANT:
                cards = [c for c in cards
                         if any(w in (c["id"] + c["name"]).lower() for w in WANT)]
            fails += report(sid, cards)
    finally:
        b.close()

print("\n%d problem(s) reported" % fails)
sys.exit(1 if fails else 0)
