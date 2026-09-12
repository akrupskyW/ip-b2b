/* ─────────────────────────────────────────────────────────────────────────
   inline-module-rail.js — full modules rendered INLINE inside a chat transcript.

   The app's normal outputs open in the right-hand pane (see the
   outputs-open-on-request rule). This is the opposite surface, and a member
   asks for it by name: an "Inline" chip drops the real modules — the Nutrition
   Facts panel, the ingredient list, a score breakdown, anything that would
   otherwise dock on the right — straight into the answer as a horizontal rail
   of live modules. Nothing opens on the right; the chat never resizes.

   Each module is a component the member can size:
     • the whole RAIL has a capped height — drag the grip at its foot up/down
       to grow or shrink every module at once, between a floor and a ceiling.
     • each MODULE has a width — pull its right edge, or tap its width control
       to cycle narrow → medium → wide. Swipe the rail sideways to move
       between modules.

   One shared definition, injected app-wide from js/agent-menu.js (the same way
   chip-lock.js and kebab-hover.js are), so every chat host — wiseai.html, the
   dock, the All Modules catalog — gets the identical component and behaviour.
   Self-guarded, injects its own CSS, and drives resize through document-level
   pointer delegation so a rail built after load is covered too.

   Public API (window.WiseInlineRail):
     buildRail(modules, opts) -> HTML string for a rail of modules.
     sampleModules()          -> [Nutrition Facts, Ingredient list, WISEscore].
     nfpModule() / ingredientsModule() / scoreModule() -> one module spec each.
     activate(lineEl)         -> optional entrance animation hook after insert.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  if (typeof document === 'undefined') return;
  if (window.WiseInlineRail) return;

  /* Height is capped — "there is a max height, and it is limited." The floor
     keeps a module readable; the ceiling keeps the rail from eating the thread. */
  var MIN_H = 220;
  var MAX_H = 640;
  var DEF_H = 380;

  /* Per-module width: three presets the width control cycles, plus the free
     range the right-edge drag can land anywhere inside. */
  var WIDTH_PRESETS = { narrow: 300, med: 400, wide: 560 };
  var WIDTH_CYCLE = ['narrow', 'med', 'wide'];
  var MIN_W = 260;
  var MAX_W = 720;

  var REDUCED = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Styles ────────────────────────────────────────────────────────────── */
  var CSS = `
  .sc-inline-rail {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    height: var(--imr-h, ${DEF_H}px);
    min-height: ${MIN_H}px;
    max-height: ${MAX_H}px;
    margin: 0.9em 0 0.3em;
    isolation: isolate;
  }
  /* Bleed the rail chat-module edge to edge, the same lead-in / gutter math the
     output rails use, so the modules run wide inside the answer. */
  .sc-line-body > .sc-inline-rail {
    --sc-rail-pad: var(--sc-gutter, max(var(--sc-pad-floor, 3rem), calc((100cqi - var(--sc-transcript-max, 860px)) / 2)));
    --sc-rail-lead-in: calc(var(--sc-avatar-size, 30px) + 12px + var(--sc-rail-pad));
    max-width: none;
    margin-left: calc(-1 * var(--sc-rail-lead-in));
    margin-right: calc(-1 * var(--sc-rail-pad));
  }
  .sc-inline-rail-lead { margin: 0 0 0.55em; }

  .sc-inline-rail-track {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    align-items: stretch;
    gap: 12px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x proximity;
    padding-bottom: 2px;
    scrollbar-width: thin;
  }
  .sc-line-body > .sc-inline-rail > .sc-inline-rail-track {
    padding-inline-start: var(--sc-rail-lead-in);
    padding-inline-end: 6px;
    scroll-padding-inline-start: var(--sc-rail-lead-in);
  }
  .sc-inline-rail-track::-webkit-scrollbar { height: 8px; }
  .sc-inline-rail-track::-webkit-scrollbar-thumb {
    background: var(--border-strong); border-radius: 999px;
  }

  .sc-inline-mod {
    position: relative;
    flex: 0 0 var(--imr-w, ${WIDTH_PRESETS.med}px);
    width: var(--imr-w, ${WIDTH_PRESETS.med}px);
    max-width: var(--imr-w, ${WIDTH_PRESETS.med}px);
    display: flex;
    flex-direction: column;
    min-height: 0;
    scroll-snap-align: start;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md, 16px);
    box-shadow: var(--shadow-1);
    overflow: hidden;
  }
  .sc-inline-mod-head {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 12px 9px 14px;
    border-bottom: 1px solid var(--border);
  }
  .sc-inline-mod-ic {
    font-size: 19px !important;
    color: var(--primary-ink, var(--primary));
    flex: 0 0 auto;
  }
  .sc-inline-mod-title {
    font-family: 'WISE Digits', var(--font-serif);
    font-weight: 800;
    font-size: 0.98rem;
    letter-spacing: -0.01em;
    color: var(--text);
    line-height: 1.15;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .sc-inline-mod-meta {
    font-size: 0.66rem;
    color: var(--text-muted);
    white-space: nowrap;
    margin-left: 2px;
  }
  .sc-inline-mod-tools { margin-left: auto; display: flex; align-items: center; gap: 2px; flex: 0 0 auto; }
  .sc-inline-mod-wbtn {
    width: 28px; height: 28px; padding: 0; margin: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border: 0; background: transparent; color: var(--text-muted);
    border-radius: 50%; cursor: pointer;
    transition: background 0.14s ease, color 0.14s ease;
  }
  .sc-inline-mod-wbtn:hover { background: var(--primary-soft); color: var(--primary-ink, var(--primary)); }
  .sc-inline-mod-wbtn .material-symbols-outlined { font-size: 18px !important; }

  .sc-inline-mod-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px 14px 14px;
    scrollbar-width: thin;
  }
  .sc-inline-mod-body::-webkit-scrollbar { width: 8px; }
  .sc-inline-mod-body::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 999px; }

  /* Right-edge width handle. */
  .sc-inline-mod-wseam {
    position: absolute;
    top: 0; right: 0;
    width: 12px; height: 100%;
    cursor: ew-resize;
    touch-action: none;
    z-index: 2;
  }
  .sc-inline-mod-wseam::after {
    content: '';
    position: absolute;
    top: 50%; right: 3px;
    transform: translateY(-50%);
    width: 3px; height: 34px;
    border-radius: 999px;
    background: var(--border-strong);
    opacity: 0;
    transition: opacity 0.14s ease;
  }
  .sc-inline-mod:hover .sc-inline-mod-wseam::after,
  .sc-inline-mod-wseam:hover::after { opacity: 1; }

  /* Foot grip — drag to resize the whole rail's height. */
  .sc-inline-rail-seam {
    flex: 0 0 auto;
    height: 16px;
    margin-top: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: ns-resize;
    touch-action: none;
  }
  .sc-line-body > .sc-inline-rail > .sc-inline-rail-seam {
    margin-inline-start: var(--sc-rail-lead-in);
    margin-inline-end: var(--sc-rail-pad);
  }
  .sc-inline-rail-grip {
    width: 44px; height: 5px;
    border-radius: 999px;
    background: var(--border-strong);
    transition: background 0.14s ease, width 0.14s ease;
  }
  .sc-inline-rail-seam:hover .sc-inline-rail-grip,
  .sc-inline-rail-seam:focus-visible .sc-inline-rail-grip {
    background: var(--primary);
    width: 60px;
  }
  html.imr-dragging, html.imr-dragging * {
    cursor: inherit !important;
    user-select: none !important;
  }
  html.imr-dragging-h, html.imr-dragging-h * { cursor: ns-resize !important; }
  html.imr-dragging-w, html.imr-dragging-w * { cursor: ew-resize !important; }

  .sc-inline-rail.is-imr-in {
    animation: sc-imr-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes sc-imr-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sc-inline-rail.is-imr-in { animation: none; opacity: 1; transform: none; }
    .sc-inline-mod-wbtn, .sc-inline-rail-grip, .sc-inline-mod-wseam::after { transition: none; }
  }

  /* ── Nutrition Facts label (self-contained, always print-panel black-on-white) ── */
  .imr-nf {
    background: #fff; color: #000;
    border: 1px solid #111;
    border-radius: 6px;
    overflow: hidden;
    font-family: 'WISE Digits', 'DM Sans', system-ui, sans-serif;
  }
  .imr-nf-title { font-size: 1.5rem; font-weight: 900; padding: 6px 10px 4px; border-bottom: 1px solid #000; line-height: 1; }
  .imr-nf-serv { padding: 3px 10px 5px; border-bottom: 9px solid #000; font-size: 0.72rem; }
  .imr-nf-serv-a { margin-bottom: 2px; }
  .imr-nf-serv-b { display: flex; justify-content: space-between; font-weight: 800; }
  .imr-nf-cal {
    display: flex; justify-content: space-between; align-items: flex-end;
    padding: 3px 10px; border-bottom: 5px solid #000;
  }
  .imr-nf-cal-l { display: flex; flex-direction: column; }
  .imr-nf-cal-lab { font-size: 0.6rem; }
  .imr-nf-cal-word { font-size: 1.05rem; font-weight: 900; }
  .imr-nf-cal-num { font-size: 2rem; font-weight: 900; line-height: 1; }
  .imr-nf-dv { text-align: right; font-size: 0.62rem; font-weight: 700; padding: 2px 10px; border-bottom: 1px solid #000; }
  .imr-nf-row {
    display: flex; justify-content: space-between; gap: 8px;
    padding: 2px 10px; border-bottom: 1px solid #C5CFD7; font-size: 0.72rem;
  }
  .imr-nf-row--thick { border-bottom-width: 4px; border-bottom-color: #000; }
  .imr-nf-in1 { padding-left: 20px; }
  .imr-nf-in2 { padding-left: 32px; }
  .imr-nf-foot { padding: 5px 10px; font-size: 0.58rem; line-height: 1.3; color: #222; }

  /* ── Ingredient list ── */
  .imr-ing-head {
    display: flex; align-items: baseline; gap: 8px;
    margin: 0 0 10px;
  }
  .imr-ing-count { font-size: 1.35rem; font-weight: 900; color: var(--text); line-height: 1; }
  .imr-ing-count-lab { font-size: 0.72rem; color: var(--text-muted); }
  .imr-ing-flag { margin-left: auto; font-size: 0.7rem; font-weight: 700; color: #B4531B; }
  .imr-ing-list { list-style: none; margin: 0; padding: 0; }
  .imr-ing-li {
    display: flex; align-items: center; gap: 9px;
    padding: 7px 2px;
    border-top: 1px solid var(--border);
    font-size: 0.82rem; color: var(--text);
  }
  .imr-ing-li:first-child { border-top: 0; }
  .imr-ing-dot { flex: 0 0 auto; width: 9px; height: 9px; border-radius: 50%; }
  .imr-ing-dot--ok { background: #2E9E5B; }
  .imr-ing-dot--warn { background: #E0A315; }
  .imr-ing-dot--bad { background: #D2452B; }
  .imr-ing-name { min-width: 0; }
  .imr-ing-tag {
    margin-left: auto; flex: 0 0 auto;
    font-size: 0.62rem; font-weight: 700; letter-spacing: 0.01em;
    padding: 2px 8px; border-radius: 999px;
    background: var(--surface-2); color: var(--text-muted);
    white-space: nowrap;
  }
  .imr-ing-tag--warn { background: color-mix(in srgb, #E0A315 20%, transparent); color: #8A6410; }
  html.dark .imr-ing-tag--warn { color: #E9C15C; }
  .imr-ing-tag--bad { background: color-mix(in srgb, #D2452B 22%, transparent); color: #9E2C18; }
  html.dark .imr-ing-tag--bad { color: #F0917E; }

  /* ── Score breakdown ── */
  .imr-sc-top { display: flex; gap: 16px; margin-bottom: 14px; }
  .imr-sc-hero { display: flex; flex-direction: column; }
  .imr-sc-hero-num {
    font-family: 'WISE Digits', var(--font-serif);
    font-size: 2.6rem; font-weight: 900; line-height: 0.95; color: var(--primary-ink, var(--primary));
  }
  .imr-sc-hero-lab { font-size: 0.68rem; color: var(--text-muted); font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; }
  .imr-sc-hero-tone { font-size: 0.8rem; font-weight: 800; color: #2E9E5B; margin-top: 2px; }
  .imr-sc-mini { display: flex; gap: 14px; align-self: center; }
  .imr-sc-mini-num { font-size: 1.3rem; font-weight: 900; color: var(--text); line-height: 1; }
  .imr-sc-mini-lab { font-size: 0.62rem; color: var(--text-muted); }
  .imr-sc-bars { display: flex; flex-direction: column; gap: 10px; }
  .imr-sc-bar-top { display: flex; justify-content: space-between; font-size: 0.74rem; margin-bottom: 3px; }
  .imr-sc-bar-name { color: var(--text); font-weight: 600; }
  .imr-sc-bar-val { color: var(--text-muted); font-weight: 800; }
  .imr-sc-bar-track { height: 8px; border-radius: 999px; background: var(--surface-3); overflow: hidden; }
  .imr-sc-bar-fill { height: 100%; border-radius: 999px; background: var(--primary); }
  `;

  function injectCss() {
    if (document.getElementById('wise-inline-rail-css')) return;
    var s = document.createElement('style');
    s.id = 'wise-inline-rail-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  injectCss();

  /* ── Module builders ───────────────────────────────────────────────────── */
  function moduleHtml(m) {
    m = m || {};
    var preset = WIDTH_PRESETS[m.width];
    var w = preset || (typeof m.w === 'number' ? m.w : WIDTH_PRESETS.med);
    var widthAttr = preset ? ` data-width="${esc(m.width)}"` : '';
    var meta = m.meta ? `<span class="sc-inline-mod-meta">${esc(m.meta)}</span>` : '';
    return `<section class="sc-inline-mod" data-imr-mod${widthAttr} style="--imr-w:${w}px">
        <header class="sc-inline-mod-head">
          <span class="material-symbols-outlined sc-inline-mod-ic">${esc(m.icon || 'dashboard')}</span>
          <span class="sc-inline-mod-title">${esc(m.title || '')}</span>
          ${meta}
          <span class="sc-inline-mod-tools">
            <button type="button" class="sc-inline-mod-wbtn" data-imr-width aria-label="Cycle module width">
              <span class="material-symbols-outlined">swap_horiz</span>
            </button>
          </span>
        </header>
        <div class="sc-inline-mod-body">${m.html || ''}</div>
        <span class="sc-inline-mod-wseam" data-imr-wseam aria-hidden="true" title="Drag to resize width"></span>
      </section>`;
  }

  function buildRail(modules, opts) {
    opts = opts || {};
    var h = Math.max(MIN_H, Math.min(MAX_H, opts.height || DEF_H));
    var lead = opts.lead
      ? `<p class="sc-surface-rail-lead sc-inline-rail-lead">${opts.lead}</p>`
      : '';
    var body = (modules || []).map(moduleHtml).join('');
    return `${lead}<div class="sc-inline-rail${REDUCED ? '' : ' is-imr-in'}" data-inline-rail style="--imr-h:${h}px" role="region" aria-roledescription="carousel" aria-label="${esc(opts.label || 'Inline modules')}">
        <div class="sc-inline-rail-track" data-imr-track>${body}</div>
        <div class="sc-inline-rail-seam" data-imr-seam role="separator" aria-orientation="horizontal" aria-label="Drag to resize the module height" tabindex="0"><span class="sc-inline-rail-grip"></span></div>
      </div>`;
  }

  /* ── Sample modules (Nutrition Facts, ingredient list, WISEscore) ───────── */
  function nfpModule() {
    var html =
      `<div class="imr-nf">
        <div class="imr-nf-title">Nutrition Facts</div>
        <div class="imr-nf-serv">
          <div class="imr-nf-serv-a">8 servings per container</div>
          <div class="imr-nf-serv-b"><span>Serving size</span><span>1 bar (40g)</span></div>
        </div>
        <div class="imr-nf-cal">
          <div class="imr-nf-cal-l"><span class="imr-nf-cal-lab">Amount per serving</span><span class="imr-nf-cal-word">Calories</span></div>
          <span class="imr-nf-cal-num" data-countup>180</span>
        </div>
        <div class="imr-nf-dv">% Daily Value*</div>
        <div class="imr-nf-row imr-nf-row--thick"><span><strong>Total Fat</strong> 7g</span><span><strong>9%</strong></span></div>
        <div class="imr-nf-row imr-nf-in1"><span>Saturated Fat 1g</span><span><strong>5%</strong></span></div>
        <div class="imr-nf-row imr-nf-in1"><span>Trans Fat 0g</span><span></span></div>
        <div class="imr-nf-row"><span><strong>Cholesterol</strong> 0mg</span><span><strong>0%</strong></span></div>
        <div class="imr-nf-row"><span><strong>Sodium</strong> 55mg</span><span><strong>2%</strong></span></div>
        <div class="imr-nf-row imr-nf-row--thick"><span><strong>Total Carbohydrate</strong> 26g</span><span><strong>9%</strong></span></div>
        <div class="imr-nf-row imr-nf-in1"><span>Dietary Fiber 4g</span><span><strong>14%</strong></span></div>
        <div class="imr-nf-row imr-nf-in1"><span>Total Sugars 18g</span><span></span></div>
        <div class="imr-nf-row imr-nf-in2"><span>Includes 0g Added Sugars</span><span><strong>0%</strong></span></div>
        <div class="imr-nf-row imr-nf-row--thick"><span><strong>Protein</strong> 5g</span><span></span></div>
        <div class="imr-nf-row"><span>Vitamin D 0mcg</span><span>0%</span></div>
        <div class="imr-nf-row"><span>Calcium 40mg</span><span>4%</span></div>
        <div class="imr-nf-row"><span>Iron 1.1mg</span><span>6%</span></div>
        <div class="imr-nf-row"><span>Potassium 320mg</span><span>6%</span></div>
        <div class="imr-nf-foot">* The % Daily Value tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.</div>
      </div>`;
    return { icon: 'nutrition', title: 'Nutrition Facts', meta: 'NFP+', width: 'narrow', html: html };
  }

  function ingredientsModule() {
    var rows = [
      { name: 'Organic Dates', tone: 'ok' },
      { name: 'Almonds', tone: 'ok' },
      { name: 'Cashews', tone: 'ok' },
      { name: 'Organic Cocoa', tone: 'ok' },
      { name: 'Chicory Root Fiber', tone: 'ok' },
      { name: 'Sea Salt', tone: 'ok' },
      { name: 'Natural Flavors', tone: 'warn', tag: 'GRAS not established' },
      { name: 'Citric Acid', tone: 'warn', tag: 'PL4' },
      { name: 'Sunflower Lecithin', tone: 'ok' },
      { name: 'Red 40', tone: 'bad', tag: 'Unsafe' },
    ];
    var list = rows.map(function (r) {
      var tagCls = r.tone === 'bad' ? ' imr-ing-tag--bad' : (r.tone === 'warn' ? ' imr-ing-tag--warn' : '');
      var tag = r.tag ? `<span class="imr-ing-tag${tagCls}">${esc(r.tag)}</span>` : '';
      return `<li class="imr-ing-li"><span class="imr-ing-dot imr-ing-dot--${r.tone}"></span><span class="imr-ing-name">${esc(r.name)}</span>${tag}</li>`;
    }).join('');
    var html =
      `<div class="imr-ing-head">
        <span class="imr-ing-count" data-countup>10</span>
        <span class="imr-ing-count-lab">ingredients parsed</span>
        <span class="imr-ing-flag">3 flagged</span>
      </div>
      <ul class="imr-ing-list">${list}</ul>`;
    return { icon: 'science', title: 'Ingredient list', meta: 'Analyzer', width: 'med', html: html };
  }

  function scoreModule() {
    function bar(name, val) {
      return `<div class="imr-sc-bar">
        <div class="imr-sc-bar-top"><span class="imr-sc-bar-name">${esc(name)}</span><span class="imr-sc-bar-val" data-countup>${val}</span></div>
        <div class="imr-sc-bar-track"><div class="imr-sc-bar-fill" style="width:${val}%"></div></div>
      </div>`;
    }
    var html =
      `<div class="imr-sc-top">
        <div class="imr-sc-hero">
          <span class="imr-sc-hero-num" data-countup>78</span>
          <span class="imr-sc-hero-lab">WISEscore</span>
          <span class="imr-sc-hero-tone">Good</span>
        </div>
        <div class="imr-sc-mini">
          <div><div class="imr-sc-mini-num" data-countup>88</div><div class="imr-sc-mini-lab">Non-UPF %</div></div>
          <div><div class="imr-sc-mini-num" data-countup>71</div><div class="imr-sc-mini-lab">GRAS %</div></div>
        </div>
      </div>
      <div class="imr-sc-bars">
        ${bar('Nutrient Quality', 75)}
        ${bar('Ingredient Quality', 89)}
        ${bar('Health Outcomes', 72)}
      </div>`;
    return { icon: 'insights', title: 'WISEscore breakdown', meta: '15 metrics', width: 'med', html: html };
  }

  function sampleModules() {
    return [nfpModule(), ingredientsModule(), scoreModule()];
  }

  /* Optional entrance hook (count-up rescans itself via its own observer). */
  function activate(lineEl) {
    if (!lineEl || REDUCED) return;
    var rail = lineEl.querySelector ? lineEl.querySelector('.sc-inline-rail') : null;
    if (rail) rail.classList.add('is-imr-in');
  }

  /* ── Resize behaviour (document-delegated pointer) ─────────────────────── */
  var drag = null;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function onPointerDown(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var seam = t.closest('[data-imr-seam]');
    var wseam = t.closest('[data-imr-wseam]');
    if (seam) {
      var rail = seam.closest('[data-inline-rail]');
      if (!rail) return;
      drag = {
        kind: 'h', handle: seam, el: rail,
        start: e.clientY, base: rail.getBoundingClientRect().height, pid: e.pointerId,
      };
      document.documentElement.classList.add('imr-dragging', 'imr-dragging-h');
    } else if (wseam) {
      var mod = wseam.closest('[data-imr-mod]');
      if (!mod) return;
      drag = {
        kind: 'w', handle: wseam, el: mod,
        start: e.clientX, base: mod.getBoundingClientRect().width, pid: e.pointerId,
      };
      document.documentElement.classList.add('imr-dragging', 'imr-dragging-w');
    } else {
      return;
    }
    try { drag.handle.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!drag) return;
    if (drag.kind === 'h') {
      var h = clamp(drag.base + (e.clientY - drag.start), MIN_H, MAX_H);
      drag.el.style.setProperty('--imr-h', h + 'px');
    } else {
      var w = clamp(drag.base + (e.clientX - drag.start), MIN_W, MAX_W);
      drag.el.style.setProperty('--imr-w', w + 'px');
      /* A freeform width is no longer any preset — the width control restarts
         the cycle from narrow next time. */
      drag.el.removeAttribute('data-width');
    }
    e.preventDefault();
  }

  function onPointerUp() {
    if (!drag) return;
    try { drag.handle.releasePointerCapture(drag.pid); } catch (_) {}
    drag = null;
    document.documentElement.classList.remove('imr-dragging', 'imr-dragging-h', 'imr-dragging-w');
  }

  function cycleWidth(mod) {
    var cur = mod.getAttribute('data-width');
    var idx = WIDTH_CYCLE.indexOf(cur);
    var next = WIDTH_CYCLE[(idx + 1) % WIDTH_CYCLE.length];
    mod.setAttribute('data-width', next);
    mod.style.setProperty('--imr-w', WIDTH_PRESETS[next] + 'px');
  }

  function onClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-imr-width]') : null;
    if (!btn) return;
    var mod = btn.closest('[data-imr-mod]');
    if (!mod) return;
    e.preventDefault();
    e.stopPropagation();
    cycleWidth(mod);
  }

  /* Keyboard resize on the foot grip — Up/Down grows or shrinks the rail. */
  function onKeyDown(e) {
    var seam = e.target && e.target.closest ? e.target.closest('[data-imr-seam]') : null;
    if (!seam) return;
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    var rail = seam.closest('[data-inline-rail]');
    if (!rail) return;
    e.preventDefault();
    var cur = rail.getBoundingClientRect().height;
    var step = e.shiftKey ? 48 : 20;
    var h = clamp(cur + (e.key === 'ArrowUp' ? step : -step), MIN_H, MAX_H);
    rail.style.setProperty('--imr-h', h + 'px');
  }

  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('pointerup', onPointerUp, true);
  document.addEventListener('pointercancel', onPointerUp, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);

  window.WiseInlineRail = {
    buildRail: buildRail,
    moduleHtml: moduleHtml,
    sampleModules: sampleModules,
    nfpModule: nfpModule,
    ingredientsModule: ingredientsModule,
    scoreModule: scoreModule,
    activate: activate,
    WIDTH_PRESETS: WIDTH_PRESETS,
    MIN_H: MIN_H, MAX_H: MAX_H, DEF_H: DEF_H,
  };
})();
