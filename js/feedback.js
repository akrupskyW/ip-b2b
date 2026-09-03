/* On-page comments — press C, click a spot, leave a note.
 *
 * Reviewers looking at the deployed app (any URL) hold nothing and simply press
 * "C" to arm comment mode, then click the exact spot they want to talk about. A
 * pin lands there and a composer opens with a category chip row, a free-text
 * box and their name (remembered per browser). The server stamps the date. Any
 * pin can be opened later to read the thread and reply, so the whole thing is a
 * conversation rather than a one-way suggestion box.
 *
 * Pins are anchored to an ELEMENT plus a fractional offset inside it — never to
 * raw page pixels. Most WISE pages set `body { overflow: hidden }` and scroll
 * inside module panes, so absolute coordinates are meaningless; resolving the
 * anchor's live getBoundingClientRect() every frame keeps a pin glued to its
 * target through scrolling, resizing, pane-width changes and re-renders.
 *
 * Storage goes to the shared API (see server/feedback_api.py) so comments are
 * visible to everyone, including the person who has to answer them. When that
 * API is unreachable — opening the files locally, or before the server piece is
 * deployed — it degrades to localStorage so the UI is still testable, and says
 * so in the panel.
 *
 * Self-contained: injects its own CSS (no stylesheet to wire up) and its own
 * inline SVG icons (no Material Symbols dependency, so it also works on the
 * marketing pages). Drop in with a single <script defer src> tag.
 */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  if (window.__wiseFeedbackReady) return;
  window.__wiseFeedbackReady = true;

  /* ── Config ──────────────────────────────────────────────────────────────
     There is ONE comment store, on the deployed server, and both the deployed
     site and a local checkout talk to it. That is the whole point: a note left
     while working locally has to reach the same place as one left by a
     reviewer on the server, or the two views disagree.

     Deployed, the API is same-origin. Locally the site is served by a plain
     static server (`python3 -m http.server`, dev_server.py) that has no API at
     all, so point at the deployed one instead. Override either with:
       <script>window.WISE_FEEDBACK_API = 'http://host:4144/api/feedback';</script>
       <script>window.WISE_FEEDBACK_REMOTE = 'http://host:4144';</script> */
  var REMOTE = window.WISE_FEEDBACK_REMOTE || 'http://3.17.180.155:4144';

  /* Which API to talk to is answered by asking, not by guessing from the
     hostname: a local checkout may be served by a static server with no API
     (fall back to the deployed one) or by feedback_api.py itself, which does
     have one (use it). Probed once, then reused for the session. */
  var API = window.WISE_FEEDBACK_API || '/api/feedback';
  var apiProbe = null;
  /* How the site owner is signed. The server is authoritative — it stamps the
     name on anything posted with the admin key — but the widget needs it up
     front to show "Replying as …" before you send. */
  var ownerName = 'Owner';
  /* Whether on-page commenting is switched on at all. The server owns this —
     it is a site-wide gate, not a per-browser preference — but it is mirrored
     into localStorage so the Appearance popover, which renders synchronously,
     can show the right state without waiting on a round trip. */
  var LS_ON = 'wise-comments-on';
  var commentsOn = lsGet(LS_ON) === '1';

  function health(base) {
    return fetch(base + '/health').then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (info) {
      if (info && info.owner) ownerName = info.owner;
      if (info && typeof info.enabled !== 'undefined') {
        commentsOn = !!info.enabled;
        lsSet(LS_ON, commentsOn ? '1' : '0');
      }
      return base;
    });
  }

  function apiBase() {
    if (apiProbe) return apiProbe;
    if (window.WISE_FEEDBACK_API) {
      apiProbe = health(API).catch(function () { return API; });
      return apiProbe;
    }
    apiProbe = health('/api/feedback').then(function (base) {
      API = base;
      return API;
    }).catch(function () {
      API = REMOTE + '/api/feedback';
      return health(API).catch(function () { return API; });
    });
    return apiProbe;
  }

  var LS_NAME = 'wise-feedback-name';
  var LS_KEY = 'wise-feedback-key';
  /* Anything written while the API was unreachable, waiting to be sent up. */
  var LS_QUEUE = 'wise-feedback-queue';
  /* The old local-only store, drained into the queue on first sight. */
  var LS_DATA = 'wise-feedback-data';

  /* "Comment" leads and is the default — a note is only a question, a bug or
     anything else if the person leaving it says so. */
  var DEFAULT_CHIP = 'comment';
  var CHIPS = [
    { id: 'comment', label: 'Comment' },
    { id: 'bug', label: 'Bug' },
    { id: 'design', label: 'Design' },
    { id: 'copy', label: 'Copy' },
    { id: 'question', label: 'Question' },
    { id: 'idea', label: 'Idea' }
  ];
  var CHIP_LABEL = {};
  CHIPS.forEach(function (c) { CHIP_LABEL[c.id] = c.label; });

  var ICONS = {
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6 6.4 5Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.6 16.2 5.4 12l-1.4 1.4 5.6 5.6L20.4 7.8 19 6.4 9.6 16.2Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2ZM6 9h12l-1 11a2 2 0 0 1-2 1.8H9A2 2 0 0 1 7 20L6 9Z"/></svg>',
    reply: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8 1.6 10 5.1-.8-4-3.2-8-10-9V9Z"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.6 21 12 3.4 3.4 3.4 10l12 2-12 2v6.6Z"/></svg>'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* private mode */ } }

  /* Page identity, normalised so the SAME page groups together however it was
     opened: /pages/wiseai.html on the server, on localhost:8099, or as a long
     file:///Users/... path in a local checkout. Keyed from /pages/ onward, or
     on the bare filename for the root-level pages. */
  function pageKey() {
    var p = location.pathname || '/';
    if (p.charAt(p.length - 1) === '/') p += 'index.html';
    var pages = p.indexOf('/pages/');
    if (pages !== -1) return p.slice(pages);
    var slash = p.lastIndexOf('/');
    if (slash !== -1) return '/' + p.slice(slash + 1);
    return p;
  }

  /* ── Anchoring ───────────────────────────────────────────────────────────
     A selector that survives a reload. Prefer a real id, then a stable data-*
     hook, and fall back to an :nth-of-type path. Kept short so a re-render of
     unrelated siblings does not invalidate it. */
  function cssPath(node) {
    if (!node || node.nodeType !== 1 || node === document.documentElement) return 'body';
    var parts = [];
    var cur = node;
    while (cur && cur.nodeType === 1 && cur !== document.body && parts.length < 8) {
      if (cur.id && document.querySelectorAll('#' + cssEscape(cur.id)).length === 1) {
        parts.unshift('#' + cssEscape(cur.id));
        return parts.join(' > ');
      }
      var seg = cur.tagName.toLowerCase();
      var hook = cur.getAttribute && (cur.getAttribute('data-flow') || cur.getAttribute('data-module') || cur.getAttribute('data-pane'));
      if (hook) {
        seg += '[data-flow="' + hook + '"]';
        if (document.querySelectorAll(seg).length === 1) { parts.unshift(seg); return parts.join(' > '); }
        seg = cur.tagName.toLowerCase();
      }
      var parent = cur.parentNode;
      if (parent && parent.nodeType === 1) {
        var same = [];
        for (var i = 0; i < parent.children.length; i++) {
          if (parent.children[i].tagName === cur.tagName) same.push(parent.children[i]);
        }
        if (same.length > 1) seg += ':nth-of-type(' + (same.indexOf(cur) + 1) + ')';
      }
      parts.unshift(seg);
      cur = cur.parentNode;
    }
    return 'body > ' + parts.join(' > ');
  }
  function cssEscape(s) {
    if (window.CSS && window.CSS.escape) return window.CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  /* The clicked element itself is often a tiny text node wrapper that vanishes
     on re-render. Walk up to the nearest element that is both identifiable and
     big enough to hold a meaningful fractional offset. */
  function anchorFor(target, x, y) {
    var node = target;
    /* A click that lands on <html> (page chrome, gaps between panes) would
       otherwise produce an anchor that resolves to nothing. */
    if (node === document.documentElement || !node || node.nodeType !== 1) node = document.body;
    while (node && node.nodeType === 1 && node !== document.body) {
      var r = node.getBoundingClientRect();
      var identified = node.id || (node.getAttribute && node.getAttribute('data-flow'));
      if (identified || (r.width >= 24 && r.height >= 16)) break;
      node = node.parentNode;
    }
    if (!node || node.nodeType !== 1) node = document.body;
    var rect = node.getBoundingClientRect();
    return {
      selector: cssPath(node),
      fx: rect.width ? (x - rect.left) / rect.width : 0.5,
      fy: rect.height ? (y - rect.top) / rect.height : 0.5,
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight
    };
  }
  function resolveAnchor(c) {
    var node = null;
    try { node = document.querySelector(c.selector); } catch (e) { node = null; }
    if (!node) return null;
    var r = node.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: r.left + r.width * c.fx, y: r.top + r.height * c.fy };
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var opts = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
    return d.toLocaleString(undefined, opts);
  }

  /* ── Store ───────────────────────────────────────────────────────────────
     The server is the only source of truth. When it cannot be reached a write
     is parked in a local queue and replayed on the next load that gets
     through, so a note written on a plane still lands in the shared store
     rather than being stranded in one browser.

     Deliberately NOT sticky: an earlier version latched a permanent
     "local mode" flag on the first failed request, which meant a browser that
     ever saw a 404 never spoke to the API again. Reachability is re-tested on
     every load. */
  var Store = (function () {
    var offline = false;

    function readQueue() {
      try { return JSON.parse(lsGet(LS_QUEUE) || '[]'); } catch (e) { return []; }
    }
    function writeQueue(q) { lsSet(LS_QUEUE, JSON.stringify(q)); }
    function push(op) { var q = readQueue(); q.push(op); writeQueue(q); return op; }
    function localId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

    function req(path, opts) {
      opts = opts || {};
      var headers = { 'Content-Type': 'application/json' };
      var key = lsGet(LS_KEY);
      if (key) headers['X-Feedback-Key'] = key;
      return apiBase().then(function (base) {
        return fetch(base + path, {
          method: opts.method || 'GET',
          headers: headers,
          body: opts.body ? JSON.stringify(opts.body) : undefined
        });
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    }

    /* Comments written by the old local-only fallback. Fold them into the
       queue once so nothing written before this fix is lost. */
    function drainLegacy() {
      var rows;
      try { rows = JSON.parse(lsGet(LS_DATA) || '[]'); } catch (e) { rows = []; }
      if (!rows.length) return;
      var q = readQueue();
      rows.forEach(function (c) {
        var lid = c.id || localId('l');
        q.push({ kind: 'comment', id: lid, data: {
          page: c.page, selector: c.selector, fx: c.fx, fy: c.fy,
          chip: c.chip, text: c.text, author: c.author, url: c.url,
          viewport_w: c.viewport_w, viewport_h: c.viewport_h,
          created_at: c.created_at
        } });
        (c.replies || []).forEach(function (r) {
          q.push({ kind: 'reply', commentId: lid, data: { author: r.author, text: r.text, created_at: r.created_at } });
        });
      });
      writeQueue(q);
      lsSet(LS_DATA, '[]');
    }

    /* Replay parked writes oldest-first. A reply may point at a comment that
       is itself still queued, so remember each local id -> server id as we go.
       Anything that fails stays queued for the next attempt. */
    function flush() {
      var q = readQueue();
      if (!q.length) return Promise.resolve(false);
      var idMap = {};
      var left = [];
      var chain = Promise.resolve();
      q.forEach(function (op) {
        chain = chain.then(function () {
          if (op.kind === 'comment') {
            return req('/comments', { method: 'POST', body: op.data }).then(function (saved) {
              idMap[op.id] = saved.id;
            });
          }
          var cid = idMap[op.commentId] || op.commentId;
          return req('/comments/' + encodeURIComponent(cid) + '/replies', { method: 'POST', body: op.data });
        }).catch(function () { left.push(op); });
      });
      return chain.then(function () {
        writeQueue(left);
        return left.length !== q.length;
      });
    }

    /* Queued writes rendered in the same shape the API returns, so a pending
       pin looks and behaves like any other until it syncs. */
    function pending(page) {
      var q = readQueue();
      var byId = {};
      var out = [];
      q.forEach(function (op) {
        if (op.kind !== 'comment') return;
        if (page && op.data.page !== page) return;
        var c = {};
        for (var k in op.data) c[k] = op.data[k];
        c.id = op.id;
        c.created_at = op.data.created_at || new Date().toISOString();
        c.replies = [];
        c.resolved = 0;
        c.pending = true;
        byId[op.id] = c;
        out.push(c);
      });
      q.forEach(function (op) {
        if (op.kind !== 'reply') return;
        var c = byId[op.commentId];
        if (!c) return;
        var r = {};
        for (var k in op.data) r[k] = op.data[k];
        r.pending = true;
        c.replies.push(r);
      });
      return out;
    }

    /* Replies parked against comments that already live on the server. */
    function mergePendingReplies(rows) {
      var q = readQueue();
      if (!q.length) return rows;
      var byId = {};
      rows.forEach(function (c) { byId[c.id] = c; });
      q.forEach(function (op) {
        if (op.kind !== 'reply') return;
        var c = byId[op.commentId];
        if (!c) return;
        var r = {};
        for (var k in op.data) r[k] = op.data[k];
        r.pending = true;
        (c.replies = c.replies || []).push(r);
      });
      return rows;
    }

    function sync() {
      drainLegacy();
      return flush().catch(function () { return false; });
    }

    return {
      isLocal: function () { return offline; },
      pendingCount: function () { return readQueue().length; },
      list: function (page) {
        return sync().then(function () {
          return req('/comments?page=' + encodeURIComponent(page));
        }).then(function (rows) {
          offline = false;
          return mergePendingReplies(rows).concat(pending(page));
        }).catch(function () {
          offline = true;
          return pending(page);
        });
      },
      listAll: function () {
        return sync().then(function () {
          return req('/comments/all');
        }).then(function (rows) {
          offline = false;
          return mergePendingReplies(rows).concat(pending(null));
        }).catch(function () {
          offline = true;
          return pending(null);
        });
      },
      add: function (c) {
        return req('/comments', { method: 'POST', body: c }).then(function (saved) {
          offline = false;
          return saved;
        }).catch(function () {
          offline = true;
          var op = push({ kind: 'comment', id: localId('l'), data: c });
          var row = {};
          for (var k in c) row[k] = c[k];
          row.id = op.id;
          row.created_at = new Date().toISOString();
          row.replies = [];
          row.resolved = 0;
          row.pending = true;
          return row;
        });
      },
      reply: function (id, r) {
        return req('/comments/' + encodeURIComponent(id) + '/replies', { method: 'POST', body: r })
          .then(function (saved) { offline = false; return saved; })
          .catch(function () {
            offline = true;
            push({ kind: 'reply', commentId: id, data: r });
            var row = {};
            for (var k in r) row[k] = r[k];
            row.created_at = new Date().toISOString();
            row.pending = true;
            return row;
          });
      },
      resolve: function (id, val) {
        return req('/comments/' + encodeURIComponent(id) + '/resolve', { method: 'POST', body: { resolved: val ? 1 : 0 } });
      },
      setEnabled: function (on) {
        return req('/settings', { method: 'POST', body: { enabled: on ? 1 : 0 } });
      },
      remove: function (id) {
        if (String(id).charAt(0) === 'l') {
          writeQueue(readQueue().filter(function (op) {
            return op.id !== id && op.commentId !== id;
          }));
          return Promise.resolve({ ok: true });
        }
        return req('/comments/' + encodeURIComponent(id), { method: 'DELETE' });
      }
    };
  })();

  /* ── State ───────────────────────────────────────────────────────────── */
  var comments = [];
  var armed = false;
  var pins = {};          // id -> pin element
  var openPopup = null;   // { node, comment, anchor }
  var admin = false;
  var panelOpen = false;

  /* Admin unlock: ?feedback=admin&key=SECRET — the key is remembered and sent
     as a header, then scrubbed from the URL so it is not left in the address
     bar or copied into a share link. */
  (function initAdmin() {
    var q = new URLSearchParams(location.search);
    if (q.get('feedback') === 'admin') {
      var k = q.get('key');
      if (k) lsSet(LS_KEY, k);
      admin = true;
      q.delete('feedback'); q.delete('key');
      var qs = q.toString();
      try {
        history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
      } catch (e) { /* file:// */ }
    } else if (lsGet(LS_KEY)) {
      admin = true;
    }
  })();

  /* ── Styles ──────────────────────────────────────────────────────────────
     Everything is prefixed wnote- (fb- is already taken by the full-bleed
     theming in wise.css). Colors fall back to literals so the widget also
     renders correctly on pages that do not load wise.css. */
  var CSS = [
    ':root{',
    '--wnote-comment:#5B6B7C;',
    '--wnote-bug:#DC3038;--wnote-design:#25507C;--wnote-copy:#B07908;--wnote-question:#2E7D9A;--wnote-idea:#2E9A5E;',
    '--wnote-surface:var(--surface,#fff);--wnote-bg:var(--surface-2,#F4F2EA);',
    '--wnote-text:var(--text,#111827);--wnote-muted:var(--text-subtle,#444B55);',
    '--wnote-border:var(--border-strong,rgba(37,80,124,.28));',
    '}',
    'html.dark{',
    '--wnote-comment:#93A3B4;',
    '--wnote-bug:#FF6B72;--wnote-design:#8B9FAF;--wnote-copy:#E8B84B;--wnote-question:#5FB6D1;--wnote-idea:#4FC98A;',
    '--wnote-surface:var(--surface,#0D1B24);--wnote-bg:var(--surface-2,#112633);',
    '--wnote-text:var(--text,#F3F4F6);--wnote-muted:var(--text-subtle,#BCC6D3);',
    '}',
    '#wnote-root{position:fixed;inset:0;z-index:2000000;pointer-events:none;',
    "font-family:'WISE Digits','DM Sans',system-ui,sans-serif;}",
    '#wnote-root *{box-sizing:border-box;}',
    '#wnote-root svg{width:1em;height:1em;fill:currentColor;display:block;}',

    /* Armed state */
    'html.wnote-armed,html.wnote-armed *{cursor:crosshair !important;}',
    '.wnote-hint{position:fixed;top:16px;left:50%;transform:translateX(-50%);pointer-events:none;',
    'background:var(--wnote-surface);color:var(--wnote-text);border:1px solid var(--wnote-border);',
    'border-radius:9999px;padding:8px 16px;font-size:12px;font-weight:600;',
    'box-shadow:0 8px 24px rgba(17,24,39,.18);display:flex;align-items:center;gap:8px;}',
    '.wnote-hint kbd{font:inherit;font-size:11px;background:var(--wnote-bg);border:1px solid var(--wnote-border);',
    'border-radius:5px;padding:1px 5px;}',

    /* Pins — circular by design (no rounded-square icon tiles anywhere). */
    '.wnote-pin{position:fixed;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;',
    'pointer-events:auto;cursor:pointer;border:2px solid #fff;color:#fff;font-size:12px;font-weight:700;',
    'display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(17,24,39,.35);',
    'transition:transform .14s ease;padding:0;font-family:inherit;}',
    '.wnote-pin:hover{transform:scale(1.16);}',
    '.wnote-pin.is-open{transform:scale(1.16);box-shadow:0 0 0 4px rgba(37,80,124,.28),0 2px 8px rgba(17,24,39,.35);}',
    '.wnote-pin.is-resolved{opacity:.45;}',
    '.wnote-pin.is-pending{border-style:dashed;border-color:#f59e0b;}',
    'html.dark .wnote-pin{border-color:rgba(255,255,255,.55);}',
    'html.dark .wnote-pin.is-pending{border-color:#fbbf24;}',

    /* Popups (composer + thread) */
    '.wnote-pop{position:fixed;width:320px;max-width:calc(100vw - 24px);pointer-events:auto;',
    'background:var(--wnote-surface);color:var(--wnote-text);border:1px solid var(--wnote-border);',
    'border-radius:16px;box-shadow:0 12px 40px rgba(17,24,39,.22);overflow:hidden;}',
    '.wnote-pop-head{display:flex;align-items:center;justify-content:space-between;gap:8px;',
    'padding:12px 14px 8px;}',
    ".wnote-title{font-family:'WISE Digits','Noto Serif',serif;font-weight:800;font-size:1rem;margin:0;}",
    '.wnote-x{pointer-events:auto;background:none;border:0;color:var(--wnote-muted);cursor:pointer;',
    'font-size:16px;padding:2px;border-radius:50%;display:flex;}',
    '.wnote-x:hover{color:var(--wnote-text);}',
    '.wnote-body{padding:0 14px 14px;}',

    /* Chip row */
    '.wnote-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px;}',
    '.wnote-chip{height:26px;padding:0 10px;border-radius:9999px;border:1px solid var(--wnote-border);',
    'background:transparent;color:var(--wnote-muted);font-family:inherit;font-size:11px;font-weight:600;',
    'cursor:pointer;display:inline-flex;align-items:center;gap:6px;line-height:1;}',
    '.wnote-chip::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--wnote-dot,#888);}',
    '.wnote-chip:hover{color:var(--wnote-text);border-color:var(--wnote-dot,var(--wnote-border));}',
    '.wnote-chip[aria-pressed="true"]{color:#fff;background:var(--wnote-dot,#555);border-color:var(--wnote-dot,#555);}',
    '.wnote-chip[aria-pressed="true"]::before{background:#fff;}',
    'html.dark .wnote-chip[aria-pressed="true"]{color:#05141C;}',

    /* Inputs */
    '.wnote-ta,.wnote-in{width:100%;font-family:inherit;font-size:13px;color:var(--wnote-text);',
    'background:var(--wnote-bg);border:1px solid var(--wnote-border);border-radius:10px;padding:8px 10px;',
    'outline:none;resize:vertical;}',
    '.wnote-ta{min-height:74px;line-height:1.45;}',
    '.wnote-in{height:34px;margin-top:8px;}',
    '.wnote-ta:focus,.wnote-in:focus{border-color:var(--wnote-design);}',
    '.wnote-ta::placeholder,.wnote-in::placeholder{color:var(--wnote-muted);opacity:.85;}',
    '.wnote-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:10px;}',
    '.wnote-btn{height:32px;padding:0 14px;border-radius:9999px;font-family:inherit;font-size:12px;',
    'font-weight:600;cursor:pointer;border:1px solid var(--wnote-border);background:transparent;',
    'color:var(--wnote-muted);display:inline-flex;align-items:center;gap:6px;}',
    '.wnote-btn:hover{color:var(--wnote-text);}',
    '.wnote-btn.primary{background:var(--wnote-design);border-color:var(--wnote-design);color:#fff;}',
    'html.dark .wnote-btn.primary{color:#05141C;}',
    '.wnote-btn.primary:hover{filter:brightness(1.08);}',
    '.wnote-btn[disabled]{opacity:.5;cursor:default;}',

    /* Thread */
    '.wnote-meta{display:flex;align-items:center;flex-wrap:wrap;gap:2px 6px;font-size:11px;',
    'color:var(--wnote-muted);}',
    '.wnote-meta > span{white-space:nowrap;}',
    '.wnote-tag{font-weight:700;color:var(--wnote-dot,var(--wnote-muted));text-transform:uppercase;letter-spacing:.04em;}',
    '.wnote-who{font-weight:700;color:var(--wnote-text);font-size:12px;}',
    '.wnote-text{font-size:13px;line-height:1.5;margin:6px 0 0;white-space:pre-wrap;word-break:break-word;}',
    '.wnote-thread{max-height:230px;overflow:auto;margin-top:10px;display:flex;flex-direction:column;gap:10px;}',
    '.wnote-reply{border-left:2px solid var(--wnote-border);padding-left:10px;}',
    /* The owner's side of the conversation reads as answers, not more notes. */
    '.wnote-reply.is-owner{border-left-color:var(--wnote-design);}',
    '.wnote-badge{font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;',
    'color:#fff;background:var(--wnote-design);border-radius:9999px;padding:2px 6px;line-height:1;}',
    'html.dark .wnote-badge{color:#05141C;}',
    '.wnote-as{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:12px;',
    'color:var(--wnote-muted);}',
    '.wnote-as strong{color:var(--wnote-text);}',
    '.wnote-closed{font-weight:700;color:var(--wnote-muted);}',
    '.wnote-section{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;',
    'color:var(--wnote-muted);padding:10px 0 2px;border-top:1px solid var(--wnote-border);margin-top:4px;}',
    '.wnote-empty{font-size:12px;color:var(--wnote-muted);padding:10px 0;}',
    '.wnote-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;',
    'padding-top:10px;border-top:1px solid var(--wnote-border);}',
    '.wnote-link{background:none;border:0;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;',
    'color:var(--wnote-muted);display:inline-flex;align-items:center;gap:5px;padding:2px;}',
    '.wnote-link:hover{color:var(--wnote-text);}',
    '.wnote-link.danger:hover{color:var(--wnote-bug);}',

    /* Launcher — a triangle carrying the very key that opens it, parked on the
       right edge at mid-height where no page puts its own controls. Drawn as
       SVG so the outline follows the shape (a clip-path would cut the border
       off) and so the corners can be softened with a round line join. */
    '.wnote-fab{position:fixed;right:14px;top:var(--wnote-fab-top,50%);',
    'transform:translateY(-50%);width:50px;height:46px;padding:0;border:0;background:none;',
    'pointer-events:auto;cursor:pointer;display:block;line-height:0;',
    'filter:drop-shadow(0 4px 12px rgba(17,24,39,.22));}',
    /* ID-scoped: the generic `#wnote-root svg` rule above sizes the small inline
       icons to 1em and would otherwise win on specificity and shrink this one. */
    '#wnote-root .wnote-fab svg{width:100%;height:100%;overflow:visible;fill:none;}',
    '#wnote-root .wnote-tri{fill:var(--wnote-surface);stroke:var(--wnote-border);stroke-width:3;',
    'stroke-linejoin:round;transition:fill .15s ease,stroke .15s ease;}',
    '#wnote-root .wnote-fab:hover .wnote-tri{stroke:var(--wnote-design);}',
    '#wnote-root .wnote-key{fill:var(--wnote-text);font-family:inherit;font-size:15px;',
    'font-weight:700;text-anchor:middle;}',
    '#wnote-root .wnote-fab.is-armed .wnote-tri{fill:var(--wnote-design);stroke:var(--wnote-design);}',
    '#wnote-root .wnote-fab.is-armed .wnote-key{fill:#fff;}',
    'html.dark #wnote-root .wnote-fab.is-armed .wnote-key{fill:#05141C;}',
    /* Anchored on the solid bottom-right corner — floating it off the apex
       would leave it hanging in empty space beside the hypotenuse. */
    '.wnote-count{position:absolute;right:-5px;bottom:-4px;min-width:19px;height:19px;border-radius:50%;',
    'background:var(--wnote-bug);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;',
    'justify-content:center;padding:0 5px;border:2px solid var(--wnote-surface);}',

    /* Panel */
    /* Opens to the LEFT of the launcher — the trigger already hugs the right
       edge, so there is no room to its right and a popover must never drop
       straight below its trigger. */
    '.wnote-panel{position:fixed;right:74px;top:50%;transform:translateY(-50%);',
    'width:330px;max-height:min(70vh,560px);',
    'max-width:calc(100vw - 92px);pointer-events:auto;display:flex;flex-direction:column;',
    'background:var(--wnote-surface);color:var(--wnote-text);border:1px solid var(--wnote-border);',
    'border-radius:16px;box-shadow:0 16px 44px rgba(17,24,39,.24);overflow:hidden;}',
    '.wnote-list{overflow:auto;padding:0 14px 14px;display:flex;flex-direction:column;gap:8px;}',
    '.wnote-item{width:100%;text-align:left;background:var(--wnote-bg);border:1px solid transparent;',
    'border-radius:12px;padding:9px 11px;cursor:pointer;font-family:inherit;color:inherit;}',
    '.wnote-item:hover{border-color:var(--wnote-design);}',
    '.wnote-item.is-resolved{opacity:.55;}',
    '.wnote-item .wnote-text{font-size:12px;max-height:34px;overflow:hidden;}',
    '.wnote-note{font-size:11px;color:var(--wnote-muted);padding:0 14px 10px;line-height:1.4;}',
    '@media (prefers-reduced-motion:reduce){#wnote-root *{transition:none !important;}}'
  ].join('');

  function injectCss() {
    var s = document.createElement('style');
    s.id = 'wnote-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ── Root ────────────────────────────────────────────────────────────── */
  var root, fab, countBadge, hint;
  /* False until the feature is switched on. Every document-level listener and
     the layout interval check it, so an off page carries no comment behaviour
     at all — the script is present but inert. */
  var built = false;

  function build() {
    root = el('div');
    root.id = 'wnote-root';

    fab = el('button', 'wnote-fab',
      '<svg viewBox="0 0 50 46" aria-hidden="true">' +
      '<polygon class="wnote-tri" points="25,5 45,40 5,40"></polygon>' +
      '<text class="wnote-key" x="25" y="35">C</text></svg>');
    fab.type = 'button';
    fab.title = 'Comments — press C to leave one';
    fab.setAttribute('aria-label', 'Comments — press C to leave one');
    countBadge = el('span', 'wnote-count');
    countBadge.style.display = 'none';
    fab.appendChild(countBadge);
    fab.addEventListener('click', function (e) {
      e.stopPropagation();
      togglePanel();
    });

    root.appendChild(fab);
    document.body.appendChild(root);
  }

  function chipColor(id) {
    return 'var(--wnote-' + (CHIP_LABEL[id] ? id : 'design') + ')';
  }

  /* The right edge at mid-height is clear on most pages, but not all — the
     wiseai.html speed rail (Crawl / Walk / Run) sits exactly there. Rather than
     hard-code a per-page offset, hit-test the shape and slide up or down until
     the launcher is not sitting on top of anything clickable. */
  var CLICKABLE = 'button,a,input,textarea,select,[role="button"],[contenteditable="true"]';

  /* Breathing room above and below, so the launcher never ends up flush
     against a control (which reads as part of it, e.g. the speed rail). */
  var HALO = 16;

  function fabCovers() {
    var r = fab.getBoundingClientRect();
    /* Sample points INSIDE the triangle — its bounding-box corners are empty
       space, so testing those would report collisions that are not real —
       plus a vertical halo above and below. */
    var pts = [
      [r.left + r.width * 0.5, r.top + r.height * 0.65],
      [r.left + r.width * 0.5, r.top + r.height * 0.18],
      [r.left + r.width * 0.24, r.bottom - 4],
      [r.left + r.width * 0.76, r.bottom - 4],
      [r.left + r.width * 0.5, r.top - HALO],
      [r.left + r.width * 0.5, r.bottom + HALO],
      [r.left + r.width * 0.24, r.bottom + HALO],
      [r.left + r.width * 0.76, r.bottom + HALO]
    ];
    var prev = fab.style.pointerEvents;
    fab.style.pointerEvents = 'none';
    var hit = false;
    for (var i = 0; i < pts.length && !hit; i++) {
      var node = document.elementFromPoint(pts[i][0], pts[i][1]);
      if (node && node.closest && node.closest(CLICKABLE)) hit = true;
    }
    fab.style.pointerEvents = prev;
    return hit;
  }

  function avoidChrome() {
    if (!fab || !root) return;
    var steps = [0, -90, 90, -180, 180, -270, 270];
    for (var i = 0; i < steps.length; i++) {
      root.style.setProperty('--wnote-fab-top',
        steps[i] ? 'calc(50% + ' + steps[i] + 'px)' : '50%');
      if (!fabCovers()) return;
    }
    root.style.setProperty('--wnote-fab-top', '50%');
  }

  /* Page chrome does not all arrive at once — wiseai.html's speed rail settles
     after the first checks — so keep re-checking, but only act when the
     launcher is actually covered, which keeps it from wandering. */
  var lastAvoid = 0;
  function maybeAvoid() {
    if (!fab || !root) return;
    var now = Date.now();
    if (now - lastAvoid < 1500) return;
    lastAvoid = now;
    if (fabCovers()) avoidChrome();
  }

  /* ── Arm / disarm ────────────────────────────────────────────────────── */
  function setArmed(on) {
    armed = !!on && built;
    document.documentElement.classList.toggle('wnote-armed', armed);
    if (fab) fab.classList.toggle('is-armed', armed);
    if (armed) {
      if (!hint) {
        hint = el('div', 'wnote-hint', 'Click anywhere to leave a comment <kbd>Esc</kbd> to cancel');
        root.appendChild(hint);
      }
    } else if (hint) {
      hint.remove();
      hint = null;
    }
  }

  function isTyping(t) {
    if (!t || t.nodeType !== 1) return false;
    var tag = t.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
  }

  document.addEventListener('keydown', function (e) {
    if (!built) return;
    if (e.defaultPrevented) return;
    if (e.key === 'Escape') {
      if (armed) { setArmed(false); return; }
      if (openPopup) { closePopup(); return; }
      if (panelOpen) { togglePanel(); return; }
      return;
    }
    /* Bare "c" only — never with a modifier (Cmd+C must still copy) and never
       while the reviewer is typing into the app's own inputs. */
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTyping(e.target)) return;
    if (String(e.key).toLowerCase() !== 'c') return;
    e.preventDefault();
    setArmed(!armed);
  }, true);

  /* Capture-phase so the app's own click handlers never see the placement
     click (rows would navigate, chips would fire transcripts, etc). */
  document.addEventListener('click', function (e) {
    if (!built || !armed) return;
    if (root && root.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    setArmed(false);
    openComposer(e.clientX, e.clientY, anchorFor(e.target, e.clientX, e.clientY));
  }, true);

  /* ── Popup placement ─────────────────────────────────────────────────────
     Popovers sit to the right of the pin when there is room, then left, then
     above — never directly below the trigger. */
  function place(node, x, y) {
    var pad = 12;
    var w = node.offsetWidth || 320;
    var h = node.offsetHeight || 200;
    var left = x + 22;
    if (left + w + pad > window.innerWidth) left = x - 22 - w;
    if (left < pad) left = Math.max(pad, Math.min(x - w / 2, window.innerWidth - w - pad));
    var top = y - h / 2;
    if (top + h + pad > window.innerHeight) top = y - h - 18;
    if (top < pad) top = pad;
    node.style.left = Math.round(left) + 'px';
    node.style.top = Math.round(top) + 'px';
  }

  function closePopup() {
    if (!openPopup) return;
    if (openPopup.node) openPopup.node.remove();
    Object.keys(pins).forEach(function (id) { pins[id].classList.remove('is-open'); });
    openPopup = null;
  }

  document.addEventListener('mousedown', function (e) {
    if (!openPopup) return;
    if (openPopup.node && openPopup.node.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.wnote-pin')) return;
    closePopup();
  }, true);

  /* ── Composer ────────────────────────────────────────────────────────── */
  function openComposer(x, y, anchor) {
    closePopup();
    var pop = el('div', 'wnote-pop');
    var name = lsGet(LS_NAME) || '';
    pop.innerHTML =
      '<div class="wnote-pop-head"><h3 class="wnote-title">Leave a comment</h3>' +
      '<button type="button" class="wnote-x" aria-label="Cancel">' + ICONS.close + '</button></div>' +
      '<div class="wnote-body">' +
      '<div class="wnote-chips">' + CHIPS.map(function (c) {
        return '<button type="button" class="wnote-chip" data-chip="' + c.id + '" aria-pressed="false" ' +
          'style="--wnote-dot:' + chipColor(c.id) + '">' + esc(c.label) + '</button>';
      }).join('') + '</div>' +
      '<textarea class="wnote-ta" placeholder="What should change here?"></textarea>' +
      /* The owner is identified by their key, not by whatever name this
         browser last used — so no editable field to get it wrong. */
      (admin
        ? '<div class="wnote-as">Commenting as <strong>' + esc(ownerName) + '</strong>' +
          '<span class="wnote-badge">Owner</span></div>'
        : '<input class="wnote-in" type="text" placeholder="Your name" value="' + esc(name) + '" />') +
      '<div class="wnote-actions">' +
      '<button type="button" class="wnote-btn wnote-cancel">Cancel</button>' +
      '<button type="button" class="wnote-btn primary wnote-post" disabled>Post</button>' +
      '</div></div>';
    root.appendChild(pop);
    place(pop, x, y);

    var ta = pop.querySelector('.wnote-ta');
    var nameIn = pop.querySelector('.wnote-in');
    var post = pop.querySelector('.wnote-post');
    var chip = DEFAULT_CHIP;

    function who() { return admin ? ownerName : (nameIn ? nameIn.value.trim() : ''); }
    function sync() {
      post.disabled = !(ta.value.trim() && who());
    }
    pop.querySelectorAll('.wnote-chip').forEach(function (b) {
      if (b.getAttribute('data-chip') === chip) b.setAttribute('aria-pressed', 'true');
      b.addEventListener('click', function () {
        chip = b.getAttribute('data-chip');
        pop.querySelectorAll('.wnote-chip').forEach(function (o) {
          o.setAttribute('aria-pressed', String(o === b));
        });
      });
    });
    ta.addEventListener('input', sync);
    if (nameIn) nameIn.addEventListener('input', sync);
    ta.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !post.disabled) submit();
    });
    pop.querySelector('.wnote-x').addEventListener('click', closePopup);
    pop.querySelector('.wnote-cancel').addEventListener('click', closePopup);
    post.addEventListener('click', submit);
    sync();
    setTimeout(function () { ta.focus(); }, 0);

    function submit() {
      post.disabled = true;
      post.textContent = 'Posting…';
      var author = who();
      if (!admin) lsSet(LS_NAME, author);
      Store.add({
        page: pageKey(),
        selector: anchor.selector,
        fx: anchor.fx,
        fy: anchor.fy,
        viewport_w: anchor.viewport_w,
        viewport_h: anchor.viewport_h,
        chip: chip,
        text: ta.value.trim(),
        author: author,
        url: location.href
      }).then(function (saved) {
        closePopup();
        comments.push(saved);
        render();
      }).catch(function () {
        post.disabled = false;
        post.textContent = 'Retry';
      });
    }

    openPopup = { node: pop, anchor: anchor };
  }

  /* ── Thread ──────────────────────────────────────────────────────────────
     Who is talking has to be unmistakable, so an answer from the site owner
     is never read as coming from the person who raised the thread. The badge
     follows the server's is_owner stamp, not a name the client typed. */
  function ownerBadge(row) {
    return row && row.is_owner ? '<span class="wnote-badge">Owner</span>' : '';
  }

  function replyHtml(r) {
    return '<div class="wnote-reply' + (r.is_owner ? ' is-owner' : '') + '">' +
      '<div class="wnote-meta"><span class="wnote-who">' + esc(r.author) + '</span>' +
      ownerBadge(r) + '<span>·</span><span>' + esc(fmtDate(r.created_at)) + '</span></div>' +
      '<p class="wnote-text">' + esc(r.text) + '</p></div>';
  }

  function openThread(c) {
    closePopup();
    var pin = pins[c.id];
    /* The anchor can genuinely disappear — a flow moves on, a pane closes, the
       page changes. The thread must still open (from the panel) rather than
       becoming a comment nobody can read, so fall back to the viewport centre
       and say why the pin is missing. */
    var pt = resolveAnchor(c);
    var orphan = !pt;
    if (orphan) pt = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    if (pin) pin.classList.add('is-open');

    var pop = el('div', 'wnote-pop');
    pop.style.setProperty('--wnote-dot', chipColor(c.chip));
    var replies = c.replies || [];
    pop.innerHTML =
      '<div class="wnote-pop-head"><h3 class="wnote-title">' + esc(CHIP_LABEL[c.chip] || 'Comment') + '</h3>' +
      '<button type="button" class="wnote-x" aria-label="Close">' + ICONS.close + '</button></div>' +
      '<div class="wnote-body">' +
      '<div class="wnote-meta"><span class="wnote-who">' + esc(c.author) + '</span>' + ownerBadge(c) +
      '<span>·</span><span>' + esc(fmtDate(c.created_at)) + '</span>' +
      (c.resolved ? '<span class="wnote-closed">· Closed</span>' : '') + '</div>' +
      '<p class="wnote-text">' + esc(c.text) + '</p>' +
      (orphan ? '<div class="wnote-empty">The spot this was pinned to is not on the page right now.</div>' : '') +
      '<div class="wnote-thread">' + replies.map(replyHtml).join('') + '</div>' +
      (c.resolved
        ? '<div class="wnote-empty">This thread is closed, so it no longer shows on the page.</div>'
        : '<textarea class="wnote-ta wnote-rta" placeholder="Reply…" style="min-height:56px;margin-top:10px"></textarea>' +
          (admin
            ? '<div class="wnote-as">Replying as <strong>' + esc(ownerName) + '</strong>' +
              '<span class="wnote-badge">Owner</span></div>'
            : '<input class="wnote-in wnote-rname" type="text" placeholder="Your name" value="' + esc(lsGet(LS_NAME) || '') + '" />') +
          '<div class="wnote-actions"><button type="button" class="wnote-btn primary wnote-send" disabled>' +
          ICONS.send + ' Reply</button></div>') +
      /* Closing is the owner's call alone, and it takes the pin off the page
         for everyone — so it lives here, not next to Reply. */
      (admin ? '<div class="wnote-foot">' +
        '<button type="button" class="wnote-link wnote-resolve">' + ICONS.check +
        (c.resolved ? ' Reopen' : ' Close thread') + '</button>' +
        '<button type="button" class="wnote-link danger wnote-del">' + ICONS.trash + ' Delete</button></div>' : '') +
      '</div>';
    root.appendChild(pop);
    place(pop, pt.x, pt.y);

    var rta = pop.querySelector('.wnote-rta');
    var rname = pop.querySelector('.wnote-rname');
    var send = pop.querySelector('.wnote-send');
    var thread = pop.querySelector('.wnote-thread');
    thread.scrollTop = thread.scrollHeight;
    pop.querySelector('.wnote-x').addEventListener('click', closePopup);

    function who() { return admin ? ownerName : (rname ? rname.value.trim() : ''); }
    function sync() { send.disabled = !(rta.value.trim() && who()); }

    /* A closed thread has no reply box at all. */
    if (rta && send) {
      rta.addEventListener('input', sync);
      if (rname) rname.addEventListener('input', sync);
      rta.addEventListener('keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !send.disabled) fire();
      });
      send.addEventListener('click', fire);
    }

    function fire() {
      send.disabled = true;
      var author = who();
      if (!admin) lsSet(LS_NAME, author);
      Store.reply(c.id, { author: author, text: rta.value.trim() }).then(function (saved) {
        (c.replies = c.replies || []).push(saved);
        thread.insertAdjacentHTML('beforeend', replyHtml(saved));
        thread.scrollTop = thread.scrollHeight;
        rta.value = '';
        sync();
        renderPanel();
      }).catch(function () { send.disabled = false; });
    }

    if (admin) {
      pop.querySelector('.wnote-resolve').addEventListener('click', function () {
        Store.resolve(c.id, !c.resolved).then(function () {
          c.resolved = c.resolved ? 0 : 1;
          closePopup();
          render();
        });
      });
      pop.querySelector('.wnote-del').addEventListener('click', function () {
        if (!window.confirm('Delete this comment and its replies?')) return;
        Store.remove(c.id).then(function () {
          comments = comments.filter(function (o) { return o.id !== c.id; });
          closePopup();
          render();
        });
      });
    }

    openPopup = { node: pop, comment: c };
  }

  /* ── Panel ───────────────────────────────────────────────────────────── */
  var panel = null;

  function togglePanel() {
    panelOpen = !panelOpen;
    if (!panelOpen) {
      if (panel) { panel.remove(); panel = null; }
      return;
    }
    panel = el('div', 'wnote-panel');
    panel.innerHTML =
      '<div class="wnote-pop-head"><h3 class="wnote-title">Comments</h3>' +
      '<button type="button" class="wnote-x" aria-label="Close">' + ICONS.close + '</button></div>' +
      '<div class="wnote-note">Press <strong>C</strong>, then click the exact spot you want to talk about.</div>' +
      '<div class="wnote-list"></div>';
    root.appendChild(panel);
    panel.querySelector('.wnote-x').addEventListener('click', togglePanel);
    renderPanel();
  }

  function itemHtml(c) {
    var n = (c.replies || []).length;
    return '<button type="button" class="wnote-item' + (c.resolved ? ' is-resolved' : '') +
      '" data-id="' + esc(c.id) + '" style="--wnote-dot:' + chipColor(c.chip) + '">' +
      '<div class="wnote-meta"><span class="wnote-tag">' + esc(CHIP_LABEL[c.chip] || 'Comment') + '</span>' +
      '<span>·</span><span class="wnote-who">' + esc(c.author) + '</span>' + ownerBadge(c) +
      '<span>·</span><span>' + esc(fmtDate(c.created_at)) + '</span>' +
      (n ? '<span>· ' + n + ' repl' + (n === 1 ? 'y' : 'ies') + '</span>' : '') + '</div>' +
      '<p class="wnote-text">' + esc(c.text) + '</p></button>';
  }

  function renderPanel() {
    if (!panel) return;
    var list = panel.querySelector('.wnote-list');
    var open = openComments();
    /* Closed threads are only ever returned to the owner, so this section
       simply does not exist for anyone else. */
    var closed = comments.filter(function (c) { return c.resolved; });

    if (!comments.length) {
      list.innerHTML = '<div class="wnote-empty">No comments on this page yet.</div>';
    } else {
      list.innerHTML =
        (open.length ? open.map(itemHtml).join('')
          : '<div class="wnote-empty">Nothing open on this page.</div>') +
        (closed.length ? '<div class="wnote-section">Closed · ' + closed.length + '</div>' +
          closed.map(itemHtml).join('') : '');
      list.querySelectorAll('.wnote-item').forEach(function (b) {
        b.addEventListener('click', function () {
          var c = comments.filter(function (o) { return String(o.id) === b.getAttribute('data-id'); })[0];
          if (c) openThread(c);
        });
      });
    }
    var note = panel.querySelector('.wnote-note');
    var waiting = Store.pendingCount();
    if (Store.isLocal()) {
      note.innerHTML = 'Press <strong>C</strong>, then click the exact spot you want to talk about.' +
        '<br><em>Comment server unreachable — ' + (waiting || 'new') + ' note' +
        (waiting === 1 ? '' : 's') + ' held here and sent up automatically once it answers.</em>';
    } else if (waiting) {
      note.innerHTML = 'Press <strong>C</strong>, then click the exact spot you want to talk about.' +
        '<br><em>' + waiting + ' note' + (waiting === 1 ? '' : 's') + ' still waiting to sync.</em>';
    }
  }

  /* ── Pins ────────────────────────────────────────────────────────────────
     Closing a thread takes it off the page entirely — no dimmed pin left
     behind. The owner still reaches closed threads from the panel, which is
     the only way back to reopening one. */
  function openComments() {
    return comments.filter(function (c) { return !c.resolved; });
  }

  function render() {
    var seen = {};
    openComments().forEach(function (c, i) {
      seen[c.id] = true;
      var pin = pins[c.id];
      if (!pin) {
        pin = el('button', 'wnote-pin');
        pin.type = 'button';
        pin.addEventListener('click', function (e) {
          e.stopPropagation();
          if (openPopup && openPopup.comment && openPopup.comment.id === c.id) closePopup();
          else openThread(c);
        });
        root.appendChild(pin);
        pins[c.id] = pin;
      }
      pin.textContent = String(i + 1);
      pin.style.background = chipColor(c.chip);
      pin.title = (CHIP_LABEL[c.chip] || 'Comment') + ' — ' + c.author +
        (c.pending ? ' (waiting to sync)' : '');
      pin.classList.toggle('is-pending', !!c.pending);
    });
    Object.keys(pins).forEach(function (id) {
      if (!seen[id]) { pins[id].remove(); delete pins[id]; }
    });
    var open = openComments().length;
    countBadge.textContent = String(open);
    countBadge.style.display = open ? 'flex' : 'none';
    layout();
    renderPanel();
  }

  /* Pins are fixed-position, so they must be re-resolved whenever anything
     moves. WISE pages scroll inside module panes and re-render on flow steps,
     so events alone are not enough — a light interval covers the rest. */
  var layoutQueued = false;
  function layout() {
    if (layoutQueued) return;
    layoutQueued = true;
    requestAnimationFrame(function () {
      layoutQueued = false;
      comments.forEach(function (c) {
        var pin = pins[c.id];
        if (!pin) return;
        var pt = resolveAnchor(c);
        if (!pt || pt.x < -20 || pt.y < -20 || pt.x > window.innerWidth + 20 || pt.y > window.innerHeight + 20) {
          pin.style.display = 'none';
          return;
        }
        pin.style.display = 'flex';
        pin.style.left = pt.x + 'px';
        pin.style.top = pt.y + 'px';
      });
      if (openPopup && openPopup.comment) {
        var p = resolveAnchor(openPopup.comment);
        if (p) place(openPopup.node, p.x, p.y);
      }
    });
  }

  window.addEventListener('scroll', function () { if (built) layout(); }, true);
  window.addEventListener('resize', function () { if (built) layout(); });
  setInterval(function () { if (built) { layout(); maybeAvoid(); } }, 500);

  /* ── Boot ────────────────────────────────────────────────────────────── */
  function load() {
    return Store.list(pageKey()).then(function (rows) {
      comments = rows || [];
      comments.sort(function (a, b) { return String(a.created_at).localeCompare(String(b.created_at)); });
      render();
    });
  }

  /* Nothing below exists until the feature is switched on: no launcher, no C
     shortcut, no pins, no stylesheet. Turning it off tears all of it back
     down, so a page that was showing comments stops without a reload. */
  function raise() {
    if (built) return;
    built = true;
    injectCss();
    build();
    load();
    /* Page chrome arrives late on several flows, so re-check the corner once
       the first paint settles and again after the shell has injected its nav. */
    setTimeout(avoidChrome, 400);
    setTimeout(avoidChrome, 1800);
  }

  function teardown() {
    if (!built) return;
    built = false;
    setArmed(false);
    closePopup();
    panelOpen = false;
    panel = null;
    pins = {};
    comments = [];
    if (root) root.remove();
    root = fab = countBadge = null;
    if (hint) { hint.remove(); hint = null; }
    var sheet = document.getElementById('wnote-css');
    if (sheet) sheet.remove();
    document.documentElement.classList.remove('wnote-armed');
  }

  function gate() {
    if (commentsOn) raise();
    else teardown();
    try {
      document.dispatchEvent(new CustomEvent('wise:comments', { detail: { on: commentsOn } }));
    } catch (e) { /* older engines */ }
  }

  function start() {
    /* Ask the server before drawing anything. The mirrored value only decides
       what the popover shows; what actually renders waits for the truth. */
    apiBase().then(gate, gate);

    window.addEventListener('resize', function () { if (built) avoidChrome(); });
    /* Retry parked writes without needing a reload: when the network comes
       back, when the tab is looked at again, and on a slow background beat. */
    window.addEventListener('online', function () { if (built) load(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden || !built) return;
      if (Store.isLocal() || Store.pendingCount()) load();
    });
    setInterval(function () {
      if (built && (Store.isLocal() || Store.pendingCount())) load();
    }, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.WiseFeedback = {
    open: function () { if (built && !panelOpen) togglePanel(); },
    arm: function () { if (built) setArmed(true); },
    refresh: load,
    isAdmin: function () { return admin; },
    isLocal: function () { return Store.isLocal(); },
    pending: function () { return Store.pendingCount(); },
    api: function () { return API; },
    pageKey: pageKey,
    /* Used by the Comments row in the Appearance popover. */
    isOn: function () { return commentsOn; },
    isBuilt: function () { return built; },
    canToggle: function () { return admin; },
    setEnabled: function (on) {
      if (!admin) return Promise.reject(new Error('owner only'));
      return Store.setEnabled(on).then(function (info) {
        commentsOn = !!(info && info.enabled);
        lsSet(LS_ON, commentsOn ? '1' : '0');
        gate();
        return commentsOn;
      });
    }
  };
})();
