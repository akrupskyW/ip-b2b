"""Do the specimen row menus open on hover, and clear the card's scroller?

Hovers a ⋮ on a table specimen (the way js/kebab-hover.js sees a pointer
arrive), then reports whether the popover showed, where it sits relative to its
trigger, whether js/popover-layer.js portalled it onto <body>, and whether it
is clipped by the card. Repeats for the reports icon and at the Mobile preset,
where the menu is supposed to flip to the left of the glyph.

Usage:  python3 scripts/_attb_menu_check.py [light|dark] [s|t|m|l]
"""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys

PORT = 9381
args = list(sys.argv[1:])
THEME = args.pop(0).lower() if args and args[0].lower() in ("light", "dark") else "light"
SIZE = args.pop(0).lower() if args and args[0].lower() in ("s", "t", "m", "l") else "m"
URL = "http://localhost:8765/pages/analytics-types.html"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

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
window.__errs=[];
addEventListener('error',e=>{__errs.push(e.message||'')});
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
js("document.getElementById('az-palette-launch') && document.getElementById('az-palette-launch').click()")
time.sleep(0.5)
js("document.querySelector('.azp-size[data-azp-size=\"%s\"]').click()" % SIZE)
time.sleep(2.2)
js("document.querySelector('.azp-close').click()")
time.sleep(0.8)

print("preset:", SIZE, "theme_dark:", js("document.documentElement.classList.contains('dark')"))
print("kebab-hover loaded:", js("!!window.__wiseKebabHover"),
      "| popover-layer loaded:", js("!!window.__wisePopoverLayer"))
print("total specimen kebabs:", js("document.querySelectorAll('.attb-rowmenu-btn').length"))

HOVER = r"""
(function(sel, idx){
  var card = document.getElementById(sel);
  var sc = document.getElementById('agent-main-scroll');
  var top = card.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 40;
  sc.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  var btns = card.querySelectorAll('.attb-rowmenu-btn');
  var btn = btns[idx];
  if (!btn) return 'no button';
  var r = btn.getBoundingClientRect();
  var opts = { bubbles: true, cancelable: true, pointerType: 'mouse',
               clientX: r.left + r.width/2, clientY: r.top + r.height/2 };
  btn.dispatchEvent(new PointerEvent('pointerover', opts));
  btn.dispatchEvent(new PointerEvent('pointerenter', opts));
  btn.dispatchEvent(new MouseEvent('mouseover', opts));
  return 'hovered';
})('%s', %d)
"""

REPORT = r"""
(function(sel, idx){
  var card = document.getElementById(sel);
  var btn = card.querySelectorAll('.attb-rowmenu-btn')[idx];
  var pop = document.getElementById(btn.getAttribute('aria-controls'));
  if (!pop) return JSON.stringify({err:'no pop'});
  var cs = getComputedStyle(pop);
  var shown = cs.display !== 'none' && !pop.hidden && pop.getClientRects().length > 0;
  var b = btn.getBoundingClientRect(), p = pop.getBoundingClientRect();
  var wrap = card.querySelector('.attb-wrap').getBoundingClientRect();
  return JSON.stringify({
    glyph: (btn.querySelector('.material-symbols-outlined')||{}).textContent
      || btn.querySelector('[data-icon-svg]') && btn.querySelector('[data-icon-svg]').getAttribute('data-icon-svg'),
    expanded: btn.getAttribute('aria-expanded'),
    shown: shown,
    portalled: pop.parentElement === document.body,
    position: cs.position,
    side: p.left >= b.right - 2 ? 'right' : p.right <= b.left + 2 ? 'left' : 'overlapping',
    below: p.top > b.bottom - 2,
    items: pop.querySelectorAll('[role="menuitem"]').length,
    clippedByScroller: p.right > wrap.right + 1 && cs.position !== 'fixed',
    inViewport: p.left >= -1 && p.right <= innerWidth + 1
  });
})('%s', %d)
"""

for cid, idx, what in [("attb-pf-claimed", 0, "row ⋮"),
                       ("attb-pf-claimed", 1, "reports icon"),
                       ("attb-inv", 0, "invoice ⋮"),
                       ("attb-team", 0, "team ⋮")]:
    print("\n--", cid, what)
    print("  ", js(HOVER % (cid, idx)))
    time.sleep(0.6)
    print("  ", js(REPORT % (cid, idx)))
    js("document.body.click()")
    time.sleep(0.3)

print("\nerrors:", js("(window.__errs||[]).join(' || ')") or "(none)")
proc.terminate()
