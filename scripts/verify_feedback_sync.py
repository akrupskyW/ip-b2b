"""Prove comments flow BOTH ways between a local checkout and the server.

The failure this guards against: locally the site is served by a plain static
server with no API, so the widget used to fall back to localStorage, latch a
sticky "local mode" flag, and strand every note in one browser. Nothing ever
reached the server.

The setup here reproduces that exactly — pages on one port, API on another,
different origins — and walks the five cases that matter:

  1. local page  -> server   a note written locally reaches the shared store
  2. server      -> local    a note left by a reviewer shows up locally
  3. offline               a note written with the API down is queued, not lost
  4. reconnect             the queued note syncs on the next load
  5. rescue                notes stranded by the OLD build are drained up too

Run the API first (see server/README.md), then:

    python3 scripts/verify_feedback_sync.py [static_base] [api_base]
"""
import base64
import json
import os
import shutil
import socket
import struct
import subprocess
import sys
import tempfile
import time
import urllib.request

PORT = 9336
STATIC = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8099"
API = sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:8770"
PAGE = STATIC + "/pages/wiseai.html"
KEY = os.environ.get("WISE_FEEDBACK_KEY", "devsecret")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DEAD_API = "http://127.0.0.1:9/api/feedback"  # nothing listens on port 9

fails = []


def check(label, got, want):
    ok = got == want
    print("  %s %s: %r%s" % ("PASS" if ok else "FAIL", label, got,
                             "" if ok else " (expected %r)" % (want,)))
    if not ok:
        fails.append(label)
    return ok


# ── Minimal CDP client ─────────────────────────────────────────────────────
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


# ── Server-side helpers (talk to the API directly, as the "server" side) ───
def api_all():
    req = urllib.request.Request(API + "/api/feedback/comments/all",
                                 headers={"X-Feedback-Key": KEY})
    return json.load(urllib.request.urlopen(req))


def api_texts():
    return sorted(c["text"] for c in api_all())


def api_wipe():
    for row in api_all():
        req = urllib.request.Request(API + "/api/feedback/comments/" + row["id"],
                                     headers={"X-Feedback-Key": KEY}, method="DELETE")
        try:
            urllib.request.urlopen(req)
        except Exception:
            pass


def api_post(text, author="Reviewer on server"):
    body = json.dumps({
        "page": "/pages/wiseai.html", "selector": "body", "fx": 0.4, "fy": 0.3,
        "chip": "question", "text": text, "author": author,
    }).encode()
    req = urllib.request.Request(API + "/api/feedback/comments", data=body,
                                 headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req))


