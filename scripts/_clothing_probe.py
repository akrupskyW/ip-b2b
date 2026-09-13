"""Drive the FOODTRUTH clothing-line intent on wiseai.html.

Taps the welcome card after The Wise Walk, then checks the finished turn: the
whole lookbook packed into one edge-to-edge masonry grid, every pane shut, the
chat unmoved, and a follow-up chip that re-cuts the kids pages.

    python3 scripts/_clothing_probe.py [light|dark] [wait-seconds]
"""
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
WAIT_S = float(sys.argv[2]) if len(sys.argv) > 2 else 180.0

STATE = r"""
(function(){
  var host = document.querySelector('[id$="-messages"]');
  if (!host) return { none: true };
  var mod = document.querySelector('.wa-chat, .sc-card') || document.body;
  var mb = mod.getBoundingClientRect();
  var grid = host.querySelector('.sc-mgrid-grid');
  var tiles = grid ? Array.from(grid.querySelectorAll('.sc-mgrid-item')) : [];
  var spans = {};
  tiles.forEach(function (t) { spans[t.style.gridRowEnd || '?'] = 1; });
  var gb = grid ? grid.getBoundingClientRect() : null;
  var open = ['wa-results','wa-visuals','wa-unified','wa-report'].filter(function(id){
    var el = document.getElementById(id);
    return el && el.classList.contains('is-open');
  });
  return {
    tiles: tiles.length,
    titles: tiles.map(function (t) { return t.getAttribute('data-mgrid-title') || ''; }),
    spans: Object.keys(spans).length,
    cols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
    bleedL: gb ? Math.round(gb.left - mb.left) : null,
    bleedR: gb ? Math.round(mb.right - gb.right) : null,
    grids: host.querySelectorAll('.sc-mgrid').length,
    chips: host.querySelectorAll('.sc-inline-chips .chip, .sc-reply-chips .chip').length,
    chipLabels: Array.from(host.querySelectorAll('.sc-inline-chips .chip, .sc-reply-chips .chip'))
      .map(function (c) { return (c.textContent || '').replace(/\s+/g, ' ').trim(); }),
    open: open,
    chatW: Math.round(mb.width),
    viewer: !!document.getElementById('wise-masonry-detail'),
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
    b.js("document.dispatchEvent(new KeyboardEvent('keydown',"
         "{key:'Escape',code:'Escape',keyCode:27,bubbles:true,cancelable:true}))")
    for _ in range(8):
        time.sleep(0.3)
        if not b.js("!!document.getElementById('wise-masonry-detail')"):
            return


def wait_for(b, done, wait_s, note=""):
    t0 = time.time()
    last = None
    while time.time() - t0 < wait_s:
        st = b.js(STATE) or {}
        if done(st):
            time.sleep(1.2)
            return b.js(STATE) or {}
        brief = (st.get("tiles"), st.get("chips"), st.get("open"))
        if brief != last:
            print("    … %stiles=%s chips=%s open=%s"
                  % ((note + " ") if note else "", *brief))
            last = brief
        time.sleep(2.0)
    return b.js(STATE) or {}


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
            "localStorage.setItem('wise:chat-ollama-on','0');}catch(e){}"
            % (THEME, THEME)
        )
        b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)
        ok(bool(b.js("document.documentElement.classList.contains('dark')"))
           == (THEME == "dark"), "loaded in %s mode" % THEME)

        rest_w = b.js("(function(){var m=document.querySelector('.wa-chat, .sc-card');"
                      "return m?Math.round(m.getBoundingClientRect().width):0})()")
        print("  chat rest width", rest_w)

        order = b.js(
            "(function(){"
            "var cards=Array.from(document.querySelectorAll('.sc-welcome .ws-scorecard'));"
            "return cards.map(function(c){return c.getAttribute('aria-label')||'';});"
            "})()"
        ) or []
        walk_i = next((i for i, t in enumerate(order) if "leave the screen" in (t or "").lower()), -1)
        line_i = next((i for i, t in enumerate(order) if "wear the truth" in (t or "").lower()), -1)
        ok(walk_i >= 0 and line_i == walk_i + 1,
           "the clothing card sits after Show me the work (walk %s, line %s)"
           % (walk_i, line_i))

        card = b.js(
            "(function(){"
            "var cards=Array.from(document.querySelectorAll('.sc-welcome .ws-scorecard'));"
            "var i=cards.findIndex(function(c){"
            "return /wear the truth/i.test(c.getAttribute('aria-label')||'')});"
            "if(i<0)return null;"
            "cards[i].scrollIntoView({inline:'center',block:'nearest'});"
            "var art=getComputedStyle(cards[i]).getPropertyValue('--ws-sc-art');"
            "return {i:i,art:(art||'').trim().slice(0,120)};"
            "})()"
        ) or {}
        ok((card.get("i") or -1) >= 0, "the clothing card is on the welcome rail")
        ok("food-truth-line" in (card.get("art") or ""),
           "carrying the line's own artwork")
        time.sleep(0.5)
        print("  shot", b.shot("clothing__welcome-card__%s" % THEME))

        b.js("(function(){"
             "var cards=Array.from(document.querySelectorAll('.sc-welcome .ws-scorecard'));"
             "var c=cards.find(function(x){"
             "return /wear the truth/i.test(x.getAttribute('aria-label')||'')});"
             "if(c)c.click();})()")

        pieces = b.js("(window.WiseFoodTruth && window.WiseFoodTruth.media || []).length") or 0
        ok(pieces > 0, "the clothing module is loaded (%s pages)" % pieces)

        st = wait_for(b, lambda s: s.get("tiles") == pieces, WAIT_S, "turn")
        print("  state", {k: st.get(k) for k in
                          ("tiles", "spans", "cols", "chips", "open", "chatW")})

        ok(st.get("tiles") == pieces,
           "all %s lookbook pages landed (got %s)" % (pieces, st.get("tiles")))
        ok((st.get("spans") or 0) > 1,
           "the lookbook packs at mixed shapes rather than a uniform row (%s spans)"
           % st.get("spans"))
        ok((st.get("bleedL") or 99) <= 2 and (st.get("bleedR") or 99) <= 2,
           "and runs edge to edge too (L %s / R %s)"
           % (st.get("bleedL"), st.get("bleedR")))
        ok((st.get("open") or []) == [],
           "no output pane opened on its own (%s)" % st.get("open"))
        ok(st.get("chatW") == rest_w,
           "the chat kept its rest width (%s → %s)" % (rest_w, st.get("chatW")))
        ok((st.get("chips") or 0) > 0, "closing chips trailed the lookbook")
        ok(not st.get("errs"), "no page errors (%s)" % (st.get("errs") or "none"))
        print("  shot", b.shot("clothing__gallery__%s" % THEME))

        b.js("(function(){"
             "var t=document.querySelector('[id$=\"-messages\"] .sc-mgrid-item');"
             "if(t)t.click();})()")
        time.sleep(1.2)
        opened = b.js(
            "(function(){"
            "var d=document.getElementById('wise-masonry-detail');"
            "if(!d)return null;"
            "var img=d.querySelector('img');"
            "return {src:(img&&(img.currentSrc||img.src))||'',"
            "title:(d.querySelector('.wise-modal-title, [id$=\"-title\"]')||{}).textContent||''};"
            "})()"
        ) or {}
        ok(bool(opened.get("src")), "tapping a tile opens it full size")
        ok("thumbs/" not in (opened.get("src") or ""),
           "the viewer shows the full-size file")
        print("  shot", b.shot("clothing__viewer__%s" % THEME))
        escape(b)

        b.js("(function(){"
             "var chips=Array.from(document.querySelectorAll("
             "'.sc-inline-chips .chip, .sc-reply-chips .chip'));"
             "var c=chips.find(function(x){"
             "return /kids collection/i.test(x.textContent||'')});"
             "if(c)c.click();})()")
        kids = wait_for(b, lambda s: s.get("grids") >= 2 and (s.get("tiles") or 0) >= 3,
                        90, "kids")
        ok((kids.get("grids") or 0) >= 2,
           "the kids follow-up posted its own grid (%s grids)" % kids.get("grids"))
        print("  shot", b.shot("clothing__kids__%s" % THEME))

    finally:
        b.close()
    print(("PASS" if fails == 0 else "FAIL %s" % fails))
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
