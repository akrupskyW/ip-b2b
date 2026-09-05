/**
 * analytics-card-kit.js — the shared card shell and entrance machinery every
 * specimen on pages/analytics-types.html is built from.
 *
 * The page grew two families of cards: the chart variations
 * (js/analytics-types-variations.js) and the table specimens
 * (js/analytics-types-tables.js). Both want the same shell, the same
 * status-colour tokens, the same count-up, and the same "sweep in on scroll,
 * click to replay" behaviour, so all of that lives here once.
 *
 * Chart geometry (axes, sectors, polylines) is not shared — it stays with the
 * charts that need it.
 */

const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

export const prefersReduced = reduced;

export const escq = (s) => String(s).replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
));

export const NUM = (n) => Math.round(n).toLocaleString('en-US');

/* ---- status colour tokens (the five-tier scale the whole page uses) ---- */
export const EX = 'var(--chart-status-excellent)';
export const GD = 'var(--chart-status-good)';
export const OK = 'var(--chart-status-okay)';
export const FR = 'var(--chart-status-fair)';
export const PR = 'var(--chart-status-poor)';
export const PRI = 'var(--primary)';

export function tierVar(v) {
  return v >= 80 ? EX : v >= 60 ? GD : v >= 40 ? OK : v >= 20 ? FR : PR;
}

export const TIER_LEGEND = [
  [EX, 'Excellent'],
  [GD, 'Good'],
  [OK, 'OK'],
  [FR, 'Fair'],
  [PR, 'Poor'],
];

export const dotsHTML = (pairs) => pairs.map((p) =>
  `<span><span class="att-dot" style="background:${p[0]}"></span>${escq(p[1])}</span>`).join('');

export function statusPill(score) {
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'OK' : score >= 20 ? 'Fair' : 'Poor';
  const tone = score >= 80 ? 'good' : score >= 60 ? 'primary' : score >= 40 ? 'warn' : 'alert';
  return `<span class="upf-pill upf-pill--${tone}">${label}</span>`;
}

/* Ease a node's text from 0 to `to`. Honours reduced motion by landing on the
   final value immediately. */
export function countUp(node, to, dur, fmtFn) {
  const F = fmtFn || NUM;
  if (reduced || !node) { if (node) node.textContent = F(to); return; }
  const st = performance.now();
  (function tick(now) {
    const p = Math.min(1, (now - st) / dur);
    node.textContent = F(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  })(st);
}

/* The card shell: an optional serif family name above a bordered card holding
   a title, an intro, the stage, an optional legend, and an optional note.
   `noteHTML` is for a note that carries a link; `note` is plain text. */
export function card(opts) {
  const wrap = document.createElement('div');
  wrap.className = 'att-block';
  if (opts.eyebrow) {
    const type = document.createElement('h2');
    type.className = 'att-type-title';
    type.textContent = opts.eyebrow;
    wrap.appendChild(type);
  }
  const s = document.createElement('section');
  s.className = 'att-card atx-card' + (opts.className ? ' ' + opts.className : '');
  s.id = opts.id;
  s.innerHTML =
    `<div class="att-head">` +
    `<span class="att-title">${escq(opts.title)}</span></div>` +
    `<p class="att-intro">${escq(opts.intro)}</p>` +
    `<div class="atx-stage" tabindex="0" role="img" aria-label="${escq(opts.title)}"></div>` +
    (opts.legend ? `<div class="att-legend atx-legend"><div class="att-legend-dots">${opts.legend}</div></div>` : '') +
    (opts.noteHTML ? `<p class="atx-note">${opts.noteHTML}</p>`
      : opts.note ? `<p class="atx-note">${escq(opts.note)}</p>` : '');
  wrap.appendChild(s);
  return wrap;
}

/* Build the replay function for a stage. `draws` are stroked paths, `wipes`
   clip-path reveals, `gauges` dash-offset rings, `nums` count-ups. Passing
   `snap` (or reduced motion, or a print) lands everything on its end state. */
export function makePlay(stage, cfg) {
  cfg = cfg || {};
  const draws = cfg.draws || [], wipes = cfg.wipes || [], gauges = cfg.gauges || [], nums = cfg.nums || [];
  return function play(snap) {
    if (snap || reduced) {
      stage.classList.add('is-in');
      draws.forEach((d) => { d.node.style.transition = 'none'; d.node.style.strokeDasharray = d.len; d.node.style.strokeDashoffset = '0'; });
      wipes.forEach((w) => { w.style.transition = 'none'; w.style.clipPath = 'none'; });
      gauges.forEach((g) => { g.node.style.transition = 'none'; g.node.style.strokeDashoffset = String(100 - g.value); });
      nums.forEach((n) => { n.node.textContent = (n.fmt || NUM)(n.to); });
      return;
    }
    stage.classList.remove('is-in');
    draws.forEach((d) => { d.node.style.transition = 'none'; d.node.style.strokeDasharray = d.len; d.node.style.strokeDashoffset = d.len; });
    wipes.forEach((w) => { w.style.transition = 'none'; w.style.clipPath = 'inset(0 100% 0 0)'; });
    gauges.forEach((g) => { g.node.style.transition = 'none'; g.node.style.strokeDashoffset = '100'; });
    nums.forEach((n) => { n.node.textContent = (n.fmt || NUM)(0); });
    void stage.offsetWidth;
    stage.classList.add('is-in');
    draws.forEach((d) => { d.node.style.transition = 'stroke-dashoffset 1.15s cubic-bezier(.22,1,.36,1)'; d.node.style.transitionDelay = (d.delay || 0) + 'ms'; d.node.style.strokeDashoffset = '0'; });
    wipes.forEach((w) => { w.style.transition = 'clip-path 1.15s cubic-bezier(.22,1,.36,1)'; w.style.transitionDelay = (w._delay || 0) + 'ms'; w.style.clipPath = 'inset(0 0 0 0)'; });
    gauges.forEach((g) => { g.node.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)'; g.node.style.strokeDashoffset = String(100 - g.value); });
    nums.forEach((n) => { setTimeout(() => countUp(n.node, n.to, n.dur || 1300, n.fmt), n.delay || 0); });
  };
}

/* Play once when the card scrolls in, again on click / Enter, and snap to the
   finished state for a print or an explicit finalize. */
export function wire(cardEl, play) {
  const stage = cardEl.querySelector('.atx-stage');
  stage.addEventListener('click', () => play());
  stage.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } });
  const finalize = () => play(true);
  window.addEventListener('wise:finalize-charts', finalize);
  window.addEventListener('beforeprint', finalize);
  if (window.IntersectionObserver) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { play(); io.disconnect(); } });
    }, { threshold: 0.18 });
    io.observe(cardEl);
  } else { play(); }
}
