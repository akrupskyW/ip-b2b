#!/usr/bin/env python3
"""Local dev server with live reload (browser refresh on file changes)."""

import os

from livereload import Server

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 8765
HOST = "127.0.0.1"


def main():
    os.chdir(ROOT)
    server = Server()

    def ignore(path):
        base = os.path.basename(path)
        if base.startswith(".") and base not in (".", ".."):
            return True
        if "node_modules" in path.split(os.sep):
            return True
        if "__pycache__" in path.split(os.sep):
            return True
        return False

    server.watch("index.html", ignore=ignore)
    server.watch("js", ignore=ignore)
    server.watch("pages", ignore=ignore)

    print(f"WISE dev: http://{HOST}:{PORT}/")
    print("Watching index.html, js/, pages/ — save a file to reload the browser.")
    server.serve(port=PORT, host=HOST, root=ROOT, open_url=False, live_css=True)


if __name__ == "__main__":
    main()
