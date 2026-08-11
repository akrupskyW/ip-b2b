"""Minimal Chrome DevTools Protocol driver (no deps): navigate, wait real time,
optionally click by JS, and screenshot. Used to verify the ported compare board
in real wall-clock time (so JS count-up animations settle naturally)."""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys, hashlib

PORT = 9333
URL = "http://localhost:8765/pages/wiseai.html"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
    "--hide-scrollbars", "--window-size=1600,1150",
    "--remote-debugging-port=%d" % PORT, "about:blank"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def ws_connect(url):
    # url like ws://127.0.0.1:PORT/devtools/page/ID
    assert url.startswith("ws://")
    hostport, path = url[5:].split("/", 1)
    host, port = hostport.split(":")
    s = socket.create_connection((host, int(port)))
    key = base64.b64encode(os.urandom(16)).decode()
    req = ("GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
           "Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n" % (path, hostport, key))
    s.sendall(req.encode())
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
    masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
    s.sendall(bytes(hdr) + masked)

def ws_recv(s):
    def rd(n):
        b = b""
        while len(b) < n:
            c = s.recv(n - len(b))
            if not c: raise IOError("closed")
            b += c
        return b
    b0, b1 = rd(2)
    ln = b1 & 0x7f
    if ln == 126: ln = struct.unpack(">H", rd(2))[0]
    elif ln == 127: ln = struct.unpack(">Q", rd(8))[0]
    return rd(ln).decode("utf-8", "replace")

# wait for devtools endpoint
target = None
for _ in range(50):
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
def cmd(method, params=None, wait_result=True):
    _id[0] += 1
    mid = _id[0]
    ws_send(ws, json.dumps({"id": mid, "method": method, "params": params or {}}))
    if not wait_result:
        return None
    while True:
        msg = json.loads(ws_recv(ws))
        if msg.get("id") == mid:
            return msg

cmd("Page.enable")
cmd("Runtime.enable")
cmd("Page.addScriptToEvaluateOnNewDocument", {"source":
    "window.__errs=[];addEventListener('error',e=>{__errs.push((e.message||'')+' @ '+(e.filename||'')+':'+(e.lineno||''))});"
    "addEventListener('unhandledrejection',e=>{__errs.push('promise: '+(e.reason&&e.reason.message||e.reason))});"})
cmd("Page.navigate", {"url": URL})
time.sleep(2.5)  # let welcome screen + scorecards render

def shot(path):
    r = cmd("Page.captureScreenshot", {"format": "png"})
    img = base64.b64decode(r["result"]["data"])
    open(path, "wb").write(img)
    print("wrote", path, len(img), "bytes")

def js(expr):
    r = cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True})
    return r.get("result", {}).get("result", {}).get("value")

# Trigger the compare board via the real path: click the "Compare" scorecard.
# cards order: 0 upf,1 worst,2 spider,3 cupcake,4 cookie,5 compare -> data-card="5"
clicked = js("(function(){var b=document.querySelector('[data-card=\"5\"]');"
             "if(!b){return 'no-card';}b.click();return 'clicked';})()")
print("compare_click:", clicked)
time.sleep(4.0)  # let surface(660ms) + openPane + engine render + count-up settle
print("cmp_body_exists:", js("!!document.getElementById('cmp-body')"))
print("cmp_body_children:", js("(document.getElementById('cmp-body')||{}).childElementCount"))
shot("/tmp/cdp_board.png")

# Report gauge numbers actually shown (post-animation) + column order
print("gauge_nums:", js("Array.from(document.querySelectorAll('.cmp-gauge-num')).map(e=>e.textContent).join(',')"))
print("gauge_scores:", js("Array.from(document.querySelectorAll('.cmp-gauge')).map(e=>e.getAttribute('data-score')).join(',')"))
print("names:", js("Array.from(document.querySelectorAll('.cmp-ent-name')).map(e=>e.textContent).join(' | ')"))
print("errors:", js("(window.__errs||[]).join(' || ')"))

# Interaction 1: toggle Spider chart mode
js("cmpSetChartMode('radar')"); time.sleep(1.5); shot("/tmp/cdp_spider.png")
# Interaction 2: Guiding Stars on
js("cmpSetChartMode('bars'); cmpToggleGuidingStars(true)"); time.sleep(1.5); shot("/tmp/cdp_gs.png")
# Interaction 3: open metric menu
js("cmpToggleGuidingStars(false); cmpToggleMetricMenu()"); time.sleep(0.6); shot("/tmp/cdp_metricmenu.png")

proc.terminate()
print("done")
