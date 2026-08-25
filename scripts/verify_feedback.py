"""Drive the on-page comment widget in headless Chrome and screenshot it.

Exercises the real path a reviewer takes — press C, click a spot, fill the
composer, post, reopen the pin, reply — in both light and dark mode, and
reports any JS errors the page threw along the way. Requires the API to be
running with WISE_FEEDBACK_STATIC pointed at the repo (see server/README.md).

    python3 scripts/verify_feedback.py [http://127.0.0.1:8770]
"""
import base64
import json
import os
import socket
import struct
import subprocess
import sys
import time
import urllib.request

PORT = 9334
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8770"
PAGE = BASE + "/pages/wiseai.html"
KEY = os.environ.get("WISE_FEEDBACK_KEY", "devsecret")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT = "/tmp/wise-feedback-shots"


def ws_connect(url):
    hostport, path = url[5:].split("/", 1)
    host, port = hostport.split(":")
    s = socket.create_connection((host, int(port)))
    key = base64.b64encode(os.urandom(16)).decode()
    s.sendall((
        "GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
        "Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n" % (path, hostport, key)
    ).encode())
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
        hdr.append(0x80 | 126)
        hdr += struct.pack(">H", n)
    else:
        hdr.append(0x80 | 127)
        hdr += struct.pack(">Q", n)
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
    ln = b1 & 0x7F
    if ln == 126:
        ln = struct.unpack(">H", rd(2))[0]
    elif ln == 127:
        ln = struct.unpack(">Q", rd(8))[0]
    return rd(ln).decode("utf-8", "replace")


def wipe():
    """Start each run from an empty board so the click point is never already
    occupied by a pin from the previous pass."""
    req = urllib.request.Request(BASE + "/api/feedback/comments/all",
                                 headers={"X-Feedback-Key": KEY})
    try:
        rows = json.load(urllib.request.urlopen(req))
    except Exception as exc:
        print("  (could not clear existing comments: %s)" % exc)
        return
    for row in rows:
        drop = urllib.request.Request(BASE + "/api/feedback/comments/" + row["id"],
                                      headers={"X-Feedback-Key": KEY}, method="DELETE")
        try:
            urllib.request.urlopen(drop)
        except Exception:
            pass
    print("  cleared %d existing comment(s)" % len(rows))


