"""Drive the WISEcodeAI Library the way a member does and check the result.

Every card on the shelf is meant to open the thing it is a picture of, so this
loads the page, reports what the score cards actually count, then taps a report
card (the viewer must open with that report's contents) and a chat card (the
conversation must come back in the chat module). Runs in both themes and
screenshots each step, so a dark-mode regression cannot slip through.

    python3 scripts/_library_probe.py [light|dark]

Needs a static server on 8099 and Chrome. Screenshots land in screenshots/_diag.
"""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys

PORT = 9334
THEME = (sys.argv[1] if len(sys.argv) > 1 else "light").lower()
URL = "http://localhost:8099/pages/conversation-library.html"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT = os.path.join(os.path.dirname(__file__), "..", "screenshots", "_diag")
os.makedirs(OUT, exist_ok=True)

proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
    "--hide-scrollbars", "--window-size=1600,1250",
    "--remote-debugging-port=%d" % PORT, "about:blank"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def ws_connect(url):
    hostport, path = url[5:].split("/", 1)
    host, port = hostport.split(":")
    s = socket.create_connection((host, int(port)))
    key = base64.b64encode(os.urandom(16)).decode()
    s.sendall(("GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
               "Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n"
               % (path, hostport, key)).encode())
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
for _ in range(50):
    try:
        data = json.load(urllib.request.urlopen("http://127.0.0.1:%d/json" % PORT))
        pages = [t for t in data if t.get("type") == "page"]
        if pages:
            target = pages[0]
            break
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
    r = cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True})
    res = r.get("result", {}).get("result", {})
    if r.get("result", {}).get("exceptionDetails"):
        return "EXC: " + json.dumps(r["result"]["exceptionDetails"])[:400]
    return res.get("value")


def shot(name):
    path = os.path.abspath(os.path.join(OUT, "lib-open__%s__%s.png" % (name, THEME)))
    r = cmd("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True})
    open(path, "wb").write(base64.b64decode(r["result"]["data"]))
    print("wrote", path)
    return path


cmd("Page.enable")
cmd("Runtime.enable")
cmd("Page.addScriptToEvaluateOnNewDocument", {"source": """
window.__errs=[];
addEventListener('error',e=>{__errs.push((e.message||'')+' @ '+(e.filename||'')+':'+(e.lineno||''))});
addEventListener('unhandledrejection',e=>{__errs.push('promise: '+((e.reason&&e.reason.message)||e.reason))});
try {
  localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Demo User',
    email:'demo@wisealliance.com',title:'Product Intelligence Lead',org:'WISE Foods',
    initials:'DU',at:new Date().toISOString()}));
  localStorage.setItem('wise-walkthrough', JSON.stringify({v:1,completed:true,dismissed:true,
    doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));
  localStorage.setItem('wise-theme',%(t)r);
  localStorage.setItem('chat-theme',%(t)r);
  localStorage.removeItem('wise-lib-folders');
  localStorage.removeItem('wise-lib-copies');
  localStorage.removeItem('wise-lib-filed');
} catch(e) {}
""" % {"t": THEME}})

cmd("Page.navigate", {"url": URL})
time.sleep(4.0)

print("theme_dark:", js("document.documentElement.classList.contains('dark')"))
print("cards:", js("document.querySelectorAll('#lib-grid .lib-card').length"))
print("scorecards:", js(
    "Array.from(document.querySelectorAll('.lib-stat[data-stat]')).map(b=>"
    "b.querySelector('.lib-stat-label').textContent.trim()+'='+"
    "b.querySelector('.lib-stat-num').textContent).join('  ')"))
print("errors:", js("(window.__errs||[]).join(' || ')") or "(none)")
shot("shelf")

# A report card must open the viewer showing that report.
print("report_click:", js(
    "(function(){var c=Array.from(document.querySelectorAll('#lib-grid .lib-card'))"
    ".find(function(e){return /private label/i.test(e.textContent)});"
    "if(!c) return 'no-card'; c.click(); return 'clicked';})()"))
time.sleep(1.2)
print("viewer_open:", js("!!document.querySelector('.lib-viewer:not([hidden])')"))
print("viewer_title:", js("(document.querySelector('[data-lib-vtitle]')||{}).textContent"))
print("viewer_blocks:", js("document.querySelectorAll('.lib-viewer-body .lib-art-panel').length"))
shot("viewer-report")

js("(document.querySelector('.lib-viewer-close')||{click:function(){}}).click()")
time.sleep(0.5)

# A reference card opens as the paper.
print("ref_click:", js(
    "(function(){var c=Array.from(document.querySelectorAll('#lib-grid .lib-card'))"
    ".find(function(e){return /umbrella review/i.test(e.textContent)});"
    "if(!c) return 'no-card'; c.click(); return 'clicked';})()"))
time.sleep(1.0)
print("viewer_title:", js("(document.querySelector('[data-lib-vtitle]')||{}).textContent"))
shot("viewer-ref")
js("(document.querySelector('.lib-viewer-close')||{click:function(){}}).click()")
time.sleep(0.4)

# An MCP card opens as the tool call it was.
print("mcp_click:", js(
    "(function(){var c=Array.from(document.querySelectorAll('#lib-grid .lib-card'))"
    ".find(function(e){return /natto/i.test(e.textContent) && /MCP/.test(e.textContent)});"
    "if(!c) return 'no-card'; c.click(); return 'clicked';})()"))
time.sleep(1.0)
print("viewer_title:", js("(document.querySelector('[data-lib-vtitle]')||{}).textContent"))
shot("viewer-mcp")
js("(document.querySelector('.lib-viewer-close')||{click:function(){}}).click()")
time.sleep(0.4)

# A chat card must come back in the chat module, not the viewer.
print("chat_click:", js(
    "(function(){var c=Array.from(document.querySelectorAll('#lib-grid .lib-card'))"
    ".find(function(e){return /one point away from being/i.test(e.textContent)});"
    "if(!c) return 'no-card'; c.click(); return 'clicked';})()"))
time.sleep(2.0)
print("chat_lines:", js("document.querySelectorAll('#wiseai-dock-panel .sc-line').length"))
print("viewer_still_shut:", js("!document.querySelector('.lib-viewer:not([hidden])')"))
shot("chat-restored")

print("errors:", js("(window.__errs||[]).join(' || ')") or "(none)")
proc.terminate()
print("done")
