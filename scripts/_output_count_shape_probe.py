"""Drive real turns and check the output-count rule.

One output surfaces as the landscape chip; more than one surfaces as portrait
cards on a single rail, under a line that counts them. Sends one ask of each
kind and reports the shape the transcript ended up with.

  python3 scripts/_output_count_shape_probe.py [light|dark]
"""
import base64
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"

SEND = r"""
(function(text){
  var input = document.querySelector('.chat-input-rail textarea.fl-input, .chat-input-rail textarea');
  if (!input) return 'no-input';
  var proto = input.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  var set = Object.getOwnPropertyDescriptor(proto, 'value').set;
  set.call(input, text);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  var btn = document.querySelector('.sc-send');
  if (btn) { btn.click(); return 'sent'; }
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  return 'sent-enter';
})
"""

SHAPE = r"""
(function(){
  var host = document.querySelector('[id$="-messages"]');
  if (!host) return null;
  var cards = host.querySelectorAll('.sc-surface-card[data-surface]');
  var rails = host.querySelectorAll('.sc-surface-rail');
  var leads = Array.prototype.map.call(host.querySelectorAll('.sc-surface-rail-lead'),
    function(p){ return p.textContent.replace(/\s+/g,' ').trim(); });
  return {
    outputs: cards.length,
    portrait: host.querySelectorAll('.sc-surface-card--portrait[data-surface]').length,
    landscape: host.querySelectorAll(
      '.sc-surface-card[data-surface]:not(.sc-surface-card--portrait)').length,
    rails: rails.length,
    leads: leads,
    panesOpen: ['wa-results','wa-visuals','wa-unified','wa-report'].filter(function(id){
      var el = document.getElementById(id);
      return el && el.classList.contains('is-open');
    }),
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


def settle(b, want, limit=110.0):
    """Wait until the output count stops growing (and has reached `want`)."""
    last, stable, t0 = -1, 0, time.time()
    while time.time() - t0 < limit:
        time.sleep(1.0)
        s = b.js(SHAPE) or {}
        n = s.get("outputs", 0)
        stable = stable + 1 if n == last and n >= want else 0
        last = n
        if stable >= 3:
            break
    return b.js(SHAPE) or {}


def shot(b, name):
    os.makedirs(OUT, exist_ok=True)
    r = b.js(r"""
    (function(){
      var host = document.querySelector('[id$="-messages"]');
      var rail = host && host.querySelector('.sc-surface-rail, .sc-surface-card[data-surface]');
      if (rail) rail.scrollIntoView({ block: 'center' });
      var chat = document.querySelector('.wa-chat');
      var b = (chat || document.body).getBoundingClientRect();
      return { x: Math.max(0, b.left), y: Math.max(0, b.top),
               w: Math.min(b.width, window.innerWidth), 
               h: Math.min(b.height, window.innerHeight) };
    })()
    """)
    time.sleep(0.8)
    res = b.cmd("Page.captureScreenshot", {"format": "png", "clip": {
        "x": r["x"], "y": r["y"], "width": r["w"], "height": r["h"], "scale": 2}})
    p = os.path.join(OUT, "outcount__%s__%s.png" % (name, THEME))
    with open(p, "wb") as fh:
        fh.write(base64.b64decode(res["result"]["data"]))
    print("  shot", p)


CLICK_CHIP = r"""
(function(label){
  var chip = Array.prototype.find.call(
    document.querySelectorAll('.ws-intent-chip, .sc-inline-chips .chip, .sc-reply-chips .chip'),
    function(c){ return c.textContent.replace(/\s+/g,' ').indexOf(label) >= 0; });
  if (!chip) return 'no-chip';
  chip.click();
  return 'tapped';
})
"""


def run(b, ask, want, label, chip=False):
    print("\n%s — %r" % (label, ask))
    print("  send:", b.js((CLICK_CHIP if chip else SEND) + "(%r)" % ask))
    s = settle(b, want)
    print("  shape:", {k: s[k] for k in ("outputs", "portrait", "landscape", "rails", "leads")})
    if s.get("errs"):
        print("  page errors:", s["errs"])
    return s


def main():
    b = Browser(port=9441 if THEME == "dark" else 9442,
                width=1700, height=1100, out=OUT)
    b.cmd("Runtime.disable")
    try:
        b.on_new_document(
            "window.__errs=[];addEventListener('error',function(e){"
            "__errs.push((e.message||'')+' @ '+(e.filename||'')+':'+(e.lineno||''))});"
            "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
            "localStorage.setItem('wise-authed','1');"
            "localStorage.setItem('wise-theme','%s');"
            "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME))
        # Each case gets a fresh load: surface() re-routes a follow-up against
        # the topic the previous turn left behind, so two asks in one thread
        # would not be the two turns this is trying to compare.
        b.goto(URL, ready="!!document.querySelector('.sc-send')", settle=3.5)
        one = run(b, "How many ingredients have GRAS status?", 1, "ONE OUTPUT",
                  chip=True)
        ok(one["outputs"] == 1, "a one-output turn surfaced one output")
        ok(one["landscape"] == 1 and one["portrait"] == 0,
           "and drew it as the landscape chip")
        ok(one["rails"] == 0 and not one["leads"],
           "with no rail and no count line")
        ok(not one["panesOpen"], "the pane stayed shut")
        shot(b, "one")

        b.goto(URL, ready="!!document.querySelector('.sc-send')", settle=3.5)
        many = run(b, "show me a spider chart", 2, "MANY OUTPUTS")
        n = many["outputs"]
        ok(n > 1, "a multi-output turn surfaced %d outputs" % n)
        ok(many["portrait"] == n, "and drew every one of them as a portrait card")
        ok(many["rails"] == 1, "on a single rail")
        ok(any(("%d outputs" % n) in l for l in many["leads"]),
           "under a line counting them: %r" % (many["leads"] or ""))
        ok(not many["panesOpen"], "the pane stayed shut")
        shot(b, "many")
    finally:
        b.close()
    print("\n%s" % ("all output-shape checks passed" if not fails
                    else "%d check(s) failed" % fails))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
