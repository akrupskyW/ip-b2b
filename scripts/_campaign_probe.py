"""Drive the "your food has character" campaign on wiseai.html.

Shoots the double-width campaign card and the gold one beside it, plays the
small intent chip, then checks both in-transcript galleries: the finished
pieces as an edge-to-edge masonry grid (packed, not a uniform grid) and the
collector set as a scrolling card rail, with the panes shut throughout. Opens
a piece full size and steps to the next one, scrolls the rail and opens a card
the same way, presses play on the teaser, then taps a follow-up chip and checks
that its own cut of the work lands in the given theme.
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
  var open = ['wa-results','wa-visuals','wa-unified','wa-report'].filter(function(id){
    var el = document.getElementById(id);
    return el && el.classList.contains('is-open');
  });
  /* The masonry: how many pieces, how wide it runs against the chat module,
     and how many distinct row spans the packing produced (a uniform grid would
     collapse to one). */
  var grid = host ? host.querySelector('.sc-mgrid-grid') : null;
  var mod = document.querySelector('.wa-chat, .sc-card') || document.body;
  var tiles = grid ? Array.from(grid.querySelectorAll('.sc-mgrid-item')) : [];
  var spans = {};
  tiles.forEach(function (t) { spans[t.style.gridRowEnd || '?'] = 1; });
  var gb = grid ? grid.getBoundingClientRect() : null;
  var mb = mod.getBoundingClientRect();
  var cols = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0;
  /* The card rail: one scrolling row of same-shape tiles, its viewport running
     the width of the module. */
  var vp = host ? host.querySelector('[data-mgrid-railvp]') : null;
  var rtiles = vp ? Array.from(vp.querySelectorAll('.sc-mgrid-item')) : [];
  var vb = vp ? vp.getBoundingClientRect() : null;
  var rh = {};
  rtiles.forEach(function (t) {
    rh[Math.round(t.getBoundingClientRect().height)] = 1;
  });
  /* The teaser: a real film in the answer, on the shared inline-film block,
     sitting after the deck it was cut for and playing nothing on its own. */
  var film = host ? host.querySelector('.sc-inline-film-media') : null;
  var fsrc = film ? film.querySelector('source') : null;
  var railFig = host ? host.querySelector('.sc-mgrid--rail') : null;
  return {
    film: !!film,
    filmSrc: fsrc ? fsrc.getAttribute('src') : '',
    filmCtl: film ? !!film.controls : false,
    filmPlaying: film ? !film.paused : false,
    filmAuto: film ? !!film.autoplay : false,
    filmAfterRail: (film && railFig)
      ? (railFig.compareDocumentPosition(film) & 4) === 4 : false,
    rail: rtiles.length,
    railShapes: Object.keys(rh).length,
    railW: rtiles.length ? Math.round(rtiles[0].getBoundingClientRect().width) : 0,
    railOver: vp ? (vp.scrollWidth - vp.clientWidth) : 0,
    railBleedL: vb ? Math.round(vb.left - mb.left) : null,
    railBleedR: vb ? Math.round(mb.right - vb.right) : null,
    cards: cards.length,
    titles: titles,
    open: open,
    chips: host ? host.querySelectorAll('.sc-inline-chips .chip, .sc-reply-chips .chip').length : 0,
    grids: host ? host.querySelectorAll('.sc-mgrid').length : 0,
    films: host ? host.querySelectorAll('.sc-inline-film-media').length : 0,
    tiles: tiles.length,
    spans: Object.keys(spans).length,
    cols: cols,
    bleedL: gb ? Math.round(gb.left - mb.left) : null,
    bleedR: gb ? Math.round(mb.right - gb.right) : null,
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
    """Press Escape on the open viewer and wait for it to go.

    The key is dispatched in the page rather than through CDP on purpose. A CDP
    Escape backgrounds the tab — visibilityState goes hidden, frames stop and
    timers throttle — and Chrome then auto-repeats a phantom key, so everything
    scheduled afterwards stalls: the rail's glide, the modal's own
    fade-and-remove, even video playback. The listener does not care whether the
    event was trusted, and the rest of the run stays awake.
    """
    b.js("document.dispatchEvent(new KeyboardEvent('keydown',"
         "{key:'Escape',code:'Escape',keyCode:27,bubbles:true,cancelable:true}))")
    for _ in range(8):
        time.sleep(0.3)
        if not b.js("!!document.getElementById('wise-masonry-detail')"):
            return


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
            print("  %4.0fs  tiles=%s  rail=%s  film=%s  chips=%s  chipcards=%s  open=%s"
                  % (WAIT_S - (deadline - time.time()),
                     after.get("tiles"), after.get("rail"), after.get("film"),
                     after.get("chips"), after.get("cards"), after.get("open") or "-"))
            if (after.get("chips", 0) > 0
                    and after.get("tiles") and after.get("rail") and after.get("film")):
                break

        print("  grid  tiles=%s spans=%s cols=%s bleed=%s/%s"
              % (after.get("tiles"), after.get("spans"), after.get("cols"),
                 after.get("bleedL"), after.get("bleedR")))
        print("  rail  cards=%s shapes=%s cardw=%s overflow=%s bleed=%s/%s"
              % (after.get("rail"), after.get("railShapes"), after.get("railW"),
                 after.get("railOver"), after.get("railBleedL"), after.get("railBleedR")))
        ok(after.get("tiles") == 16, "sixteen pieces in the grid (got %s)" % after.get("tiles"))
        ok((after.get("cols") or 0) >= 2, "it packs into columns (got %s)" % after.get("cols"))
        ok((after.get("spans") or 0) >= 3,
           "tiles keep their own shapes, not one row height (got %s)" % after.get("spans"))
        ok(after.get("bleedL") is not None and abs(after["bleedL"]) <= 2
           and abs(after.get("bleedR") or 99) <= 2,
           "it runs edge to edge (%s / %s)" % (after.get("bleedL"), after.get("bleedR")))
        ok(after.get("rail") == 24,
           "both card series on their own rail (got %s)" % after.get("rail"))
        ok(after.get("railShapes") == 1,
           "the deck is one shape, so it does not pack (got %s heights)" % after.get("railShapes"))
        ok((after.get("railOver") or 0) > 0,
           "the rail scrolls rather than wrapping (%spx over)" % after.get("railOver"))
        ok(after.get("railBleedL") is not None and abs(after["railBleedL"]) <= 2
           and abs(after.get("railBleedR") or 99) <= 2,
           "the rail runs edge to edge (%s / %s)"
           % (after.get("railBleedL"), after.get("railBleedR")))
        ok(after.get("film"), "the teaser plays in the answer")
        ok("teaser-food-truth-wins.mp4" in (after.get("filmSrc") or ""),
           "and it is the campaign's own clip (%r)" % after.get("filmSrc"))
        ok(after.get("filmCtl"), "with the browser's own controls")
        ok(not after.get("filmPlaying") and not after.get("filmAuto"),
           "and nothing started on its own")
        ok(after.get("filmAfterRail"), "it lands after the deck it was cut for")
        ok(after.get("cards") == 0,
           "the whole campaign reads in the thread, so no output chips (got %s)"
           % after.get("cards"))
        ok(not after.get("open"), "every pane stayed shut (%s)" % (after.get("open") or "none"))
        ok(after.get("chips", 0) > 0, "turn closed on intent chips")
        ok(not after.get("errs"), "no page errors (%s)" % (after.get("errs") or "none"))

        b.js("(function(){var p=document.querySelector('.sc-mgrid');"
             "if(p)p.scrollIntoView({block:'center'});})()")
        time.sleep(0.6)
        print("  shot", b.shot("campaign__masonry__%s" % THEME))

        # Tapping a piece opens it full size; the arrows carry the rest of the set.
        b.js("(function(){var t=document.querySelectorAll('.sc-mgrid-item');"
             "if(t[2])t[2].click();})()")
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

        # The rail: the chevron moves it by a card, and a card opens the same
        # viewer with the deck on its arrows.
        b.js("(function(){var r=document.querySelector('.sc-mgrid--rail');"
             "if(r)r.scrollIntoView({block:'center'});})()")
        time.sleep(0.6)
        print("  shot", b.shot("campaign__cards__%s" % THEME))
        moved = b.js(
            "(function(){var vp=document.querySelector('[data-mgrid-railvp]');"
            "var was=vp?vp.scrollLeft:-1;"
            "var n=document.querySelector('.sc-mgrid--rail [data-mgrid-scroll=\"1\"]');"
            "if(n)n.click();return {was:was,btn:!!n};})()"
        ) or {}
        time.sleep(0.9)
        now = b.js("(function(){var vp=document.querySelector('[data-mgrid-railvp]');"
                   "return vp?Math.round(vp.scrollLeft):-1})()")
        ok(moved.get("btn") and now > (moved.get("was") or 0),
           "the chevron scrolls the deck (%s -> %s)" % (moved.get("was"), now))
        b.js("(function(){var t=document.querySelectorAll('.sc-mgrid--rail .sc-mgrid-item');"
             "if(t[1])t[1].click();})()")
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
        ok(" of 12" in (card.get("eyebrow") or ""),
           "the deck is its own set, not the grid's (%r)" % card.get("eyebrow"))
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

        # The teaser at rest, then pressed. A tab Chrome has backgrounded will
        # not decode, so bring it forward before asking whether it played.
        b.js("(function(){var f=document.querySelector('.sc-inline-film');"
             "if(f)f.scrollIntoView({block:'end'});})()")
        b.cmd("Page.bringToFront")
        time.sleep(1.0)
        cap = b.js("(function(){var c=document.querySelector('.sc-inline-film-cap');"
                   "if(!c)return null;var r=c.getBoundingClientRect();"
                   "return {txt:c.textContent.replace(/\\s+/g,' ').trim(),"
                   "h:Math.round(r.height)};})()") or {}
        print("  caption", cap)
        ok("Food Truth Wins" in (cap.get("txt") or "")
           and (cap.get("h") or 0) > 0,
           "the film says what it is (%r)" % cap.get("txt"))
        print("  shot", b.shot("campaign__teaser__%s" % THEME))
        b.js("(function(){var v=document.querySelector('.sc-inline-film-media');"
             "if(v){v.muted=true;window.__playErr='';"
             "var p=v.play();if(p&&p.catch)p.catch(function(e){window.__playErr=String(e)});}})()")
        played = {}
        for _ in range(20):
            time.sleep(0.5)
            played = b.js(
                "(function(){var v=document.querySelector('.sc-inline-film-media');"
                "return v?{t:Math.round(v.currentTime*100)/100,"
                "dur:Math.round((v.duration||0)*100)/100,w:v.videoWidth,h:v.videoHeight,"
                "ready:v.readyState,paused:v.paused,err:window.__playErr||''}:null})()"
            ) or played
            if (played.get("t") or 0) > 0.2:
                break
        print("  teaser", played)
        ok((played.get("t") or 0) > 0.2,
           "pressing play runs it (%ss in)" % played.get("t"))
        ok(abs((played.get("dur") or 0) - 8.04) < 0.5,
           "the whole eight seconds are there (%ss)" % played.get("dur"))
        ok(played.get("w") == 1280 and played.get("h") == 720,
           "at its real size (%sx%s)" % (played.get("w"), played.get("h")))
        b.js("(function(){var v=document.querySelector('.sc-inline-film-media');"
             "if(v){v.pause();v.currentTime=0;}})()")

        b.js("(function(){var h=document.querySelector('[id$=\"-messages\"]');"
             "if(h)h.scrollTop=h.scrollHeight})()")
        time.sleep(0.4)
        print("  shot", b.shot("campaign__thread__%s" % THEME))

        # Each follow-up chip re-cuts the work the answer already shipped, so
        # tapping one has to land its own gallery and close on chips again.
        before_grids = (b.js(STATE) or {}).get("grids") or 0
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
            if (follow.get("grids") or 0) > before_grids and follow.get("chips", 0) > 0:
                break
        print("  follow-up", {k: follow.get(k) for k in ("grids", "chips", "cards", "open")})
        ok((follow.get("grids") or 0) > before_grids,
           "the follow-up lands its own cut of the artwork (%s -> %s grids)"
           % (before_grids, follow.get("grids")))
        ok(not follow.get("open"),
           "and the panes are still shut (%s)" % (follow.get("open") or "none"))
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
