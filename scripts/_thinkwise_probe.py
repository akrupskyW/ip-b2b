"""Drive the "Think Wise. Code Wise. Live Wise." campaign on wiseai.html.

Taps the welcome card, then checks the finished turn: the three owls on their
own carousel because they are all the same plate, the whole buy packed into one
edge-to-edge masonry grid, and the launch film last with its own controls and
nothing playing. Confirms every output pane stayed shut and the chat never
resized, opens a piece full size and steps to the next one, then taps the cast
chip and checks the character bible lands with a plate, a line and its facts
for each owl.

    python3 scripts/_thinkwise_probe.py [light|dark] [wait-seconds] [model-off|model-on]

The local model is pinned OFF by default. It is on by default in the page, and
a rewrite replaces the whole answer when it lands — so a run with it on cannot
tell "the component never rendered" from "the component is being re-rendered
right now". Run it once with `model-on` as well: the components are masked in
ollama-chat.js KEEP_SEL, so they must survive the rewrite intact.
"""
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
WAIT_S = float(sys.argv[2]) if len(sys.argv) > 2 else 200.0
MODEL_ON = len(sys.argv) > 3 and sys.argv[3] == "model-on"

STATE = r"""
(function(){
  var host = document.querySelector('[id$="-messages"]');
  if (!host) return { none: true };
  var mod = document.querySelector('.wa-chat, .sc-card') || document.body;
  var mb = mod.getBoundingClientRect();
  /* The packed buy. */
  var grid = host.querySelector('.sc-mgrid-grid');
  var tiles = grid ? Array.from(grid.querySelectorAll('.sc-mgrid-item')) : [];
  var spans = {};
  tiles.forEach(function (t) { spans[t.style.gridRowEnd || '?'] = 1; });
  var gb = grid ? grid.getBoundingClientRect() : null;
  /* The three plates, on their own rail because they share one shape. */
  var vp = host.querySelector('[data-mgrid-railvp]');
  var rtiles = vp ? Array.from(vp.querySelectorAll('.sc-mgrid-item')) : [];
  var rh = {};
  rtiles.forEach(function (t) { rh[Math.round(t.getBoundingClientRect().height)] = 1; });
  var vb = vp ? vp.getBoundingClientRect() : null;
  var railFig = host.querySelector('.sc-mgrid--rail');
  /* The bible page, which the cast follow-up posts. */
  var bible = host.querySelector('.wcb');
  var plates = bible ? Array.from(bible.querySelectorAll('.wcb-card')) : [];
  var film = host.querySelector('.sc-inline-film-media');
  var fsrc = film ? film.querySelector('source') : null;
  var open = ['wa-results','wa-visuals','wa-unified','wa-report'].filter(function(id){
    var el = document.getElementById(id);
    return el && el.classList.contains('is-open');
  });
  return {
    tiles: tiles.length,
    spans: Object.keys(spans).length,
    cols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
    bleedL: gb ? Math.round(gb.left - mb.left) : null,
    bleedR: gb ? Math.round(mb.right - gb.right) : null,
    grids: host.querySelectorAll('.sc-mgrid').length,
    rail: rtiles.length,
    railShapes: Object.keys(rh).length,
    railOver: vp ? (vp.scrollWidth - vp.clientWidth) : 0,
    railBleedL: vb ? Math.round(vb.left - mb.left) : null,
    railBleedR: vb ? Math.round(mb.right - vb.right) : null,
    railTitles: rtiles.map(function (t) {
      return t.getAttribute('data-mgrid-title') || '';
    }),
    railArt: rtiles.map(function (t) {
      var i = t.querySelector('.sc-mgrid-img');
      return i ? (i.naturalWidth > 0) : false;
    }),
    gridBeforeFilm: (grid && film) ? (grid.compareDocumentPosition(film) & 4) === 4 : false,
    railBeforeGrid: (railFig && grid) ? (railFig.compareDocumentPosition(grid) & 4) === 4 : false,
    plates: plates.length,
    names: plates.map(function (p) {
      var n = p.querySelector('.wcb-name');
      return n ? n.textContent.trim() : '';
    }),
    lines: plates.map(function (p) {
      var l = p.querySelector('.wcb-line');
      return l ? l.textContent.trim() : '';
    }),
    accents: plates.map(function (p) {
      return getComputedStyle(p).getPropertyValue('--wcb-accent').trim();
    }),
    facts: plates.map(function (p) { return p.querySelectorAll('.wcb-fact').length; }),
    plateArt: plates.map(function (p) {
      var i = p.querySelector('.wcb-art');
      return i ? (i.naturalWidth > 0) : false;
    }),
    film: !!film,
    filmSrc: fsrc ? fsrc.getAttribute('src') : '',
    filmCtl: film ? !!film.controls : false,
    filmPlaying: film ? !film.paused : false,
    filmAuto: film ? !!film.autoplay : false,
    chips: host.querySelectorAll('.sc-inline-chips .chip, .sc-reply-chips .chip').length,
    open: open,
    chatW: Math.round(mb.width),
    errs: (window.__errs || []).join(' || ')
  };
})()
"""

