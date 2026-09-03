"""CDP driver for the Analytics Types chart palette.

Loads pages/analytics-types.html, waits real wall-clock time so the dashboard
body, the variation charts, and every count-up settle, then exercises the
palette: launcher toggle, the three chart sizes, drag, and the skinny-bar
switch. Shoots light and dark. No dependencies.

Usage:  python3 scripts/cdp_palette_shot.py [light|dark] [fresh|restore]

`restore` seeds a saved seat, a saved Small size, and a collapsed palette before
the first paint, to prove the stored state lands before the charts first draw
rather than resizing them after.
"""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys

PORT = 9337
THEME = (sys.argv[1] if len(sys.argv) > 1 else "light").lower()
MODE = (sys.argv[2] if len(sys.argv) > 2 else "fresh").lower()
URL = "http://localhost:8765/pages/analytics-types.html"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT = "/tmp/palette_" + THEME + ("" if MODE == "fresh" else "_" + MODE)

SEED_FRESH = """
  localStorage.removeItem('az-palette-pos');
  localStorage.removeItem('az-palette-open');
  localStorage.removeItem('az-chart-size');
  localStorage.setItem('az-skinny-bars','0');
"""
SEED_RESTORE = """
  localStorage.setItem('az-palette-pos', JSON.stringify({left:120,top:90}));
  localStorage.setItem('az-palette-open','0');
  localStorage.setItem('az-chart-size','s');
  localStorage.setItem('az-skinny-bars','1');
"""

