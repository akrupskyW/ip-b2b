"""Shoot the table specimens on pages/analytics-types.html, clipped to the card.

Frames the report to a palette preset, scrolls each named specimen in, waits
real wall-clock time for the entrance sweep and the count-ups to settle, then
captures just that card.

Usage:  python3 scripts/_attb_shot.py [light|dark] [s|t|m|l] [card-substring ...]

`size` is a palette preset id: s (Mobile), t (Tablet), m (Laptop), l (Desktop).
With no card arguments it shoots every specimen.
"""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys

PORT = 9361
args = list(sys.argv[1:])
THEME = args.pop(0).lower() if args and args[0].lower() in ("light", "dark") else "light"
SIZE = args.pop(0).lower() if args and args[0].lower() in ("s", "t", "m", "l") else "s"
WANT = [a.lower() for a in args]
URL = "http://localhost:8765/pages/analytics-types.html"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUTDIR = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"

proc = subprocess.Popen(
    [CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
     "--window-size=1900,1250", "--remote-debugging-port=%d" % PORT, "about:blank"],
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
        return "JS-ERROR: " + json.dumps(res["exceptionDetails"])[:500]
    return res.get("result", {}).get("value")


cmd("Page.enable")
cmd("Runtime.enable")
cmd("Page.addScriptToEvaluateOnNewDocument", {"source": """
try {
  localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Arthur Krupsky',
    email:'akrupsky@wisecode.ai',title:'Product Intelligence Lead',org:'WISE Foods',
    initials:'AK',at:new Date().toISOString()}));
  localStorage.setItem('wise-theme', %r);
  localStorage.setItem('chat-theme', %r);
  localStorage.setItem('wise-walkthrough', JSON.stringify({v:1,completed:true,dismissed:true,
    doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));
  localStorage.removeItem('az-palette-pos');
  localStorage.setItem('az-palette-open','0');
} catch (e) {}
""" % (THEME, THEME)})

cmd("Page.navigate", {"url": URL})
time.sleep(8.0)

# The palette is the only way to frame the report, so keep asking until the
# preset actually lands — a shot at the wrong width proves nothing.
for _ in range(10):
    js("(function(){var b=document.getElementById('az-palette-launch');"
       "if(b&&!b.hidden)b.click();})()")
    time.sleep(0.6)
    js("(function(){var b=document.querySelector('.azp-size[data-azp-size=\"%s\"]');"
       "if(b)b.click();})()" % SIZE)
    time.sleep(1.6)
    if js("document.body.getAttribute('data-az-chart-size')") == SIZE:
        break
else:
    print("!! could not frame the report to preset", SIZE)
js("(function(){var b=document.querySelector('.azp-close');if(b)b.click();})()")
time.sleep(1.2)

print("theme_dark:", js("document.documentElement.classList.contains('dark')"),
      "preset:", SIZE, "specimens:", js("document.querySelectorAll('.attb-card').length"))

os.makedirs(OUTDIR, exist_ok=True)

ids = json.loads(js("JSON.stringify(Array.from(document.querySelectorAll('.attb-card'))"
                    ".map(function(c){return c.id;}))"))
if WANT:
    ids = [i for i in ids if any(w in i.lower() for w in WANT)]

for cid in ids:
    ok = js("""(function(){
      var el = document.getElementById('%s');
      if (!el) return false;
      var sc = document.getElementById('agent-main-scroll');
      var top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 40;
      sc.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
      return true;
    })()""" % cid)
    if ok is not True:
        print("skip", cid); continue
    time.sleep(2.6)   # entrance sweep, then the count-ups
    box = json.loads(js("""(function(){
      var el = document.getElementById('%s');
      var b = el.parentElement.getBoundingClientRect();   /* .att-block, incl. eyebrow */
      return JSON.stringify({x:Math.max(0,b.left-10), y:Math.max(0,b.top-10),
                             w:Math.min(b.width+20, innerWidth), h:b.height+20});
    })()""" % cid))
    r = cmd("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True,
                                       "clip": {"x": box["x"], "y": box["y"],
                                                "width": box["w"], "height": box["h"],
                                                "scale": 1}})
    if "result" not in r or "data" not in r.get("result", {}):
        print("shot failed", cid); continue
    path = "%s/%s__%s__%s.png" % (OUTDIR, cid, SIZE, THEME)
    open(path, "wb").write(base64.b64decode(r["result"]["data"]))
    print("wrote", path)

proc.terminate()
