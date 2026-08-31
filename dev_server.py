#!/usr/bin/env python3
"""Local dev server with live reload (browser refresh on file changes).

Start and stop this only from a terminal you own (e.g. Terminal.app, iTerm).
It is not wired to Cursor; closing a chat does not start or stop the process.

POST /__wise/dev-ready writes js/dev-ready-data.js from the All Modules
toggles so a later commit / Ubuntu pull ships the same greens. Bound to
127.0.0.1 only — the deployed static server does not expose this."""

import json
import os

from livereload import Server as LiveServer
from tornado import web

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 8765
HOST = "127.0.0.1"
SEED_PATH = os.path.join(ROOT, "js", "dev-ready-data.js")

SEED_HEADER = """\
/* Dev Ready seed — the committed default for the green "Dev Ready" switches on
 * pages/all-modules.html.
 *
 * The switches used to live only in localStorage ('wise-dsc-dev-ready'), which
 * is scoped per origin, so state built up on a local dev origin never reached
 * a deployed one. This map ships with the code instead. localStorage now holds
 * only the *diff* against this seed, so an updated seed reaches every browser
 * on the next push — including ones that have already toggled switches.
 *
 * Keys are the same stable ready ids the toggles render with:
 *   component name  e.g. "Score card"
 *   'dir:<area>'    directory areas        'tbl:<selector|label>'  tables
 *   'motion:<title>' motion items          'trace:<part>'          trace states
 *   'ds:<title>' / 'dsfont:*' / 'dstype:*'  design system parts
 *   'mi-*'          a whole module (set implicitly when every part is ready)
 * A value of `true` ships green; anything else ships off.
 *
 * On the local livereload server (127.0.0.1:8765) a toggle writes this file
 * automatically, so the next commit / pull is what the Ubuntu origin shows.
 * Manual fallback from any origin that holds the state you want to ship:
 *   1. open pages/all-modules.html there
 *   2. run  WiseDevReady.dumpSeed()  in the console (also copies to clipboard)
 *   3. paste the result over the export below and commit
 */
"""


def _valid_ready_id(value):
    if not isinstance(value, str):
        return False
    if not (1 <= len(value) <= 200):
        return False
    if any(ch in value for ch in ("\n", "\r", "\0")):
        return False
    return True


class DevReadyWriteHandler(web.RequestHandler):
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
        ids = payload.get("ids")
        if not isinstance(ids, list) or not all(_valid_ready_id(i) for i in ids):
            self.set_status(400)
            self.write({"ok": False, "error": "bad ids"})
            return
        unique = sorted(set(ids))
        body = "\n".join(f"  {json.dumps(i, ensure_ascii=False)}: true," for i in unique)
        text = SEED_HEADER + f"export const DEV_READY_SEED = {{\n{body}\n}};\n"
        with open(SEED_PATH, "w", encoding="utf-8") as fh:
            fh.write(text)
        self.write({"ok": True, "count": len(unique)})


class Server(LiveServer):
    def get_web_handlers(self, script):
        return [(r"/__wise/dev-ready", DevReadyWriteHandler)] + super().get_web_handlers(script)


def main():
    os.chdir(ROOT)
    server = Server()

    def ignore(path):
        base = os.path.basename(path)
        if base == "dev-ready-data.js":
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
