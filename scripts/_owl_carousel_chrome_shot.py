"""Verify owl + masonry carousel chrome: prev / count / next at the foot."""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from _cdp import Browser  # noqa: E402

BASE = "http://127.0.0.1:8099"
OUT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "screenshots/_diag")
AUTH = """
try {
  localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Demo User',email:'demo@wisealliance.com',initials:'DU'}));
  localStorage.setItem('wise-theme', '%s');
  localStorage.setItem('chat-theme', '%s');
  localStorage.setItem('wise-walkthrough', JSON.stringify({v:1,completed:true,dismissed:true,doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));
  if ('%s' === 'dark') { document.documentElement.classList.add('dark'); }
} catch (e) {}
"""

INJECT = r"""
(function(){
  var area = document.querySelector('.chat-messages-area, #chat-messages');
  if (!area || !window.WiseOwlProgression) return 'no-area';
  var line = document.createElement('div');
  line.className = 'sc-line sc-line-wiseai';
  var dark = document.documentElement.classList.contains('dark');
  line.style.cssText = 'position:fixed;left:0;right:0;top:72px;z-index:40;padding:20px 36px;'
    + 'background:' + (dark ? '#0d1524' : '#ffffff') + ';box-shadow:0 20px 60px rgba(0,0,0,.35);';
  var body = document.createElement('div');
  body.className = 'sc-line-body';
  body.innerHTML = window.WiseOwlProgression.html();
  line.appendChild(body);
  area.appendChild(line);
  window.WiseOwlProgression.mount(document);
  return 'ok';
})()
"""

STRIP = r"""
(function(){
  var s = document.querySelector('.sc-owl-prog');
  if (!s) return null;
  var count = s.querySelector('[data-owl-count]');
  var prev = s.querySelector('[data-owl-dir="-1"]');
  var next = s.querySelector('[data-owl-dir="1"]');
  var r = s.getBoundingClientRect();
  return {
    count: count ? count.textContent.trim() : '',
    prev: !!prev, next: !!next,
    x: r.x, y: r.y, w: r.width, h: r.height
  };
})()
"""

OPEN = r"""
(function(){
  var item = document.querySelector('.sc-owl-prog-item.is-openable');
  if (item) item.click();
  return !!item;
})()
"""

MODAL = r"""
(function(){
  var s = document.getElementById('owl-prog-detail');
  if (!s) return null;
  var count = s.querySelector('[data-owl-count]');
  var chrome = s.querySelector('.sc-owl-prog-chrome');
  var detail = s.querySelector('.sc-owl-prog-detail');
  var cr = chrome ? chrome.getBoundingClientRect() : null;
  var dr = detail ? detail.getBoundingClientRect() : null;
  return {
    title: (s.querySelector('.wise-modal-title') || {}).textContent || '',
    count: count ? count.textContent.trim() : '',
    prev: !!s.querySelector('[data-owl-step="-1"]'),
    next: !!s.querySelector('[data-owl-step="1"]'),
    chromeBelow: !!(cr && dr && cr.top >= dr.bottom - 2)
  };
})()
"""


def main():
    fails = 0
    b = Browser(port=9488, width=1440, height=1000, out=OUT)
    try:
        for theme in ("light", "dark"):
            b.on_new_document(AUTH % (theme, theme, theme))
            b.goto("%s/pages/wiseai.html?v=%d" % (BASE, int(time.time() * 1000)),
                   ready="!!document.querySelector('.chat-messages-area, #chat-messages')",
                   settle=2.2)
            print(theme, "inject", b.js(INJECT))
            time.sleep(1.2)
            strip = b.js(STRIP) or {}
            print(theme, "strip", strip)
            if not (strip.get("prev") and strip.get("next") and " of " in (strip.get("count") or "")):
                print("  FAIL strip chrome", strip)
                fails += 1
            if strip.get("w"):
                clip = {
                    "x": max(strip["x"], 0), "y": max(strip["y"], 0),
                    "width": strip["w"], "height": strip["h"] + 8, "scale": 2,
                }
                r = b.cmd("Page.captureScreenshot", {"format": "png", "clip": clip})
                p = os.path.join(OUT, "owl-prog-chrome__%s.png" % theme)
                open(p, "wb").write(__import__("base64").b64decode(r["result"]["data"]))
                print("  shot", p)
            b.js(OPEN)
            time.sleep(1.4)
            modal = b.js(MODAL) or {}
            print(theme, "modal", modal)
            if not (modal.get("prev") and modal.get("next") and " of " in (modal.get("count") or "")
                    and modal.get("chromeBelow")):
                print("  FAIL modal chrome", modal)
                fails += 1
            print("  shot", b.shot("owl-prog-detail__%s" % theme))
            first_title = modal.get("title")
            first_count = modal.get("count")
            b.js("(function(){var n=document.querySelector('[data-owl-step=\"1\"]');if(n)n.click();})()")
            time.sleep(1.2)
            stepped = b.js(MODAL) or {}
            print(theme, "step", stepped)
            if not (stepped.get("title") and stepped.get("title") != first_title
                    and stepped.get("count") and stepped.get("count") != first_count):
                print("  FAIL step", first_title, first_count, "->", stepped)
                fails += 1
            print("  shot", b.shot("owl-prog-detail-next__%s" % theme))
            b.js("(function(){var x=document.querySelector('#owl-prog-detail .wise-modal-close');if(x)x.click();})()")
            time.sleep(0.4)
        print("fails", fails)
        return 1 if fails else 0
    finally:
        b.close()


if __name__ == "__main__":
    sys.exit(main())
