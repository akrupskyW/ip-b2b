"""A very small Chrome DevTools Protocol client.

Just enough to drive a page headlessly — navigate, type, click, evaluate,
screenshot — without pulling in a browser-automation dependency. Shared by the
verify_feedback_* scripts.
"""
import base64
import json
import os
import shutil
import socket
import struct
import subprocess
import tempfile
import time
import urllib.request

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def _ws_connect(url):
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


def _ws_frame(s, opcode, payload=b""):
    hdr = bytearray([0x80 | opcode])
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


def _ws_send(s, data):
    _ws_frame(s, 0x1, data.encode())


def _ws_recv(s):
    """One application message, control frames handled on the way.

    A long watch (a probe that drives a whole chat turn) idles far longer than
    Chrome's keepalive. An unanswered ping is a closed socket a moment later, so
    ping is ponged here rather than read as if it were a message. Big payloads
    also arrive fragmented, so continuation frames are joined instead of
    desyncing the stream.
    """
    def rd(n):
        b = b""
        while len(b) < n:
            c = s.recv(n - len(b))
            if not c:
                raise IOError("closed")
            b += c
        return b
    buf = b""
    while True:
        b0, b1 = rd(2)
        fin = b0 & 0x80
        opcode = b0 & 0x0F
        ln = b1 & 0x7F
        if ln == 126:
            ln = struct.unpack(">H", rd(2))[0]
        elif ln == 127:
            ln = struct.unpack(">Q", rd(8))[0]
        payload = rd(ln) if ln else b""
        if opcode == 0x9:       # ping
            _ws_frame(s, 0xA, payload)
            continue
        if opcode == 0xA:       # pong
            continue
        if opcode == 0x8:       # close
            raise IOError("closed")
        buf += payload
        if fin:
            return buf.decode("utf-8", "replace")


def _page_target(port, tries=80):
    for _ in range(tries):
        try:
            data = json.load(urllib.request.urlopen("http://127.0.0.1:%d/json" % port))
            pages = [t for t in data if t.get("type") == "page"]
            if pages:
                return pages[0]
        except Exception:
            pass
        time.sleep(0.2)
    return None


class Browser(object):
    def __init__(self, port=9340, width=1440, height=900, out="/tmp/wise-shots"):
        self.out = out
        self.port = port
        os.makedirs(out, exist_ok=True)
        self._profile = tempfile.mkdtemp(prefix="wise-cdp-")
        self._proc = subprocess.Popen(
            [CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
             "--window-size=%d,%d" % (width, height), "--user-data-dir=" + self._profile,
             "--remote-debugging-port=%d" % port, "about:blank"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        target = _page_target(port)
        if not target:
            self.close()
            raise RuntimeError("no devtools target on port %d" % port)
        self._ws = _ws_connect(target["webSocketDebuggerUrl"])
        self._n = 0
        self._injected = None
        self.cmd("Page.enable")
        self.cmd("Runtime.enable")

    def _reconnect(self):
        """Re-attach to the same page after Chrome drops the devtools socket.

        A probe that watches a long, chatty run outlives the connection often
        enough that losing it must not lose the run: the tab is still there and
        still holds the page's state, so pick it up again and carry on.
        """
        try:
            self._ws.close()
        except Exception:
            pass
        target = _page_target(self.port, tries=25)
        if not target:
            raise IOError("devtools target gone on port %d" % self.port)
        self._ws = _ws_connect(target["webSocketDebuggerUrl"])
        self._n = 0

    def cmd(self, method, params=None, _retry=True):
        try:
            self._n += 1
            mid = self._n
            _ws_send(self._ws, json.dumps({"id": mid, "method": method,
                                           "params": params or {}}))
            while True:
                msg = json.loads(_ws_recv(self._ws))
                if msg.get("id") == mid:
                    return msg
        except (IOError, OSError, ValueError):
            if not _retry:
                raise
            self._reconnect()
            return self.cmd(method, params, _retry=False)

    def js(self, expr):
        r = self.cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True,
                                          "awaitPromise": True})
        return r.get("result", {}).get("result", {}).get("value")

    def on_new_document(self, source):
        """Replace the script run before every page load."""
        if self._injected:
            self.cmd("Page.removeScriptToEvaluateOnNewDocument", {"identifier": self._injected})
        r = self.cmd("Page.addScriptToEvaluateOnNewDocument", {"source": source})
        self._injected = r.get("result", {}).get("identifier")

    def goto(self, url, ready=None, timeout=30.0, settle=1.5):
        self.cmd("Page.navigate", {"url": url})
        deadline = time.time() + timeout
        while time.time() < deadline:
            time.sleep(0.4)
            if ready is None or self.js(ready):
                break
        time.sleep(settle)

    def key(self, k, code, vk):
        for kind in ("keyDown", "keyUp"):
            self.cmd("Input.dispatchKeyEvent", {"type": kind, "key": k, "code": code,
                                                "windowsVirtualKeyCode": vk,
                                                "nativeVirtualKeyCode": vk})

    def click(self, x, y):
        for kind in ("mousePressed", "mouseReleased"):
            self.cmd("Input.dispatchMouseEvent", {"type": kind, "x": x, "y": y,
                                                  "button": "left", "clickCount": 1})

    def fill(self, selector, value):
        return self.js(
            "(function(){var n=document.querySelector(%s);if(!n)return false;n.focus();"
            "n.value=%s;n.dispatchEvent(new Event('input',{bubbles:true}));return true})()"
            % (json.dumps(selector), json.dumps(value)))

    def click_sel(self, selector):
        return self.js("(function(){var n=document.querySelector(%s);if(!n)return false;"
                       "n.click();return true})()" % json.dumps(selector))

    def text(self, selector):
        return self.js("(function(){var n=document.querySelector(%s);"
                       "return n?n.textContent.replace(/\\s+/g,' ').trim():null})()"
                       % json.dumps(selector))

    def count(self, selector):
        return self.js("document.querySelectorAll(%s).length" % json.dumps(selector))

    def shot(self, name):
        r = self.cmd("Page.captureScreenshot", {"format": "png"})
        path = os.path.join(self.out, name + ".png")
        with open(path, "wb") as fh:
            fh.write(base64.b64decode(r["result"]["data"]))
        return path

    def close(self):
        try:
            self._proc.terminate()
        except Exception:
            pass
        shutil.rmtree(self._profile, ignore_errors=True)
