"""Drive the "your food has character" campaign on wiseai.html.

Runs with outputs read AS CARDS (js/output-mode.js), because this is the probe
for the pane path; the in-the-thread reading has its own in
_output_mode_probe.py.

Shoots the double-width campaign card and the gold one beside it, plays the
small intent chip, then checks the turn behaved like every other turn that
produces output: the answer reads in the thread, four output chips land under
it as portrait cards on a bleeding rail, nothing but those chips is on screen,
and every pane is still shut.

Then it taps each chip in turn and checks what opens — the sixteen finished
pieces as a packed masonry gallery, the collector deck as a fixed grid of
equal rows that wraps rather than scrolls, and the two spots with their own
controls and sound. Opens a piece full size, steps to the next one, presses
play on both films, then taps a follow-up chip and checks its own cut arrives
the same way, in the given theme.
"""
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
WAIT_S = float(sys.argv[2]) if len(sys.argv) > 2 else 150.0

STATE = r"""
(function(){
  var host = document.querySelector('[id$="-messages"]');
  var cards = host ? Array.from(host.querySelectorAll('.sc-surface-card[data-surface]')) : [];
  var titles = cards.map(function(c){
    var t = c.querySelector('.sc-surface-title');
    return t ? t.textContent.replace(/\s+/g, ' ').trim() : '';
  });
  function shown(sel){
    return Array.from(host.querySelectorAll(sel)).filter(function(el){
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }
  var lead = host ? host.querySelector('.sc-surface-rail-lead') : null;
  var rail = host ? host.querySelector('.sc-surface-rail') : null;
  var mod = document.querySelector('.wa-chat, .sc-card') || document.body;
  var mb = mod.getBoundingClientRect();
  var rb = rail ? rail.getBoundingClientRect() : null;
  var open = ['wa-results','wa-visuals','wa-unified','wa-report'].filter(function(id){
    var el = document.getElementById(id);
    return el && el.classList.contains('is-open');
  });
  return {
    mode: document.documentElement.getAttribute('data-output-mode'),
    cards: cards.length,
    portrait: cards.filter(function(c){
      return c.classList.contains('sc-surface-card--portrait'); }).length,
    titles: titles,
    lead: lead ? lead.textContent.replace(/\s+/g,' ').trim() : '',
    railBleedL: rb ? Math.round(rb.left - mb.left) : null,
    railBleedR: rb ? Math.round(mb.right - rb.right) : null,
    chatW: Math.round(mb.width),
    open: open,
    chips: host ? host.querySelectorAll('.sc-inline-chips .chip, .sc-reply-chips .chip').length : 0,
    /* Reading outputs as cards, nothing of the artwork is on screen in the
       thread: the chip is what the member sees, and the output itself is in
       the pane behind it. The full-size copies are still written (that is what
       makes the three-dot switch free) — they are just not shown. */
    inlineGrids: host ? shown('.sc-out--inline .sc-mgrid').length : 0,
    inlineFilms: host ? shown('.sc-out--inline .sc-inline-film').length : 0,
    errs: (window.__errs || []).join(' || ')
  };
})()
"""