fails = 0


def ok(cond, msg):
    global fails
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails += 1


def escape(b):
    """Press Escape in the page (see _campaign_probe.py for why not via CDP)."""
    b.js("document.dispatchEvent(new KeyboardEvent('keydown',"
         "{key:'Escape',code:'Escape',keyCode:27,bubbles:true,cancelable:true}))")
    for _ in range(8):
        time.sleep(0.3)
        if not b.js("!!document.getElementById('wise-masonry-detail')"):
            return


def wait_for(b, done, wait_s, note="", resettle=True):
    """Poll the page state until `done(state)` holds, then let it settle.

    `resettle=False` returns the very state that satisfied the wait instead of
    re-reading. The closing chip row is one shared element the chat re-parks at
    the end of the thread, so it is momentarily empty while it moves — a second
    read can legitimately catch it at zero after a first read saw it full.
    """
    t0 = time.time()
    last = None
    while time.time() - t0 < wait_s:
        st = b.js(STATE) or {}
        if done(st):
            if not resettle:
                return st
            time.sleep(1.2)
            return b.js(STATE) or {}
        brief = (st.get("rail"), st.get("tiles"), st.get("plates"),
                 st.get("film"), st.get("chips"))
        if brief != last:
            print("    … %srail=%s tiles=%s plates=%s film=%s chips=%s"
                  % ((note + " ") if note else "", *brief))
            last = brief
        time.sleep(2.0)
    return b.js(STATE) or {}


def poll_js(b, expr, pred, wait_s, every=0.5):
    """Read one expression until it satisfies `pred`, then hand it back."""
    t0 = time.time()
    last = None
    while time.time() - t0 < wait_s:
        last = b.js(expr)
        if pred(last):
            return last
        time.sleep(every)
    return last


