"""Close-up of a spent chip row sitting above the live one.

Drives view-product far enough to leave two rows behind, then clips the shot
to the transcript so the disabled look can be read in both themes.

  python3 scripts/_chip_lock_shot.py [light|dark]
"""
import base64
import json
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
URL = "http://127.0.0.1:8099/pages/view-product.html"
OUT = "/tmp/wise-chip-lock"

TAP = """(function(){
  var t = document.querySelector('#chat-messages');
  var rows = [].slice.call(t.querySelectorAll('.sc-reply-chips')).filter(function(r){
    return !r.hasAttribute('data-chips-spent');
  });
  var row = rows[rows.length - 1];
  if (!row) return 'no live row';
  var chip = row.querySelector('.chip:not([aria-disabled="true"])');
  if (!chip) return 'no live chip';
  var label = chip.textContent.replace(/\\s+/g, ' ').trim();
  chip.click();
  return label;
})()"""

b = Browser(port=9382 if THEME == "dark" else 9381,
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
    print("  tap 1: %s" % b.js(TAP))
    time.sleep(11)
    print("  tap 2: %s" % b.js(TAP))
    time.sleep(13)
    b.js("var t=document.querySelector('#chat-messages');if(t)t.scrollTop=t.scrollHeight")
    time.sleep(0.8)
    box = json.loads(b.js(
        "(function(){var t=document.querySelector('#chat-messages');"
        "var r=t.getBoundingClientRect();"
        "return JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height})})()"))
    r = b.cmd("Page.captureScreenshot", {"format": "png", "clip": {
        "x": box["x"], "y": box["y"], "width": box["w"], "height": box["h"],
        "scale": 2}})
    path = os.path.join(OUT, "chip-lock__thread__%s.png" % THEME)
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(r["result"]["data"]))
    print("  shot: %s" % path)
finally:
    b.close()
