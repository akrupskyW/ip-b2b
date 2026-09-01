/* ─────────────────────────────────────────────────────────────────────────
   date-column.js — stacked date cells + a header ⋮ picker, shared by every
   table that shows a date.

   A date column always shows at least two dates stacked in one cell, matching
   the Product Portfolio "Updated / Last edited" pattern:

     UPDATED      Apr 20, 2026   (primary — darker)
     LAST EDITED  Apr 16, 2026   (secondary — dimmed)

   The three-dot menu in the column header lists every date kind that table
   supports (created, updated, last edited, published, …). Picking one makes
   it the primary line, the header label, and the value the column sorts by.
   The paired date sits underneath.

   Self-initialising: injects its CSS, delegates clicks app-wide, and exposes
   window.WiseDateCol. Importing the file is enough; no per-page stylesheet.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  if (window.WiseDateCol) return;

  var KINDS = {
    created:   { id: 'created',   label: 'Created',      menu: 'Created date',       icon: 'calendar_add_on' },
    updated:   { id: 'updated',   label: 'Updated',      menu: 'Updated date',       icon: 'update' },
    edited:    { id: 'edited',    label: 'Last edited',  menu: 'Last edited date',   icon: 'edit_calendar' },
    published: { id: 'published', label: 'Published',    menu: 'Published date',     icon: 'publish' },
    verified:  { id: 'verified',  label: 'Verified',     menu: 'Verified date',      icon: 'verified' },
    viewed:    { id: 'viewed',    label: 'Last viewed',  menu: 'Last viewed date',   icon: 'visibility' },
    used:      { id: 'used',      label: 'Last used',    menu: 'Last used date',     icon: 'schedule' },
    joined:    { id: 'joined',    label: 'Joined',       menu: 'Joined date',        icon: 'how_to_reg' },
    flagged:   { id: 'flagged',   label: 'Flagged',      menu: 'Flagged date',       icon: 'flag' },
    issued:    { id: 'issued',    label: 'Issued',       menu: 'Issued date',        icon: 'receipt_long' },
    due:       { id: 'due',       label: 'Due',          menu: 'Due date',           icon: 'event' },
    paid:      { id: 'paid',      label: 'Paid',         menu: 'Paid date',          icon: 'payments' },
    occurred:  { id: 'occurred',  label: 'Occurred',     menu: 'Occurred date',      icon: 'notifications' },
    read:      { id: 'read',      label: 'Read',         menu: 'Read date',          icon: 'mark_email_read' },
    active:    { id: 'active',    label: 'Last active',  menu: 'Last active date',   icon: 'online_prediction' },
    expires:   { id: 'expires',   label: 'Expires',      menu: 'Expiration date',    icon: 'hourglass_bottom' },
    sent:      { id: 'sent',      label: 'Sent',         menu: 'Sent date',          icon: 'send' },
    accepted:  { id: 'accepted',  label: 'Accepted',     menu: 'Accepted date',      icon: 'how_to_reg' }
  };

  var PRESETS = {
    product:  ['created', 'updated', 'edited', 'published', 'viewed', 'verified'],
    invoice:  ['issued', 'due', 'paid', 'created', 'updated', 'edited'],
    org:      ['joined', 'created', 'active', 'updated', 'edited'],
    asset:    ['created', 'updated', 'edited', 'viewed', 'published'],
    audit:    ['flagged', 'created', 'updated', 'edited'],
    key:      ['created', 'used', 'updated', 'edited', 'expires'],
    alert:    ['occurred', 'read', 'created', 'updated', 'edited'],
    activity: ['active', 'used', 'created', 'updated', 'joined', 'edited'],
    invite:   ['sent', 'created', 'edited', 'expires', 'accepted'],
    team:     ['joined', 'sent', 'accepted', 'active', 'created', 'edited']
  };

  /* When the lead kind is X, the second stacked line is PAIR[X] (falling back
     to the next kind in the table's list). This is how Updated always sits
     over Last edited in the reference. */
  var PAIR = {
    created: 'updated',
    updated: 'edited',
    edited: 'created',
    published: 'updated',
    viewed: 'updated',
    verified: 'updated',
    issued: 'due',
    due: 'issued',
    paid: 'issued',
    joined: 'active',
    active: 'joined',
    flagged: 'edited',
    used: 'created',
    occurred: 'read',
    read: 'occurred',
    expires: 'created',
    sent: 'expires',
    accepted: 'sent'
  };

  /* Team stacks Joined over Sent (invite day), not Last active — so invited
     rows still show two real dates, and "Joined by" sits under that pair. */
  var PRESET_PAIRS = {
    team: { joined: 'sent', sent: 'joined', accepted: 'joined', active: 'joined', created: 'joined', edited: 'joined' }
  };

  /* Offsets in days from a seed date, used to fill missing kinds in demo data. */
  var OFFSETS = {
    created: -21,
    updated: 0,
    edited: -4,
    published: -2,
    viewed: 0,
    verified: -1,
    used: 0,
    joined: -30,
    flagged: 0,
    issued: 0,
    due: 14,
    paid: 7,
    occurred: 0,
    read: -1,
    active: 0,
    expires: 365,
    sent: 0,
    accepted: 3
  };

  var leadCallbacks = [];
  var bound = false;

  function injectStyles() {
    if (document.getElementById('w-datecol-styles')) return;
    var css = [
      '.w-datecell,.pf-td.pf-col-updated,.vf-dates{display:flex;flex-direction:column;align-items:flex-start;gap:2px;}',
      '.w-date,.pf-date,.vf-date{display:flex;flex-direction:row;align-items:baseline;gap:5px;line-height:1.25;}',
      '.w-date-status,.pf-date-status,.vf-date-status{font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text);}',
      '.w-date-val,.pf-date-val,.vf-date-val{font-size:11px;color:var(--text);font-variant-numeric:tabular-nums;white-space:nowrap;}',
      '.w-date--secondary,.pf-date--secondary{opacity:.62;}',
      '.w-date--secondary .w-date-status,.w-date--secondary .pf-date-status,',
      '.pf-date--secondary .pf-date-status,.vf-date--secondary .vf-date-status{color:var(--text-subtle);}',
      '.w-date--secondary .w-date-val,.w-date--secondary .pf-date-val,',
      '.pf-date--secondary .pf-date-val,.vf-date--secondary .vf-date-val{font-size:10px;color:var(--text-subtle);}',
      '.w-date-th,.pf-th.pf-col-updated,.inv-th.w-date-th,.adm-th.w-date-th,.wmod-th.w-date-th,th.w-date-th,.ma-th.w-date-th{display:inline-flex;align-items:center;gap:2px;}',
      '.w-date-th .w-datemenu,.pf-th.pf-col-updated .w-datemenu,.pf-th.pf-col-updated .pf-datemenu{order:5;}',
      '.w-datemenu,.pf-datemenu{position:relative;display:inline-flex;}',
      '.w-datemenu-btn,.pf-datemenu-btn{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;padding:0;border-radius:50%;border:1px solid transparent;background:transparent;color:var(--text-subtle);cursor:pointer;transition:background .15s ease,color .15s ease;}',
      '.w-datemenu-btn:hover,.w-datemenu.is-open .w-datemenu-btn,.pf-datemenu-btn:hover,.pf-datemenu.is-open .pf-datemenu-btn{background:var(--surface-2);color:var(--text);}',
      'html.dark .w-datemenu-btn:hover,html.dark .w-datemenu.is-open .w-datemenu-btn,html.dark .pf-datemenu-btn:hover,html.dark .pf-datemenu.is-open .pf-datemenu-btn{background:rgba(255,255,255,.08);}',
      '.w-datemenu-btn .material-symbols-outlined,.pf-datemenu-btn .material-symbols-outlined{font-size:16px!important;line-height:1!important;}',
      '.w-datemenu-pop,.pf-datemenu-pop{position:absolute;bottom:calc(100% + 6px);top:auto;left:0;right:auto;z-index:40;min-width:188px;max-height:min(360px,70vh);overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:10px;box-shadow:var(--shadow-2,0 12px 32px rgba(0,0,0,.18));padding:5px;text-transform:none;letter-spacing:0;}',
      '.w-datemenu-pop[hidden],.pf-datemenu-pop[hidden]{display:none;}',
      '.w-datemenu-item,.pf-datemenu-item{width:100%;display:flex;align-items:center;gap:8px;padding:7px 9px;border:none;background:transparent;cursor:pointer;border-radius:7px;font-family:inherit;font-size:11.5px;font-weight:600;color:var(--text);text-align:left;text-transform:none;letter-spacing:0;}',
      '.w-datemenu-item:hover,.pf-datemenu-item:hover{background:var(--surface-2);}',
      'html.dark .w-datemenu-item:hover,html.dark .pf-datemenu-item:hover{background:rgba(255,255,255,.06);}',
      '.w-datemenu-item .material-symbols-outlined,.pf-datemenu-item .material-symbols-outlined{font-size:15px!important;line-height:1!important;color:var(--text-subtle);width:16px;flex-shrink:0;text-transform:none;letter-spacing:normal;}',
      '.w-datemenu-item.is-active,.pf-datemenu-item.is-active{color:var(--primary);}',
      '.w-datemenu-item.is-active .material-symbols-outlined,.pf-datemenu-item.is-active .material-symbols-outlined{color:var(--primary);}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'w-datecol-styles';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function kindIds(kinds) {
    if (!kinds) return PRESETS.product.slice();
    if (typeof kinds === 'string') return (PRESETS[kinds] || PRESETS.product).slice();
    return kinds.slice();
  }

  function kindMeta(id) {
    return KINDS[id] || { id: id, label: id, menu: id, icon: 'event' };
  }

  function fmtDate(input) {
    if (input == null || input === '' || input === '—') return '—';
    if (typeof input === 'string' && !/^\d+$/.test(input) && Date.parse(input)) {
      /* Already a human date (or a relative phrase like "2m ago") — keep it. */
      if (/ago|yesterday|today|mon|tue|wed|thu|fri|sat|sun/i.test(input) && !/,\s*\d{4}/.test(input)) return input;
      var parsed = Date.parse(input);
      if (!isNaN(parsed) && /[A-Za-z]{3}/.test(input) && /\d{4}/.test(input)) return input;
    }
    var d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return String(input);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function shiftDate(str, days) {
    if (str == null || str === '' || str === '—') return '—';
    var t = Date.parse(str);
    if (isNaN(t)) return str;
    return fmtDate(new Date(t + Number(days) * 86400000));
  }

  function seedOf(partial) {
    if (!partial) return '';
    return partial.updated || partial.edited || partial.created || partial.issued ||
      partial.joined || partial.flagged || partial.occurred || partial.active ||
      partial.used || Object.keys(partial).map(function (k) { return partial[k]; })
        .find(function (v) { return v && v !== '—'; }) || '';
  }

  function complete(partial, preset) {
    var ids = kindIds(preset);
    var src = partial && typeof partial === 'object' ? Object.assign({}, partial) : {};
    var seed = seedOf(src);
    ids.forEach(function (id) {
      if (src[id] != null && src[id] !== '') return;
      var off = OFFSETS[id];
      src[id] = seed ? shiftDate(seed, off == null ? -3 : off) : '—';
    });
    return src;
  }

  function pairOf(lead, ids, kinds) {
    var preset = typeof kinds === 'string' ? PRESET_PAIRS[kinds] : null;
    var p = (preset && preset[lead]) || PAIR[lead];
    if (p && ids.indexOf(p) !== -1) return p;
    var i = ids.indexOf(lead);
    if (i === -1) return ids[1] || ids[0];
    return ids[(i + 1) % ids.length] || ids[0];
  }

  function lines(dates, kinds, lead) {
    var ids = kindIds(kinds);
    var L = ids.indexOf(lead) === -1 ? ids[0] : lead;
    var S = pairOf(L, ids, kinds);
    if (S === L && ids.length > 1) S = ids[1];
    var src = dates || {};
    return [
      { id: L, meta: kindMeta(L), val: src[L] || '—', primary: true },
      { id: S, meta: kindMeta(S), val: src[S] || '—', primary: false }
    ];
  }

  function cellHtml(dates, kinds, lead) {
    return lines(dates, kinds, lead).map(function (ln, i) {
      var cls = i === 0 ? 'w-date w-date--primary pf-date pf-date--primary' : 'w-date w-date--secondary pf-date pf-date--secondary';
      return '<span class="' + cls + '">' +
        '<span class="w-date-status pf-date-status">' + esc(ln.meta.label) + '</span>' +
        '<span class="w-date-val pf-date-val">' + esc(ln.val) + '</span></span>';
    }).join('');
  }

  function headerHtml(opts) {
    opts = opts || {};
    var ids = kindIds(opts.kinds);
    var lead = ids.indexOf(opts.lead) === -1 ? ids[0] : opts.lead;
    var label = kindMeta(lead).label;
    var items = ids.map(function (id) {
      var k = kindMeta(id);
      var on = id === lead;
      return '<button type="button" class="w-datemenu-item pf-datemenu-item' + (on ? ' is-active' : '') + '" role="menuitemradio" aria-checked="' + (on ? 'true' : 'false') + '" data-datetype="' + esc(id) + '">' +
        '<span class="material-symbols-outlined">' + esc(k.icon) + '</span>' + esc(k.menu) + '</button>';
    }).join('');
    return '<span class="w-date-label pf-updated-label">' + esc(label) + '</span>' +
      '<span class="w-datemenu pf-datemenu">' +
      '<button type="button" class="w-datemenu-btn pf-datemenu-btn" aria-haspopup="true" aria-expanded="false" aria-label="Choose which date to show and sort by" title="Choose date type">' +
      '<span class="material-symbols-outlined">more_vert</span></button>' +
      '<span class="w-datemenu-pop pf-datemenu-pop" role="menu" hidden>' + items + '</span></span>';
  }

  function resetPopPos(p) {
    if (!p || !p.style) return;
    p.style.position = '';
    p.style.top = '';
    p.style.left = '';
    p.style.right = '';
    p.style.bottom = '';
    p.style.visibility = '';
    p.style.margin = '';
    p.style.zIndex = '';
  }

  /* Pin the picker in the viewport: above the ⋮ when there is room, otherwise
     to its right — never parked directly under the trigger. Fixed so ancestor
     overflow cannot clip it (popover-layer may then portal it onto <body>). */
  function placePop(btn, pop) {
    var PAD = 8;
    pop.style.position = 'fixed';
    pop.style.right = 'auto';
    pop.style.bottom = 'auto';
    pop.style.left = '0px';
    pop.style.top = '0px';
    pop.style.visibility = 'hidden';
    pop.style.zIndex = '2147483001';
    pop.removeAttribute('hidden');
    var w = pop.offsetWidth || 188;
    var h = pop.offsetHeight || 200;
    var r = btn.getBoundingClientRect();
    var top = r.top - h - 6;
    var left = r.left;
    if (top < PAD) {
      left = r.right + 6;
      top = r.top;
      if (left + w > window.innerWidth - PAD) left = Math.max(PAD, r.left - w - 6);
    }
    if (left + w > window.innerWidth - PAD) left = Math.max(PAD, window.innerWidth - w - PAD);
    if (top + h > window.innerHeight - PAD) top = Math.max(PAD, window.innerHeight - h - PAD);
    top = Math.max(PAD, top);
    left = Math.max(PAD, left);
    pop.style.left = Math.round(left) + 'px';
    pop.style.top = Math.round(top) + 'px';
    pop.style.visibility = '';
  }

  function findPop(menu) {
    if (!menu) return null;
    if (menu.__datePop && menu.__datePop.isConnected) return menu.__datePop;
    return menu.querySelector('.w-datemenu-pop, .pf-datemenu-pop');
  }

  function closeMenus(except) {
    document.querySelectorAll('.w-datemenu-pop, .pf-datemenu-pop').forEach(function (p) {
      if (except && p === except) return;
      p.setAttribute('hidden', '');
      resetPopPos(p);
    });
    document.querySelectorAll('.w-datemenu, .pf-datemenu').forEach(function (m) {
      if (except && (m === except || m.contains(except))) return;
      m.classList.remove('is-open');
    });
    document.querySelectorAll('.w-datemenu-btn, .pf-datemenu-btn').forEach(function (b) {
      b.setAttribute('aria-expanded', 'false');
    });
  }

  function rootOf(el) {
    if (!el) return document;
    var pop = el.closest && el.closest('.w-datemenu-pop, .pf-datemenu-pop');
    if (pop && pop.__dateRoot) return pop.__dateRoot;
    var menu = el.closest && el.closest('.w-datemenu, .pf-datemenu');
    if (menu && menu.__dateRoot) return menu.__dateRoot;
    return (el.closest && (el.closest('[data-w-date-root]') || el.closest('.pf-table') || el.closest('.adm-table') || el.closest('.inv-table') || el.closest('.wmod-table') || el.closest('.ma-table') || el.closest('table'))) || document;
  }

  function applyLead(root, lead) {
    if (!root) return;
    if (root.setAttribute) root.setAttribute('data-w-date-lead', lead);
    var label = kindMeta(lead).label;
    root.querySelectorAll('.w-date-label, .pf-updated-label').forEach(function (l) {
      l.textContent = label;
    });
    root.querySelectorAll('.w-datemenu-item, .pf-datemenu-item').forEach(function (it) {
      var on = it.getAttribute('data-datetype') === lead;
      it.classList.toggle('is-active', on);
      it.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }

  function fireLead(root, lead) {
    applyLead(root, lead);
    leadCallbacks.forEach(function (entry) {
      var el = entry.el;
      if (el && el !== root && !(el.contains && el.contains(root))) return;
      try { entry.fn(lead, root); } catch (err) { /* host callback */ }
    });
    if (root && root.dispatchEvent) {
      root.dispatchEvent(new CustomEvent('w-datelead', { bubbles: true, detail: { lead: lead } }));
    }
  }

  function bindDoc() {
    if (bound) return;
    bound = true;
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var btn = t.closest('.w-datemenu-btn, .pf-datemenu-btn');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        var menu = btn.closest('.w-datemenu, .pf-datemenu');
        var pop = findPop(menu);
        if (!pop) return;
        var willOpen = pop.hasAttribute('hidden');
        closeMenus();
        if (willOpen) {
          var root = rootOf(btn);
          pop.__dateRoot = root;
          menu.__dateRoot = root;
          menu.__datePop = pop;
          placePop(btn, pop);
          menu.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
        return;
      }
      var item = t.closest('.w-datemenu-item, .pf-datemenu-item');
      if (item) {
        e.preventDefault();
        e.stopPropagation();
        var lead = item.getAttribute('data-datetype');
        var itemRoot = rootOf(item);
        closeMenus();
        if (lead) fireLead(itemRoot, lead);
        return;
      }
      if (!t.closest('.w-datemenu, .pf-datemenu')) closeMenus();
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenus();
    });
  }

  function onLead(el, fn) {
    if (typeof fn !== 'function') return function () {};
    var entry = { el: el || document, fn: fn };
    leadCallbacks.push(entry);
    return function () {
      leadCallbacks = leadCallbacks.filter(function (x) { return x !== entry; });
    };
  }

  function sortValue(dates, kinds, lead) {
    var ln = lines(dates, kinds, lead)[0];
    if (!ln || !ln.val || ln.val === '—') return 0;
    var t = Date.parse(ln.val);
    return isNaN(t) ? 0 : t;
  }

  var api = {
    KINDS: KINDS,
    PRESETS: PRESETS,
    PAIR: PAIR,
    kindIds: kindIds,
    kindMeta: kindMeta,
    fmtDate: fmtDate,
    shiftDate: shiftDate,
    complete: complete,
    lines: lines,
    cellHtml: cellHtml,
    headerHtml: headerHtml,
    applyLead: applyLead,
    onLead: onLead,
    sortValue: sortValue,
    closeMenus: closeMenus
  };

  window.WiseDateCol = api;

  injectStyles();
  function boot() { bindDoc(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
