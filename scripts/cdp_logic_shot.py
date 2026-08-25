"""Screenshot the new App Logic module on pages/all-modules.html in both themes.

Dependency-free Chrome DevTools driver (same approach as scripts/cdp_shot.py).
Forces auth + theme via localStorage before the page boots, expands the App
Logic accordion section, and captures it in light and dark mode.

Usage: python3 scripts/cdp_logic_shot.py [port]
"""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys

CDP_PORT = 9344
HTTP_PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8099
URL = "http://localhost:%d/pages/all-modules.html" % HTTP_PORT
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
    "--hide-scrollbars", "--window-size=1600,1400",
    "--remote-debugging-port=%d" % CDP_PORT, "about:blank"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def ws_connect(url):
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
        data = json.load(urllib.request.urlopen("http://127.0.0.1:%d/json" % CDP_PORT))
        pages = [t for t in data if t.get("type") == "page"]
        if pages:
            target = pages[0]
            break
    except Exception:
        pass
    time.sleep(0.2)
if not target:
    print("no devtools target")
    proc.terminate()
    sys.exit(1)

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
    r = cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True})
    return r.get("result", {}).get("result", {}).get("value")


cmd("Page.enable")
cmd("Runtime.enable")

AUTH = ("localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Arthur Krupsky',"
        "email:'akrupsky@wisecode.ai',initials:'AK'}));")
ERRS = ("window.__errs=[];addEventListener('error',e=>{__errs.push((e.message||'')+' @ '+(e.filename||'')+':'+(e.lineno||''))});"
        "addEventListener('unhandledrejection',e=>{__errs.push('promise: '+(e.reason&&e.reason.message||e.reason))});")


def boot(theme):
    setup = AUTH + ERRS + (
        "localStorage.setItem('wise-theme','%s');localStorage.setItem('chat-theme','%s');" % (theme, theme))
    cmd("Page.addScriptToEvaluateOnNewDocument", {"source": setup})
    cmd("Page.navigate", {"url": URL + "#mi-logic"})
    time.sleep(3.5)


def capture(name, theme):
    boot(theme)
    print("[%s] section present:" % theme, js("!!document.getElementById('mi-logic')"))
    print("[%s] pages:" % theme, js("document.querySelectorAll('#mi-logic [data-logic-page]').length"))
    print("[%s] rules:" % theme, js("document.querySelectorAll('#mi-logic [data-logic-rule]').length"))
    print("[%s] shown count:" % theme, js("(document.getElementById('mi-logic-shown')||{}).textContent"))
    print("[%s] nav tile:" % theme, js("!!document.querySelector('[data-jump=\"mi-logic\"]')"))
    # Full-height capture of just the module so the rules are legible.
    h = js("Math.min(6000, Math.ceil(document.getElementById('mi-logic').getBoundingClientRect().height) + 120)")
    cmd("Emulation.setDeviceMetricsOverride",
        {"width": 1600, "height": int(h or 1400), "deviceScaleFactor": 1, "mobile": False})
    time.sleep(1.2)
    js("document.getElementById('mi-logic').scrollIntoView({block:'start'})")
    time.sleep(1.0)
    r = cmd("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True})
    img = base64.b64decode(r["result"]["data"])
    open(name, "wb").write(img)
    print("[%s] wrote %s (%d bytes)" % (theme, name, len(img)))
    print("[%s] errors:" % theme, js("(window.__errs||[]).join(' || ')"))
    cmd("Emulation.clearDeviceMetricsOverride")


capture("/tmp/wise-app-logic-light.png", "light")
capture("/tmp/wise-app-logic-dark.png", "dark")

proc.terminate()
print("done")
