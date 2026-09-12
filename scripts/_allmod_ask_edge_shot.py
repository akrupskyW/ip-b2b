"""Clip All Modules Transcript lines + Architecture after the sent-ask wash."""
import base64
import json
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/all-modules.html#mi-components"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"


def shot(b, clip, name):
    os.makedirs(OUT, exist_ok=True)
    res = b.cmd("Page.captureScreenshot", {"format": "png", "clip": {
        "x": clip["x"], "y": clip["y"], "width": clip["w"], "height": clip["h"], "scale": 2}})
    path = os.path.join(OUT, "allmod-ask-edge__%s__%s.png" % (name, THEME))
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(res["result"]["data"]))
    print("shot", path)
    return path


OPEN_LIB = r"""
(async function () {
  var sec = document.getElementById('mi-components');
  if (!sec) return 'no-section';
  var head = sec.querySelector(':scope > .mi-module-head');
  if (sec.classList.contains('is-collapsed') && head) head.click();
  for (var i = 0; i < 40; i++) {
    if (document.querySelector('[data-ds-comp]')) break;
    await new Promise(function (r) { setTimeout(r, 250); });
  }
  return document.querySelectorAll('[data-ds-comp]').length + ' cards';
})()
"""

MEASURE = r"""
(function(){
  var card = document.querySelector('[data-comp-name="Transcript lines"]');
  var demo = card && card.querySelector('.dsc-theme-light .dsc-ask-thread, .dsc-ask-thread');
  var you = demo && demo.querySelector('.sc-line-you:not(.sc-line-event)');
  var wrap = demo && demo.getBoundingClientRect();
  var line = you && you.getBoundingClientRect();
  var before = you && getComputedStyle(you, '::before');
  var washL = (line && before) ? Math.round(line.left + parseFloat(before.left) - wrap.left) : null;
  var washR = (line && before) ? Math.round(wrap.right - (line.right - parseFloat(before.right))) : null;
  return JSON.stringify({
    thread: !!demo,
    you: !!you,
    washL: washL,
    washR: washR,
    washBg: before && before.backgroundColor,
    lineLeft: line && wrap ? Math.round(line.left - wrap.left) : null
  });
})()
"""


def main():
    b = Browser(port=9412 if THEME == "dark" else 9413, width=1440, height=1400, out=OUT)
    try:
        dark = "document.documentElement.classList.add('dark');" if THEME == "dark" else ""
        b.on_new_document(
            "try{localStorage.clear();"
            "localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,name:'Arthur Krupsky',"
            "email:'akrupsky@wisecode.ai',initials:'AK'}));"
            "localStorage.setItem('wise-theme','%s');"
            "localStorage.setItem('chat-theme','%s');}catch(e){}"
            "%s" % (THEME, THEME, dark))
        b.goto(URL, ready="document.readyState==='complete'", timeout=60.0, settle=2.0)
        for _ in range(45):
            time.sleep(0.4)
            if b.js("!!document.getElementById('mi-components')"):
                break
        print("open lib:", b.js(OPEN_LIB))
        time.sleep(1.2)
        print("open card:", b.js("""
        (function(){
          var card = document.querySelector('[data-comp-name="Transcript lines"]');
          if (!card) return 'no-card';
          if (card.classList.contains('is-collapsed')) {
            var ch = card.querySelector(':scope > .dsc-card-head');
            if (ch) ch.click();
          }
          var sc = document.getElementById('agent-main-scroll') || card.closest('.agent-main-scroll');
          if (sc) {
            var c = card.getBoundingClientRect();
            var s = sc.getBoundingClientRect();
            sc.scrollTop += (c.top - s.top) - 12;
          }
          return card.classList.contains('is-collapsed') ? 'still-collapsed' : 'open';
        })()
        """))
        time.sleep(0.6)
        print("measure:", b.js(MEASURE))
        clip = b.js("""
        (function(){
          var card = document.querySelector('[data-comp-name="Transcript lines"]');
          if (!card) return null;
          var r = card.getBoundingClientRect();
          return { x: Math.max(0, r.left - 8), y: Math.max(0, r.top - 8),
                   w: Math.min(r.width + 16, window.innerWidth - Math.max(0, r.left - 8)),
                   h: Math.min(r.height + 16, window.innerHeight - Math.max(0, r.top - 8), 1800) };
        })()
        """)
        print("card clip:", clip)
        if clip:
            shot(b, clip, "lines")

        print("open tarch:", b.js("""
        (function(){
          var sec = document.getElementById('mi-tarch');
          if (!sec) return 'no-tarch';
          var head = sec.querySelector(':scope > .mi-module-head');
          if (sec.classList.contains('is-collapsed') && head) head.click();
          var sc = document.getElementById('agent-main-scroll') || sec.closest('.agent-main-scroll');
          if (sc) {
            var c = sec.getBoundingClientRect();
            var s = sc.getBoundingClientRect();
            sc.scrollTop += (c.top - s.top) - 8;
          }
          return sec.classList.contains('is-collapsed') ? 'still-collapsed' : 'open';
        })()
        """))
        time.sleep(0.8)
        tclip = b.js("""
        (function(){
          var chat = document.querySelector('#mi-tarch .mi-tarch-chat');
          if (!chat) return null;
          var r = chat.getBoundingClientRect();
          return { x: Math.max(0, r.left - 8), y: Math.max(0, r.top - 8),
                   w: Math.min(r.width + 16, window.innerWidth - Math.max(0, r.left - 8)),
                   h: Math.min(r.height + 16, window.innerHeight - Math.max(0, r.top - 8), 1600) };
        })()
        """)
        print("tarch clip:", tclip)
        if tclip:
            shot(b, tclip, "tarch")
    finally:
        b.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
