"""Repro: sticky right panel corners next to the chat (reformulation.html).
Opens the page, picks a food (so the studio panel + brand banner render),
screenshots the chat/studio seam, and dumps the computed corner radii of the
tucked module and its header. Raw-CDP, no deps (same approach as cdp_shot.py)."""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys

PORT = 9341
BASE = "http://localhost:8765/pages/"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PAGE = sys.argv[1] if len(sys.argv) > 1 else "reformulation.html"

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
    "try{localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,email:'demo@wisealliance.com',name:'Demo User'}));"
    "localStorage.setItem('wise-theme','light')}catch(e){}"})


def js(expr):
    r = cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True})
    return r.get("result", {}).get("result", {}).get("value")


def shot(path, clip=None):
    p = {"format": "png"}
    if clip:
        p["clip"] = {"x": clip[0], "y": clip[1], "width": clip[2], "height": clip[3], "scale": 2}
    r = cmd("Page.captureScreenshot", p)
    img = base64.b64decode(r["result"]["data"])
    open(path, "wb").write(img)
    print("wrote", path, len(img), "bytes")


cmd("Page.navigate", {"url": BASE + PAGE})
time.sleep(3.0)

if PAGE.startswith("reformulation"):
    # Pick a food so the studio + dashboard render with the brand banner. Chips
    # mount async inside the chat, so poll for them.
    pick = "no chip"
    for _ in range(12):
        pick = js("(function(){var cs=document.querySelectorAll('button, .rf-chip');for(var i=0;i<cs.length;i++){var t=cs[i].textContent||'';if(/Coconut Brownies|Chocolate Chip Muffins/.test(t)){cs[i].click();return 'clicked '+t.trim().slice(0,40)+' ['+cs[i].className.slice(0,40)+']';}}return 'no chip';})()")
        if pick != "no chip":
            break
        time.sleep(1.0)
    print("pick:", pick)
    time.sleep(4.5)

# Locate the module right of the chat and report its geometry + radii.
info = js(r"""
(function(){
  var row = document.getElementById('modules-row');
  if (!row) return {err:'no row'};
  var chat = row.querySelector('#wa-chat,#rf-chat,#sa-chat,#aid-chat,.ap-chat,#gs-chat,#chat-shell,#wiseai-dock-panel');
  var out = {chat: chat ? (chat.id||chat.className) : null, mods: []};
  var cr = chat ? chat.getBoundingClientRect() : null;
  Array.prototype.forEach.call(row.querySelectorAll('.sticky-mod, .wa-pane, .wch-sidebar, .rf-card'), function(m){
    if (m === chat) return;
    var r = m.getBoundingClientRect();
    if (!r.width) return;
    var cs = getComputedStyle(m);
    out.mods.push({id: m.id||m.className.split(' ').slice(0,3).join('.'),
      cls: m.className, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      radius: cs.borderTopLeftRadius+' '+cs.borderTopRightRadius+' '+cs.borderBottomRightRadius+' '+cs.borderBottomLeftRadius,
      padL: cs.paddingLeft, ml: cs.marginLeft, bg: cs.backgroundColor, bordL: cs.borderLeftWidth});
    var inner = m.querySelector(':scope > .panel-inner, :scope > [class*="-inner"]');
    if (inner) {
      var ns = getComputedStyle(inner);
      out.mods[out.mods.length-1].inner = {cls: inner.className,
        radius: ns.borderTopLeftRadius+' '+ns.borderTopRightRadius+' '+ns.borderBottomRightRadius+' '+ns.borderBottomLeftRadius,
        bordL: ns.borderLeftWidth, shadow: ns.boxShadow.slice(0,40)};
    }
    var head = m.querySelector('.rf-head, .wa-pane-top, .wch-head');
    if (head) {
      var hs = getComputedStyle(head);
      var hr = head.getBoundingClientRect();
      out.mods[out.mods.length-1].head = {x: Math.round(hr.left), y: Math.round(hr.top), w: Math.round(hr.width),
        radius: hs.borderTopLeftRadius+' '+hs.borderTopRightRadius+' '+hs.borderBottomRightRadius+' '+hs.borderBottomLeftRadius,
        cls: head.className};
    }
  });
  if (cr) out.chatRect = {x: Math.round(cr.left), y: Math.round(cr.top), w: Math.round(cr.width), h: Math.round(cr.height)};
  return out;
})()
""")
print(json.dumps(info, indent=1)[:3000])

shot("/tmp/sticky_full.png")
# Crop around the chat's right edge (the seam) if we found the chat.
try:
    c = info["chatRect"]
    x = c["x"] + c["w"] - 30
    shot("/tmp/sticky_seam.png", clip=(x, 0, 120, 1100))
except Exception as e:
    print("no seam crop:", e)

# Simulate the user's state: un-tuck the module NEXT to the chat (white card)
# while the module after it stays tucked behind it.
if PAGE.startswith("reformulation"):
    print("unstick:", js("(function(){var s=document.getElementById('rf-studio');if(!s)return 'no studio';s.dataset.stickyPref='off';s.classList.remove('is-sticky');return 'ok';})()"))
    time.sleep(1.0)
    r = js("(function(){var d=document.getElementById('rf-dash');var s=document.getElementById('rf-studio');var dr=d.getBoundingClientRect();var sr=s.getBoundingClientRect();return JSON.stringify({studio:[Math.round(sr.left),Math.round(sr.right)],dash:[Math.round(dr.left),Math.round(dr.right),Math.round(dr.top),Math.round(dr.bottom)]});})()")
    print("rects:", r)
    d = json.loads(r)
    shot("/tmp/sticky_unstick_full.png")
    shot("/tmp/sticky_unstick_seam.png", clip=(d["studio"][1] - 30, 0, 120, 1100))

proc.terminate()
print("done")
