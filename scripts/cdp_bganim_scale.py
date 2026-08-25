"""Verify the chat ⋯ Background sliders: master Scale + Scale X/Y/Z over the
wide 25–400% range, plus the Pitch / Nodes / Length / Thick / Depth shape knobs,
on the helix AND the owl orbit. Drives the REAL slider inputs (value + 'input'
event) so the shared wiring is what runs, waits real wall-clock time for the
field to settle, and writes PNGs to screenshots/.

Usage:  python3 scripts/cdp_bganim_scale.py [light|dark] [page]
        page defaults to wiseai; pass e.g. add-product to check an inline chat
        that carries its own copy of the menu markup.
Expects a static server on 8099 (python3 -m http.server 8099).
"""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys, shutil

PORT = 9344
THEME = (sys.argv[1] if len(sys.argv) > 1 else "light").lower()
PAGE = sys.argv[2] if len(sys.argv) > 2 else "wiseai"
URL = "http://localhost:8099/pages/%s.html" % PAGE
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "screenshots")

PROFILE = "/tmp/cdp-bganim-%s-%s" % (THEME, PAGE)
# A Chrome left over from an earlier run still owns the debug port, so a new
# launch would silently attach to it (and inherit its saved sliders). Clear it.
subprocess.run(["pkill", "-f", "remote-debugging-port=%d" % PORT],
               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
shutil.rmtree(PROFILE, ignore_errors=True)   # fresh localStorage → true defaults

proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
    "--hide-scrollbars", "--window-size=1600,1150",
    "--user-data-dir=%s" % PROFILE,
    "--remote-debugging-port=%d" % PORT, "about:blank"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def ws_connect(url):
    assert url.startswith("ws://")
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


cmd("Page.enable")
cmd("Runtime.enable")
init = ("window.__errs=[];addEventListener('error',e=>{__errs.push((e.message||'')+' @ '+(e.filename||'')+':'+(e.lineno||''))});"
        "addEventListener('unhandledrejection',e=>{__errs.push('promise: '+(e.reason&&e.reason.message||e.reason))});"
        "try{localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,name:'Demo User',"
        "email:'demo@wisealliance.com',initials:'DU'}));localStorage.setItem('wise-admin-ui','1');}catch(e){}"
        # Belt and braces: even on a reused profile, the first load starts at 100%.
        "try{if(!sessionStorage.getItem('bganim-test')){sessionStorage.setItem('bganim-test','1');"
        "['scale','scale-x','scale-y','scale-z','pitch','nodes','length','thickness','depth'].forEach(function(k){"
        "localStorage.removeItem('wise:chat-bg-anim-'+k);});}}catch(e){}")
if THEME == "dark":
    init += ("try{localStorage.setItem('wise-theme','dark');localStorage.setItem('chat-theme','dark');}catch(e){}"
             # documentElement may not exist yet on a brand-new document
             "(function add(){if(document.documentElement)document.documentElement.classList.add('dark');"
             "else document.addEventListener('readystatechange',add,{once:true});})();")
else:
    init += ("try{localStorage.setItem('wise-theme','light');localStorage.setItem('chat-theme','light');}catch(e){}")
cmd("Page.addScriptToEvaluateOnNewDocument", {"source": init})
cmd("Page.navigate", {"url": URL})
time.sleep(4.0)


def js(expr):
    r = cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True})
    res = r.get("result", {})
    if res.get("exceptionDetails"):
        return "JS-ERROR: " + json.dumps(res["exceptionDetails"])[:300]
    return res.get("result", {}).get("value")


def shot(name, sel=None):
    params = {"format": "png"}
    if sel:
        # Fall back to whatever holds the rows (the all-modules demo bar has no
        # popover) so every surface still yields a cropped control shot.
        box = js("(function(){var e=document.querySelector(%s)"
                 "||document.querySelector('.mi-motion-helix-bar');if(!e)return null;"
                 "e.scrollIntoView({block:'center'});"
                 "var r=e.getBoundingClientRect();"
                 "if(r.width<8||r.height<8)return null;"
                 "return [r.x,r.y,r.width,r.height];})()" % json.dumps(sel))
        if not box:
            print("  (no element for clip:", sel, ")")
            return
        pad = 6
        params["clip"] = {"x": max(0, box[0] - pad), "y": max(0, box[1] - pad),
                          "width": box[2] + pad * 2, "height": box[3] + pad * 2, "scale": 2}
    r = cmd("Page.captureScreenshot", params)
    stem = name if PAGE == "wiseai" else "%s-%s" % (PAGE, name)
    path = os.path.join(OUT, "bganim-%s__%s.png" % (stem, THEME))
    open(path, "wb").write(base64.b64decode(r["result"]["data"]))
    print("  wrote", path)


