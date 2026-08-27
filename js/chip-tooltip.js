/* Data-chip explainer tooltip — app-wide.
 *
 * Every "data" chip in the logged-in experience (the Shield lifecycle pills —
 * `pf-chip` / `vf-chip` — and the GRAS pills — `gv-chip` / `ib-gras` / `ib-pl`)
 * gets an instant hover/focus tooltip that says, in plain language, exactly what
 * that chip means. Directly beneath the explanation — inside the very same
 * floating card — sits the same thumbs up / thumbs down feedback affordance used
 * on WISEcodeAI answers (see feedbackRowHtml in wiseai-chat.js): a verdict pair that
 * reveals an intent-chip set plus a free-form note, so a user can tell us whether
 * the label was right and why.
 *
 * Delivered as a self-guarding plain script so it can be injected uniformly from
 * agent-menu.js (like pane-resize.js / default-fill.js) OR dropped in via a
 * <script src> tag on any page. It uses document-level delegation, so chips that
 * render after load (verification / GRAS flows, portfolio tables, …) are covered
 * automatically. No framework, no build step.
 */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  if (window.__wiseChipTooltipReady) return;
  window.__wiseChipTooltipReady = true;

  /* Only genuine *data / status* chips — the Shield lifecycle and the GRAS
     pills. Interactive action chips (`.chip`, `.ws-intent-chip`, reply chips)
     are deliberately excluded: they aren't data, and they route on click. */
  var SELECTOR = '.pf-chip, .vf-chip, .gv-chip, .ib-gras, .ib-pl';

  /* Grace period before the card hides, so the pointer can travel from the chip
     across the small gap into the (interactive) card without it vanishing. */
  var HIDE_DELAY = 220;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── Intent taxonomies (mirrors the WISEcodeAI answer feedback) ──────────────── */
  var DOWN_REASONS = [
    { reason: 'wrong-status', label: 'Wrong status' },
    { reason: 'confusing', label: 'Confusing' },
    { reason: 'outdated', label: 'Outdated' },
    { reason: 'needs-detail', label: 'Needs detail' },
    { reason: 'other', label: 'Something else' },
  ];
  var UP_REASONS = [
    { reason: 'clear', label: 'Clear' },
    { reason: 'accurate', label: 'Accurate' },
    { reason: 'helpful', label: 'Helpful' },
    { reason: 'other-good', label: 'Something else' },
  ];

  /* ── Chip → meaning resolver ──────────────────────────────────────────────
     Each chip is keyed by its family (Shield vs GRAS) and lifecycle state. The
     state is read from the chip's modifier class (e.g. `pf-chip--verified`,
     `gv-chip--ok`, `ib-gras--historical`); we fall back to the chip's own text
     when a class isn't recognised so nothing ever hovers "blank". */
  var SHIELD = {
    prequal: { icon: 'schedule', title: 'Pre-Qualified',
      desc: 'This product cleared the initial screen. It still needs to complete verification before it earns the Shield.' },
    attest: { icon: 'fact_check', title: 'Pending Attestation',
      desc: 'You need to attest to this product’s ingredient data before it can be verified.' },
    verified: { icon: 'gpp_good', title: 'Verified',
      desc: 'This product’s ingredients and data have been verified. It carries the Shield.' },
    inelig: { icon: 'block', title: 'Ineligible',
      desc: 'This product doesn’t currently meet the criteria for the Shield.' },
    ineligible: { icon: 'block', title: 'Ineligible',
      desc: 'This product doesn’t currently meet the criteria for the Shield.' },
    verify: { icon: 'science', title: 'Verify ingredients',
      desc: 'Action needed — submit this product’s ingredients to start verification.' },
    complete: { icon: 'task_alt', title: 'Data complete',
      desc: 'All of the required product data has been provided.' },
    pay: { icon: 'payments', title: 'Payment due',
      desc: 'A payment is required before this product can move forward.' },
    muted: { icon: 'lock', title: 'Locked',
      desc: 'This Shield status is locked until the product’s data is complete.' },
    incomplete: { icon: 'edit_note', title: 'Incomplete',
      desc: 'Required product details are still missing. Complete them to unlock reports and stats.' },
  };
  var GRAS = {
    ok: { icon: 'verified_user', title: 'GRAS',
      desc: 'Generally Recognized As Safe — this ingredient’s safety is supported by published evidence and expert consensus.' },
    gras: { icon: 'verified_user', title: 'GRAS',
      desc: 'Generally Recognized As Safe — this ingredient’s safety is supported by published evidence and expert consensus.' },
    verified: { icon: 'verified_user', title: 'GRAS',
      desc: 'Generally Recognized As Safe — this ingredient’s safety is supported by published evidence and expert consensus.' },
    info: { icon: 'hourglass_top', title: 'In review',
      desc: 'This ingredient’s GRAS status is being reviewed.' },
    pending: { icon: 'hourglass_top', title: 'In review',
      desc: 'This ingredient’s GRAS status is being reviewed.' },
    historical: { icon: 'history', title: 'Historical',
      desc: 'This ingredient has a history of use but isn’t formally GRAS-affirmed.' },
    warn: { icon: 'help', title: 'Unclear',
      desc: 'There isn’t enough evidence to confirm this ingredient’s GRAS status.' },
    unclear: { icon: 'help', title: 'Unclear',
      desc: 'There isn’t enough evidence to confirm this ingredient’s GRAS status.' },
    unsafe: { icon: 'gpp_bad', title: 'Not safe',
      desc: 'Available evidence indicates this ingredient is not safe at the intended use level.' },
  };
  /* Processing level — the NOVA-style 1→4 scale used by the ingredient browser
     (`ib-pl-1` … `ib-pl-4`), navy → amber → orange → red. */
  var PLEVEL = {
    '1': { icon: 'eco', title: 'Minimally processed',
      desc: 'Level 1 — an unprocessed or minimally processed ingredient.' },
    '2': { icon: 'restaurant', title: 'Processed culinary ingredient',
      desc: 'Level 2 — a processed culinary ingredient (e.g. an oil, sugar or salt).' },
    '3': { icon: 'blender', title: 'Processed',
      desc: 'Level 3 — a processed food made by combining Level 1 and Level 2 items.' },
    '4': { icon: 'factory', title: 'Ultra-processed',
      desc: 'Level 4 — an ultra-processed food or ingredient.' },
  };

  /* Pull the trailing token from a BEM-style modifier, e.g. `pf-chip--verified`
     → "verified", scoped to a given base so we don't grab an unrelated class. */
  function stateFromClass(el, bases) {
    var cls = el.className || '';
    for (var i = 0; i < bases.length; i++) {
      var re = new RegExp('(?:^|\\s)' + bases[i] + '--([a-z0-9]+)');
      var m = re.exec(cls);
      if (m) return m[1];
    }
    return '';
  }

  function chipText(el) {
    /* The visible label minus the leading Material-Symbols glyph. */
    var clone = el.cloneNode(true);
    var ic = clone.querySelector('.material-symbols-outlined');
    if (ic) ic.remove();
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function ownIcon(el) {
    var ic = el.querySelector('.material-symbols-outlined');
    return ic ? (ic.textContent || '').trim() : '';
  }

  function resolveMeaning(el) {
    var text = chipText(el);
    var family, category, state = '', entry;
    if (el.matches('.ib-pl')) {
      family = 'processing';
      category = 'Processing level';
      var pm = /(?:^|\s)ib-pl-(\d)/.exec(el.className || '');
      state = pm ? pm[1] : (/^\d$/.test(text) ? text : '');
      entry = PLEVEL[state];
    } else if (el.matches('.gv-chip, .ib-gras')) {
      family = 'gras';
      category = 'GRAS status';
      state = stateFromClass(el, ['gv-chip', 'ib-gras']);
      entry = GRAS[state];
      /* GRAS pills sometimes encode the state only in their text. */
      if (!entry) {
        var t = text.toLowerCase();
        if (/gras/.test(t)) entry = GRAS.ok;
        else if (/review|pending/.test(t)) entry = GRAS.pending;
        else if (/histor/.test(t)) entry = GRAS.historical;
        else if (/unsafe|not safe/.test(t)) entry = GRAS.unsafe;
        else if (/unclear/.test(t)) entry = GRAS.unclear;
      }
    } else {
      family = 'shield';
      category = 'Shield status';
      state = stateFromClass(el, ['pf-chip', 'vf-chip']);
      entry = SHIELD[state];
    }
    if (!entry) {
      /* Unknown chip — still explain *something* rather than nothing, and keep
         the feedback affordance so we learn which labels are unclear. */
      entry = { icon: ownIcon(el) || 'info', title: text || 'Status',
        desc: 'This label reflects the item’s current status.' };
    }
    return {
      icon: ownIcon(el) || entry.icon || 'info',
      title: entry.title,
      category: category,
      desc: entry.desc,
      family: family,
      state: state || '',
      label: text,
    };
  }

  /* ── One-time styles ──────────────────────────────────────────────────────
     Self-contained so the card looks right on pages that never mount the WISEcodeAI
     chat (whose sc-fb CSS would otherwise be absent). Visual language matches
     the answer-feedback popover. */
  function ensureStyles() {
    if (document.getElementById('ct-styles')) return;
    var css = ''
      + '.ct-card{position:fixed;z-index:4000;width:max-content;max-width:300px;'
      + 'display:flex;flex-direction:column;gap:9px;padding:13px 14px;'
      + 'background:var(--surface,#fff);color:var(--text,#12203a);'
      + 'border:1px solid var(--border-strong,rgba(20,40,80,.16));border-radius:13px;'
      + 'box-shadow:var(--shadow-3,0 14px 40px rgba(15,30,60,.20));'
      + 'font:inherit;opacity:0;transform:translateY(4px) scale(.98);transform-origin:top center;'
      + 'pointer-events:none;transition:opacity .13s ease,transform .13s ease;}'
      + '.ct-card.is-vis{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}'
      + '.ct-card[hidden]{display:none;}'
      + 'html.dark .ct-card{background:#1A2339;border-color:rgba(37,80,124,.28);color:#e8eefb;}'
      + '.ct-card::before{content:"";position:absolute;left:var(--ct-arrow,20px);'
      + 'border:7px solid transparent;}'
      + '.ct-card:not(.ct-card--above)::before{bottom:100%;border-bottom-color:var(--border-strong,rgba(20,40,80,.16));}'
      + '.ct-card:not(.ct-card--above)::after{content:"";position:absolute;left:calc(var(--ct-arrow,20px) + 1px);bottom:100%;transform:translateY(1px);border:6px solid transparent;border-bottom-color:var(--surface,#fff);}'
      + '.ct-card--above::before{top:100%;border-top-color:var(--border-strong,rgba(20,40,80,.16));}'
      + '.ct-card--above::after{content:"";position:absolute;left:calc(var(--ct-arrow,20px) + 1px);top:100%;transform:translateY(-1px);border:6px solid transparent;border-top-color:var(--surface,#fff);}'
      + 'html.dark .ct-card:not(.ct-card--above)::before{border-bottom-color:rgba(37,80,124,.28);}'
      + 'html.dark .ct-card:not(.ct-card--above)::after{border-bottom-color:#1A2339;}'
      + 'html.dark .ct-card--above::before{border-top-color:rgba(37,80,124,.28);}'
      + 'html.dark .ct-card--above::after{border-top-color:#1A2339;}'
      + '.ct-head{display:flex;align-items:flex-start;gap:9px;}'
      + '.ct-head-ic{flex:0 0 auto;font-size:20px;color:var(--primary-ink,var(--primary,#25507c));'
      + 'font-variation-settings:"FILL" 1;line-height:1;margin-top:1px;}'
      + '.ct-head-txt{display:flex;flex-direction:column;gap:1px;min-width:0;}'
      + '.ct-title{font-size:13.5px;font-weight:700;line-height:1.2;}'
      + '.ct-cat{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;'
      + 'color:var(--text-subtle,#6b7a92);}'
      + '.ct-desc{margin:0;font-size:12.5px;line-height:1.5;color:var(--text-muted,#4a5a73);}'
      // feedback block
      + '.ct-fb-wrap{border-top:1px solid var(--border,rgba(20,40,80,.10));padding-top:9px;'
      + 'display:flex;flex-direction:column;gap:8px;}'
      + 'html.dark .ct-fb-wrap{border-top-color:rgba(255,255,255,.10);}'
      + '.ct-fb-row{display:flex;align-items:center;gap:8px;}'
      + '.ct-fb-q{font-size:11.5px;font-weight:600;color:var(--text-muted,#4a5a73);}'
      + '.ct-fb-btns{display:inline-flex;align-items:center;gap:2px;margin-left:auto;}'
      + '.ct-fb-btn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;'
      + 'border:0;border-radius:6px;background:transparent;color:var(--text-subtle,#6b7a92);cursor:pointer;padding:0;'
      + 'transition:background .14s ease,color .14s ease;}'
      + '.ct-fb-btn:hover{background:var(--surface-3,rgba(20,40,80,.06));color:var(--text,#12203a);}'
      + 'html.dark .ct-fb-btn:hover{background:rgba(255,255,255,.08);color:#e8eefb;}'
      + '.ct-fb-btn .material-symbols-outlined{font-size:16px;}'
      + '.ct-fb-btn.is-on{color:var(--primary-ink,var(--primary,#25507c));}'
      + '.ct-fb-btn.is-on .material-symbols-outlined{font-variation-settings:"FILL" 1;}'
      + '.ct-fb-btn.is-on[data-fb="down"]{color:var(--sec-red-text,#c0392b);}'
      + '.ct-fb-reasons{display:flex;flex-direction:column;gap:8px;}'
      + '.ct-fb-reasons[hidden]{display:none;}'
      + '.ct-fb-reasons-label{font-size:11.5px;font-weight:600;color:var(--text-muted,#4a5a73);}'
      + '.ct-fb-reason-chips{display:flex;flex-wrap:wrap;gap:6px;}'
      + '.ct-fb-reason{font-size:11.5px;padding:5px 11px;font-weight:500;border-radius:999px;cursor:pointer;'
      + 'border:1px solid var(--border-strong,rgba(20,40,80,.16));background:transparent;color:var(--text,#12203a);'
      + 'font-family:inherit;transition:border-color .14s ease,color .14s ease,background .14s ease;}'
      + 'html.dark .ct-fb-reason{color:#e8eefb;border-color:rgba(255,255,255,.16);}'
      + '.ct-fb-reason:hover{border-color:var(--primary,#25507c);}'
      + '.ct-fb-reason.is-on{border-color:var(--primary,#25507c);color:var(--primary-ink,var(--primary,#25507c));'
      + 'background:color-mix(in srgb,var(--primary,#25507c) 12%,transparent);}'
      + '.ct-fb-form{display:flex;flex-direction:column;gap:7px;min-width:220px;}'
      + '.ct-fb-input{width:100%;box-sizing:border-box;resize:vertical;min-height:34px;max-height:120px;'
      + 'padding:7px 9px;border-radius:9px;font:inherit;font-size:12px;line-height:1.4;color:var(--text,#12203a);'
      + 'background:var(--surface-2,rgba(20,40,80,.04));border:1px solid var(--border-strong,rgba(20,40,80,.16));'
      + 'outline:none;transition:border-color .14s ease,box-shadow .14s ease;}'
      + 'html.dark .ct-fb-input{background:rgba(255,255,255,.05);color:#e8eefb;}'
      + '.ct-fb-input:focus{border-color:var(--primary,#25507c);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary,#25507c) 18%,transparent);}'
      + '.ct-fb-send{align-self:flex-end;font-size:11.5px;padding:6px 14px;font-weight:700;border-radius:999px;cursor:pointer;'
      + 'border:1px solid var(--primary,#25507c);color:#fff;background:var(--primary,#25507c);font-family:inherit;}'
      + '.ct-fb-send:hover{filter:brightness(1.05);}'
      + '.ct-fb-note{display:flex;align-items:center;gap:5px;font-size:11.5px;font-style:italic;color:var(--text-subtle,#6b7a92);}'
      + '.ct-fb-note[hidden]{display:none;}'
      + '.ct-fb-note .material-symbols-outlined{font-size:15px;}';
    var st = document.createElement('style');
    st.id = 'ct-styles';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ── Card element (single, reused) ────────────────────────────────────────*/
  var card = null;
  var currentEl = null;      // the chip the card currently explains
  var hideTimer = null;

  function reasonChips(list) {
    return list.map(function (r) {
      return '<button type="button" class="ct-fb-reason" data-reason="' + esc(r.reason) + '">' + esc(r.label) + '</button>';
    }).join('');
  }

  function reasonsBlock(kind, list, label, placeholder) {
    return '<div class="ct-fb-reasons ct-fb-reasons--' + kind + '" role="menu" hidden>'
      + '<span class="ct-fb-reasons-label">' + esc(label) + '</span>'
      + '<div class="ct-fb-reason-chips">' + reasonChips(list) + '</div>'
      + '<div class="ct-fb-form">'
      + '<textarea class="ct-fb-input" rows="2" placeholder="' + esc(placeholder) + '" aria-label="' + esc(placeholder) + '"></textarea>'
      + '<button type="button" class="ct-fb-send" data-fb-send="' + kind + '">Send</button>'
      + '</div></div>';
  }

  function cardHtml(m) {
    return ''
      + '<div class="ct-head">'
      + '<span class="ct-head-ic material-symbols-outlined" aria-hidden="true">' + esc(m.icon) + '</span>'
      + '<div class="ct-head-txt">'
      + (m.category ? '<span class="ct-cat">' + esc(m.category) + '</span>' : '')
      + '<span class="ct-title">' + esc(m.title) + '</span>'
      + '</div></div>'
      + (m.desc ? '<p class="ct-desc">' + esc(m.desc) + '</p>' : '')
      + '<div class="ct-fb-wrap">'
      + '<div class="ct-fb-row">'
      + '<span class="ct-fb-q">Is this right?</span>'
      + '<span class="ct-fb-btns" role="group" aria-label="Was this label helpful?">'
      + '<button type="button" class="ct-fb-btn" data-fb="up" aria-label="Helpful" aria-pressed="false"><span class="material-symbols-outlined">thumb_up</span></button>'
      + '<button type="button" class="ct-fb-btn" data-fb="down" aria-label="Not helpful" aria-pressed="false"><span class="material-symbols-outlined">thumb_down</span></button>'
      + '</span></div>'
      + reasonsBlock('up', UP_REASONS, 'What worked?', 'What worked? (optional)')
      + reasonsBlock('down', DOWN_REASONS, 'What wasn’t right?', 'Tell us more (optional)')
      + '<div class="ct-fb-note" hidden></div>'
      + '</div>';
  }

  function ensureCard() {
    if (card) return card;
    ensureStyles();
    card = document.createElement('div');
    card.className = 'ct-card';
    card.id = 'ct-card';
    card.setAttribute('role', 'tooltip');
    card.hidden = true;
    document.body.appendChild(card);

    /* Keep the card open while the pointer is inside it (it's interactive). */
    card.addEventListener('mouseenter', cancelHide);
    card.addEventListener('mouseleave', scheduleHide);
    card.addEventListener('click', onCardClick);
    /* Don't let clicks/keys inside the card bubble to the outside-dismiss. */
    card.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    return card;
  }

  /* ── Feedback interactions (mirror wiseai-chat answer feedback) ───────────*/
  function setNote(text, icon) {
    var note = card.querySelector('.ct-fb-note');
    if (!note) return;
    if (!text) { note.hidden = true; note.innerHTML = ''; return; }
    note.innerHTML = '<span class="material-symbols-outlined">' + esc(icon || 'check') + '</span>' + esc(text);
    note.hidden = false;
  }

  function emitFeedback(verdict, payload) {
    var detail = {
      verdict: verdict,
      family: card.dataset.family || '',
      state: card.dataset.state || '',
      label: card.dataset.label || '',
      title: card.dataset.title || '',
    };
    if (typeof payload === 'string') detail.reason = payload;
    else if (payload && typeof payload === 'object') detail.note = payload.note;
    try {
      if (typeof window.WISE_onChipFeedback === 'function') window.WISE_onChipFeedback(detail);
    } catch (_) {}
    try { document.dispatchEvent(new CustomEvent('wise:chip-feedback', { detail: detail })); } catch (_) {}
  }

  function onCardClick(e) {
    var send = e.target.closest('.ct-fb-send');
    if (send) {
      var pop = send.closest('.ct-fb-reasons');
      var kind = send.getAttribute('data-fb-send');
      var input = pop ? pop.querySelector('.ct-fb-input') : null;
      var text = input ? input.value.trim() : '';
      if (input) input.value = '';
      if (pop) pop.hidden = true;
      setNote('Thanks — your feedback helps WISE™ improve.', kind === 'up' ? 'thumb_up' : 'favorite');
      emitFeedback(kind, { note: text });
      position(currentEl);
      return;
    }
    var reason = e.target.closest('.ct-fb-reason');
    if (reason) {
      var rpop = reason.closest('.ct-fb-reasons');
      var rkind = rpop && rpop.classList.contains('ct-fb-reasons--up') ? 'up' : 'down';
      reason.classList.toggle('is-on');
      var anyOn = rpop && rpop.querySelector('.ct-fb-reason.is-on');
      setNote(anyOn ? (rkind === 'up' ? 'Thanks — glad this was clear.' : 'Thanks — your feedback helps WISE™ improve.') : '',
        rkind === 'up' ? 'thumb_up' : 'favorite');
      emitFeedback(rkind, reason.getAttribute('data-reason'));
      position(currentEl);
      return;
    }
    var btn = e.target.closest('.ct-fb-btn');
    if (btn) {
      var verdict = btn.getAttribute('data-fb');
      var up = card.querySelector('.ct-fb-btn[data-fb="up"]');
      var down = card.querySelector('.ct-fb-btn[data-fb="down"]');
      var upPop = card.querySelector('.ct-fb-reasons--up');
      var downPop = card.querySelector('.ct-fb-reasons--down');
      if (verdict === 'up') {
        var onU = !up.classList.contains('is-on');
        up.classList.toggle('is-on', onU);
        up.setAttribute('aria-pressed', onU ? 'true' : 'false');
        down.classList.remove('is-on'); down.setAttribute('aria-pressed', 'false');
        if (downPop) downPop.hidden = true;
        if (upPop) upPop.hidden = !onU;
        setNote('', '');
        if (onU) emitFeedback('up');
      } else if (verdict === 'down') {
        var onD = !down.classList.contains('is-on');
        down.classList.toggle('is-on', onD);
        down.setAttribute('aria-pressed', onD ? 'true' : 'false');
        up.classList.remove('is-on'); up.setAttribute('aria-pressed', 'false');
        if (upPop) upPop.hidden = true;
        if (downPop) downPop.hidden = !onD;
        setNote('', '');
        if (onD) emitFeedback('down');
      }
      position(currentEl);
    }
  }

  /* ── Positioning ─────────────────────────────────────────────────────────
     Fixed to the viewport so it escapes any table / overflow-scroll clipping.
     Prefers below the chip; flips above when there isn't room. Clamped to the
     viewport horizontally with the arrow tracking the chip's centre. */
  function position(anchor) {
    if (!anchor || !card || card.hidden) return;
    var r = anchor.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    var margin = 8;
    var cw = card.offsetWidth, ch = card.offsetHeight;
    var above = false;
    var top = r.bottom + margin;
    if (top + ch > vh - margin && r.top - margin - ch > margin) {
      above = true;
      top = r.top - margin - ch;
    }
    var center = r.left + r.width / 2;
    var left = center - cw / 2;
    left = Math.max(margin, Math.min(left, vw - cw - margin));
    /* Arrow tip should sit under the chip's centre. The ::before triangle is a
       7px border box, so offset its left edge by 7px to centre the tip. */
    var arrow = Math.max(6, Math.min(center - left - 7, cw - 20));
    card.style.top = Math.round(top) + 'px';
    card.style.left = Math.round(left) + 'px';
    card.style.setProperty('--ct-arrow', Math.round(arrow) + 'px');
    card.classList.toggle('ct-card--above', above);
  }

  function showFor(el) {
    if (!el) return;
    cancelHide();
    ensureCard();
    if (currentEl === el && !card.hidden) return;
    currentEl = el;
    var m = resolveMeaning(el);
    card.dataset.family = m.family;
    card.dataset.state = m.state;
    card.dataset.label = m.label;
    card.dataset.title = m.title;
    card.innerHTML = cardHtml(m);
    /* Suppress the native title bubble while our card is up (restore on hide). */
    var native = el.getAttribute('title');
    if (native != null) { el.setAttribute('data-ct-title', native); el.removeAttribute('title'); }
    card.hidden = false;
    /* Measure off the pre-visible frame, then reflow so the enter transition
       plays from the settled position. */
    position(el);
    card.offsetWidth; // eslint-disable-line no-unused-expressions
    card.classList.add('is-vis');
  }

  function hideNow() {
    cancelHide();
    if (!card || card.hidden) return;
    if (currentEl && currentEl.hasAttribute('data-ct-title')) {
      currentEl.setAttribute('title', currentEl.getAttribute('data-ct-title'));
      currentEl.removeAttribute('data-ct-title');
    }
    card.classList.remove('is-vis');
    card.hidden = true;
    currentEl = null;
  }

  function scheduleHide() {
    cancelHide();
    hideTimer = setTimeout(hideNow, HIDE_DELAY);
  }
  function cancelHide() {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  }

  /* ── Delegated triggers ──────────────────────────────────────────────────*/
  document.addEventListener('mouseover', function (e) {
    var chip = e.target.closest ? e.target.closest(SELECTOR) : null;
    if (chip) { showFor(chip); return; }
    /* Entering the card counts as staying open. */
    if (card && e.target.closest && e.target.closest('#ct-card')) cancelHide();
  });
  document.addEventListener('mouseout', function (e) {
    var chip = e.target.closest ? e.target.closest(SELECTOR) : null;
    if (!chip) return;
    /* Moving into the card (or staying within the chip) keeps it open. */
    var to = e.relatedTarget;
    if (to && to.closest && (to.closest('#ct-card') || to.closest(SELECTOR) === chip)) return;
    scheduleHide();
  });
  document.addEventListener('focusin', function (e) {
    var chip = e.target.closest ? e.target.closest(SELECTOR) : null;
    if (chip) showFor(chip);
  });
  document.addEventListener('focusout', function (e) {
    /* Keep open if focus moves into the card. */
    var to = e.relatedTarget;
    if (to && to.closest && (to.closest('#ct-card') || to.closest(SELECTOR))) return;
    scheduleHide();
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest && (e.target.closest('#ct-card') || e.target.closest(SELECTOR))) return;
    hideNow();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideNow(); });
  window.addEventListener('scroll', function () { if (currentEl) position(currentEl); }, true);
  window.addEventListener('resize', hideNow);
})();
