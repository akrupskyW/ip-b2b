"""Close-up of the grounding source chip at the end of an answer's meta row.

Drives one turn on view-product, prints the computed size / weight of the
source chip beside the timestamp it sits opposite, and clips a shot of the
meta row so the two can be read against each other.

  python3 scripts/_trust_chip_shot.py [light|dark]
"""
import base64
import json
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
PAGE = sys.argv[2] if len(sys.argv) > 2 else "wiseai"
URL = "http://127.0.0.1:8099/pages/%s.html" % PAGE
OUT = "/tmp/wise-trust-chip"

TAP = """(function(){
  var t = document.querySelector('.chat-messages-area, #chat-messages');
  var sel = '.sc-reply-chips, .sc-inline-chips, .ws-chips';
  var rows = [].slice.call(t.querySelectorAll(sel)).filter(function(r){
    return !r.hasAttribute('data-chips-spent');
  });
  var row = rows[rows.length - 1];
  var live = '.chip:not([aria-disabled="true"]), .ws-intent-chip:not([aria-disabled="true"])';
  /* The welcome chips on wiseai sit in the overlay, outside the transcript. */
  var chip = row ? row.querySelector(live) : null;
  if (!chip) {
    chip = [].slice.call(document.querySelectorAll('.ws-intent-chip' + ':not([aria-disabled="true"])'))
      .filter(function(c){ return !/what can i ask/i.test(c.textContent); })[0];
  }
  if (!chip) return 'no live chip';
  var label = chip.textContent.replace(/\\s+/g, ' ').trim();
  chip.click();
  return label;
})()"""

MEASURE = """(function(){
  var chips = document.querySelectorAll('.sc-trust-chip');
  var chip = chips[chips.length - 1];
  if (!chip) return JSON.stringify({error: 'no source chip'});
  var meta = chip.closest('.sc-line-meta');
  meta.scrollIntoView({block: 'center'});
  var time = meta && meta.querySelector('.sc-line-time');
  function read(el){
    if (!el) return null;
    var cs = getComputedStyle(el);
    return {text: el.textContent.replace(/\\s+/g,' ').trim(),
            size: cs.fontSize, weight: cs.fontWeight, spacing: cs.letterSpacing};
  }
  var r = meta.getBoundingClientRect();
  return JSON.stringify({source: read(chip), time: read(time),
    box: {x: r.left, y: r.top, w: r.width, h: r.height}});
})()"""

b = Browser(port=9392 if THEME == "dark" else 9391,
            width=1500, height=1050, out=OUT)
b.cmd("Runtime.disable")
try:
    b.on_new_document(
        "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
        "localStorage.setItem('wise-authed','1');"
        "localStorage.setItem('wise-theme','%s');"
        "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME)
    )
    b.goto(URL, ready="!!document.querySelector('.chip')", settle=3.0)
    print("  tap: %s" % b.js(TAP))
    time.sleep(13)
    b.js("var t=document.querySelector('.chat-messages-area, #chat-messages');if(t)t.scrollTop=t.scrollHeight")
    time.sleep(0.8)
    b.js(MEASURE)          # scrolls the row into view
    time.sleep(1.0)        # let a smooth scroll land before the clip is read
    info = json.loads(b.js(MEASURE))
    if info.get("error"):
        print("  %s (chips seen: %s)" % (
            info["error"], b.js("document.querySelectorAll('.sc-line-meta').length")))
        sys.exit(1)
    print("  source: %s" % info.get("source"))
    print("  time:   %s" % info.get("time"))
    box = info["box"]
    pad = 10
    r = b.cmd("Page.captureScreenshot", {"format": "png", "clip": {
        "x": box["x"] - pad, "y": box["y"] - pad,
        "width": box["w"] + pad * 2, "height": box["h"] + pad * 2,
        "scale": 4}})
    path = os.path.join(OUT, "trust-chip__meta__%s.png" % THEME)
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(r["result"]["data"]))
    print("  shot: %s" % path)
finally:
    b.close()
