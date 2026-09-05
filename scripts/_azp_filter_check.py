#!/usr/bin/env python3
"""Drive the chart-palette filter on pages/analytics-types.html.

Opens the palette, types a few queries, and reports the visible-row count, the
head's count caption, the empty state, and where Enter lands — then clips a
screenshot of the card per theme so the field can be eyeballed light and dark.

    python3 scripts/_azp_filter_check.py [light|dark|both]
"""

import base64
import json
import os
import subprocess
import sys
import time
import urllib.request

from websocket import create_connection

PORT = 9438
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "screenshots", "_diag")
# Served, not file:// — ES modules are blocked cross-origin on file://.
URL = "http://localhost:8765/pages/analytics-types.html"

# Signed in, walkthrough done, palette seated fresh — otherwise the page
# bounces to login and the card never mounts.
SEED = """
window.__errs=[];
addEventListener('error',function(e){__errs.push(e.message||String(e))});
try {
  localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Arthur Krupsky',
    email:'akrupsky@wisecode.ai',title:'Product Intelligence Lead',org:'WISE Foods',
    initials:'AK',at:new Date().toISOString()}));
  localStorage.setItem('wise-theme', '%s');
  localStorage.setItem('chat-theme', '%s');
  localStorage.setItem('wise-walkthrough', JSON.stringify({v:1,completed:true,dismissed:true,
    doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));
  localStorage.removeItem('az-palette-pos');
  localStorage.setItem('az-palette-open','1');
} catch (e) {}
"""


