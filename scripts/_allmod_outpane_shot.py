"""Open All Modules → Output pane contents and clip phone / laptop states.

  python3 scripts/_allmod_outpane_shot.py [light|dark] [380|700|1000]
"""
import base64
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/all-modules.html#mi-components"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
WIDTH = int(sys.argv[2]) if len(sys.argv) > 2 else 380

OPEN = r"""
(async function () {
  var root = document.getElementById('agent-main') || document;
  var sec = document.getElementById('mi-components');
  if (!sec) return 'no-section';
  var head = sec.querySelector(':scope > .mi-module-head');
  if (sec.classList.contains('is-collapsed') && head) head.click();
  for (var i = 0; i < 40; i++) {
    if (document.querySelector('[data-comp-name="Output pane contents"]')) break;
    await new Promise(function (r) { setTimeout(r, 250); });
  }
  var card = document.querySelector('[data-comp-name="Output pane contents"]');
  if (!card) return 'no-card';
  if (card.classList.contains('is-collapsed')) {
    var ch = card.querySelector(':scope > .dsc-card-head');
    if (ch) ch.click();
  }
  await new Promise(function (r) { setTimeout(r, 400); });
  return card.classList.contains('is-collapsed') ? 'still-collapsed' : 'open';
})()
"""

SET_W = """(function(w){
  var btn = document.querySelector('[data-out-set="'+w+'"]');
  if (!btn) return false;
  btn.click();
  return true;
})(%d)"""

RECT = """(function(){
  var card = document.querySelector('[data-comp-name="Output pane contents"]');
  if (!card) return null;
  var sc = document.getElementById('agent-main-scroll') || card.closest('.agent-main-scroll');
  if (sc) {
    var c = card.getBoundingClientRect();
    var s = sc.getBoundingClientRect();
    sc.scrollTop += (c.top - s.top) - 8;
  }
  var r = card.getBoundingClientRect();
  return { x: Math.max(0, r.left - 4), y: Math.max(0, r.top - 4),
           w: Math.min(r.width + 8, window.innerWidth - Math.max(0, r.left - 4)),
           h: Math.min(r.height + 8, window.innerHeight - Math.max(0, r.top - 4), 1400) };
})()"""


def main():
    b = Browser(port=9397, width=1600, height=1400, out=OUT)
    try:
        b.on_new_document(
            "try{localStorage.clear();"
            "localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,name:'Arthur Krupsky',"
            "email:'akrupsky@wisecode.ai',initials:'AK'}));"
            "localStorage.setItem('wise-theme','%s');"
            "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME))
        b.goto(URL, ready="document.readyState==='complete'", timeout=60.0, settle=2.0)
        print("href:", b.js("location.href"))
        print("title:", b.js("document.title"))
        for _ in range(45):
            time.sleep(1.0)
            if b.js("!!document.getElementById('mi-components')"):
                break
        print("has section:", b.js("!!document.getElementById('mi-components')"))
        print("boot:", b.js("document.getElementById('mi-load-pct')&&document.getElementById('mi-load-pct').textContent"))
        opened = b.js(OPEN)
        print("open:", opened)
        time.sleep(1.2)
        print("set width:", b.js(SET_W % WIDTH))
        time.sleep(1.0)
        r = b.js(RECT)
        if not r:
            print("no card rect")
            return 1
        res = b.cmd("Page.captureScreenshot", {"format": "png", "clip": {
            "x": r["x"], "y": r["y"], "width": r["w"], "height": r["h"], "scale": 2}})
        os.makedirs(OUT, exist_ok=True)
        path = os.path.join(OUT, "allmod-outpane__%s__%dpx.png" % (THEME, WIDTH))
        with open(path, "wb") as fh:
            fh.write(base64.b64decode(res["result"]["data"]))
        print("shot", path)
        cards = b.js(
            "document.querySelectorAll('[data-comp-name=\"Output pane contents\"] "
            ".dsc-out-stage .rtbl-cards').length")
        kpis = b.js(
            "(function(){var g=document.querySelector('[data-comp-name=\"Output pane contents\"] "
            ".dsc-out-kpis');if(!g)return null;var s=getComputedStyle(g);"
            "return {cols:s.gridTemplateColumns, w:Math.round(g.getBoundingClientRect().width)};})()")
        print("carded tables:", cards, "kpis:", kpis)
    finally:
        b.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
