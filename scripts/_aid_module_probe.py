"""Probe pages/ai-dashboard.html: confirm the dashboard module sits on the same
surface as its neighbours, and that its new width control actually moves the
module through single -> double -> fill -> custom.

Shoots both themes and prints the measured module width after every tap.
Usage: python3 scripts/_aid_module_probe.py [light|dark]
"""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys

PORT = 9344
URL = "http://localhost:8099/pages/ai-dashboard.html"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
THEME = (sys.argv[1] if len(sys.argv) > 1 else "light").lower()
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"

proc = subprocess.Popen(
    [CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
     "--window-size=1600,1000", "--remote-debugging-port=%d" % PORT, "about:blank"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def ws_connect(url):
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
    _, b1 = rd(2)
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


cmd("Page.enable")
cmd("Runtime.enable")
cmd("Page.addScriptToEvaluateOnNewDocument", {"source":
    "window.__errs=[];addEventListener('error',e=>{__errs.push((e.message||'')+' @ '+"
    "(e.filename||'')+':'+(e.lineno||''))});"
    "try{localStorage.setItem('wise-auth','1');localStorage.setItem('wise-theme','%s');"
    "localStorage.setItem('chat-theme','%s');"
    "localStorage.removeItem('wise-module-width-tiers-v1');}catch(e){}" % (THEME, THEME)})
cmd("Page.navigate", {"url": URL})
time.sleep(4.0)   # nav mount + charts + count-ups settle


def js(expr):
    r = cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True})
    res = r.get("result", {}).get("result", {})
    return res.get("value", res.get("description"))


def shot(name):
    path = os.path.join(OUT, name)
    r = cmd("Page.captureScreenshot", {"format": "png"})
    open(path, "wb").write(base64.b64decode(r["result"]["data"]))
    print("wrote", path)


print("theme:", THEME)
print("errors:", js("(window.__errs||[]).join(' || ')"))
print("width_btn_present:", js("!!document.getElementById('aid-dash-width')"))
print("kebab_present:", js("!!document.querySelector('.aid-top-actions .panel-more-btn')"))
print("cluster_order:", js(
    "Array.from(document.querySelector('.aid-top-actions').children)"
    ".map(e=>e.id||e.className).join(' , ')"))
print("mod_bg:", js("getComputedStyle(document.getElementById('aid-dash-card')).backgroundColor"))
print("chat_mod_bg:", js(
    "(function(){var c=document.querySelector('#aid-chat .sc-card')||document.getElementById('aid-chat');"
    "return c?getComputedStyle(c).backgroundColor:'none'})()"))
print("card_bg:", js("getComputedStyle(document.querySelector('.aid-card')).backgroundColor"))
print("page_bg:", js("getComputedStyle(document.body).backgroundColor"))

shot("aid-module__rest__%s.png" % THEME)
print("rest_width:", js(
    "Math.round(document.getElementById('aid-dash-card').getBoundingClientRect().width)"))
print("rest_classes:", js("document.getElementById('aid-dash-card').className"))


def tap():
    """A REAL tap through the Input domain. Synthetic .click() is untrusted, so
    the capture listener in pane-width.js skips it and the module never gets
    data-width-user-set. Re-locate the button every time: it lives inside the
    module, so it moves as soon as the module resizes."""
    box = json.loads(js(
        "(function(){var r=document.getElementById('aid-dash-width')"
        ".getBoundingClientRect();var x=Math.round(r.left+r.width/2),"
        "y=Math.round(r.top+r.height/2);var hit=document.elementFromPoint(x,y);"
        "return JSON.stringify({x:x,y:y,rect:[Math.round(r.left),Math.round(r.top),"
        "Math.round(r.width),Math.round(r.height)],"
        "hit:hit?(hit.id||hit.tagName+'.'+hit.className):'none'})})()"))
    print(" tap_at:", box)
    for t in ("mousePressed", "mouseReleased"):
        cmd("Input.dispatchMouseEvent", {"type": t, "x": box["x"], "y": box["y"],
                                         "button": "left", "clickCount": 1})


for i in range(5):
    tap()
    time.sleep(0.9)
    print("--- tap", i + 1, "---")
    print(" title:", js("document.getElementById('aid-dash-width').getAttribute('title')"))
    print(" width:", js(
        "Math.round(document.getElementById('aid-dash-card').getBoundingClientRect().width)"))
    print(" classes:", js("document.getElementById('aid-dash-card').className"))
    # The shell must never be wider than the card: when it was, the grids and
    # the header (with this very control) hung outside the visible module.
    print(" overflow:", js(
        "(function(){var m=document.getElementById('aid-dash-card');"
        "return m.scrollWidth>m.clientWidth+1?'OVERFLOW '+m.scrollWidth+'>'+m.clientWidth:'clean'})()"))
    shot("aid-module__tap%d__%s.png" % (i + 1, THEME))

print("errors_after:", js("(window.__errs||[]).join(' || ')"))
proc.terminate()
print("done")