class Tab:
    def __init__(self, port):
        tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json"))
        page = [t for t in tabs if t["type"] == "page"][0]
        self.ws = create_connection(page["webSocketDebuggerUrl"], timeout=40)
        self.n = 0

    def cmd(self, method, params=None):
        self.n += 1
        self.ws.send(json.dumps({"id": self.n, "method": method, "params": params or {}}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.n:
                return msg.get("result", {})

    def js(self, expr):
        r = self.cmd("Runtime.evaluate", {
            "expression": expr, "returnByValue": True, "awaitPromise": True})
        return (r.get("result") or {}).get("value")


def launch():
    proc = subprocess.Popen(
        [CHROME, f"--remote-debugging-port={PORT}", "--headless=new",
         "--remote-allow-origins=*", "--window-size=1500,1000",
         "--user-data-dir=/tmp/_azpfilter", "--no-first-run",
         "--force-device-scale-factor=1", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(3)
    return proc


# Typing through CDP so the real `input` listener fires, not a value assignment.
# Deferred page scripts can steal focus mid-run, which silently sends the
# keystrokes somewhere else — so re-focus and retry until the field has the text.
def type_query(tab, text):
    for attempt in range(3):
        tab.js("(function(){var i=document.getElementById('azp-filter');"
               "i.focus();i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));})()")
        if tab.js("document.activeElement && document.activeElement.id") != "azp-filter":
            continue
        for ch in text:
            tab.cmd("Input.dispatchKeyEvent", {"type": "keyDown", "text": ch})
            tab.cmd("Input.dispatchKeyEvent", {"type": "keyUp"})
        time.sleep(0.35)
        if tab.js("document.getElementById('azp-filter').value") == text:
            return
    raise SystemExit(f"could not type {text!r} into the filter")


def state(tab):
    return json.loads(tab.js("""(function(){
      var rows = Array.from(document.querySelectorAll('#azp-list .azp-item'));
      var vis = rows.filter(function(b){ return !b.hidden; });
      var e = document.getElementById('azp-empty');
      var i = document.getElementById('azp-filter');
      return JSON.stringify({
        total: rows.length,
        visible: vis.length,
        count: (document.getElementById('azp-count').textContent||'').trim(),
        first: vis.length ? (vis[0].querySelector('.azp-item-label').textContent||'').trim() : '',
        empty: e.hidden ? '' : (e.textContent||'').trim(),
        clearShown: getComputedStyle(document.querySelector('.azp-clear')).display !== 'none',
        value: i.value,
        inputW: Math.round(i.getBoundingClientRect().width),
        rowInBody: !!document.querySelector('.azp-body .azp-search')
      });
    })()"""))


def shot(tab, name):
    box = tab.js("""(function(){
      var c=document.getElementById('az-palette');
      var r=c.getBoundingClientRect();
      return JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height});
    })()""")
    b = json.loads(box)
    res = tab.cmd("Page.captureScreenshot", {"format": "png", "clip": {
        "x": b["x"] - 6, "y": b["y"] - 6, "width": b["w"] + 12,
        "height": b["h"] + 12, "scale": 2}})
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ".png")
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(res["data"]))
    print("  shot:", os.path.relpath(path, ROOT))


def run(theme):
    print(f"\n===== {theme.upper()} =====")
    proc = launch()
    try:
        tab = Tab(PORT)
        tab.cmd("Page.enable")
        tab.cmd("Runtime.enable")
        tab.cmd("Page.addScriptToEvaluateOnNewDocument", {"source": SEED % (theme, theme)})
        tab.cmd("Page.navigate", {"url": URL})
        time.sleep(9)
        # The palette starts collapsed under 1180px; make sure it is open.
        tab.js("(function(){var l=document.getElementById('az-palette-launch');"
               "if(l&&!l.hidden)l.click();})()")
        time.sleep(1.0)

        base = state(tab)
        print(f"  catalog rows: {base['total']}  count caption: {base['count']!r}"
              f"  input {base['inputW']}px  inside scroll body: {base['rowInBody']}")
        if theme == "light":
            shot(tab, "azp-filter__rest")

        for q in ["donut", "table", "upf table", "admin", "account",
                  "gras", "invoice", "zzz"]:
            type_query(tab, q)
            s = state(tab)
            print(f"  {q!r:14} → {s['visible']:>3}/{s['total']}  caption {s['count']!r:10}"
                  f"  first {s['first']!r:34} clear={s['clearShown']}"
                  + (f"  empty {s['empty']!r}" if s["empty"] else ""))
            if q == "table":
                shot(tab, f"azp-filter__table__{theme}")
            if q == "zzz" and theme == "light":
                shot(tab, "azp-filter__nomatch")

        # Enter jumps to the top match.
        type_query(tab, "heat")
        before = tab.js("document.getElementById('agent-main-scroll').scrollTop")
        tab.cmd("Input.dispatchKeyEvent", {"type": "keyDown", "key": "Enter",
                                           "code": "Enter", "windowsVirtualKeyCode": 13})
        tab.cmd("Input.dispatchKeyEvent", {"type": "keyUp", "key": "Enter",
                                           "code": "Enter", "windowsVirtualKeyCode": 13})
        time.sleep(1.6)
        after = tab.js("document.getElementById('agent-main-scroll').scrollTop")
        active = tab.js("(function(){var a=document.querySelector('.azp-item.is-active');"
                        "return a?a.querySelector('.azp-item-label').textContent.trim():''})()")
        print(f"  Enter: scrollTop {before} → {after}   active {active!r}")

        # Escape clears without closing the card.
        tab.cmd("Input.dispatchKeyEvent", {"type": "keyDown", "key": "Escape",
                                           "code": "Escape", "windowsVirtualKeyCode": 27})
        tab.cmd("Input.dispatchKeyEvent", {"type": "keyUp", "key": "Escape",
                                           "code": "Escape", "windowsVirtualKeyCode": 27})
        time.sleep(0.4)
        s = state(tab)
        openness = tab.js("!document.getElementById('az-palette').hidden")
        print(f"  Escape: value {s['value']!r}  rows {s['visible']}/{s['total']}"
              f"  card still open: {openness}")

        errs = tab.js("(window.__errs||[]).join(' || ')")
        print("  errors:", errs or "(none)")
    finally:
        proc.terminate()
        time.sleep(1)


if __name__ == "__main__":
    which = (sys.argv[1] if len(sys.argv) > 1 else "both").lower()
    for t in (["light", "dark"] if which == "both" else [which]):
        run(t)
