#!/usr/bin/env python3
"""Local dev server with live reload (browser refresh on file changes).

Start and stop this only from a terminal you own (e.g. Terminal.app, iTerm).
It is not wired to Cursor; closing a chat does not start or stop the process.

POST /__wise/ready writes js/dev-ready-data.js or js/ai-ready-data.js from
the All Modules toggles so a later commit / Ubuntu pull ships the same
flags. Bound to 127.0.0.1 only — the deployed static server does not
expose this."""

import json
import os
import subprocess
from urllib.parse import urlparse

from livereload import Server as LiveServer
from tornado import web
from tornado.httpclient import AsyncHTTPClient, HTTPClientError, HTTPRequest

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 8765
HOST = "127.0.0.1"
SEED_KIND = {
    "dev": {
        "path": os.path.join(ROOT, "js", "dev-ready-data.js"),
        "export": "DEV_READY_SEED",
        "header": """\
/* Dev Ready seed — the committed default for the green "Dev Ready" switches on
 * pages/all-modules.html. localStorage ('wise-dsc-dev-ready') holds only the
 * diff against this map. A local toggle writes this file so the next commit
 * / Ubuntu pull ships the same greens.
 */
""",
    },
    "ai": {
        "path": os.path.join(ROOT, "js", "ai-ready-data.js"),
        "export": "AI_READY_SEED",
        "header": """\
/* AI Ready seed — the committed default for the "AI Ready" switches on
 * pages/all-modules.html. Same persist rules as Dev Ready. localStorage
 * ('wise-dsc-ai-ready') holds only the diff against this map.
 */
""",
    },
}


def _valid_ready_id(value):
    if not isinstance(value, str):
        return False
    if not (1 <= len(value) <= 200):
        return False
    if any(ch in value for ch in ("\n", "\r", "\0")):
        return False
    return True


