"""Drive the output-mode switch on the answer's three-dot menu.

Plays a turn that surfaces several outputs, then checks the two readings the
member can pick between (js/output-mode.js): in the thread by default, with
every output full size and no chips on screen; as cards once switched, with
the chips back and the full-size copies gone. Flips back to prove the switch
is retroactive — nothing is regenerated, so a turn already in the thread
re-reads either way — and shoots both in the given theme.
"""
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"

STATE = r"""
(function(){
  var host = document.querySelector('[id$="-messages"]');
  if (!host) return {};
  var mod = document.querySelector('.wa-chat, .sc-card') || document.body;
  var mb = mod.getBoundingClientRect();
  function shown(sel){
    return Array.from(host.querySelectorAll(sel)).filter(function(el){
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }
  var grids = shown('.sc-out--inline .sc-mgrid');
  var g = grids[0] ? grids[0].getBoundingClientRect() : null;
  return {
    mode: document.documentElement.getAttribute('data-output-mode'),
    inlineShown: shown('.sc-out--inline.wa-pane-body').length,
    cardsShown: shown('.sc-surface-card').length,
    leadShown: shown('.sc-surface-rail-lead').length,
    inlineTotal: host.querySelectorAll('.sc-out--inline.wa-pane-body').length,
    cardsTotal: host.querySelectorAll('.sc-surface-card[data-surface]').length,
    galleries: grids.length,
    tiles: grids.reduce(function(n,el){
      return n + el.querySelectorAll('.sc-mgrid-item').length; }, 0),
    bleedL: g ? Math.round(g.left - mb.left) : null,
    bleedR: g ? Math.round(mb.right - g.right) : null,
    films: shown('.sc-out--inline .sc-inline-film-media').length,
    /* Every output drawn in the thread is introduced by WISEcodeAI, the way
       anything else it does is — and nothing carries the old strapline. */
    says: shown('p.sc-out--inline').length,
    sayText: Array.prototype.map.call(
      host.querySelectorAll('p.sc-out--inline'),
      function(p){ return p.textContent.replace(/\s+/g,' ').trim().slice(0, 60); }),
    straplines: document.querySelectorAll('.sc-inline-film-cap, .sc-mgrid-figcap').length,
    open: ['wa-results','wa-visuals','wa-unified','wa-report'].filter(function(id){
      var el = document.getElementById(id);
      return el && el.classList.contains('is-open');
    }),
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


def pick(b, mode):
    """Choose a reading from the three-dot menu on the newest answer."""
    hit = b.js(
        "(function(){"
        "var rows=document.querySelectorAll('[id$=\"-messages\"] .sc-fb-more');"
        "var more=rows[rows.length-1];if(!more)return 'no more button';"
        "more.scrollIntoView({block:'center'});more.click();"
        "var btn=document.querySelector('.sc-fb-outmode[data-out-mode=\"%s\"]');"
        "if(!btn)return 'no row';btn.click();return 'ok';})()" % mode
    )
    time.sleep(1.0)
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
            "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME)
        )
        b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)
        ok(b.js("document.documentElement.getAttribute('data-output-mode')") == "inline",
           "a fresh load draws outputs in the thread")

        rest_w = (b.js(STATE) or {}).get("chatW")
        ok(b.js(
            "(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip'))"
            ".find(function(c){return /marketing campaign/i.test(c.textContent)});"
            "if(!n)return false;n.scrollIntoView({block:'center'});n.click();return true})()"
        ), "clicked Generate a marketing campaign")

        st = {}
        deadline = time.time() + 150.0
        while time.time() < deadline:
            time.sleep(1.2)
            st = b.js(STATE) or st
            print("  %4.0fs  inline=%s cards=%s galleries=%s films=%s"
                  % (150.0 - (deadline - time.time()), st.get("inlineShown"),
                     st.get("cardsShown"), st.get("galleries"), st.get("films")))
            if (st.get("inlineTotal") or 0) >= 4:
                break

        # ── In the thread (the default) ───────────────────────────────────
        print("  inline", st)
        ok(st.get("inlineTotal") == 4, "the turn wrote four outputs (got %s)" % st.get("inlineTotal"))
        ok(st.get("inlineShown") == 4, "all four read full size in the thread (got %s)"
           % st.get("inlineShown"))
        ok(st.get("cardsShown") == 0, "and no chips are on screen (got %s)" % st.get("cardsShown"))
        ok(st.get("leadShown") == 0, "nor the count line that introduces them")
        ok(st.get("galleries") == 2 and st.get("tiles") == 16 + 23,
           "both galleries are there whole (%s galleries, %s tiles)"
           % (st.get("galleries"), st.get("tiles")))
        ok(st.get("films") == 2, "and both spots (got %s)" % st.get("films"))
        print("  says", st.get("sayText"))
        ok(st.get("says") == 4,
           "WISEcodeAI introduces each one (got %s)" % st.get("says"))
        ok(st.get("straplines") == 0,
           "and no strapline is left under any of them (%s)" % st.get("straplines"))
        ok(st.get("bleedL") is not None and abs(st["bleedL"]) <= 2
           and st.get("bleedR") is not None and abs(st["bleedR"]) <= 2,
           "a gallery still bleeds to the module edges (%s / %s)"
           % (st.get("bleedL"), st.get("bleedR")))
        ok(not st.get("open"), "nothing docked on the right (%s)" % (st.get("open") or "none"))
        ok(st.get("chatW") == rest_w, "and the chat never resized (%s -> %s)"
           % (rest_w, st.get("chatW")))
        ok(not st.get("errs"), "no page errors (%s)" % (st.get("errs") or "none"))
        b.js("(function(){var h=document.querySelector('[id$=\"-messages\"]');"
             "if(h)h.scrollTop=h.scrollHeight})()")
        time.sleep(0.6)
        print("  shot", b.shot("outmode__inline__%s" % THEME))
        # The galleries are the reading that changed most: the pictures bleed
        # to the module edges while the line introducing them sits on the
        # prose column, and nothing is written underneath them.
        b.js("(function(){var p=document.querySelectorAll('p.sc-out--inline');"
             "if(p.length)p[0].scrollIntoView({block:'start'})})()")
        time.sleep(0.6)
        print("  shot", b.shot("outmode__inline-gallery__%s" % THEME))

        # The control itself: two labelled rows under the turn actions, with a
        # check on the reading in force.
        b.js("(function(){var r=document.querySelectorAll("
             "'[id$=\"-messages\"] .sc-fb-more');var m=r[r.length-1];"
             "if(m){m.scrollIntoView({block:'center'});m.click();}})()")
        time.sleep(0.7)
        menu = b.js(
            "Array.from(document.querySelectorAll('.sc-fb-menu:not([hidden]) .sc-fb-outmode'))"
            ".map(function(x){return {lab:x.textContent.replace(/\\s+/g,' ').trim(),"
            "on:x.getAttribute('aria-checked'),"
            "w:Math.round(x.getBoundingClientRect().width)};})"
        ) or []
        print("  menu", menu)
        ok(len(menu) == 2, "the menu offers both readings (got %s)" % len(menu))
        ok(all((m.get("w") or 0) > 100 for m in menu), "each row is a real labelled row")
        ok([m.get("on") for m in menu] == ["true", "false"],
           "with the one in force checked (%s)" % [m.get("on") for m in menu])
        print("  shot", b.shot("outmode__menu__%s" % THEME))

        # ── As cards ──────────────────────────────────────────────────────
        print("  pick cards:", pick(b, "cards"))
        cards = b.js(STATE) or {}
        print("  cards", cards)
        ok(cards.get("mode") == "cards", "the menu switched the reading (%s)" % cards.get("mode"))
        ok(cards.get("inlineShown") == 0,
           "the full-size copies stand down (got %s)" % cards.get("inlineShown"))
        ok(cards.get("says") == 0,
           "and so does their narration, since the chips say it (got %s)" % cards.get("says"))
        ok(cards.get("cardsShown") == 4, "and the four chips are back (got %s)"
           % cards.get("cardsShown"))
        ok(cards.get("leadShown") == 1, "under the line that says how many landed")
        ok(cards.get("inlineTotal") == 4,
           "nothing was thrown away, so the switch is free (%s still written)"
           % cards.get("inlineTotal"))
        ok(not cards.get("open"), "still nothing docked (%s)" % (cards.get("open") or "none"))
        ok(cards.get("chatW") == rest_w, "and still no resize (%s -> %s)"
           % (rest_w, cards.get("chatW")))
        time.sleep(0.5)
        print("  shot", b.shot("outmode__cards__%s" % THEME))

        # The chip is the door, and it still is.
        b.js("(function(){var c=document.querySelector("
             "'[id$=\"-messages\"] .sc-surface-card[data-surface]');if(c)c.click();})()")
        time.sleep(1.4)
        ok(bool((b.js(STATE) or {}).get("open")), "tapping a chip still opens the Output pane")
        print("  shot", b.shot("outmode__cards-open__%s" % THEME))

        # ── And back, on a turn that is already history ───────────────────
        print("  pick inline:", pick(b, "inline"))
        back = b.js(STATE) or {}
        print("  back", back)
        ok(back.get("mode") == "inline", "switched back (%s)" % back.get("mode"))
        ok(back.get("inlineShown") == 4 and back.get("cardsShown") == 0,
           "the same turn re-reads in the thread (%s inline, %s chips)"
           % (back.get("inlineShown"), back.get("cardsShown")))
        ok(back.get("tiles") == 16 + 23,
           "with every piece still there (%s tiles)" % back.get("tiles"))
        ok(not back.get("errs"), "still no page errors (%s)" % (back.get("errs") or "none"))

        # The preference is the member's, so it survives a reload.
        b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=2.0)
        ok(b.js("document.documentElement.getAttribute('data-output-mode')") == "inline",
           "and it is remembered across a load")

    finally:
        b.close()

    if fails:
        print("FAILED %s checks" % fails)
        sys.exit(1)
    print("ok")


if __name__ == "__main__":
    main()
