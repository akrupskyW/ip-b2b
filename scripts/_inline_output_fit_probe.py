"""Outputs drawn in the thread fill the module, and never outgrow it.

Drives real turns with `data-output-mode="inline"` in force and checks the
three things that make an output readable in the transcript:

  1. It RENDERS. The compare board is the case that did not: its host is
     found by id, both readings of the output are written at once, and the
     copy in the thread was left an empty box (see homeLiveCompareBoard).
  2. It runs the chat MODULE edge to edge rather than sitting on the prose
     column, so a table gets its columns and a matrix gets its labels.
  3. It is never WIDER than the module — at every tier of the width cycle,
     not just the ends, since the single width is where content that cannot
     shrink shows up and the middle is where a bad formula hides — and a
     plot drawn in viewBox units is never scaled past its drawn size,
     nor parked in the left corner of the room the cap left it.

Then flips to the card reading and checks the chip's thumbnail is not blank,
which is the same bug seen from the other side.

    python3 scripts/_inline_output_fit_probe.py [light|dark]
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

BASE = "http://127.0.0.1:8099/pages/wiseai.html"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"
THEME = sys.argv[1] if len(sys.argv) > 1 else "dark"

# intent -> how many outputs the turn surfaces. The atlas is the widest
# variety of them in one turn — flag, control rows, map, matrices, plot cards,
# references — so it is the one that actually exercises the inset and the
# cancels against each other.
TURNS = [
    ("compare", 1),
    ("energy", 1),
    ("topbrands", 2),
    ("report", 2),
    ("atlas", 10),
]

STATE = r"""
(function(){
  var host = document.querySelector('[id$="-messages"]');
  var mod  = document.querySelector('.wa-chat') || document.querySelector('.sc-card');
  /* Carry the error list even on this path. A module that failed to parse
     renders no transcript at all, and without the errors here the wait below
     has nothing to tell it apart from a turn that is merely slow. */
  if (!host || !mod) return {err:'no host', errs:(window.__errs||[]).slice(0,4)};
  var mb = mod.getBoundingClientRect();
  function vis(el){ var r = el.getBoundingClientRect(); return r.width>0 && r.height>0; }
  /* A rect is only a spill if it is actually PAINTED out there. A progress
     value parked at the start of a short bar, a rail mid-scroll, a clipped
     thumbnail — all report un-clipped rects while an ancestor is hiding them,
     so an ancestor that clips horizontally ends the question. */
  function clipped(el, stop){
    for (var p = el.parentElement; p && p !== stop; p = p.parentElement) {
      var ox = getComputedStyle(p).overflowX;
      if (ox && ox !== 'visible') return true;
    }
    return false;
  }

  var blocks = Array.from(host.querySelectorAll('.sc-out--inline.wa-pane-body'));
  var spill = [];
  var plots = [];
  blocks.forEach(function(b, i){
    Array.from(b.querySelectorAll('*')).forEach(function(el){
      if (!vis(el)) return;
      /* SVG <text> paints outside its own box by design (overflow: visible on
         the plots), so measure the ELEMENT boxes, not glyph runs. */
      if (el.ownerSVGElement) return;
      var r = el.getBoundingClientRect();
      var past = Math.max(Math.round(mb.left - r.left), Math.round(r.right - mb.right));
      if (past > 2 && !clipped(el, mod)) {
        spill.push({ b:i, tag: el.tagName.toLowerCase(),
                     sel: (el.className||'').toString().slice(0,40),
                     w: Math.round(r.width), past: past });
      }
    });
    b.querySelectorAll('svg[data-plot-capped]').forEach(function(s){
      var r = s.getBoundingClientRect();
      var vb = (s.getAttribute('viewBox')||'').trim().split(/[\s,]+/);
      var w = parseFloat(vb[2]);
      if (!(w > 0) || r.width < 1) return;
      /* Where the plot SITS in the room the cap left it. All of that room
         stacked on one side is the left-corner bug: an SVG is inline by
         default, so auto margins do nothing until it is a block. */
      /* Against the box that actually holds the plot. A map card sits beside a
         side panel inside its block, so measuring the gap against the block
         reads as lopsided when the plot is centred in its own card. */
      var card = s.closest('.wa-chart-card, .atl-card') || s.closest('.wa-block') || b;
      var cr = card.getBoundingClientRect();
      plots.push({ b:i, cls:(s.getAttribute('class')||'-').slice(0,26),
                   vbW: Math.round(w), w: Math.round(r.width),
                   scale: +(r.width / w).toFixed(2),
                   gapL: Math.round(r.left - cr.left),
                   gapR: Math.round(cr.right - r.right) });
    });
  });
  spill.sort(function(a,b){ return b.past - a.past; });

  /* The block reaching the module edges is not the whole promise: its PROSE
     sits on a small inset, and the wide content is supposed to cancel that
     inset and reach the edges anyway. Measure both halves, so a missing
     cancel shows up as a chart that stops short rather than as nothing. */
  var WIDE = '.wa-chart-card, table, .rtbl, .cmp-body, .atl-card, .atl-mapwrap, .sc-mgrid';
  var wide = [], prose = [];
  blocks.forEach(function(b, i){
    /* No `clipped` test here: that one exists to excuse a rect the thread's
       own scroller is hiding, and the scroller is an ancestor of everything,
       so it would excuse every box in the block. */
    b.querySelectorAll(WIDE).forEach(function(el){
      if (!vis(el)) return;
      /* Only the OUTERMOST wide box on its branch. A table inside a card sits
         on that card's own padding, which is the frame the output is supposed
         to keep — demanding it reach the module edges too would be asking for
         a table printed on the card's border. */
      if (el.parentElement && el.parentElement.closest(WIDE)
          && b.contains(el.parentElement.closest(WIDE))) return;
      var r = el.getBoundingClientRect();
      /* Only boxes that actually want the full width — a stat tile or a half
         card is meant to stop short. */
      if (r.width < mb.width - 60) return;
      wide.push({ b:i, cls:(el.className||'-').toString().slice(0,28),
                  offL: Math.round(r.left - mb.left),
                  offR: Math.round(mb.right - r.right) });
    });
    b.querySelectorAll('.wa-sec-title, .wa-report-lede, .atl-ctrl-label, .wa-ref-group')
      .forEach(function(el){
        if (!vis(el)) return;
        var r = el.getBoundingClientRect();
        prose.push({ b:i, cls:(el.className||'-').toString().slice(0,26),
                     offL: Math.round(r.left - mb.left) });
      });
  });

  var rects = blocks.map(function(b){
    var r = b.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height),
             offL: Math.round(r.left - mb.left),
             offR: Math.round(mb.right - r.right) };
  });

  /* The chip's thumbnail in the card reading — a blank one is the same bug. */
  var thumbs = Array.from(host.querySelectorAll('.sc-surface-thumb-inner')).map(function(t){
    return { kids: t.childElementCount, h: Math.round(t.getBoundingClientRect().height) };
  });

  return {
    mode: document.documentElement.getAttribute('data-output-mode'),
    modW: Math.round(mb.width),
    n: blocks.length,
    rects: rects,
    plots: plots,
    badPlots: plots.filter(function(p){ return p.scale > 1.02; }),
    lopsided: plots.filter(function(p){
      return Math.abs(p.gapL - p.gapR) > 6 && Math.max(p.gapL, p.gapR) > 12;
    }),
    spillN: spill.length, spill: spill.slice(0, 6),
    wideN: wide.length,
    wideShort: wide.filter(function(w){ return w.offL > 2 || w.offR > 2; }).slice(0, 6),
    proseN: prose.length,
    proseOnEdge: prose.filter(function(p){ return p.offL < 6; }).slice(0, 6),
    cards: host.querySelectorAll('.sc-surface-card[data-surface]').length,
    thumbs: thumbs,
    blankThumbs: thumbs.filter(function(t){ return !t.kids; }).length,
    errs: (window.__errs||[]).slice(0, 4)
  };
})()
"""

TAP = r"""
(function(){
  var btn = document.querySelector('.wa-chat .panel-width-toggle-btn');
  var mod = document.querySelector('.wa-chat');
  if (!btn || !mod) return null;
  btn.click();
  return Math.round(mod.getBoundingClientRect().width);
})()
"""

fails = 0


def ok(cond, msg):
    global fails
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails += 1


def settle(b, want):
    """Wait for the turn to surface all of its outputs and stop moving.

    Bails out the moment the page reports a script error. A broken module
    surfaces nothing, and waiting the full window for nothing turns a one-line
    syntax error into a silent several-minute hang with no output to read.
    """
    st, stable, last = {}, 0, -1
    deadline = time.time() + 180.0
    while time.time() < deadline:
        time.sleep(1.5)
        st = b.js(STATE) or st
        if st.get("errs"):
            print("  !! the page is throwing, so nothing will surface:",
                  json.dumps(st.get("errs")))
            break
        n = st.get("n") or 0
        stable = stable + 1 if (n == last and n >= want) else 0
        last = n
        if stable >= 2:
            break
    return st


def main():
    b = Browser(width=1512, height=980, out=OUT)
    b.cmd("Runtime.disable")
    try:
        for intent, want in TURNS:
            b.on_new_document(
                "window.__errs=[];addEventListener('error',function(e){"
                "__errs.push((e.message||'')+' @'+(e.lineno||''))});"
                "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
                "localStorage.setItem('wise-authed','1');"
                "localStorage.setItem('wise-theme','%s');"
                "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME)
            )
            b.goto("%s?intent=%s" % (BASE, intent),
                   ready="!!document.querySelector('.ws-intent-chip')", settle=2.0)
            st = settle(b, want)
            print("\n=== %s === module=%spx outputs=%s" % (intent, st.get("modW"), st.get("n")))
            ok(st.get("mode") == "inline", "the thread is the reading in force")
            ok(st.get("n") == want, "the turn drew %s output(s) in the thread (got %s)"
               % (want, st.get("n")))

            rects = st.get("rects") or []
            ok(rects and all(r["h"] > 120 for r in rects),
               "every one of them actually rendered (heights %s)"
               % [r["h"] for r in rects])
            ok(rects and all(abs(r["offL"]) <= 2 and abs(r["offR"]) <= 2 for r in rects),
               "and reaches both module edges (%s)"
               % [(r["offL"], r["offR"]) for r in rects])
            ok(st.get("spillN") == 0,
               "nothing paints past the module (%s)" % json.dumps(st.get("spill") or []))
            ok(not st.get("wideShort"),
               "its wide content cancels the inset and reaches the edges (%s of %s short%s)"
               % (len(st.get("wideShort") or []), st.get("wideN"),
                  "" if not st.get("wideShort") else ": " + json.dumps(st["wideShort"])))
            ok(not st.get("proseOnEdge"),
               "and its own words keep the inset (%s of %s on the edge)"
               % (len(st.get("proseOnEdge") or []), st.get("proseN")))
            ok(not st.get("badPlots"),
               "no plot is scaled past the size it was drawn at (%s)"
               % json.dumps(st.get("badPlots") or []))
            ok(not st.get("lopsided"),
               "and each one is centred in the room the cap left it (%s)"
               % json.dumps(st.get("lopsided") or []))
            print("   plots", json.dumps(st.get("plots") or []))
            ok(not st.get("errs"), "no page errors (%s)" % (st.get("errs") or "none"))

            b.js("(function(){var h=document.querySelector('[id$=\"-messages\"]');"
                 "if(h)h.scrollTop=h.scrollHeight})()")
            time.sleep(0.5)
            print("  shot", b.shot("inlinefit__%s__%s" % (intent, THEME)))

            # The foot of the thread shows the wide content; the HEAD of the
            # first output is where the inset on its own words reads.
            b.js("(function(){var o=document.querySelector('.sc-out--inline.wa-pane-body');"
                 "if(o)o.scrollIntoView({block:'start'})})()")
            time.sleep(0.6)
            print("  shot", b.shot("inlinefit-top__%s__%s" % (intent, THEME)))

            # ── EVERY tier, not just the ends. Content that cannot shrink shows
            #    up at the single width, but a formula that is wrong in the
            #    middle of the cycle only shows up in the middle of the cycle.
            #    The first tap on a free-growing chat enters the cycle at its
            #    first preset, so walk the WHOLE cycle rather than stopping at
            #    the single width the first tap lands on.
            seen, narrow = [st.get("modW")], None
            for _ in range(4):
                b.js(TAP)
                time.sleep(1.4)
                tst = b.js(STATE) or {}
                w = tst.get("modW") or 0
                seen.append(w)
                trects = tst.get("rects") or []
                ok(trects and all(abs(r["offL"]) <= 2 and abs(r["offR"]) <= 2 for r in trects),
                   "at %spx the outputs still reach both edges (%s)"
                   % (w, [(r["offL"], r["offR"]) for r in trects]))
                ok(tst.get("spillN") == 0,
                   "at %spx nothing is wider than the transcript (%s)"
                   % (w, json.dumps(tst.get("spill") or [])))
                ok(not tst.get("badPlots"),
                   "at %spx no plot is scaled past its drawn size (%s)"
                   % (w, json.dumps(tst.get("badPlots") or [])))
                if w <= 400 and narrow is None:
                    narrow = b.shot("inlinefit-narrow__%s__%s" % (intent, THEME))
            print("  tiers:", " -> ".join(str(w) for w in seen))
            ok(any((w or 0) <= 400 for w in seen[1:]),
               "the cycle passes through the single width (%s)" % seen)
            ok(len({w for w in seen[1:]}) > 1,
               "and the toggle actually moves the module every tap (%s)" % seen)
            print("  shot", narrow)

            # ── The card reading: the chip preview must not be blank
            b.js("(function(){try{window.WiseOutputMode.set('cards')}catch(e){}})()")
            time.sleep(1.6)
            cst = b.js(STATE) or {}
            ok(cst.get("mode") == "cards", "switched to the card reading")
            ok(cst.get("cards") == want,
               "the chips are there (%s of %s)" % (cst.get("cards"), want))
            ok(cst.get("blankThumbs") == 0,
               "and no chip has a blank preview (%s blank of %s)"
               % (cst.get("blankThumbs"), len(cst.get("thumbs") or [])))
    finally:
        b.close()

    if fails:
        print("\nFAILED %s checks" % fails)
        sys.exit(1)
    print("\nok")


if __name__ == "__main__":
    main()