def main():
    os.makedirs(OUT, exist_ok=True)
    proc = subprocess.Popen(
        [CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
         "--window-size=1440,900", "--remote-debugging-port=%d" % PORT, "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

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
        print("no devtools target")
        proc.terminate()
        return 1

    ws = ws_connect(target["webSocketDebuggerUrl"])
    counter = [0]

    def cmd(method, params=None):
        counter[0] += 1
        mid = counter[0]
        ws_send(ws, json.dumps({"id": mid, "method": method, "params": params or {}}))
        while True:
            msg = json.loads(ws_recv(ws))
            if msg.get("id") == mid:
                return msg

    def js(expr):
        r = cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
        return r.get("result", {}).get("result", {}).get("value")

    def shot(name):
        r = cmd("Page.captureScreenshot", {"format": "png"})
        path = os.path.join(OUT, name + ".png")
        with open(path, "wb") as fh:
            fh.write(base64.b64decode(r["result"]["data"]))
        print("  shot:", path)

    def key(k, code, vk):
        for kind in ("keyDown", "keyUp"):
            cmd("Input.dispatchKeyEvent", {"type": kind, "key": k, "code": code,
                                           "windowsVirtualKeyCode": vk, "nativeVirtualKeyCode": vk})

    def click(x, y):
        for kind in ("mousePressed", "mouseReleased"):
            cmd("Input.dispatchMouseEvent", {"type": kind, "x": x, "y": y, "button": "left",
                                             "clickCount": 1})

    def fill(selector, value):
        js("(function(){var n=document.querySelector(%s);n.focus();n.value=%s;"
           "n.dispatchEvent(new Event('input',{bubbles:true}));return !!n})()"
           % (json.dumps(selector), json.dumps(value)))

    cmd("Page.enable")
    cmd("Runtime.enable")

    for theme in ("light", "dark"):
        print("\n=== %s ===" % theme)
        wipe()
        init = (
            "window.__errs=[];"
            "addEventListener('error',function(e){__errs.push((e.message||'')+' @ '+(e.filename||'')+':'+(e.lineno||''))});"
            "addEventListener('unhandledrejection',function(e){__errs.push('promise: '+(e.reason&&e.reason.message||e.reason))});"
            "try{localStorage.setItem('wise-theme',%s);localStorage.setItem('chat-theme',%s);"
            "localStorage.removeItem('wise-feedback-local');"
            # Leftover unsynced notes would place a stray pin on the click point
            # and open a thread instead of the composer.
            "localStorage.removeItem('wise-feedback-queue');"
            "localStorage.removeItem('wise-feedback-data');}catch(e){}"
        ) % (json.dumps(theme), json.dumps(theme))
        if theme == "dark":
            init += "document.addEventListener('DOMContentLoaded',function(){document.documentElement.classList.add('dark')});"
        cmd("Page.addScriptToEvaluateOnNewDocument", {"source": init})

        cmd("Page.navigate", {"url": PAGE + "?feedback=admin&key=" + KEY})
        # Poll rather than guess: a remote host over the network takes far
        # longer to paint this page than localhost does.
        ready = False
        for _ in range(50):
            time.sleep(0.5)
            if js("!!(window.WiseFeedback && document.querySelector('.wnote-fab'))"):
                ready = True
                break
        time.sleep(2.0)
        print("  widget loaded:", ready)
        print("  admin:", js("window.WiseFeedback && WiseFeedback.isAdmin()"))

        # Press C, then click a spot in the page body.
        key("c", "KeyC", 67)
        time.sleep(0.4)
        print("  armed:", js("document.documentElement.classList.contains('wnote-armed')"))
        shot("01-armed-" + theme)

        click(700, 300)
        time.sleep(0.6)
        print("  composer open:", js("!!document.querySelector('.wnote-post')"))
        js("(function(){var b=document.querySelector('.wnote-chip[data-chip=\"design\"]');b&&b.click()})()")
        fill(".wnote-pop .wnote-ta",
             "The hero number feels too small next to the headline — can it match the module title scale?")
        # This run is signed in as the owner, who posts under their own name
        # from the server and so has no name field to fill.
        print("  posting as:", js("(document.querySelector('.wnote-as')||{}).textContent||'(name field)'"))
        time.sleep(0.3)
        shot("02-composer-" + theme)

        js("(function(){var b=document.querySelector('.wnote-post');b&&b.click()})()")
        time.sleep(1.5)
        print("  pins:", js("document.querySelectorAll('.wnote-pin').length"),
              "| local-fallback:", js("WiseFeedback.isLocal()"),
              "| composer closed:", js("!document.querySelector('.wnote-post')"))
        shot("03-pin-" + theme)

        # Reopen the pin just created (the last one) and reply as the admin.
        js("(function(){var p=document.querySelectorAll('.wnote-pin');"
           "p.length&&p[p.length-1].click()})()")
        time.sleep(0.8)
        print("  thread open:", js("!!document.querySelector('.wnote-rta')"))
        fill(".wnote-rta", "Good catch — bumping it to the module title size today.")
        time.sleep(0.2)
        shot("04-thread-" + theme)
        js("(function(){var b=document.querySelector('.wnote-send');b&&b.click()})()")
        time.sleep(1.2)
        print("  replies:", js("document.querySelectorAll('.wnote-reply').length"))
        shot("05-replied-" + theme)

        # Panel listing every comment on the page.
        js("(function(){var b=document.querySelector('.wnote-x');b&&b.click();"
           "document.querySelector('.wnote-fab').click()})()")
        time.sleep(0.8)
        shot("06-panel-" + theme)

        print("  js errors:", js("(window.__errs||[]).join(' || ') || 'none'"))

    proc.terminate()
    print("\nscreenshots in", OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