# What the Output pane is showing right now, measured against the pane itself.
# With 2+ outputs the pane is a carousel, so only the active block renders —
# everything below is scoped to that slide.
PANE = r"""
(function(){
  /* Merged mode routes every visuals/results block into the one unified body,
     so take whichever pane the turn actually wrote into. */
  var body = ['wa-unified','wa-visuals','wa-results','wa-report']
    .map(function(id){ return document.getElementById(id + '-body'); })
    .find(function(el){ return el && el.querySelector('.wa-block'); });
  if (!body) return {};
  var pb = body.getBoundingClientRect();
  var slide = body.classList.contains('is-carousel')
    ? body.querySelector('.wa-block.is-active') : body;
  if (!slide) return { blocks: body.querySelectorAll('.wa-block').length };
  function shape(root){
    if (!root) return null;
    var tiles = Array.from(root.querySelectorAll('.sc-mgrid-item'));
    var spans = {}, hs = {}, tops = {};
    tiles.forEach(function(t){
      spans[t.style.gridRowEnd || '?'] = 1;
      var r = t.getBoundingClientRect();
      hs[Math.round(r.height)] = 1;
      tops[Math.round(r.top)] = 1;
    });
    var g = root.querySelector('[data-mgrid-grid], [data-mgrid-deck], [data-mgrid-railvp]');
    var gb = g ? g.getBoundingClientRect() : null;
    return {
      tiles: tiles.length,
      spans: Object.keys(spans).length,
      heights: Object.keys(hs).length,
      rows: Object.keys(tops).length,
      cols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0,
      over: g ? (g.scrollWidth - g.clientWidth) : 0,
      bleedL: gb ? Math.round(gb.left - pb.left) : null,
      bleedR: gb ? Math.round(pb.right - gb.right) : null
    };
  }
  var reels = Array.from(body.querySelectorAll('.sc-inline-film-media'));
  return {
    blocks: body.querySelectorAll('.wa-block').length,
    masonry: shape(body.querySelector('.sc-mgrid:not(.sc-mgrid--deck):not(.sc-mgrid--rail)')),
    deck: shape(body.querySelector('.sc-mgrid--deck')),
    films: reels.length,
    filmSrcs: reels.map(function(v){
      var s = v.querySelector('source'); return s ? s.getAttribute('src') : ''; }),
    filmCtl: reels.length ? reels.every(function(v){ return !!v.controls; }) : false,
    filmPlaying: reels.some(function(v){ return !v.paused; }),
    filmAuto: reels.some(function(v){ return !!v.autoplay; })
  };
})()
"""

fails = 0


def flush(d, *keys):
    """True when every named inset is present and within a pixel or two of 0.

    Spelt out rather than `d.get(k) or 99`, because a perfect bleed measures
    exactly 0 — which is falsy, and read as "missing" by that idiom.
    """
    for k in keys:
        v = d.get(k)
        if v is None or abs(v) > 2:
            return False
    return True


def ok(cond, msg):
    global fails
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails += 1


def escape(b):
    """Press Escape on the open viewer and wait for it to go.

    The key is dispatched in the page rather than through CDP on purpose. A CDP
    Escape backgrounds the tab — visibilityState goes hidden, frames stop and
    timers throttle — and Chrome then auto-repeats a phantom key, so everything
    scheduled afterwards stalls: the modal's own fade-and-remove, even video
    playback. The listener does not care whether the event was trusted, and the
    rest of the run stays awake.
    """
    b.js("document.dispatchEvent(new KeyboardEvent('keydown',"
         "{key:'Escape',code:'Escape',keyCode:27,bubbles:true,cancelable:true}))")
    for _ in range(8):
        time.sleep(0.3)
        if not b.js("!!document.getElementById('wise-masonry-detail')"):
            return