class ReadyWriteHandler(web.RequestHandler):
    def set_default_headers(self):
        self.set_header("Cache-Control", "no-store")

    def post(self):
        if self.request.remote_ip not in ("127.0.0.1", "::1"):
            self.set_status(403)
            return
        try:
            payload = json.loads(self.request.body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            self.set_status(400)
            self.write({"ok": False, "error": "bad json"})
            return
        kind = payload.get("kind") or "dev"
        spec = SEED_KIND.get(kind)
        if not spec:
            self.set_status(400)
            self.write({"ok": False, "error": "bad kind"})
            return
        ids = payload.get("ids")
        if not isinstance(ids, list) or not all(_valid_ready_id(i) for i in ids):
            self.set_status(400)
            self.write({"ok": False, "error": "bad ids"})
            return
        unique = sorted(set(ids))
        body = "\n".join(f"  {json.dumps(i, ensure_ascii=False)}: true," for i in unique)
        text = spec["header"] + f"export const {spec['export']} = {{\n{body}\n}};\n"
        with open(spec["path"], "w", encoding="utf-8") as fh:
            fh.write(text)
        self.write({"ok": True, "kind": kind, "count": len(unique)})


class OllamaProxyHandler(web.RequestHandler):
    """Same-origin pass-through to Ollama on this Mac. Localhost only."""

    def set_default_headers(self):
        self.set_header("Cache-Control", "no-store")

    async def get(self, path=""):
        await self._proxy(path)

    async def post(self, path=""):
        await self._proxy(path)

    async def _proxy(self, path):
        if self.request.remote_ip not in ("127.0.0.1", "::1"):
            self.set_status(403)
            return
        dest = "http://127.0.0.1:11434/" + str(path or "").lstrip("/")
        if self.request.query:
            dest += "?" + self.request.query
        req = HTTPRequest(
            url=dest,
            method=self.request.method,
            headers={"Content-Type": self.request.headers.get("Content-Type", "application/json")},
            body=self.request.body if self.request.method == "POST" else None,
            connect_timeout=2,
            request_timeout=60,
            allow_nonstandard_methods=True,
        )
        client = AsyncHTTPClient()
        try:
            resp = await client.fetch(req, raise_error=False)
        except HTTPClientError:
            self.set_status(502)
            self.write({"ok": False, "error": "ollama unavailable"})
            return
        except Exception:
            self.set_status(502)
            self.write({"ok": False, "error": "ollama unavailable"})
            return
        self.set_status(resp.code)
        content_type = resp.headers.get("Content-Type")
        if content_type:
            self.set_header("Content-Type", content_type)
        self.write(resp.body)


_WEB_HOSTS = (
    "world.openfoodfacts.org",
    "search.openfoodfacts.org",
    "en.wikipedia.org",
    "en.m.wikipedia.org",
)


class WebLookupHandler(web.RequestHandler):
    """Same-origin GET of an allow-listed public page. Localhost only."""

    def set_default_headers(self):
        self.set_header("Cache-Control", "no-store")

    async def get(self):
        if self.request.remote_ip not in ("127.0.0.1", "::1"):
            self.set_status(403)
            return
        raw = self.get_argument("u", "")
        if not raw.startswith("https://"):
            self.set_status(400)
            self.write({"ok": False, "error": "bad url"})
            return
        host = (urlparse(raw).hostname or "").lower()
        if host not in _WEB_HOSTS:
            self.set_status(400)
            self.write({"ok": False, "error": "host not allowed"})
            return
        req = HTTPRequest(
            url=raw,
            method="GET",
            headers={"User-Agent": "WISE-Demo/1.0 (local chat lookup)"},
            connect_timeout=3,
            request_timeout=8,
        )
        client = AsyncHTTPClient()
        try:
            resp = await client.fetch(req, raise_error=False)
            if resp.code < 500:
                self.set_status(resp.code)
                content_type = resp.headers.get("Content-Type")
                if content_type:
                    self.set_header("Content-Type", content_type)
                self.write(resp.body)
                return
        except Exception:
            pass
        # This Mac's Python cert store often fails HTTPS; curl is the fallback
        # the rest of the demo already uses for Open Food Facts.
        try:
            proc = subprocess.run(
                [
                    "curl", "-sL", "--max-time", "8",
                    "-A", "WISE-Demo/1.0 (local chat lookup)",
                    "-H", "Accept: application/json",
                    "-w", "\n__WISE_HTTP__%{http_code}",
                    raw,
                ],
                capture_output=True,
                timeout=10,
                check=False,
            )
        except Exception:
            self.set_status(502)
            self.write({"ok": False, "error": "lookup failed"})
            return
        blob = proc.stdout or b""
        if b"__WISE_HTTP__" not in blob:
            self.set_status(502)
            self.write({"ok": False, "error": "lookup failed"})
            return
        body, _, code = blob.rpartition(b"__WISE_HTTP__")
        try:
            status = int(code.decode("ascii", "replace").strip() or "502")
        except ValueError:
            status = 502
        self.set_status(status)
        self.set_header("Content-Type", "application/json")
        self.write(body)


class Server(LiveServer):
    def get_web_handlers(self, script):
        extra = [
            (r"/__wise/ready", ReadyWriteHandler),
            (r"/__wise/dev-ready", ReadyWriteHandler),
            (r"/__wise/ollama/(.*)", OllamaProxyHandler),
            (r"/__wise/web", WebLookupHandler),
        ]
        return extra + super().get_web_handlers(script)


def main():
    os.chdir(ROOT)
    server = Server()

    def ignore(path):
        base = os.path.basename(path)
        if base in ("dev-ready-data.js", "ai-ready-data.js"):
            return True
        if base.startswith(".") and base not in (".", ".."):
            return True
        if "node_modules" in path.split(os.sep):
            return True
        if "__pycache__" in path.split(os.sep):
            return True
        return False

    server.watch("index.html", ignore=ignore)
    server.watch("js/*.js", ignore=ignore)
    server.watch("pages/*.html", ignore=ignore)

    print(f"WISE dev: http://{HOST}:{PORT}/")
    print("Watching index.html, js/*.js, pages/*.html — save a file to reload the browser.")
    server.serve(port=PORT, host=HOST, root=ROOT, open_url=False, live_css=True)


if __name__ == "__main__":
    main()
