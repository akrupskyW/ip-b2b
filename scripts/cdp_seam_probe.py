"""Probe the paint order at the chat/right-drawer seam with Appearance ▸ Search
on vs off, on every page that has a chat plus a module tucked to its right."""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys

PORT = int(os.environ.get("CDP_PORT", "9346"))
BASE = "http://localhost:8099"
PAGE = os.environ.get("PAGE", "/pages/add-product.html")
SEARCH = os.environ.get("SEARCH", "1")
DARK = os.environ.get("DARK") == "1"
OUT = os.environ.get("OUT", "/tmp/seam")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
    "--hide-scrollbars", "--window-size=1600,1000",
    "--user-data-dir=/tmp/cdp-profile-%d" % PORT,
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
    localStorage.setItem('wise-app-search','%s');
    localStorage.setItem('wise-theme','%s');
    localStorage.setItem('chat-theme','%s');
  } catch (e) {}
  if ('%s' === 'dark') document.documentElement.classList.add('dark');
""" % (SEARCH, theme, theme, theme)})
cmd("Page.navigate", {"url": BASE + PAGE})
time.sleep(5.0)


def js(expr):
    r = cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True})
    res = r.get("result", {}).get("result", {})
    return res.get("value", res)


PROBE = r"""
(function(){
  var CHAT_SEL = '#wa-chat,#rf-chat,#sa-chat,#aid-chat,#pl-chat,#ar-chat,.ap-chat,#gs-chat,#chat-shell,#wiseai-dock-panel';
  var row = document.getElementById('modules-row');
  var chat = row && row.querySelector(CHAT_SEL);
  if (!chat) return { err: 'no chat' };
  var cr = chat.getBoundingClientRect();
  var name = function(el){ return el ? (el.tagName.toLowerCase() + (el.id ? '#'+el.id : '') + (el.className && typeof el.className === 'string' ? '.'+el.className.trim().split(/\s+/).slice(0,3).join('.') : '')) : null; };
  var mods = [];
  row.querySelectorAll('.sticky-mod.is-sticky, .wa-pane.is-open.is-sticky, .wch-sidebar.wch-right').forEach(function(m){
    var mr = m.getBoundingClientRect();
    var kid = m.querySelector(':scope > .panel-inner, :scope > [class*="-inner"]');
    var kr = kid && kid.getBoundingClientRect();
    mods.push({
      mod: name(m), z: getComputedStyle(m).zIndex,
      wrapLeft: Math.round(mr.left), wrapTop: Math.round(mr.top), wrapBottom: Math.round(mr.bottom),
      innerLeft: kr ? Math.round(kr.left) : null, inner: name(kid),
      overlapPx: Math.round(cr.right - (kr ? kr.left : mr.left))
    });
  });
  var probes = {};
  [['topArc', cr.right - 4, cr.top + 3],
   ['topArc8', cr.right - 8, cr.top + 2],
   ['mid', cr.right - 4, cr.top + cr.height / 2],
   ['botArc', cr.right - 4, cr.bottom - 3]].forEach(function(p){
    var el = document.elementFromPoint(p[1], p[2]);
    probes[p[0]] = name(el) + ' | inChat=' + (el ? chat.contains(el) : 'null');
  });
  return {
    search: document.documentElement.classList.contains('app-search-on'),
    chat: name(chat), chatZ: getComputedStyle(chat).zIndex,
    chatBox: [Math.round(cr.left), Math.round(cr.top), Math.round(cr.right), Math.round(cr.bottom)],
    chatRadius: getComputedStyle(chat).borderRadius,
    mods: mods, probes: probes
  };
})()
"""

print("url:", js("location.pathname"))
print("row:", js("!!document.getElementById('modules-row')"))
print(json.dumps(js(PROBE), indent=1))


def shot(path, clip=None, scale=4):
    params = {"format": "png"}
    if clip:
        params["clip"] = dict(clip, scale=scale)
    r = cmd("Page.captureScreenshot", params)
    open(path, "wb").write(base64.b64decode(r["result"]["data"]))
    print("wrote", path)


CHAT_SEL = "'#wa-chat,#rf-chat,#sa-chat,#aid-chat,#pl-chat,#ar-chat,.ap-chat,#gs-chat,#chat-shell,#wiseai-dock-panel'"


def corners():
    return js("""
    (function(){
      var r = document.querySelector(%s).getBoundingClientRect();
      return { top: { x: r.right - 24, y: r.top - 4, width: 30, height: 28 },
               bot: { x: r.right - 24, y: r.bottom - 24, width: 30, height: 28 } };
    })()
    """ % CHAT_SEL)


def style(css, sid):
    js("""
    (function(){
      var old = document.getElementById('%s');
      if (old) old.remove();
      var st = document.createElement('style');
      st.id = '%s';
      st.textContent = %s;
      document.head.appendChild(st);
    })()
    """ % (sid, sid, json.dumps(css)))


c = corners()
shot(OUT + "_corner_top.png", c["top"], scale=10)
shot(OUT + "_corner_bot.png", c["bot"], scale=10)
shot(OUT + "_full.png")

print("who_lifts_to_500:", json.dumps(js("""
(function(){
  var LIFT = '.topbar-popover:not(.hidden):not([data-popover-static]), .panel-more-btn.is-open, [role="menu"]:not(.hidden):not([hidden]):not([data-popover-static]), .pf-rowmenu-pop:not([hidden]), .pf-filter-pop:not([hidden]), .lib-filter-pop:not([hidden]), .pf-gs-infopop:not([hidden])';
  var out = [];
  Array.prototype.forEach.call(document.getElementById('modules-row').children, function(el){
    var hits = [];
    el.querySelectorAll(LIFT).forEach(function(n){
      hits.push(n.tagName.toLowerCase() + (n.id ? '#'+n.id : '') + '.' + String(n.className).trim().split(/\\s+/).slice(0,2).join('.'));
    });
    out.push({ el: (el.id || String(el.className).slice(0,30)), z: getComputedStyle(el).zIndex, lifters: hits.slice(0,4), n: hits.length });
  });
  return out;
})()
"""), indent=1))

# Worst case that ships today: chat and drawer tie on z-index, so the drawer
# (later in DOM) paints its squared tuck strip OVER the chat's rounded corner.
js("""
(function(){
  var chat = document.querySelector(%s);
  chat.style.setProperty('z-index', '2', 'important');
  var nfp = document.querySelector('#modules-row .sticky-mod.is-sticky');
  if (nfp) nfp.style.setProperty('z-index', '2', 'important');
})()
""" % CHAT_SEL)
time.sleep(0.4)
c = corners()
shot(OUT + "_tie_top.png", c["top"], scale=10)
shot(OUT + "_tie_bot.png", c["bot"], scale=10)

# Candidate: chat strictly above every right-of-chat drawer.
js("""
(function(){
  var chat = document.querySelector(%s);
  chat.style.setProperty('z-index', '9', 'important');
  var nfp = document.querySelector('#modules-row .sticky-mod.is-sticky');
  if (nfp) nfp.style.setProperty('z-index', '1', 'important');
})()
""" % CHAT_SEL)
time.sleep(0.4)
c = corners()
shot(OUT + "_below_top.png", c["top"], scale=10)
shot(OUT + "_below_bot.png", c["bot"], scale=10)
shot(OUT + "_below_full.png")

proc.terminate()
print("done")
