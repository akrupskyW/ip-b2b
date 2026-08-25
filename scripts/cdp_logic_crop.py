"""Readable crops of the App Logic module (header + first page cards), both themes.

Companion to scripts/cdp_logic_shot.py, which captures the whole (very tall)
module. This one clips to a legible slice at 2x so the rule text can actually
be proofread in a screenshot.
"""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys

CDP_PORT = 9345
HTTP_PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8099
ORIGIN = "http://localhost:%d" % HTTP_PORT
# %d is a cache-buster: without a changing URL, Page.navigate to the same
# address with the same hash is a no-op and the shot reuses the prior state.
URL = ORIGIN + "/pages/all-modules.html?v=%d#mi-logic"
_nav = [0]
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# A leftover headless Chrome still holding CDP_PORT gets attached to and then
# dies mid-run, which surfaces as a websocket reset. Clear it first.
subprocess.call("lsof -ti tcp:%d | xargs -r kill -9" % CDP_PORT, shell=True,
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.5)

proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
    "--hide-scrollbars", "--window-size=1500,1200",
    "--remote-debugging-port=%d" % CDP_PORT, "about:blank"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def ws_connect(url):
    hostport, path = url[5:].split("/", 1)
    host, port = hostport.split(":")
    s = socket.create_connection((host, int(port)))
    key = base64.b64encode(os.urandom(16)).decode()
    s.sendall(("GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
               "Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n" % (path, hostport, key)).encode())
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
        pages = [t for t in json.load(urllib.request.urlopen("http://127.0.0.1:%d/json" % CDP_PORT))
                 if t.get("type") == "page"]
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


def js(expr):
    return cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True}) \
        .get("result", {}).get("result", {}).get("value")


cmd("Page.enable")
cmd("Runtime.enable")

AUTH = ("localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Arthur Krupsky',"
        "email:'akrupsky@wisecode.ai',initials:'AK'}));")


def shoot(theme, out, anchor, height=1500, after=None, offset=0):
    """Capture the viewport with `anchor` scrolled to the top. A tall viewport
    beats a clip here: clipping beyond the viewport re-lays-out the grid and
    the icon font may still be swapping, so we wait on document.fonts first.

    `after` is JS run once the page has settled (to exercise filters/search);
    `offset` scrolls further down from the anchor before capturing."""
    cmd("Emulation.setDeviceMetricsOverride",
        {"width": 1500, "height": height, "deviceScaleFactor": 2, "mobile": False})
    # Seed auth + theme against the real origin, then load the page fresh. An
    # init script can't do this (localStorage isn't reachable at document-create
    # time on the first navigation), and a reload is unsafe: the first hit is
    # unauthenticated, so auth-guard may already have replaced us with
    # login.html — which then bounces the now-signed-in visitor to wiseai.html.
    cmd("Page.navigate", {"url": ORIGIN + "/pages/all-modules.html"})
    time.sleep(1.5)
    js(AUTH + "localStorage.setItem('wise-theme','%s');localStorage.setItem('chat-theme','%s');1"
       % (theme, theme))
    _nav[0] += 1
    cmd("Page.navigate", {"url": URL % _nav[0]})
    time.sleep(3.0)
    # Material Symbols is a remote webfont — until its face resolves the icons
    # capture as their literal ligature text ("expand_more", "hub", …).
    # document.fonts.status can read 'loaded' before that face is requested, so
    # ask for it by name and then confirm a real glyph is being drawn.
    # It is fetched from Google Fonts, so in headless it can resolve well after
    # document.fonts.status flips to 'loaded'. Ask for the face by name and
    # poll fonts.check() rather than trusting the aggregate status.
    js("document.fonts.load('24px \"Material Symbols Outlined\"','hub')")
    for _ in range(60):
        if js("document.fonts.check('24px \"Material Symbols Outlined\"')"):
            break
        time.sleep(0.25)
    if after:
        print("[%s] after ->" % theme, js(after))
        time.sleep(0.8)
    # The shell scrolls an inner pane, not the window, so walk up to the real
    # scroller before applying `offset`.
    js("(function(){var e=document.querySelector('%s');if(!e)return;"
       "e.scrollIntoView({block:'start'});var o=%d;if(!o)return;"
       "var p=e.parentElement;while(p){var cs=getComputedStyle(p);"
       "if(/(auto|scroll)/.test(cs.overflowY)&&p.scrollHeight>p.clientHeight+4)"
       "{p.scrollTop+=o;return;}p=p.parentElement;}"
       "(document.scrollingElement||document.documentElement).scrollTop+=o;})()" % (anchor, offset))
    time.sleep(1.2)
    print("[%s] icons ok:" % theme,
          js("document.fonts.check('24px \"Material Symbols Outlined\"')"),
          "| html.dark:", js("document.documentElement.classList.contains('dark')"),
          "| page:", js("location.pathname"))
    r = cmd("Page.captureScreenshot", {"format": "png"})
    open(out, "wb").write(base64.b64decode(r["result"]["data"]))
    print("[%s] wrote %s" % (theme, out))
    cmd("Emulation.clearDeviceMetricsOverride")


SEARCH = ("(function(){var i=document.querySelector('#mi-logic-search');"
          "i.value='localStorage';i.dispatchEvent(new Event('input',{bubbles:true}));"
          "return document.querySelector('#mi-logic-shown').textContent;})()")
FILTER = ("(function(){document.querySelector('#mi-logic [data-logic-filter=\"verify\"]').click();"
          "return document.querySelector('#mi-logic-shown').textContent;})()")

shoot("light", "/tmp/wise-logic-crop-light.png", "#mi-logic")
shoot("dark", "/tmp/wise-logic-crop-dark.png", "#mi-logic")
shoot("light", "/tmp/wise-logic-rules.png", "#logic-product-portfolio")
shoot("dark", "/tmp/wise-logic-rules-dark.png", "#logic-product-portfolio")
shoot("light", "/tmp/wise-logic-search.png", "#mi-logic-grid", after=SEARCH)
shoot("light", "/tmp/wise-logic-filter.png", "#mi-logic-grid", after=FILTER)

proc.terminate()
print("done")
