"""Drive wiseai.html to the generated-report layout and screenshot it.

Runs the real path: click the "Build me a report" welcome scorecard, let the
transcript stream and surface its outputs, open the Output titledrop, add every
output to the report, then hit Generate Report. Captures the resulting two-drawer
layout in light and dark and prints the pane width tiers that landed.

Usage: python3 scripts/cdp_report_double.py [light|dark]
"""
import json, socket, base64, struct, os, subprocess, sys, time, urllib.request

PORT = 9337
URL = "http://localhost:8765/pages/wiseai.html"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
MODE = (sys.argv[1] if len(sys.argv) > 1 else "light").lower()
PROFILE = "/tmp/cdp_report_double_profile_" + MODE

proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
    "--hide-scrollbars", "--window-size=1600,1150",
    "--user-data-dir=" + PROFILE,
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
for _ in range(60):
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
    print("no devtools target"); proc.terminate(); sys.exit(1)

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
    r = cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True,
                                 "awaitPromise": True})
    res = r.get("result", {})
    if res.get("exceptionDetails"):
        return "JS-ERROR: " + json.dumps(res["exceptionDetails"])[:400]
    return res.get("result", {}).get("value")


def shot(path):
    r = cmd("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
    img = base64.b64decode(r["result"]["data"])
    open(path, "wb").write(img)
    print("wrote", path, len(img), "bytes")


cmd("Page.enable")
cmd("Runtime.enable")
theme = "dark" if MODE == "dark" else "light"
cmd("Page.addScriptToEvaluateOnNewDocument", {"source":
    "window.__errs=[];addEventListener('error',e=>{__errs.push((e.message||'')+' @ '+(e.filename||'')+':'+(e.lineno||''))});"
    "addEventListener('unhandledrejection',e=>{__errs.push('promise: '+(e.reason&&e.reason.message||e.reason))});"
    "try{localStorage.setItem('wise-auth','1');localStorage.setItem('wise-theme','%s');"
    "localStorage.setItem('chat-theme','%s');}catch(e){}"
    "document.addEventListener('DOMContentLoaded',function(){"
    "document.documentElement.classList.toggle('dark', %s);});" % (theme, theme, "true" if theme == "dark" else "false")})

cmd("Page.navigate", {"url": URL})
time.sleep(3.5)

print("screen_width:", js("window.screen.width"))
print("cards:", js("Array.from(document.querySelectorAll('.ws-scorecard[data-card]'))"
                   ".map(c=>(c.textContent||'').trim().slice(0,40)).join(' | ')"))

clicked = js("(function(){var cards=Array.from(document.querySelectorAll('.ws-scorecard[data-card]'));"
             "var c=cards.find(function(x){return /report/i.test(x.textContent||'')});"
             "if(!c)return 'no-report-card';c.click();return 'clicked '+(c.textContent||'').trim().slice(0,40);})()")
print("card_click:", clicked)

# Let the transcript stream out and both outputs land in the Output pane.
for _ in range(40):
    time.sleep(1.0)
    n = js("document.querySelectorAll('#wa-unified-body > .wa-block').length")
    if isinstance(n, int) and n >= 2:
        break
print("output_blocks:", js("document.querySelectorAll('#wa-unified-body > .wa-block').length"))
time.sleep(2.0)
shot("/tmp/report_double_%s_1_output.png" % MODE)
print("unified_tier_before:", js("window.WPaneWidth.tierOfEl(document.getElementById('wa-unified'))"))

opened = js("(function(){var h=document.querySelector('#wa-unified .wa-pane-mast-head');"
            "if(!h)return 'no-mast';h.click();return !!document.querySelector('.wa-titledrop-pop');})()")
print("titledrop_open:", opened)
time.sleep(0.8)

print("plus_count:", js("document.querySelectorAll('.wa-titledrop-pop [data-td-plus]').length"))
js("document.querySelectorAll('.wa-titledrop-pop [data-td-plus]').forEach(function(b){b.click()})")
time.sleep(0.6)
gen = js("(function(){var b=document.querySelector('.wa-titledrop-pop [data-td-report]');"
         "if(!b)return 'no-gen-btn';b.click();return 'generated';})()")
print("generate:", gen)
time.sleep(2.5)

print("report_open:", js("document.getElementById('wa-report').classList.contains('is-open')"))
print("report_tier:", js("window.WPaneWidth.tierOfEl(document.getElementById('wa-report'))"))
print("report_px:", js("Math.round(document.getElementById('wa-report').getBoundingClientRect().width)"))
print("report_btn_title:", js("(document.querySelector('[data-pane-width=\"report\"]')||{}).title"))
print("unified_tier:", js("window.WPaneWidth.tierOfEl(document.getElementById('wa-unified'))"))
print("unified_px:", js("Math.round(document.getElementById('wa-unified').getBoundingClientRect().width)"))
print("unified_btn_title:", js("(document.querySelector('[data-pane-width=\"unified\"]')||{}).title"))
shot("/tmp/report_double_%s_2_report.png" % MODE)

# default-fill runs off row mutations — confirm it does not claw Output back to fill.
time.sleep(3.5)
print("after_settle_unified_tier:", js("window.WPaneWidth.tierOfEl(document.getElementById('wa-unified'))"))
print("after_settle_report_tier:", js("window.WPaneWidth.tierOfEl(document.getElementById('wa-report'))"))
print("after_settle_report_px:", js("Math.round(document.getElementById('wa-report').getBoundingClientRect().width)"))
shot("/tmp/report_double_%s_3_settled.png" % MODE)
print("errors:", js("(window.__errs||[]).join(' || ')"))

proc.terminate()
print("done", MODE)