# ── Where the Background rows live ──────────────────────────────────────────
# Chat surfaces keep them in the ⋯ popover; the all-modules gallery keeps the
# same sliders in the "Welcome helix" demo bar, so scope to that instead.
OPEN_MENU = """(function(){
  var demo = document.querySelector('[data-motion-helix]');
  if(demo){
    /* Sections load collapsed (setSectionCollapsed in all-modules-flow.js), and
       a collapsed section has zero-size rows — open it before touching them. */
    var sec = demo.closest('.mi-module');
    if(sec && sec.classList.contains('is-collapsed')){
      var head = sec.querySelector(':scope > .mi-module-head');
      if(head) head.click();
    }
    demo.scrollIntoView({block:'center'});
    window.__pop = sec || demo;
    return 'demo-bar';
  }
  var item = document.querySelector('.topbar-popover [data-sc="bg-anim"]');
  if(!item) return 'no-bganim-row';
  var pop = item.closest('.topbar-popover');
  var btn = document.querySelector('[aria-controls="'+pop.id+'"]');
  if(!btn) return 'no-trigger';
  if(pop.classList.contains('hidden')) btn.click();
  window.__pop = pop;
  return pop.id;
})()"""

ROWS = """(function(){
  var pop = window.__pop; if(!pop) return 'no-pop';
  var rows = pop.querySelectorAll('.sc-bganim-detail, .mi-motion-helix-opacity');
  return Array.from(rows).map(function(r){
    var i = r.querySelector('input[type=range]');
    var lab = r.querySelector('.sc-bganim-detail-label, .mi-motion-helix-opacity-label');
    return [lab ? lab.textContent : '?',
            i ? i.min+'-'+i.max : '-',
            i ? i.value : '-',
            (r.querySelector('.sc-bganim-scale-val, .sc-bganim-knob-val, .sc-bganim-opacity-val, .sc-bganim-angle-val')||{}).textContent,
            r.hidden ? 'HIDDEN' : ''].join(' | ');
  }).join('\\n');
})()"""


# The sliders carry a STOP INDEX, not the percentage (see bgAnimPctToStop in
# js/wiseai-chat.js) — mirror the same stop list so a test can ask for "400%".
STOPS = list(range(25, 101, 5)) + list(range(110, 201, 10)) + list(range(220, 401, 20))


def stop_of(pct):
    return min(range(len(STOPS)), key=lambda i: abs(STOPS[i] - pct))


def drag(sel, pct, wait=1.6):
    out = js("""(function(){
      var pop = window.__pop || document;
      var sel = %s;
      /* The all-modules demo bar keys the same sliders off data-helix-* */
      var i = pop.querySelector(sel)
           || pop.querySelector(sel.replace('data-axis', 'data-helix-scale').replace('data-knob', 'data-helix-knob'));
      if(!i) return 'missing';
      i.focus(); i.value = '%d';
      i.dispatchEvent(new Event('input', {bubbles:true}));
      i.blur();
      var row = i.closest('.sc-bganim-detail, .mi-motion-helix-opacity');
      var v = row && row.querySelector('.sc-bganim-scale-val, .sc-bganim-knob-val');
      return (v ? v.textContent : i.value);
    })()""" % (json.dumps(sel), stop_of(pct)))
    time.sleep(wait)
    return out


print("== %s ==" % THEME)
print("menu:", js(OPEN_MENU))
time.sleep(0.6)
print("rows:\n" + str(js(ROWS)))
shot("menu", ".topbar-popover:not(.hidden)")

print("default field")
shot("field-default")