def tap_chip(b, pattern):
    """Open one output by its chip, the only door that opens a pane."""
    hit = b.js(
        "(function(){var c=Array.from(document.querySelectorAll("
        "'[id$=\"-messages\"] .sc-surface-card[data-surface]'))"
        ".find(function(x){return /%s/i.test(x.textContent)});"
        "if(!c)return '';c.scrollIntoView({block:'center'});"
        "var t=c.querySelector('.sc-surface-title');"
        "c.click();return t?t.textContent.replace(/\\s+/g,' ').trim():'?';})()" % pattern
    )
    time.sleep(1.4)
    return hit


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
            # This run is about the pane, so ask for the card reading; the
            # other reading has its own probe (_output_mode_probe.py).
            "localStorage.setItem('wise:output-mode','cards');"
            "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME)
        )
        b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)
        dark = b.js("document.documentElement.classList.contains('dark')")
        ok(bool(dark) == (THEME == "dark"), "loaded in %s mode" % THEME)

        n_cards = b.js("document.querySelectorAll('.sc-welcome .ws-scorecard').length")
        gold = b.js(
            "(function(){"
            "var cards=Array.from(document.querySelectorAll('.sc-welcome .ws-scorecard'));"
            "var labels=cards.map(function(c){return (c.getAttribute('aria-label')||'').trim()});"
            "var i=labels.findIndex(function(l){return /marketing campaign/i.test(l)});"
            "if(i>=0)cards[i].scrollIntoView({inline:'center',block:'nearest'});"
            "return {n:cards.length,i:i,label:i>=0?labels[i]:''};"
            "})()"
        ) or {}
        ok(n_cards and n_cards >= 7, "overview rail has 7+ cards (got %s)" % n_cards)
        ok((gold.get("i") or -1) >= 0, "the gold campaign card is on the rail (index %s)"
           % gold.get("i"))
        time.sleep(0.4)
        print("  shot", b.shot("campaign__welcome-gold__%s" % THEME))

        # The double-width hero card: twice a regular card, carrying its own
        # artwork and the call to action.
        xl = b.js(
            "(function(){"
            "var reg=document.querySelector('.sc-welcome .ws-scorecard:not(.ws-scorecard--lg)"
            ":not(.ws-scorecard--hero):not(.ws-scorecard--xl)');"
            "var c=document.querySelector('.sc-welcome .ws-scorecard--xl');"
            "if(!c)return null;c.scrollIntoView({inline:'center',block:'nearest'});"
            "var art=getComputedStyle(c).getPropertyValue('--ws-sc-art');"
            "var act=c.querySelector('.ws-sc-action');"
            "return {w:Math.round(c.getBoundingClientRect().width),"
            "reg:reg?Math.round(reg.getBoundingClientRect().width):0,"
            "h:Math.round(c.getBoundingClientRect().height),"
            "art:(art||'').trim().slice(0,120),"
            "cta:act?act.textContent.replace(/\\s+/g,' ').trim():'',"
            "title:c.querySelectorAll('.ws-sc-intro-title,.ws-sc-desc').length};"
            "})()"
        ) or {}
        print("  xl card", xl)
        ok(xl.get("w") and xl.get("reg") and xl["w"] >= xl["reg"] * 2,
           "campaign card is double width (%s vs %s)" % (xl.get("w"), xl.get("reg")))
        ok("wise-campaign" in (xl.get("art") or ""), "it carries the campaign artwork")
        ok("campaign" in (xl.get("cta") or "").lower(),
           "and the call to action (%r)" % xl.get("cta"))
        ok(xl.get("title") == 0, "art-only: the picture carries it, no stacked headline")
        time.sleep(0.4)
        print("  shot", b.shot("campaign__welcome-xl__%s" % THEME))

        rest_w = (b.js(STATE) or {}).get("chatW")
        chip = b.js(
            "(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip'))"
            ".find(function(c){return /marketing campaign/i.test(c.textContent)});"
            "if(!n)return false;n.scrollIntoView({block:'center'});n.click();return true})()"
        )
        ok(chip, "clicked Generate a marketing campaign")

        after = {}
        deadline = time.time() + WAIT_S
        while time.time() < deadline:
            time.sleep(1.2)
            after = b.js(STATE) or after
            print("  %4.0fs  chipcards=%s  chips=%s  open=%s"
                  % (WAIT_S - (deadline - time.time()),
                     after.get("cards"), after.get("chips"), after.get("open") or "-"))
            if after.get("cards", 0) >= 4 and after.get("chips", 0) > 0:
                break

        print("  outputs", after.get("titles"))
        print("  lead   ", repr(after.get("lead")))
        ok(after.get("cards") == 4,
           "the turn surfaced four outputs (got %s)" % after.get("cards"))
        ok(after.get("portrait") == 4,
           "more than one output, so they are portrait cards (got %s)" % after.get("portrait"))
        ok("4 outputs" in (after.get("lead") or ""),
           "and the rail says how many landed (%r)" % after.get("lead"))
        ok(flush(after, "railBleedL", "railBleedR"),
           "the rail bleeds to the module edges (%s / %s)"
           % (after.get("railBleedL"), after.get("railBleedR")))
        ok(after.get("inlineGrids") == 0 and after.get("inlineFilms") == 0,
           "and the chips are all that is on screen (%s grids, %s films)"
           % (after.get("inlineGrids"), after.get("inlineFilms")))
        ok(not after.get("open"), "every pane stayed shut (%s)" % (after.get("open") or "none"))
        ok(after.get("chatW") == rest_w,
           "and the chat never resized (%s -> %s)" % (rest_w, after.get("chatW")))
        ok(after.get("chips", 0) > 0, "turn closed on intent chips")
        ok(not after.get("errs"), "no page errors (%s)" % (after.get("errs") or "none"))
        b.js("(function(){var h=document.querySelector('[id$=\"-messages\"]');"
             "if(h)h.scrollTop=h.scrollHeight})()")
        time.sleep(0.5)
        print("  shot", b.shot("campaign__thread__%s" % THEME))

        # ── The finished pieces, opened by their chip ──────────────────────
        ok(bool(tap_chip(b, "the campaign")), "tapped the finished-pieces chip")
        pane = b.js(PANE) or {}
        ok((b.js(STATE) or {}).get("open"), "that opens the Output pane")
        m = pane.get("masonry") or {}
        print("  masonry", m)
        ok(m.get("tiles") == 16, "sixteen pieces in the gallery (got %s)" % m.get("tiles"))
        ok((m.get("cols") or 0) >= 2, "it packs into columns (got %s)" % m.get("cols"))
        ok((m.get("spans") or 0) >= 3,
           "tiles keep their own shapes, not one row height (got %s)" % m.get("spans"))
        ok(flush(m, "bleedL", "bleedR"),
           "it runs edge to edge of the pane (%s / %s)" % (m.get("bleedL"), m.get("bleedR")))
        time.sleep(0.5)
        print("  shot", b.shot("campaign__masonry__%s" % THEME))

        # Tapping a piece opens it full size; the arrows carry the rest of the set.
        b.js("(function(){var t=document.querySelectorAll("
             "'.wa-pane-body:not(.sc-out--inline) .sc-mgrid-item');if(t[2])t[2].click();})()")
        time.sleep(0.6)
        opened = b.js(
            "(function(){"
            "var s=document.getElementById('wise-masonry-detail');"
            "return {scrim:!!s,title:s?(s.querySelector('.wise-modal-title')||{}).textContent:'',"
            "eyebrow:s?(s.querySelector('.wise-modal-eyebrow')||{}).textContent:'',"
            "src:s?((s.querySelector('.sc-mgrid-full')||{}).getAttribute?"
            "s.querySelector('.sc-mgrid-full').getAttribute('src'):''):''};"
            "})()"
        ) or {}
        print("  viewer", opened)
        ok(opened.get("scrim"), "tapping a piece opens it full size")
        ok("thumbs/" not in (opened.get("src") or ""), "the viewer shows the full-size file")
        ok(" of 16" in (opened.get("eyebrow") or ""),
           "and says where it sits in the set (%r)" % opened.get("eyebrow"))
        time.sleep(0.8)
        print("  shot", b.shot("campaign__masonry-open__%s" % THEME))
        b.js("document.dispatchEvent(new KeyboardEvent('keydown',"
             "{key:'ArrowRight',code:'ArrowRight',keyCode:39,bubbles:true,cancelable:true}))")
        time.sleep(0.6)
        stepped = b.js(
            "(function(){var s=document.getElementById('wise-masonry-detail');"
            "return s?(s.querySelector('.wise-modal-eyebrow')||{}).textContent:'';})()"
        )
        ok(stepped and stepped != opened.get("eyebrow"),
           "the right arrow moves to the next piece (%r)" % stepped)
        escape(b)
        ok(not b.js("!!document.getElementById('wise-masonry-detail')"), "Escape closes it")

        # ── The deck: every card the same shape, in a grid that wraps ──────
        ok(bool(tap_chip(b, "collector set")), "tapped the collector-set chip")
        deck = (b.js(PANE) or {}).get("deck") or {}
        print("  deck", deck)
        ok(deck.get("tiles") == 23, "the whole deck is there (got %s)" % deck.get("tiles"))
        ok(deck.get("heights") == 1,
           "every card is the same height (got %s heights)" % deck.get("heights"))
        ok((deck.get("rows") or 0) >= 3,
           "it wraps into rows rather than one strip (got %s)" % deck.get("rows"))
        ok((deck.get("cols") or 0) >= 3, "with at least three across (got %s)" % deck.get("cols"))
        ok((deck.get("over") or 0) == 0,
           "and nothing scrolls sideways (%spx over)" % deck.get("over"))
        ok(flush(deck, "bleedL", "bleedR"),
           "the deck runs edge to edge too (%s / %s)"
           % (deck.get("bleedL"), deck.get("bleedR")))
        time.sleep(0.5)
        print("  shot", b.shot("campaign__cards__%s" % THEME))

        b.js("(function(){var t=document.querySelectorAll("
             "'.wa-pane-body:not(.sc-out--inline) .sc-mgrid--deck .sc-mgrid-item');if(t[13])t[13].click();})()")
        time.sleep(0.6)
        card = b.js(
            "(function(){"
            "var s=document.getElementById('wise-masonry-detail');"
            "return {scrim:!!s,title:s?(s.querySelector('.wise-modal-title')||{}).textContent:'',"
            "sub:s?(s.querySelector('.wise-modal-sub')||{}).textContent:'',"
            "eyebrow:s?(s.querySelector('.wise-modal-eyebrow')||{}).textContent:'',"
            "src:s?((s.querySelector('.sc-mgrid-full')||{}).getAttribute?"
            "s.querySelector('.sc-mgrid-full').getAttribute('src'):''):''};"
            "})()"
        ) or {}
        print("  card viewer", card)
        ok(card.get("scrim"), "tapping a card opens it full size")
        ok(" of 23" in (card.get("eyebrow") or ""),
           "the deck is its own set, not the gallery's (%r)" % card.get("eyebrow"))
        ok("/cards/" in (card.get("src") or "")
           and "thumbs/" not in (card.get("src") or ""),
           "and shows the full-size card (%r)" % card.get("src"))
        ok(bool(card.get("sub")), "the card names its faction and power (%r)" % card.get("sub"))
        time.sleep(0.8)
        print("  shot", b.shot("campaign__cards-open__%s" % THEME))
        # Close this one on the ✕ — the other way out, and the one a member is
        # most likely to use on a card.
        b.js("(function(){var x=document.querySelector('#wise-masonry-detail .wise-modal-close');"
             "if(x)x.click();})()")
        gone = False
        for _ in range(8):
            time.sleep(0.3)
            gone = not b.js("!!document.getElementById('wise-masonry-detail')")
            if gone:
                break
        ok(gone, "the close button closes it")
        ok(not b.js("document.querySelectorAll('.wise-modal-scrim').length"),
           "and leaves no dialog behind (%s)"
           % b.js("document.querySelectorAll('.wise-modal-scrim').length"))

        # ── The two spots ─────────────────────────────────────────────────
        ok(bool(tap_chip(b, "teaser")), "tapped the teaser chip")
        ok(bool(tap_chip(b, "face-off")), "tapped the face-off chip")
        b.cmd("Page.bringToFront")
        time.sleep(1.0)
        films = b.js(PANE) or {}
        srcs = films.get("filmSrcs") or []
        print("  films", films.get("films"), srcs)
        ok(films.get("films") == 2, "both spots are in the pane (got %s)" % films.get("films"))
        ok(len(srcs) == 2 and "teaser-food-truth-wins.mp4" in srcs[0]
           and "faceoff-food-truth-wins.mp4" in srcs[1],
           "the teaser leads and the face-off follows (%r)" % (srcs,))
        ok(films.get("filmCtl"), "with the browser's own controls")
        ok(not films.get("filmPlaying") and not films.get("filmAuto"),
           "and nothing started on its own")
        # A film in a pane is the film. The strapline that used to sit under it
        # was never anything the app does elsewhere, and the pane's own
        # masthead already names the output.
        ok(b.js("document.querySelectorAll('.sc-inline-film-cap, .sc-mgrid-figcap').length") == 0,
           "no strapline under any output (%s)"
           % b.js("document.querySelectorAll('.sc-inline-film-cap, .sc-mgrid-figcap').length"))
        print("  shot", b.shot("campaign__teaser__%s" % THEME))

        for i, name in enumerate(("teaser", "face-off")):
            b.js("(function(){var v=document.querySelectorAll("
                 "'.wa-pane-body:not(.sc-out--inline) .sc-inline-film-media')[%d];"
                 "if(v){v.scrollIntoView({block:'center'});v.muted=true;window.__playErr='';"
                 "var p=v.play();if(p&&p.catch)p.catch(function(e){window.__playErr=String(e)});}})()"
                 % i)
            played = {}
            for _ in range(20):
                time.sleep(0.5)
                played = b.js(
                    "(function(){var v=document.querySelectorAll("
                    "'.wa-pane-body:not(.sc-out--inline) .sc-inline-film-media')[%d];"
                    "return v?{t:Math.round(v.currentTime*100)/100,"
                    "dur:Math.round((v.duration||0)*100)/100,w:v.videoWidth,h:v.videoHeight,"
                    "ready:v.readyState,paused:v.paused,err:window.__playErr||''}:null})()" % i
                ) or played
                if (played.get("t") or 0) > 0.2:
                    break
            print("  %s" % name, played)
            ok((played.get("t") or 0) > 0.2,
               "pressing play runs the %s (%ss in)" % (name, played.get("t")))
            ok(abs((played.get("dur") or 0) - 8.04) < 0.5,
               "the whole eight seconds are there (%ss)" % played.get("dur"))
            ok(played.get("w") == 1280 and played.get("h") == 720,
               "at its real size (%sx%s)" % (played.get("w"), played.get("h")))
            b.js("(function(){var v=document.querySelectorAll("
                 "'.wa-pane-body:not(.sc-out--inline) .sc-inline-film-media')[%d];"
                 "if(v){v.pause();v.currentTime=0;}})()" % i)

        # ── A follow-up re-cuts the buy, and arrives the same way ─────────
        before = (b.js(STATE) or {}).get("cards") or 0
        tapped = b.js(
            "(function(){var rows=document.querySelectorAll('.sc-inline-chips, .sc-reply-chips');"
            "var row=rows[rows.length-1];if(!row)return '';"
            "var c=Array.from(row.querySelectorAll('.chip'))"
            ".find(function(x){return /out-of-home/i.test(x.textContent)});"
            "if(!c)return '';c.scrollIntoView({block:'center'});"
            "var lab=c.textContent.replace(/\\s+/g,' ').trim();c.click();return lab;})()"
        )
        ok(bool(tapped), "tapped a campaign follow-up chip (%r)" % tapped)
        follow = {}
        deadline = time.time() + 90.0
        while time.time() < deadline:
            time.sleep(1.2)
            follow = b.js(STATE) or follow
            if (follow.get("cards") or 0) > before and follow.get("chips", 0) > 0:
                break
        print("  follow-up", {k: follow.get(k) for k in ("cards", "chips", "titles")})
        ok((follow.get("cards") or 0) > before,
           "the follow-up posts its own output chip (%s -> %s)" % (before, follow.get("cards")))
        ok(follow.get("inlineGrids") == 0,
           "and still shows nothing but the chip (%s)" % follow.get("inlineGrids"))
        ok(follow.get("chips", 0) > 0, "the follow-up closes on chips too")
        ok(not follow.get("errs"), "still no page errors (%s)" % (follow.get("errs") or "none"))
        b.js("(function(){var h=document.querySelector('[id$=\"-messages\"]');"
             "if(h)h.scrollTop=h.scrollHeight})()")
        time.sleep(0.5)
        print("  shot", b.shot("campaign__followup-ooh__%s" % THEME))

    finally:
        b.close()

    if fails:
        print("FAILED %s checks" % fails)
        sys.exit(1)
    print("ok")


if __name__ == "__main__":
    main()
