"""Audit js/sticky-modules.js across every page that loads it.

For each page: navigate headless Chrome, wait for async module builds, then
probe #modules-row — which children are module-like, right of the chat, and
whether each got a working sticky toggle and the tucked (.is-sticky) look.
Prints one JSON line per page. No deps (reuses the raw-CDP approach of
cdp_shot.py)."""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys

PORT = 9334
BASE = "http://localhost:8765/pages/"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

PAGES = [
    "wiseai.html", "overview.html", "reformulation.html", "studio-ai.html",
    "ai-dashboard.html", "add-product.html", "view-product.html",
    "report-guiding-stars.html", "product-portfolio.html", "product-comparison.html",
    "verification.html", "gras-verification.html", "agents.html", "alerts.html",
    "reports.html", "docs.html", "help.html", "profile.html", "preferences.html",
    "invoices.html", "api-keys.html", "user-management.html", "organizations.html",
    "quick-invite.html", "admin-utils.html", "audit-queue.html",
    "conversation-library.html", "ingredient-browser.html", "all-modules.html",
    "analytics-types.html", "non-upf-dashboard.html", "marketing-assets.html",
    "accessibility-review.html",
]

PROBE = r"""
(function () {
  var CHAT_SEL = '#wa-chat,#rf-chat,#sa-chat,#aid-chat,.ap-chat,#gs-chat,#chat-shell,#wiseai-dock-panel';
  var NATIVE = '[data-pane-act="sticky"],[data-turns-act="sticky"]';
  var out = { errs: (window.__errs || []).slice(0, 4), hasScript: !!window.WiseStickyModules };
  var row = document.getElementById('modules-row');
  if (!row) { out.row = false; return JSON.stringify(out); }
  out.row = true;
  var chat = row.querySelector(CHAT_SEL);
  out.chat = chat ? (chat.id || chat.className.split(' ')[0]) : null;
  out.chatSticky = chat ? chat.classList.contains('sticky-chat') : false;
  var mods = [];
  function ident(el) { return el.id ? '#' + el.id : '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.'); }
  function push(el) {
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    var rightOfChat = null;
    if (chat) {
      var cr = chat.getBoundingClientRect();
      rightOfChat = (r.width > 0 && cr.width > 0)
        ? (r.left + r.width / 2) >= (cr.left + cr.width / 2)
        : !!(chat.compareDocumentPosition(el) & 4);
    }
    mods.push({
      id: ident(el), tag: el.tagName, w: Math.round(r.width),
      right: rightOfChat,
      native: !!el.querySelector(NATIVE),
      toggle: !!el.querySelector('[data-sticky-toggle]'),
      menu: !!el.querySelector('.panel-more-wrap'),
      stickyMod: el.classList.contains('sticky-mod'),
      isSticky: el.classList.contains('is-sticky'),
      wch: el.classList.contains('wch-sidebar') ? (el.classList.contains('wch-right') ? 'right' : 'left') : null,
      wchUnsticky: el.classList.contains('wch-unsticky'),
      ml: cs.marginLeft, display: cs.display
    });
  }
  Array.prototype.forEach.call(row.children, function (child) {
    if (child.nodeType !== 1) return;
    var tag = child.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE' || tag === 'INPUT' || tag === 'LINK') return;
    if (child.id === 'panels-row-right') {
      Array.prototype.forEach.call(child.children, push);
      return;
    }
    push(child);
  });
  out.mods = mods;
  return JSON.stringify(out);
})()
"""

proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
    "--hide-scrollbars", "--window-size=1600,1150",
    "--remote-debugging-port=%d" % PORT, "about:blank"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def ws_connect(url):
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
            if not c:
                raise IOError("closed")
            b += c
        return b
    b0, b1 = rd(2)
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
    "window.__errs=[];addEventListener('error',e=>{__errs.push((e.message||'')+' @ '+(e.filename||'').split('/').pop()+':'+(e.lineno||''))});"
    "try{localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,email:'demo@wisealliance.com',name:'Demo User'}))}catch(e){}"})


def js(expr):
    r = cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True})
    return r.get("result", {}).get("result", {}).get("value")


for page in PAGES:
    cmd("Page.navigate", {"url": BASE + page})
    time.sleep(3.0)
    raw = js(PROBE)
    try:
        res = json.loads(raw) if raw else {"probeFailed": True}
    except Exception:
        res = {"probeFailed": True, "raw": str(raw)[:200]}
    res["page"] = page
    print(json.dumps(res))
    sys.stdout.flush()

proc.terminate()
print("done")