def main():
    os.makedirs(OUT, exist_ok=True)
    b = Browser(width=1512, height=980, out=OUT)
    b.cmd("Runtime.disable")
    try:
        b.on_new_document(
            "window.__errs=[];addEventListener('error',function(e){"
            "__errs.push((e.message||'')+' @ '+(e.filename||'')+':'+(e.lineno||''))});"
            "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
            "localStorage.setItem('wise-authed','1');"
            "localStorage.setItem('wise-theme','%s');"
            "localStorage.setItem('chat-theme','%s');"
            "localStorage.setItem('wise:chat-ollama-on','%s');}catch(e){}"
            % (THEME, THEME, '1' if MODEL_ON else '0')
        )
        print("  local model:", "on" if MODEL_ON else "off")
        b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)
        ok(bool(b.js("document.documentElement.classList.contains('dark')"))
           == (THEME == "dark"), "loaded in %s mode" % THEME)

        rest_w = b.js("(function(){var m=document.querySelector('.wa-chat, .sc-card');"
                      "return m?Math.round(m.getBoundingClientRect().width):0})()")
        print("  chat rest width", rest_w)

        card = b.js(
            "(function(){"
            "var cards=Array.from(document.querySelectorAll('.sc-welcome .ws-scorecard'));"
            "var i=cards.findIndex(function(c){"
            "return /leave the screen/i.test(c.getAttribute('aria-label')||'')});"
            "if(i<0)return null;"
            "cards[i].scrollIntoView({inline:'center',block:'nearest'});"
            "var art=getComputedStyle(cards[i]).getPropertyValue('--ws-sc-art');"
            "return {i:i,art:(art||'').trim().slice(0,90)};"
            "})()"
        ) or {}
        ok((card.get("i") or -1) >= 0, "the Wise Walk card is on the welcome rail")
        ok("think-wise" in (card.get("art") or ""), "carrying the campaign's own artwork")
        time.sleep(0.5)
        print("  shot", b.shot("thinkwise__welcome-card__%s" % THEME))

        b.js("(function(){"
             "var cards=Array.from(document.querySelectorAll('.sc-welcome .ws-scorecard'));"
             "var c=cards.find(function(x){"
             "return /leave the screen/i.test(x.getAttribute('aria-label')||'')});"
             "if(c)c.click();})()")

        st = wait_for(b, lambda s: s.get("tiles") == 12 and s.get("rail") == 3
                      and s.get("film"), WAIT_S, "turn")
        print("  state", {k: st.get(k) for k in
                          ("rail", "railShapes", "railTitles", "tiles", "spans",
                           "cols", "chips", "open", "chatW")})

        ok(st.get("rail") == 3, "the three owls ride their own carousel (%s plates)"
           % st.get("rail"))
        ok(st.get("railShapes") == 1, "every plate the same shape (%s heights)"
           % st.get("railShapes"))
        ok(st.get("railTitles") == ["Rue", "Ollie", "Sage"],
           "named Rue, Ollie and Sage, in the order of the line (%s)"
           % st.get("railTitles"))
        ok(all(st.get("railArt") or [False]), "every plate's art decoded")
        ok((st.get("railBleedL") or 99) <= 2 and (st.get("railBleedR") or 99) <= 2,
           "the rail bleeds to the module edges (L %s / R %s)"
           % (st.get("railBleedL"), st.get("railBleedR")))

        ok(st.get("tiles") == 12, "all 12 finished pieces landed (got %s)" % st.get("tiles"))
        ok((st.get("spans") or 0) > 1,
           "the buy packs at mixed shapes rather than a uniform row (%s spans)"
           % st.get("spans"))
        ok((st.get("bleedL") or 99) <= 2 and (st.get("bleedR") or 99) <= 2,
           "and runs edge to edge too (L %s / R %s)"
           % (st.get("bleedL"), st.get("bleedR")))
        ok(st.get("railBeforeGrid"), "the plates read before the buy")

        ok(st.get("film"), "the launch film is in the answer")
        ok("film-the-wise-walk" in (st.get("filmSrc") or ""),
           "pointing at the cut film (%s)" % st.get("filmSrc"))
        ok(st.get("filmCtl"), "with real controls")
        ok(not st.get("filmPlaying") and not st.get("filmAuto"),
           "and nothing started on its own")
        ok(st.get("gridBeforeFilm"), "and it lands last, after the buy")

        ok(st.get("open") == [], "every output pane stayed shut (%s)" % st.get("open"))
        ok(abs((st.get("chatW") or 0) - (rest_w or 0)) <= 2,
           "and the chat never resized (%s → %s)" % (rest_w, st.get("chatW")))
        ok(not st.get("errs"), "no page errors (%s)" % (st.get("errs") or "none"))

        # The closing row trails the finished set, and the set ends on a film
        # whose metadata still has to load — so this is the slowest stage of the
        # turn and needs a real window, not a few seconds.
        chips = wait_for(b, lambda s: (s.get("chips") or 0) > 0, 120, "chips",
                         resettle=False)
        ok((chips.get("chips") or 0) > 0,
           "the turn closes on intent chips (%s)" % chips.get("chips"))

        b.js("(function(){var h=document.querySelector('[id$=\"-messages\"]');"
             "var g=h&&h.querySelector('.sc-mgrid-grid');"
             "if(g)g.scrollIntoView({block:'center'})})()")
        time.sleep(0.6)
        print("  shot", b.shot("thinkwise__gallery__%s" % THEME))

        b.js("(function(){var h=document.querySelector('[id$=\"-messages\"]');"
             "var t=h&&h.querySelector('.sc-mgrid-grid .sc-mgrid-item');if(t)t.click()})()")
        time.sleep(1.4)
        viewer = b.js(
            "(function(){var s=document.getElementById('wise-masonry-detail');"
            "if(!s)return null;var i=s.querySelector('.sc-mgrid-full');"
            "return {title:(s.querySelector('.wise-modal-title')||{}).textContent,"
            "loaded:i?i.naturalWidth>0:false};})()"
        ) or {}
        ok(bool(viewer.get("loaded")), "a piece opens full size (%s)" % viewer.get("title"))
        print("  shot", b.shot("thinkwise__viewer__%s" % THEME))
        TITLE = ("(function(){var s=document.getElementById('wise-masonry-detail');"
                 "return s?(s.querySelector('.wise-modal-title')||{}).textContent:''})()")
        STEP = ("(function(){var n=document.querySelector('[data-mgrid-step=\"1\"]');"
                "if(n)n.click();return !!n})()")
        # The next piece has to decode before the viewer relabels, so give the
        # step a real window rather than a single beat.
        nxt = viewer.get("title")
        for _ in range(3):
            b.js(STEP)
            nxt = poll_js(b, TITLE, lambda t: t and t != viewer.get("title"), 12)
            if nxt and nxt != viewer.get("title"):
                break
        ok(bool(nxt) and nxt != viewer.get("title"),
           "and the arrows step through the set (%r → %r)" % (viewer.get("title"), nxt))
        escape(b)

        # The cast chip is what posts the bible page. The closing row is a live
        # element the chat re-parks, so the chip can be mid-move when we look —
        # find it again and tap again rather than calling one miss a failure.
        TAP_CAST = ("(function(){var h=document.querySelector('[id$=\"-messages\"]');"
                    "var rows=Array.from(h.querySelectorAll('.sc-inline-chips .chip,"
                    ".sc-reply-chips .chip'));"
                    "var c=rows.find(function(x){"
                    "return /rue|sage|cast/i.test(x.textContent||'')});"
                    "if(c){c.scrollIntoView({block:'center'});c.click();}"
                    "return !!c})()")
        bib = {}
        for _ in range(4):
            tapped = b.js(TAP_CAST)
            bib = wait_for(b, lambda s: s.get("plates") == 3, 45, "bible")
            if bib.get("plates") == 3:
                break
            if not tapped:
                time.sleep(2.0)
        print("  bible", {k: bib.get(k) for k in
                          ("plates", "names", "lines", "accents", "facts")})
        ok(bib.get("plates") == 3, "the character bible has a plate each (got %s)"
           % bib.get("plates"))
        ok(bib.get("names") == ["Rue", "Ollie", "Sage"],
           "named in order (%s)" % bib.get("names"))
        ok(bib.get("lines") == ["Think Wise", "Code Wise", "Live Wise"],
           "each owning a third of the line (%s)" % bib.get("lines"))
        ok(len(set(bib.get("accents") or [])) == 3,
           "in three distinct accents (%s)" % bib.get("accents"))
        ok(all((n or 0) >= 5 for n in (bib.get("facts") or [0])),
           "with the job, the tell, the palette, the never-says and the film role (%s)"
           % bib.get("facts"))
        ok(all(bib.get("plateArt") or [False]), "every bible plate's art decoded")
        ok(bib.get("open") == [], "and still nothing opened on the right")
        ok(not bib.get("errs"), "no page errors (%s)" % (bib.get("errs") or "none"))
        b.js("(function(){var w=document.querySelector('.wcb');"
             "if(w)w.scrollIntoView({block:'center'})})()")
        time.sleep(0.6)
        print("  shot", b.shot("thinkwise__bible__%s" % THEME))

        print("\n%s — %d failure(s)" % (THEME, fails))
        return 1 if fails else 0
    finally:
        b.close()


if __name__ == "__main__":
    sys.exit(main())
