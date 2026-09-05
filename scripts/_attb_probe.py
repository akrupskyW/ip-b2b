"""Probe the table specimens on pages/analytics-types.html at every palette preset.

For each specimen card it reports, per preset:
  * whether it mounted at all
  * whether js/responsive-tables.js has put it in card mode (.rtbl-cards)
  * how far its table overflows its own scroller (expected at tablet+, and the
    scroller is the thing that handles it)
  * whether anything spills past the CARD's content box (never expected — that
    is the failure the size palette exists to catch)

Usage:  python3 scripts/_attb_probe.py [light|dark] [s|t|m|l]
"""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys

PORT = 9347
args = list(sys.argv[1:])
THEME = args.pop(0).lower() if args and args[0].lower() in ("light", "dark") else "light"
SIZE = args.pop(0).lower() if args and args[0].lower() in ("s", "t", "m", "l") else "s"
URL = "http://localhost:8765/pages/analytics-types.html"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

proc = subprocess.Popen(
    [CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
     "--window-size=1900,1200", "--remote-debugging-port=%d" % PORT, "about:blank"],
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
        return "JS-ERROR: " + json.dumps(res["exceptionDetails"])[:600]
    return res.get("result", {}).get("value")


cmd("Page.enable")
cmd("Runtime.enable")
cmd("Page.addScriptToEvaluateOnNewDocument", {"source": """
window.__errs=[];
addEventListener('error',e=>{__errs.push((e.message||'')+' @ '+(e.filename||'').split('/').pop()+':'+(e.lineno||''))});
addEventListener('unhandledrejection',e=>{__errs.push('promise: '+(e.reason&&e.reason.message||e.reason))});
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
time.sleep(2.5)
js("document.querySelector('.azp-close').click()")
time.sleep(0.6)

print("theme_dark:", js("document.documentElement.classList.contains('dark')"))
print("preset:", SIZE, "frame:",
      js("(function(){var d=document.querySelector('#agent-main-scroll .dash');"
         "return d?Math.round(d.getBoundingClientRect().width):-1;})()"))
print("errors:", js("(window.__errs||[]).join(' || ')") or "(none)")
print("mounted specimens:", js("document.querySelectorAll('.attb-card').length"))
print("catalog rail entries:", js("document.querySelectorAll('.azp-item').length"))

PROBE = r"""
(function(){
  var out = [];
  document.querySelectorAll('.attb-card').forEach(function(card){
    var tbl = card.querySelector('.attb-tbl');
    var wrap = card.querySelector('.attb-wrap');
    if (!tbl || !wrap) { out.push({id: card.id, err: 'no table'}); return; }
    var cs = getComputedStyle(card);
    var r = card.getBoundingClientRect();
    var box = { left: r.left + (parseFloat(cs.paddingLeft)||0),
                right: r.right - (parseFloat(cs.paddingRight)||0) };
    var spill = 0, who = '';
    card.querySelectorAll('*').forEach(function(el){
      if (el.offsetWidth === 0 && el.offsetHeight === 0) return;
      var es = getComputedStyle(el);
      if (es.position === 'fixed' || es.display === 'none' || es.visibility === 'hidden') return;
      // The scroller is allowed to hold something wider than itself.
      if (el.closest('.attb-wrap')) return;
      var q = el.getBoundingClientRect();
      if (!q.width) return;
      var over = Math.max(q.right - box.right, box.left - q.left);
      if (over > spill) { spill = over; who = (el.className||'').toString().split(' ')[0] || el.tagName; }
    });
    out.push({
      id: card.id,
      cards: tbl.classList.contains('rtbl-cards'),
      wrapW: Math.round(wrap.getBoundingClientRect().width),
      tblW: Math.round(tbl.getBoundingClientRect().width),
      scrollBy: Math.max(0, Math.round(wrap.scrollWidth - wrap.clientWidth)),
      rows: tbl.tBodies[0] ? tbl.tBodies[0].rows.length : 0,
      labelled: tbl.querySelectorAll('td[data-rlabel]').length,
      spill: Math.round(spill), who: who
    });
  });
  return JSON.stringify(out);
})()
"""

rows = json.loads(js(PROBE))
print("\n%-24s %6s %7s %7s %8s %5s %8s %6s %s" % (
    "CARD", "CARDS", "WRAP", "TABLE", "SCROLLBY", "ROWS", "LABELLED", "SPILL", "WORST"))
bad = 0
for r in rows:
    if r.get("err"):
        print("%-24s  %s" % (r["id"], r["err"])); bad += 1; continue
    flag = " <<<" if r["spill"] > 2 else ""
    if r["spill"] > 2:
        bad += 1
    print("%-24s %6s %7d %7d %8d %5d %8d %6d %s%s" % (
        r["id"][:24], "yes" if r["cards"] else "-", r["wrapW"], r["tblW"],
        r["scrollBy"], r["rows"], r["labelled"], r["spill"], r["who"][:18], flag))
print("\n%d specimen(s), %d reporting a problem" % (len(rows), bad))
print("final_errors:", js("(window.__errs||[]).join(' || ')") or "(none)")
proc.terminate()
