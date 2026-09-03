"""Screenshot the streaming trace in both themes so its colours can be eyeballed:
the in-progress ring around the owl with the helix below it, the summary rows
(milestone key + elapsed clock), and the matching live-conversation ring in the
History specimen on all-modules.

Runs the real shared trace (window.WiseTraceStream.run) inside the real chat
transcript on wiseai.html. Pass "chat" or "modules" to shoot only one surface.
Serve the repo on :8765 first (python3 -m http.server 8765)."""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys

PORT = 9334
BASE = "http://localhost:8765/pages/wiseai.html"
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
    r = cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True,
                                 "awaitPromise": True})
    return r.get("result", {}).get("result", {}).get("value")


cmd("Page.enable")
cmd("Runtime.enable")

RUN_TRACE = """(function(){
  var m = document.querySelector('[id$="-messages"]');
  if (!m) return 'no-messages';
  var w = document.querySelector('.sc-welcome'); if (w) w.style.display='none';
  window.WiseTraceStream.run({
    messages: m,
    avatarHtml: '<span class="sc-avatar sc-avatar-wiseai"></span>',
    milestones: [
      { key: 'Assembling the field', story: ['x'] },
      { key: 'Scoring', story: ['x'] },
      { key: 'Setting the table', story: ['x'] },
      { key: 'Laying it out', story: ['x'] }
    ],
    streamOn: true, streamLevel: 'full',
    scrollDown: function(){},
    done: function(){}
  });
  return 'ran';
})()"""


def clip_shot(sel, out, pad=12, grow_h=0, scale=3):
    # Page.captureScreenshot clips in DOCUMENT coordinates, so fold in the scroll.
    box = js("(function(){var e=document.querySelector('%s');if(!e)return null;"
             "var r=e.getBoundingClientRect();"
             "return {x:r.x+window.scrollX,y:r.y+window.scrollY,w:r.width,h:r.height}})()" % sel)
    params = {"format": "png"}
    if box:
        params["clip"] = {"x": max(0, box["x"] - pad), "y": max(0, box["y"] - pad),
                          "width": box["w"] + pad * 2,
                          "height": box["h"] + pad * 2 + grow_h, "scale": scale}
    r = cmd("Page.captureScreenshot", params)
    open(out, "wb").write(base64.b64decode(r["result"]["data"]))
    print("wrote", out)


def shoot(theme):
    init = ("localStorage.setItem('wise-theme','%s');"
            "localStorage.setItem('chat-theme','%s');" % (theme, theme))
    cmd("Page.addScriptToEvaluateOnNewDocument", {"source": init})
    cmd("Page.navigate", {"url": BASE})
    time.sleep(3.5)
    print(theme, "dark_class:", js("document.documentElement.classList.contains('dark')"))
    print(theme, "trace:", js(RUN_TRACE))
    # Mid-trace: the in-progress ring around the owl, with the helix hanging below.
    time.sleep(3.0)
    print(theme, "ring:", js(
        "(function(){var e=document.querySelector('.sc-line-trace .sc-avatar-wiseai');"
        "return e?getComputedStyle(e,'::after').borderTopColor:'none'})()"))
    print(theme, "helix_stroke:", js(
        "(function(){var s=document.querySelector('.sc-trace-dna stop');"
        "return s?s.getAttribute('stop-color'):'none'})()"))
    clip_shot('.sc-line-trace .sc-avatar-wiseai', '/tmp/trace_ring_%s.png' % theme,
              pad=10, grow_h=140)
    time.sleep(20.0)  # let every step land and the summary replace the live block
    print(theme, "keys:", js("Array.from(document.querySelectorAll('.sc-trace-step-key'))"
                             ".map(function(e){return e.textContent}).join(' | ')"))
    clip_shot('.sc-trace', '/tmp/trace_steps_%s.png' % theme)


AUTH = ("try{localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,"
        "name:'Demo User',email:'demo@wisealliance.com',initials:'DU',"
        "at:new Date().toISOString()}));"
        "localStorage.setItem('wise-walkthrough',JSON.stringify({v:1,completed:true,"
        "dismissed:true,doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},"
        "cursor:''}));}catch(e){}")


def shoot_all_modules(theme):
    init = (AUTH + "localStorage.setItem('wise-theme','%s');"
            "localStorage.setItem('chat-theme','%s');" % (theme, theme))
    cmd("Page.addScriptToEvaluateOnNewDocument", {"source": init})
    cmd("Page.navigate", {"url": "http://localhost:8765/pages/all-modules.html"})
    time.sleep(5.0)
    # Open every collapsed catalog section so the History specimen is rendered.
    js("Array.from(document.querySelectorAll('.mi-module.is-collapsed .mi-module-head'))"
       ".forEach(function(h){h.click()})")
    time.sleep(6.0)
    # Each component card is its own accordion — open the History one.
    js("(function(){var c=document.querySelector('[data-comp-name=\"History\"]');"
       "if(!c)return;var h=c.querySelector('.dsc-card-head');if(h)h.click();})()")
    time.sleep(2.5)
    # all-modules scrolls inside a pane, so window scroll stays 0 and viewport
    # coords ARE document coords — park the live row on screen before measuring.
    js("(function(){var d=document.querySelector('[data-comp-name=\"History\"] .wch-item-live');"
       "if(d)d.scrollIntoView({block:'center'})})()")
    time.sleep(1.5)
    for pane in ("light", "dark"):
        print(theme, "all-modules %s pane dot:" % pane, js(
            "(function(){var e=document.querySelector('[data-comp-name=\"History\"] "
            ".dsc-theme-%s .wch-live-dot');"
            "return e?getComputedStyle(e,'::after').borderTopColor:'none'})()" % pane))
    # Tight on the two live rows (light pane + dark pane) so the spinning ring
    # around the chat dot is readable.
    for pane in ("light", "dark"):
        box = js("(function(){var d=document.querySelector('[data-comp-name=\"History\"] "
                 ".dsc-theme-%s .wch-item-live');if(!d)return null;"
                 "var r=d.getBoundingClientRect();"
                 "return {x:r.left,y:r.top,w:r.width,h:r.height}})()" % pane)
        params = {"format": "png"}
        if box:
            params["clip"] = {"x": max(0, box["x"] - 10), "y": max(0, box["y"] - 8),
                              "width": min(box["w"], 210) + 20,
                              "height": box["h"] + 16, "scale": 8}
        r = cmd("Page.captureScreenshot", params)
        out = '/tmp/allmod_dot_%s_pane_%s.png' % (theme, pane)
        open(out, "wb").write(base64.b64decode(r["result"]["data"]))
        print("wrote", out)


only = sys.argv[1] if len(sys.argv) > 1 else "all"
if only in ("all", "chat"):
    shoot("light")
    shoot("dark")
if only in ("all", "modules"):
    shoot_all_modules("light")
    shoot_all_modules("dark")
proc.terminate()
print("done")