proc = subprocess.Popen(
    [CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
     "--window-size=1600,1150", "--remote-debugging-port=%d" % PORT, "about:blank"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def ws_connect(url):
    assert url.startswith("ws://")
    hostport, path = url[5:].split("/", 1)
    host, port = hostport.split(":")
    s = socket.create_connection((host, int(port)))
    key = base64.b64encode(os.urandom(16)).decode()
    s.sendall(("GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\n"
               "Connection: Upgrade\r\nSec-WebSocket-Key: %s\r\n"
               "Sec-WebSocket-Version: 13\r\n\r\n" % (path, hostport, key)).encode())
    resp = b""
    while b"\r\n\r\n" not in resp:
        resp += s.recv(4096)
    return s


def ws_send(s, data):
    payload = data.encode()
    hdr = bytearray([0x81])
    n = len(payload)
    mask = os.urandom(4)
    if n < 126:
        hdr.append(0x80 | n)
    elif n < 65536:
        hdr.append(0x80 | 126); hdr += struct.pack(">H", n)
    else:
        hdr.append(0x80 | 127); hdr += struct.pack(">Q", n)
    hdr += mask
    s.sendall(bytes(hdr) + bytes(b ^ mask[i % 4] for i, b in enumerate(payload)))


def ws_recv(s):
    def rd(n):
        b = b""
        while len(b) < n:
            c = s.recv(n - len(b))
            if not c:
                raise IOError("closed")
            b += c
        return b
    _b0, b1 = rd(2)
    ln = b1 & 0x7f
    if ln == 126:
        ln = struct.unpack(">H", rd(2))[0]
    elif ln == 127:
        ln = struct.unpack(">Q", rd(8))[0]
    return rd(ln).decode("utf-8", "replace")


target = None
for _ in range(60):
    try:
        data = json.load(urllib.request.urlopen("http://127.0.0.1:%d/json" % PORT))
        pages = [t for t in data if t.get("type") == "page"]
        if pages:
            target = pages[0]; break
    except Exception:
        pass
    time.sleep(0.2)
if not target:
    print("no target"); proc.terminate(); sys.exit(1)

ws = ws_connect(target["webSocketDebuggerUrl"])
_id = [0]


def cmd(method, params=None):
    _id[0] += 1
    mid = _id[0]
    ws_send(ws, json.dumps({"id": mid, "method": method, "params": params or {}}))
    while True:
        msg = json.loads(ws_recv(ws))
        if msg.get("id") == mid:
            return msg


def js(expr):
    r = cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
    res = r.get("result", {})
    if "exceptionDetails" in res:
        return "JS-ERROR: " + json.dumps(res["exceptionDetails"])[:400]
    return res.get("result", {}).get("value")


def shot(name):
    r = cmd("Page.captureScreenshot", {"format": "png"})
    path = "%s_%s.png" % (OUT, name)
    open(path, "wb").write(base64.b64decode(r["result"]["data"]))
    print("wrote", path)


cmd("Page.enable")
cmd("Runtime.enable")
cmd("Page.addScriptToEvaluateOnNewDocument", {"source": """
window.__errs=[];
addEventListener('error',e=>{__errs.push((e.message||'')+' @ '+(e.filename||'').split('/').pop()+':'+(e.lineno||''))});
addEventListener('unhandledrejection',e=>{__errs.push('promise: '+(e.reason&&e.reason.message||e.reason))});
try {
  localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Arthur Krupsky',
    email:'akrupsky@wisecode.ai',title:'Product Intelligence Lead',org:'WISE Foods',
    initials:'AK',at:new Date().toISOString()}));
  localStorage.setItem('wise-theme', %r);
  localStorage.setItem('chat-theme', %r);
  localStorage.setItem('wise-walkthrough', JSON.stringify({v:1,completed:true,dismissed:true,
    doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));
  %s
} catch (e) {}
""" % (THEME, THEME, SEED_FRESH if MODE == "fresh" else SEED_RESTORE)})

cmd("Page.navigate", {"url": URL})

if MODE == "restore":
    time.sleep(6.0)
    print("theme_dark:", js("document.documentElement.classList.contains('dark')"))
    print("size_attr (want s):", js("document.body.getAttribute('data-az-chart-size')"))
    print("collapsed (want True):", js("document.getElementById('az-palette').hidden"))
    print("launcher_shown (want True):", js("!document.getElementById('az-palette-launch').hidden"))
    print("skinny (want True):", js("document.body.classList.contains('az-skinny-bars')"))
    print("stage width (want ~0.58x):",
          js("(function(){var s=document.querySelector('#atx-line-card .atx-stage');"
             "return s?Math.round(s.getBoundingClientRect().width):-1;})()"))
    shot("10_restored_collapsed")
    js("document.getElementById('az-palette-launch').click()")
    time.sleep(0.8)
    print("reopened at saved seat:",
          js("(function(){var p=document.getElementById('az-palette');"
             "return p.style.left+' / '+p.style.top;})()"))
    print("errors:", js("(window.__errs||[]).join(' || ')") or "(none)")
    shot("11_restored_open")
    proc.terminate()
    print("done")
    sys.exit(0)

time.sleep(6.0)   # dashboard body + matrix + 24 chart cards + count-ups

print("theme_dark:", js("document.documentElement.classList.contains('dark')"))
print("palette_exists:", js("!!document.getElementById('az-palette')"))
print("palette_open:", js("(function(){var p=document.getElementById('az-palette');return p&&!p.hidden;})()"))
print("launch_hidden:", js("(function(){var b=document.getElementById('az-palette-launch');return b&&b.hidden;})()"))
print("nav_items:", js("document.querySelectorAll('#az-palette .azp-item').length"))
print("size_btns:", js("Array.from(document.querySelectorAll('.azp-size')).map(b=>b.textContent+':'+b.getAttribute('aria-pressed')).join(' ')"))
print("body_size_attr:", js("document.body.getAttribute('data-az-chart-size')"))
print("old_rail_gone:", js("!document.getElementById('az-nav')"))
print("seat:", js("(function(){var p=document.getElementById('az-palette');var r=p.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)].join(',');})()"))
print("errors:", js("(window.__errs||[]).join(' || ')") or "(none)")
shot("01_open_large")

# Jump to a chart-heavy section so the size change is visible.
js("(function(){var b=Array.from(document.querySelectorAll('.azp-item'))"
   ".find(e=>/WISEscore Over Time/.test(e.textContent));if(b)b.click();})()")
time.sleep(2.0)
print("active_item:", js("(document.querySelector('.azp-item.is-active')||{}).textContent"))
shot("02_jumped")

for sid, label in (("s", "03_small"), ("m", "04_medium"), ("l", "05_large")):
    js("document.querySelector('.azp-size[data-azp-size=\"%s\"]').click()" % sid)
    time.sleep(2.2)   # transition + the 300ms replay + the entrance sweep
    w = js("(function(){var s=document.querySelector('#atx-line-card .atx-stage');"
           "return s?Math.round(s.getBoundingClientRect().width):-1;})()")
    print("size %s -> stage width %s, attr %s" % (sid, w, js("document.body.getAttribute('data-az-chart-size')")))
    shot(label)

# Skinny bars
js("document.querySelector('.azp-switch').click()")
time.sleep(0.8)
print("skinny_on:", js("document.body.classList.contains('az-skinny-bars')"))
print("score_chips:", js("document.querySelectorAll('.az-score-chip').length"))
js("document.querySelector('.azp-switch').click()")
time.sleep(0.4)
print("skinny_off:", js("document.body.classList.contains('az-skinny-bars')"))

# Drag the head, then confirm the seat persisted.
js("""(function(){
  var card=document.getElementById('az-palette');
  var head=card.querySelector('.azp-head');
  var r=head.getBoundingClientRect();
  var x=Math.round(r.left+r.width/2), y=Math.round(r.top+8);
  function pe(t,cx,cy){return new PointerEvent(t,{bubbles:true,cancelable:true,clientX:cx,clientY:cy,button:0,pointerId:1});}
  head.dispatchEvent(pe('pointerdown',x,y));
  document.dispatchEvent(pe('pointermove',x-380,y+40));
  document.dispatchEvent(pe('pointermove',x-420,y+60));
  document.dispatchEvent(pe('pointerup',x-420,y+60));
})()""")
time.sleep(0.6)
print("after_drag:", js("(function(){var p=document.getElementById('az-palette');return p.style.left+' / '+p.style.top;})()"))
print("saved_pos:", js("localStorage.getItem('az-palette-pos')"))
shot("06_dragged")

# Collapse to the launcher.
js("document.querySelector('.azp-close').click()")
time.sleep(0.5)
print("collapsed:", js("document.getElementById('az-palette').hidden"),
      "launcher_back:", js("!document.getElementById('az-palette-launch').hidden"))
shot("07_collapsed")

print("final_errors:", js("(window.__errs||[]).join(' || ')") or "(none)")
proc.terminate()
print("done")
