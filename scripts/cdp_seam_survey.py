"""Survey every page with a chat plus a module tucked to its right: with
Appearance ▸ Search on, report whether the drawer paints over the chat's
rounded corner (the "cornered edges" artifact)."""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys

PORT = int(os.environ.get("CDP_PORT", "9360"))
BASE = "http://localhost:8099"
SEARCH = os.environ.get("SEARCH", "1")
DARK = os.environ.get("DARK") == "1"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

PAGES = [
    "wiseai.html", "add-product.html", "add-catalog.html", "view-product.html",
    "reformulation.html", "studio-ai.html", "ai-dashboard.html",
    "product-portfolio.html", "product-comparison.html",
    "report-guiding-stars.html", "verification.html", "gras-verification.html",
    "progress-log.html", "accessibility-review.html", "reports.html",
    "conversation-library.html", "ingredient-browser.html", "overview.html",
]

proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
    "--hide-scrollbars", "--window-size=1600,1000",
    "--user-data-dir=/tmp/cdp-survey-%d" % PORT,
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
    localStorage.setItem('wise-admin-ui','1');
    localStorage.setItem('wise-app-search','%s');
    localStorage.setItem('wise-theme','%s');
    localStorage.setItem('chat-theme','%s');
  } catch (e) {}
  if ('%s' === 'dark') document.documentElement.classList.add('dark');
""" % (SEARCH, theme, theme, theme)})


def js(expr):
    r = cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True})
    res = r.get("result", {}).get("result", {})
    return res.get("value", res)


PROBE = r"""
(function(){
  var CHAT_SEL = '#wa-chat,#rf-chat,#sa-chat,#aid-chat,#pl-chat,#ar-chat,.ap-chat,#gs-chat,#chat-shell,#wiseai-dock-panel,.sticky-chat,.wch-chat-anchor';
  var row = document.getElementById('modules-row');
  if (!row) return { skip: 'no #modules-row' };
  var chat = row.querySelector(CHAT_SEL);
  if (!chat) return { skip: 'no chat in row' };
  var cr = chat.getBoundingClientRect();
  if (!cr.width) return { skip: 'chat has no box' };
  var chatZ = parseFloat(getComputedStyle(chat).zIndex);
  var drawers = [];
  row.querySelectorAll('.sticky-mod.is-sticky, .wa-pane.is-open.is-sticky, .wch-sidebar.wch-right').forEach(function(m){
    var mr = m.getBoundingClientRect();
    if (!mr.width || mr.left < cr.left) return;
    drawers.push({
      mod: (m.id || String(m.className).trim().split(/\s+/).slice(0,2).join('.')),
      z: getComputedStyle(m).zIndex,
      overlapsChat: Math.round(cr.right - mr.left)
    });
  });
  /* Who wins where the chat's rounded corner leaves a notch? */
  var pt = function(x, y){
    var el = document.elementFromPoint(x, y);
    if (!el) return 'null';
    if (chat.contains(el)) return 'CHAT';
    var d = el.closest('.sticky-mod, .wa-pane, .wch-sidebar');
    return d ? ('DRAWER:' + (d.id || String(d.className).trim().split(/\s+/)[0])) : ('other:' + el.tagName.toLowerCase());
  };
  return {
    chat: (chat.id || String(chat.className).trim().split(/\s+/).slice(0,2).join('.')),
    chatZ: chatZ, drawers: drawers,
    edgeMid: pt(cr.right - 4, cr.top + cr.height / 2),
    cornerTop: pt(cr.right - 5, cr.top + 2),
    cornerBot: pt(cr.right - 5, cr.bottom - 2)
  };
})()
"""

results = {}
for page in PAGES:
    cmd("Page.navigate", {"url": BASE + "/pages/" + page})
    time.sleep(3.2)
    r = js(PROBE)
    results[page] = r
    print(page, "->", json.dumps(r))

print("\n=== BROKEN (drawer paints over the chat edge/corner) ===")
for page, r in results.items():
    if not isinstance(r, dict) or r.get("skip"):
        continue
    bad = [k for k in ("edgeMid", "cornerTop", "cornerBot") if str(r.get(k, "")).startswith("DRAWER")]
    if bad:
        print(page, bad, "chatZ=", r.get("chatZ"), r.get("drawers"))

proc.terminate()
print("done")
