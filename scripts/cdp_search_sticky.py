"""Reproduce the sticky-drawer edge that shows through while Appearance ▸ Search
is on. Loads a flow page with Search forced on, screenshots the row, and reports
the geometry/paint order of the chat vs the module tucked to its right."""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys

PORT = 9344
BASE = "http://localhost:8099"
PAGE = os.environ.get("PAGE", "/pages/add-product.html")
DARK = os.environ.get("DARK") == "1"
OUT = os.environ.get("OUT", "/tmp/search_sticky")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
    "--hide-scrollbars", "--window-size=1600,1000",
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
theme = "dark" if DARK else "light"
cmd("Page.addScriptToEvaluateOnNewDocument", {"source": """
  try {
    localStorage.setItem('wise-auth','1');
    localStorage.setItem('wise-authed','1');
    localStorage.setItem('wise-admin-ui','1');
    localStorage.setItem('wise-app-search','1');
    localStorage.setItem('wise-theme','%s');
    localStorage.setItem('chat-theme','%s');
  } catch (e) {}
  document.documentElement.classList.add('app-search-on');
  if ('%s' === 'dark') document.documentElement.classList.add('dark');
""" % (theme, theme, theme)})
cmd("Page.navigate", {"url": BASE + PAGE})
time.sleep(4.0)


def js(expr):
    r = cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True})
    res = r.get("result", {}).get("result", {})
    if "value" in res:
        return res["value"]
    return res


def shot(path, clip=None):
    params = {"format": "png"}
    if clip:
        params["clip"] = dict(clip, scale=3)
    r = cmd("Page.captureScreenshot", params)
    img = base64.b64decode(r["result"]["data"])
    open(path, "wb").write(img)
    print("wrote", path, len(img), "bytes")


print("search_on:", js("document.documentElement.classList.contains('app-search-on')"))
print(json.dumps(js("""
(function(){
  var row = document.getElementById('modules-row');
  if (!row) return 'no row';
  var out = [];
  row.querySelectorAll('*').forEach(function(){});
  Array.prototype.forEach.call(row.children, function(el){
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    out.push({
      id: el.id, cls: String(el.className).slice(0,80),
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      z: cs.zIndex, ml: cs.marginLeft, radius: cs.borderRadius, bg: cs.backgroundColor
    });
  });
  return out;
})()
"""), indent=1))

shot(OUT + "_full.png")

# Tight crop around the chat's right edge, where the drawer shows through.
box = js("""
(function(){
  var chat = document.querySelector('#wa-chat,#rf-chat,#sa-chat,#aid-chat,#pl-chat,#ar-chat,.ap-chat,#gs-chat,#chat-shell,#wiseai-dock-panel');
  if (!chat) return null;
  var r = chat.getBoundingClientRect();
  return { x: r.right - 60, y: r.top - 12, width: 160, height: 120 };
})()
""")
print("crop:", box)
if box:
    shot(OUT + "_topedge.png", box)
    box2 = dict(box)
    box2["y"] = js("(function(){var c=document.querySelector('#wa-chat,#rf-chat,#sa-chat,#aid-chat,#pl-chat,#ar-chat,.ap-chat,#gs-chat,#chat-shell,#wiseai-dock-panel');var r=c.getBoundingClientRect();return r.bottom-108;})()")
    shot(OUT + "_bottomedge.png", box2)

print("inner_geom:", json.dumps(js("""
(function(){
  var out = [];
  document.querySelectorAll('#modules-row .sticky-mod.is-sticky').forEach(function(m){
    var mr = m.getBoundingClientRect();
    var cs = getComputedStyle(m);
    var kid = m.querySelector(':scope > .panel-inner, :scope > [class*="-inner"]');
    var kr = kid ? kid.getBoundingClientRect() : null;
    out.push({
      id: m.id || String(m.className).slice(0,40),
      wrap: [Math.round(mr.left), Math.round(mr.top), Math.round(mr.right), Math.round(mr.bottom)],
      z: cs.zIndex, padLeft: cs.paddingLeft, marLeft: cs.marginLeft,
      innerCls: kid ? String(kid.className).slice(0,40) : null,
      inner: kr ? [Math.round(kr.left), Math.round(kr.top), Math.round(kr.right), Math.round(kr.bottom)] : null,
      innerRadius: kid ? getComputedStyle(kid).borderRadius : null
    });
  });
  var chat = document.querySelector('.ap-chat,#wa-chat,#rf-chat,#sa-chat,#aid-chat,#pl-chat,#ar-chat,#gs-chat,#chat-shell');
  var cr = chat.getBoundingClientRect();
  out.push({ id:'CHAT', wrap:[Math.round(cr.left),Math.round(cr.top),Math.round(cr.right),Math.round(cr.bottom)], z:getComputedStyle(chat).zIndex, radius:getComputedStyle(chat).borderRadius });
  return out;
})()
"""), indent=1))

# Wide view of the whole seam column, top to bottom.
wide = js("""
(function(){
  var chat = document.querySelector('.ap-chat,#wa-chat,#rf-chat,#sa-chat,#aid-chat,#pl-chat,#ar-chat,#gs-chat,#chat-shell');
  var r = chat.getBoundingClientRect();
  return { x: r.right - 40, y: r.top - 16, width: 90, height: Math.round(r.height + 32) };
})()
""")
if wide:
    r = cmd("Page.captureScreenshot", {"format": "png", "clip": dict(wide, scale=2)})
    open(OUT + "_seam.png", "wb").write(base64.b64decode(r["result"]["data"]))
    print("wrote", OUT + "_seam.png")

proc.terminate()
print("done")
