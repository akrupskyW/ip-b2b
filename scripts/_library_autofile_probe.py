"""Check that work done on wiseai.html files itself onto the Library shelf.

Runs a real turn — clicks a welcome scorecard, lets the answer and its outputs
land — then reads the shelf out of localStorage. A finished conversation must be
there as one card, and every output the turn surfaced must be there as its own.

    python3 scripts/_library_autofile_probe.py

Needs a static server on 8099 and Chrome.
"""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys

PORT = 9335
URL = "http://localhost:8099/pages/wiseai.html"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
    "--hide-scrollbars", "--window-size=1600,1150",
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
    if r.get("result", {}).get("exceptionDetails"):
        return "EXC: " + json.dumps(r["result"]["exceptionDetails"])[:300]
    return r.get("result", {}).get("result", {}).get("value")


BASE_INIT = """
window.__errs=[];
addEventListener('error',e=>{__errs.push((e.message||'')+' @ '+(e.filename||'')+':'+(e.lineno||''))});
addEventListener('unhandledrejection',e=>{__errs.push('promise: '+((e.reason&&e.reason.message)||e.reason))});
try {
  localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Demo User',
    email:'demo@wisealliance.com',title:'Product Intelligence Lead',org:'WISE Foods',
    initials:'DU',at:new Date().toISOString()}));
  localStorage.setItem('wise-walkthrough', JSON.stringify({v:1,completed:true,dismissed:true,
    doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));
} catch(e) {}
"""

cmd("Page.enable")
cmd("Runtime.enable")
# Start from an empty shelf — but only for the first load. The whole point of
# the second half is that what the first half filed is still there.
first = cmd("Page.addScriptToEvaluateOnNewDocument", {"source": BASE_INIT + """
try {
  localStorage.removeItem('wise-lib-filed');
  localStorage.removeItem('wise-chat-history:wiseai');
} catch(e) {}
"""})

cmd("Page.navigate", {"url": URL})
time.sleep(4.0)
print("shelf_before:", js("(JSON.parse(localStorage.getItem('wise-lib-filed')||'[]')).length"))

print("card_click:", js(
    "(function(){var b=Array.from(document.querySelectorAll('.ws-scorecard[data-card]'))"
    ".find(function(c){return /compare a few products/i.test(c.textContent)});"
    "if(!b) return 'no-card'; b.click(); return 'clicked';})()"))

# The turn has to finish: answer streams, then its outputs land, then chips trail.
time.sleep(16.0)

# A second turn that produces a written report, so the shelf gets one of those too.
print("report_chip:", js(
    "(function(){var c=Array.from(document.querySelectorAll('#wa-chat .chip, #wa-chat .ws-intent-chip'))"
    ".filter(function(e){return !e.disabled && /pretty report/i.test(e.textContent)});"
    "if(!c.length) return 'no-chip'; c[c.length-1].click(); return 'clicked';})()"))
time.sleep(16.0)

# A report the member composes by hand must file itself too: open an output,
# pick two slides out of the title dropdown, generate.
print("open_output:", js(
    "(function(){var c=document.querySelector('#wa-chat .sc-surface-card[data-surface]');"
    "if(!c) return 'no-chip'; c.click(); return 'clicked';})()"))
time.sleep(1.5)
print("titledrop:", js(
    "(function(){var h=document.querySelector('#wa-unified .wa-pane-mast-head');"
    "if(!h) return 'no-head'; h.click(); return 'clicked';})()"))
time.sleep(0.8)
print("pick_two:", js(
    "(function(){var p=Array.from(document.querySelectorAll('.wa-titledrop-pop [data-td-plus]'));"
    "if(p.length<2) return 'only '+p.length; p[0].click(); p[1].click(); return 'picked';})()"))
time.sleep(0.5)
print("generate:", js(
    "(function(){var b=document.querySelector('.wa-titledrop-pop [data-td-report]');"
    "if(!b) return 'no-btn'; b.click(); return 'clicked';})()"))
time.sleep(2.5)

print("shelf:", js(
    "JSON.parse(localStorage.getItem('wise-lib-filed')||'[]')"
    ".map(function(i){return i.type+' | '+i.title+' | art:'+((i.html||'').length)}).join('\\n')"))
print("errors:", js("(window.__errs||[]).join(' || ')") or "(none)")

# The same work must now be on the shelf, and the shelf must open it.
cmd("Page.removeScriptToEvaluateOnNewDocument",
    {"identifier": first["result"]["identifier"]})
cmd("Page.addScriptToEvaluateOnNewDocument", {"source": BASE_INIT})
cmd("Page.navigate", {"url": "http://localhost:8099/pages/conversation-library.html"})
time.sleep(4.0)
print("lib_cards:", js("document.querySelectorAll('#lib-grid .lib-card').length"))
print("lib_filed_cards:", js(
    "Array.from(document.querySelectorAll('#lib-grid .lib-card[data-filed]')).map(function(c){"
    "return c.dataset.libType+' | '+((c.querySelector('.lib-cname')||{}).textContent"
    "||'(no title)')}).join('\\n')"))
print("lib_counts:", js(
    "Array.from(document.querySelectorAll('.lib-stat[data-stat]')).map(b=>"
    "b.querySelector('.lib-stat-label').textContent.trim()+'='+"
    "b.querySelector('.lib-stat-num').textContent).join('  ')"))

out = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "screenshots", "_diag"))
os.makedirs(out, exist_ok=True)


def shot(name):
    path = os.path.join(out, "lib-autofile__%s.png" % name)
    r = cmd("Page.captureScreenshot", {"format": "png"})
    open(path, "wb").write(base64.b64decode(r["result"]["data"]))
    print("wrote", path)


shot("shelf")
print("open_filed_output:", js(
    "(function(){var c=document.querySelector('#lib-grid .lib-card[data-lib-type=\"dashboard\"][data-filed]');"
    "if(!c) return 'no-card'; c.click(); return 'clicked';})()"))
time.sleep(1.0)
print("viewer_title:", js("(document.querySelector('[data-lib-vtitle]')||{}).textContent"))
shot("viewer-filed-output")
js("(document.querySelector('.lib-viewer-close')||{click:function(){}}).click()")
time.sleep(0.4)
print("open_filed_chat:", js(
    "(function(){var c=document.querySelector('#lib-grid .lib-card[data-lib-type=\"chat\"][data-filed]');"
    "if(!c) return 'no-card'; c.click(); return 'clicked';})()"))
time.sleep(2.0)
print("chat_lines:", js("document.querySelectorAll('#wiseai-dock-panel .sc-line').length"))
shot("chat-refiled")
print("errors:", js("(window.__errs||[]).join(' || ')") or "(none)")
proc.terminate()
print("done")