print("master scale -> 25%:", drag('.sc-bganim-scale-range[data-axis="all"]', 25))
print("  readouts:", js("(function(){var p=window.__pop;return Array.from(p.querySelectorAll('.sc-bganim-scale-val')).map(e=>e.textContent).join(',');})()"))
shot("scale-25")
print("master scale -> 400%:", drag('.sc-bganim-scale-range[data-axis="all"]', 400))
shot("scale-400")
print("axis mix (x 400 / y 60):", drag('.sc-bganim-scale-range[data-axis="x"]', 400, 0.4),
      drag('.sc-bganim-scale-range[data-axis="y"]', 60))
print("  master readout (expect —):", js(
    "(function(){var p=window.__pop;"
    "var r=p.querySelector('.sc-bganim-scale-all .sc-bganim-scale-val')"
    "||p.querySelector('[data-helix-scale-val=\"all\"]');"
    "return r&&r.textContent;})()"))
shot("scale-mixed")

# back to a neutral scale, then exercise the shape knobs one at a time
drag('.sc-bganim-scale-range[data-axis="all"]', 100, 0.8)
print("pitch -> 25%:", drag('.sc-bganim-knob-range[data-knob="pitch"]', 25))
shot("pitch-25")
print("pitch -> 400%:", drag('.sc-bganim-knob-range[data-knob="pitch"]', 400))
shot("pitch-400")
drag('.sc-bganim-knob-range[data-knob="pitch"]', 100, 0.6)
print("nodes -> 300%:", drag('.sc-bganim-knob-range[data-knob="nodes"]', 300))
shot("nodes-300")
drag('.sc-bganim-knob-range[data-knob="nodes"]', 100, 0.6)
print("length -> 30%:", drag('.sc-bganim-knob-range[data-knob="length"]', 30))
shot("length-30")
drag('.sc-bganim-knob-range[data-knob="length"]', 100, 0.6)
print("thick -> 25%:", drag('.sc-bganim-knob-range[data-knob="thickness"]', 25))
shot("thick-25")
print("thick -> 400%:", drag('.sc-bganim-knob-range[data-knob="thickness"]', 400))
shot("thick-400")
drag('.sc-bganim-knob-range[data-knob="thickness"]', 100, 0.6)
print("depth -> 25%:", drag('.sc-bganim-knob-range[data-knob="depth"]', 25))
shot("depth-25")
print("depth -> 400%:", drag('.sc-bganim-knob-range[data-knob="depth"]', 400))
shot("depth-400")
drag('.sc-bganim-knob-range[data-knob="depth"]', 100, 0.6)

# ── Orbit: Scale + Nodes must stay live; Angle / Pitch / Length / Thick / Depth hide ────────
print("orbit:", js("""(function(){
  var b = window.__pop.querySelector('[data-sc="bg-anim-style"][data-style="orbit"]');
  if(!b) return 'no-orbit-btn';
  b.click();
  return 'clicked';
})()"""))
time.sleep(2.0)
print("rows (orbit):\n" + str(js(ROWS)))
shot("orbit-menu", ".topbar-popover:not(.hidden)")
print("orbit scale -> 260%:", drag('.sc-bganim-scale-range[data-axis="all"]', 260))
shot("orbit-scale-260")
print("orbit nodes -> 320%:", drag('.sc-bganim-knob-range[data-knob="nodes"]', 320))
shot("orbit-nodes-320")

# ── Settings survive a reload (shared keys, restored without a flash) ───────
js("""(function(){
  var b = window.__pop.querySelector('[data-sc="bg-anim-style"][data-style="helix"]');
  if(b) b.click();
})()""")
time.sleep(1.0)
drag('.sc-bganim-scale-range[data-axis="all"]', 160, 0.8)
drag('.sc-bganim-knob-range[data-knob="pitch"]', 200, 0.8)
cmd("Page.navigate", {"url": URL})
time.sleep(4.0)
print("after reload:", js(OPEN_MENU))
time.sleep(0.6)
print("rows (reloaded):\n" + str(js(ROWS)))
shot("reload", ".topbar-popover:not(.hidden)")

print("errors:", js("(window.__errs||[]).join(' || ') || 'none'"))
proc.terminate()
print("done")
