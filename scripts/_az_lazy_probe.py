"""Prove Analytics Types thumbs lazy-load instead of booting every iframe.

  python3 scripts/_az_lazy_probe.py
"""
import base64
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/all-modules.html"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"

OPEN = r"""
(async function () {
  var sec = document.getElementById('mi-analytics');
  if (!sec) return 'no-section';
  var head = sec.querySelector(':scope > .mi-module-head');
  if (sec.classList.contains('is-collapsed') && head) head.click();
  for (var i = 0; i < 40; i++) {
    if (document.querySelector('#mi-az-grid [data-az-thumb]')) break;
    await new Promise(function (r) { setTimeout(r, 200); });
  }
  return document.querySelectorAll('#mi-az-grid [data-az-thumb]').length + ' thumbs';
})()
"""

COUNTS = r"""
(function(){
  var thumbs = document.querySelectorAll('#mi-az-grid [data-az-thumb]');
  var hosts = document.querySelectorAll('#mi-az-grid [data-az-lazy-host]');
  var frames = document.querySelectorAll('#mi-az-grid .mi-pane-frame');
  var live = 0, src = 0;
  frames.forEach(function(f){ if (f.getAttribute('src')) src++; });
  hosts.forEach(function(h){ if (h.dataset.azLive === '1') live++; });
  return {
    thumbs: thumbs.length,
    hosts: hosts.length,
    frames: frames.length,
    src: src,
    live: live
  };
})()
"""

SCROLL = r"""
(function(){
  var sc = document.getElementById('agent-main-scroll');
  if (!sc) return false;
  sc.scrollTop = sc.scrollHeight;
  return sc.scrollTop;
})()
"""

CLIP = r"""
(function(){
  var grid = document.getElementById('mi-az-grid');
  var sec = document.getElementById('mi-analytics');
  var el = grid || sec;
  if (!el) return null;
  var sc = document.getElementById('agent-main-scroll');
  if (sc && sec) {
    var c = sec.getBoundingClientRect();
    var s = sc.getBoundingClientRect();
    sc.scrollTop += (c.top - s.top) - 8;
  }
  var r = el.getBoundingClientRect();
  var head = sec && sec.querySelector(':scope > .mi-module-head');
  var hr = head ? head.getBoundingClientRect() : r;
  return {
    x: Math.max(0, Math.min(hr.left, r.left) - 8),
    y: Math.max(0, hr.top - 8),
    w: Math.min(Math.max(hr.width, r.width) + 16, window.innerWidth - 16),
    h: Math.min(720, window.innerHeight - Math.max(0, hr.top - 8))
  };
})()
"""


def shot(b, clip, name):
    os.makedirs(OUT, exist_ok=True)
    res = b.cmd("Page.captureScreenshot", {"format": "png", "clip": {
        "x": clip["x"], "y": clip["y"], "width": clip["w"], "height": clip["h"], "scale": 2}})
    path = os.path.join(OUT, "allmod-az-lazy__%s.png" % name)
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(res["result"]["data"]))
    print("shot", path)
    return path


def run_theme(theme):
    b = Browser(port=9414 if theme == "light" else 9415, width=1440, height=1100, out=OUT)
    try:
        dark = "document.documentElement.classList.add('dark');" if theme == "dark" else ""
        b.on_new_document(
            "try{localStorage.clear();"
            "localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,name:'Arthur Krupsky',"
            "email:'akrupsky@wisecode.ai',initials:'AK'}));"
            "localStorage.setItem('wise-theme','%s');"
            "localStorage.setItem('chat-theme','%s');}catch(e){}"
            "%s" % (theme, theme, dark))
        b.goto(URL, ready="document.readyState==='complete'", timeout=60.0, settle=1.6)
        for _ in range(40):
            time.sleep(0.3)
            if b.js("!!document.getElementById('mi-analytics')"):
                break
        print(theme, "open:", b.js(OPEN))
        t0 = time.time()
        instant = b.js(COUNTS)
        print(theme, "instant", "%.2fs" % (time.time() - t0), instant)
        time.sleep(1.2)
        after = b.js(COUNTS)
        print(theme, "after 1.2s", after)
        clip = b.js(CLIP)
        print(theme, "clip", clip)
        if clip:
            shot(b, clip, theme)
        b.js(SCROLL)
        time.sleep(1.4)
        scrolled = b.js(COUNTS)
        print(theme, "after scroll", scrolled)
        ok = (
            instant and after
            and instant["thumbs"] >= 20
            and instant["frames"] <= AZ_CAP
            and after["src"] <= AZ_CAP_AFTER
            and after["src"] < after["thumbs"]
            and after["src"] >= 1
        )
        print(theme, "PASS" if ok else "FAIL")
        return 0 if ok else 1
    finally:
        b.close()


# Instant: no iframe in the markup, so frames should be 0–3 (first pump).
# After a beat: only the in-view + look-ahead row, never the whole gallery.
AZ_CAP = 6
AZ_CAP_AFTER = 16


def main():
    failed = 0
    for theme in ("light", "dark"):
        failed += run_theme(theme)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
