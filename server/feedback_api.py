#!/usr/bin/env python3
"""Comment API for the on-page feedback widget (js/feedback.js).

Reviewers press C on any page of the deployed app, click a spot and leave a
note; this service is what makes those notes visible to everyone else instead
of dying in the reviewer's own browser. Comments and replies live in a single
SQLite file, so there is no database server to run and the data survives a
restart or redeploy.

Public (no key): read comments for a page, post a comment, post a reply.
Key-gated (X-Feedback-Key header): read every page's comments at once, resolve
a thread, delete a thread. The key is whatever WISE_FEEDBACK_KEY is set to in
the systemd unit.

Run behind gunicorn + nginx (see server/README.md); nginx proxies /api/feedback
to this app so the browser talks to the same origin as the site.
"""

import os
import re
import sqlite3
import time
import uuid
from datetime import datetime, timezone

from flask import Flask, g, jsonify, request

DB_PATH = os.environ.get("WISE_FEEDBACK_DB", "/var/lib/wise-feedback/comments.db")
ADMIN_KEY = os.environ.get("WISE_FEEDBACK_KEY", "")
# Extra site origins allowed to call the API, comma separated. The deployed
# site is same-origin and needs none of this; it exists so a local checkout
# (served by a plain static server on some port) writes to the SAME store
# instead of stranding notes in one browser.
ALLOW_ORIGINS = {
    o.strip() for o in os.environ.get("WISE_FEEDBACK_ORIGIN", "").split(",") if o.strip()
}
# Accept http://localhost:* and http://127.0.0.1:* whatever port the local
# static server happens to be on. Off unless explicitly enabled.
ALLOW_LOCALHOST = os.environ.get("WISE_FEEDBACK_ALLOW_LOCALHOST", "") == "1"
_LOCALHOST_RE = re.compile(r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$")

MAX_TEXT = 4000
MAX_NAME = 80
MAX_SELECTOR = 600
CHIPS = {"bug", "design", "copy", "question", "idea"}

app = Flask(__name__)


# ── Storage ────────────────────────────────────────────────────────────────
SCHEMA = """
CREATE TABLE IF NOT EXISTS comments (
    id          TEXT PRIMARY KEY,
    page        TEXT NOT NULL,
    url         TEXT,
    selector    TEXT NOT NULL,
    fx          REAL NOT NULL,
    fy          REAL NOT NULL,
    viewport_w  INTEGER,
    viewport_h  INTEGER,
    chip        TEXT NOT NULL,
    text        TEXT NOT NULL,
    author      TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    resolved    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_comments_page ON comments(page);

CREATE TABLE IF NOT EXISTS replies (
    id          TEXT PRIMARY KEY,
    comment_id  TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    author      TEXT NOT NULL,
    text        TEXT NOT NULL,
    created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_replies_comment ON replies(comment_id);
"""


def db():
    if "db" not in g:
        directory = os.path.dirname(DB_PATH)
        if directory:
            os.makedirs(directory, exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        # WAL keeps a reader from blocking the reviewer who is posting.
        conn.execute("PRAGMA journal_mode = WAL")
        conn.executescript(SCHEMA)
        g.db = conn
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


# ── Helpers ────────────────────────────────────────────────────────────────
def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def written_at(value):
    """Timestamp for a note, preferring the server clock.

    A note written while the API was unreachable is replayed later, so it may
    legitimately carry an older client timestamp; keeping it stops a backlog
    from all landing at once at the top of the thread. Anything in the future
    or absurdly old is a wrong client clock, so fall back to now.
    """
    if not isinstance(value, str) or not value:
        return now_iso()
    try:
        stamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return now_iso()
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    if stamp > now or (now - stamp).days > 90:
        return now_iso()
    return stamp.astimezone(timezone.utc).isoformat(timespec="seconds")


def clean(value, limit):
    if value is None:
        return ""
    text = str(value).replace("\x00", "").strip()
    return text[:limit]


def is_admin():
    return bool(ADMIN_KEY) and request.headers.get("X-Feedback-Key", "") == ADMIN_KEY


def need_admin():
    return jsonify({"error": "unauthorized"}), 401


def page_of(value):
    """Normalize to a path so a comment left on ?foo=1 groups with the page."""
    path = clean(value, 300) or "/"
    path = re.sub(r"[?#].*$", "", path)
    if not path.startswith("/"):
        path = "/" + path
    return path


def row_to_comment(row, replies):
    return {
        "id": row["id"],
        "page": row["page"],
        "url": row["url"],
        "selector": row["selector"],
        "fx": row["fx"],
        "fy": row["fy"],
        "viewport_w": row["viewport_w"],
        "viewport_h": row["viewport_h"],
        "chip": row["chip"],
        "text": row["text"],
        "author": row["author"],
        "created_at": row["created_at"],
        "resolved": row["resolved"],
        "replies": replies,
    }


def fetch(where="", params=()):
    conn = db()
    rows = conn.execute(
        "SELECT * FROM comments " + where + " ORDER BY created_at ASC", params
    ).fetchall()
    if not rows:
        return []
    ids = [r["id"] for r in rows]
    marks = ",".join("?" * len(ids))
    reply_rows = conn.execute(
        "SELECT * FROM replies WHERE comment_id IN (%s) ORDER BY created_at ASC" % marks,
        ids,
    ).fetchall()
    grouped = {}
    for r in reply_rows:
        grouped.setdefault(r["comment_id"], []).append(
            {
                "id": r["id"],
                "author": r["author"],
                "text": r["text"],
                "created_at": r["created_at"],
            }
        )
    return [row_to_comment(r, grouped.get(r["id"], [])) for r in rows]


# Crude flood guard: a handful of posts per IP per minute is plenty for humans
# reviewing a page, and keeps a stray script from filling the disk.
_hits = {}
POST_LIMIT = 20
POST_WINDOW = 60


def rate_limited():
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "?").split(",")[0].strip()
    now = time.time()
    hits = [t for t in _hits.get(ip, []) if now - t < POST_WINDOW]
    hits.append(now)
    _hits[ip] = hits
    if len(_hits) > 4096:
        _hits.clear()
    return len(hits) > POST_LIMIT


def origin_allowed(origin: str) -> bool:
    if not origin:
        return False
    if origin in ALLOW_ORIGINS:
        return True
    return ALLOW_LOCALHOST and bool(_LOCALHOST_RE.match(origin))


@app.after_request
def cors(resp):
    origin = request.headers.get("Origin", "")
    if origin_allowed(origin):
        # Echo the caller rather than "*": the allowlist is the gate, and an
        # echoed origin keeps the door open to credentialed requests later.
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Feedback-Key"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
        resp.headers["Access-Control-Max-Age"] = "86400"
    return resp


# ── Routes ─────────────────────────────────────────────────────────────────
@app.get("/api/feedback/health")
def health():
    return jsonify({"ok": True, "comments": db().execute("SELECT COUNT(*) c FROM comments").fetchone()["c"]})


@app.get("/api/feedback/comments")
def list_comments():
    page = page_of(request.args.get("page", "/"))
    return jsonify(fetch("WHERE page = ?", (page,)))


@app.get("/api/feedback/comments/all")
def list_all():
    if not is_admin():
        return need_admin()
    return jsonify(fetch())


@app.post("/api/feedback/comments")
def add_comment():
    if rate_limited():
        return jsonify({"error": "slow down"}), 429
    data = request.get_json(silent=True) or {}
    text = clean(data.get("text"), MAX_TEXT)
    author = clean(data.get("author"), MAX_NAME)
    selector = clean(data.get("selector"), MAX_SELECTOR)
    if not text or not author or not selector:
        return jsonify({"error": "text, author and selector are required"}), 400

    chip = clean(data.get("chip"), 20).lower()
    if chip not in CHIPS:
        chip = "question"

    def frac(v):
        try:
            return min(1.0, max(0.0, float(v)))
        except (TypeError, ValueError):
            return 0.5

    def num(v):
        try:
            return int(v)
        except (TypeError, ValueError):
            return None

    row = {
        "id": uuid.uuid4().hex[:12],
        "page": page_of(data.get("page", "/")),
        "url": clean(data.get("url"), 500),
        "selector": selector,
        "fx": frac(data.get("fx")),
        "fy": frac(data.get("fy")),
        "viewport_w": num(data.get("viewport_w")),
        "viewport_h": num(data.get("viewport_h")),
        "chip": chip,
        "text": text,
        "author": author,
        "created_at": written_at(data.get("created_at")),
        "resolved": 0,
    }
    conn = db()
    conn.execute(
        "INSERT INTO comments (id, page, url, selector, fx, fy, viewport_w, viewport_h,"
        " chip, text, author, created_at, resolved)"
        " VALUES (:id, :page, :url, :selector, :fx, :fy, :viewport_w, :viewport_h,"
        " :chip, :text, :author, :created_at, :resolved)",
        row,
    )
    conn.commit()
    row["replies"] = []
    return jsonify(row), 201


@app.post("/api/feedback/comments/<cid>/replies")
def add_reply(cid):
    if rate_limited():
        return jsonify({"error": "slow down"}), 429
    data = request.get_json(silent=True) or {}
    text = clean(data.get("text"), MAX_TEXT)
    author = clean(data.get("author"), MAX_NAME)
    if not text or not author:
        return jsonify({"error": "text and author are required"}), 400

    conn = db()
    if conn.execute("SELECT 1 FROM comments WHERE id = ?", (cid,)).fetchone() is None:
        return jsonify({"error": "no such comment"}), 404

    reply = {
        "id": uuid.uuid4().hex[:12],
        "comment_id": cid,
        "author": author,
        "text": text,
        "created_at": written_at(data.get("created_at")),
    }
    conn.execute(
        "INSERT INTO replies (id, comment_id, author, text, created_at)"
        " VALUES (:id, :comment_id, :author, :text, :created_at)",
        reply,
    )
    conn.commit()
    reply.pop("comment_id")
    return jsonify(reply), 201


@app.post("/api/feedback/comments/<cid>/resolve")
def resolve(cid):
    if not is_admin():
        return need_admin()
    data = request.get_json(silent=True) or {}
    value = 1 if data.get("resolved") in (1, "1", True, "true") else 0
    conn = db()
    conn.execute("UPDATE comments SET resolved = ? WHERE id = ?", (value, cid))
    conn.commit()
    return jsonify({"ok": True, "resolved": value})


@app.delete("/api/feedback/comments/<cid>")
def delete(cid):
    if not is_admin():
        return need_admin()
    conn = db()
    conn.execute("DELETE FROM replies WHERE comment_id = ?", (cid,))
    conn.execute("DELETE FROM comments WHERE id = ?", (cid,))
    conn.commit()
    return jsonify({"ok": True})


# ── Serving the site ───────────────────────────────────────────────────────
# Point WISE_FEEDBACK_STATIC at the repo and this process serves the pages too,
# so the widget reaches /api/feedback on its own origin — no CORS, no second
# port. That is how it runs on the Ubuntu box (port 4144), replacing the old
# nocache_server.py, and it is also the easiest way to test locally.
STATIC_ROOT = os.environ.get("WISE_FEEDBACK_STATIC", "")

if STATIC_ROOT:
    from flask import send_from_directory

    def _no_cache(resp):
        """Browsers heuristically cache HTML/JS/CSS and serve stale copies after
        a git pull, so the site always revalidates (same contract the previous
        nocache_server.py provided)."""
        resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        resp.headers["Pragma"] = "no-cache"
        resp.headers["Expires"] = "0"
        return resp

    @app.get("/")
    def site_index():
        return _no_cache(send_from_directory(STATIC_ROOT, "index.html"))

    @app.get("/<path:filename>")
    def site_static(filename):
        full = os.path.join(STATIC_ROOT, filename)
        if os.path.isdir(full):
            filename = filename.rstrip("/") + "/index.html"
        return _no_cache(send_from_directory(STATIC_ROOT, filename))


if __name__ == "__main__":
    # Local development only; production runs under gunicorn.
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5001")), debug=True)