def main():
    profile = tempfile.mkdtemp(prefix="wise-fb-sync-")
    proc = subprocess.Popen(
        [CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
         "--window-size=1440,900", "--user-data-dir=" + profile,
         "--remote-debugging-port=%d" % PORT, "about:blank"],
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
        shutil.rmtree(profile, ignore_errors=True)
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
        r = cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True,
                                     "awaitPromise": True})
        return r.get("result", {}).get("result", {}).get("value")

    def key(k, code, vk):
        for kind in ("keyDown", "keyUp"):
            cmd("Input.dispatchKeyEvent", {"type": kind, "key": k, "code": code,
                                           "windowsVirtualKeyCode": vk,
                                           "nativeVirtualKeyCode": vk})

    def click(x, y):
        for kind in ("mousePressed", "mouseReleased"):
            cmd("Input.dispatchMouseEvent", {"type": kind, "x": x, "y": y,
                                             "button": "left", "clickCount": 1})

    def fill(selector, value):
        js("(function(){var n=document.querySelector(%s);n.focus();n.value=%s;"
           "n.dispatchEvent(new Event('input',{bubbles:true}));return !!n})()"
           % (json.dumps(selector), json.dumps(value)))

    injected = [None]

    def load(remote=None, api=None):
        """Reload the page with the widget aimed somewhere.

        `remote` is the honest path: the static server on this port has no API,
        so the widget must probe, come up empty, and fall back on its own —
        exactly what happens in a local checkout. `api` pins the base outright,
        used only to simulate an unreachable server.
        """
        if injected[0]:
            cmd("Page.removeScriptToEvaluateOnNewDocument", {"identifier": injected[0]})
        src = ""
        if remote:
            src += "window.WISE_FEEDBACK_REMOTE=%s;" % json.dumps(remote)
        if api:
            src += "window.WISE_FEEDBACK_API=%s;" % json.dumps(api)
        r = cmd("Page.addScriptToEvaluateOnNewDocument", {"source": src})
        injected[0] = r.get("result", {}).get("identifier")
        cmd("Page.navigate", {"url": PAGE})
        for _ in range(60):
            time.sleep(0.5)
            if js("!!(window.WiseFeedback && document.querySelector('.wnote-fab'))"):
                break
        time.sleep(1.5)

    def write_note(x, y, text, author="AeyKay (local)"):
        key("c", "KeyC", 67)
        time.sleep(0.4)
        click(x, y)
        time.sleep(0.6)
        if not js("!!document.querySelector('.wnote-post')"):
            print("  !! composer did not open")
            return False
        fill(".wnote-pop .wnote-ta", text)
        fill(".wnote-pop .wnote-in", author)
        time.sleep(0.2)
        js("(function(){var b=document.querySelector('.wnote-post');b&&b.click()})()")
        time.sleep(1.5)
        return True

    cmd("Page.enable")
    cmd("Runtime.enable")
    api_wipe()

    # ── 1. local page -> shared server store ──────────────────────────────
    print("\n=== 1. a note written on the LOCAL page reaches the server ===")
    load(remote=API)
    print("  widget API:", js("WiseFeedback.api()"))
    print("  page key stored as:", js("(WiseFeedback.pageKey&&WiseFeedback.pageKey())||'n/a'"))
    write_note(700, 300, "LOCAL: nav spacing looks tight on this breakpoint")
    check("reached the server", api_texts(),
          ["LOCAL: nav spacing looks tight on this breakpoint"])
    check("not in local-only mode", js("WiseFeedback.isLocal()"), False)
    check("nothing left queued", js("WiseFeedback.pending()"), 0)

    # ── 2. server -> local page ───────────────────────────────────────────
    print("\n=== 2. a note left ON THE SERVER shows up locally ===")
    api_post("SERVER: the CTA copy reads as a question, not an action")
    load(remote=API)
    pins = js("document.querySelectorAll('.wnote-pin').length")
    check("both notes visible locally", pins, 2)
    seen = js("Array.from(document.querySelectorAll('.wnote-pin')).map(function(p){return p.title})")
    print("  pins:", seen)

    # ── 3. API unreachable -> queued, not lost ────────────────────────────
    print("\n=== 3. with the API DOWN the note is queued, not lost ===")
    load(api=DEAD_API)
    check("widget reports offline", js("WiseFeedback.isLocal()"), True)
    write_note(700, 420, "OFFLINE: this was written with no connection")
    check("queued locally", js("WiseFeedback.pending()"), 1)
    check("pin shown as pending",
          js("document.querySelectorAll('.wnote-pin.is-pending').length"), 1)
    check("server untouched while offline", len(api_texts()), 2)

    # ── 4. reconnect -> queue flushes ─────────────────────────────────────
    print("\n=== 4. back online, the queued note syncs up by itself ===")
    load(remote=API)
    check("queue drained", js("WiseFeedback.pending()"), 0)
    check("offline note now on the server",
          "OFFLINE: this was written with no connection" in api_texts(), True)
    check("no pending pins left",
          js("document.querySelectorAll('.wnote-pin.is-pending').length"), 0)

    # ── 5. notes stranded by the OLD build are rescued ────────────────────
    print("\n=== 5. notes stranded in localStorage by the old build are rescued ===")
    stranded = [{
        "id": "lold1", "page": "/pages/wiseai.html", "selector": "body",
        "fx": 0.6, "fy": 0.5, "chip": "bug", "text": "STRANDED: written before the fix",
        "author": "AeyKay", "url": PAGE, "created_at": "2026-08-21T12:00:00+00:00",
        "resolved": 0,
        "replies": [{"id": "rold1", "author": "AeyKay",
                     "text": "STRANDED REPLY: and so was this",
                     "created_at": "2026-08-21T12:05:00+00:00"}],
    }]
    js("(function(){localStorage.setItem('wise-feedback-data',%s);"
       "localStorage.setItem('wise-feedback-local','1');return 1})()"
       % json.dumps(json.dumps(stranded)))
    load(remote=API)
    texts = api_texts()
    check("stranded note pushed up", "STRANDED: written before the fix" in texts, True)
    rescued = [c for c in api_all() if c["text"] == "STRANDED: written before the fix"]
    check("its reply came with it",
          [r["text"] for r in rescued[0]["replies"]] if rescued else [],
          ["STRANDED REPLY: and so was this"])
    check("original timestamp kept",
          rescued[0]["created_at"] if rescued else "", "2026-08-21T12:00:00+00:00")
    check("legacy store emptied",
          js("localStorage.getItem('wise-feedback-data')"), "[]")
    check("sticky local flag no longer traps the widget",
          js("WiseFeedback.isLocal()"), False)

    print("\n  final server contents:")
    for c in sorted(api_all(), key=lambda c: c["created_at"]):
        print("   -", c["created_at"], "|", c["author"], "|", c["text"])
        for r in c["replies"]:
            print("       reply:", r["author"], "|", r["text"])

    print("\n  js errors:", js("(window.__errs||[]).join(' || ') || 'none'"))
    proc.terminate()
    shutil.rmtree(profile, ignore_errors=True)

    print("\n" + ("ALL CHECKS PASSED" if not fails else "FAILED: " + ", ".join(fails)))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
