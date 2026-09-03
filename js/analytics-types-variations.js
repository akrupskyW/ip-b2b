/**
 * Chart-family variations for pages/analytics-types.html.
 *
 * Sibling encodings of the extra charts already on that page: grouped and
 * 100% columns, floating range columns, several bar encodings, pie / half
 * donut / concentric rings / a donut strip, plus a leaderboard table and a
 * heat table. Same .att-card shell, status-colour tokens, count-up numerics,
 * scroll-in sweep, and click-to-replay.
 *
 * Mounts after #atx-box-card so the original ten extra charts stay first.
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const escq = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NUM = (n) => Math.round(n).toLocaleString('en-US');

  function m(tag, attrs, txt) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  const add = (parent, child) => (parent.appendChild(child), child);

  function countUp(node, to, dur, fmtFn) {
    const F = fmtFn || NUM;
    if (reduced || !node) { if (node) node.textContent = F(to); return; }
    const st = performance.now();
    (function tick(now) {
      const p = Math.min(1, (now - st) / dur);
      node.textContent = F(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    })(st);
  }

  function tierVar(v) {
    return v >= 80 ? 'var(--chart-status-excellent)'
      : v >= 60 ? 'var(--chart-status-good)'
      : v >= 40 ? 'var(--chart-status-okay)'
      : v >= 20 ? 'var(--chart-status-fair)'
      : 'var(--chart-status-poor)';
  }
  const TIER_LEGEND = [
    ['var(--chart-status-excellent)', 'Excellent'],
    ['var(--chart-status-good)', 'Good'],
    ['var(--chart-status-okay)', 'OK'],
    ['var(--chart-status-fair)', 'Fair'],
    ['var(--chart-status-poor)', 'Poor'],
  ];
  const EX = 'var(--chart-status-excellent)';
  const GD = 'var(--chart-status-good)';
  const OK = 'var(--chart-status-okay)';
  const FR = 'var(--chart-status-fair)';
  const PR = 'var(--chart-status-poor)';
  const PRI = 'var(--primary)';

  const dotsHTML = (pairs) => pairs.map((p) =>
    `<span><span class="att-dot" style="background:${p[0]}"></span>${escq(p[1])}</span>`).join('');

  function card(opts) {
    const s = document.createElement('section');
    s.className = 'att-card atx-card';
    s.id = opts.id;
    s.innerHTML =
      `<div class="att-head">` +
      (opts.eyebrow ? `<span class="att-eyebrow">${escq(opts.eyebrow)}</span>` : '') +
      `<span class="att-title">${escq(opts.title)}</span></div>` +
      `<p class="att-intro">${escq(opts.intro)}</p>` +
      `<div class="atx-stage" tabindex="0" role="img" aria-label="${escq(opts.title)}"></div>` +
      (opts.legend ? `<div class="att-legend atx-legend"><div class="att-legend-dots">${opts.legend}</div></div>` : '') +
      (opts.note ? `<p class="atx-note">${escq(opts.note)}</p>` : '');
    return s;
  }

  function makePlay(stage, cfg) {
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

  function wire(cardEl, play) {
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

  const polyLen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  const ptsStr = (pts) => pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

  function frame(svg, A, vmin, vmax, ticks, fmtT) {
    for (let i = 0; i <= ticks; i++) {
      const v = vmin + (vmax - vmin) * i / ticks;
      const y = A.y0 - (A.y0 - A.y1) * i / ticks;
      add(svg, m('line', { class: 'atx-grid', x1: A.x0, y1: y.toFixed(1), x2: A.x1, y2: y.toFixed(1) }));
      add(svg, m('text', { class: 'atx-tick', 'text-anchor': 'end', x: A.x0 - 8, y: (y + 4).toFixed(1) }, fmtT ? fmtT(v) : Math.round(v)));
    }
    add(svg, m('line', { class: 'atx-axis', x1: A.x0, y1: A.y1, x2: A.x0, y2: A.y0 }));
    add(svg, m('line', { class: 'atx-axis', x1: A.x0, y1: A.y0, x2: A.x1, y2: A.y0 }));
  }

  function frameH(svg, A, vmin, vmax, ticks, fmtT) {
    for (let i = 0; i <= ticks; i++) {
      const v = vmin + (vmax - vmin) * i / ticks;
      const x = A.x0 + (A.x1 - A.x0) * i / ticks;
      add(svg, m('line', { class: 'atx-grid', x1: x.toFixed(1), y1: A.y1, x2: x.toFixed(1), y2: A.y0 }));
      add(svg, m('text', { class: 'atx-tick atx-tick--x', 'text-anchor': 'middle', x: x.toFixed(1), y: A.y0 + 18 }, fmtT ? fmtT(v) : Math.round(v)));
    }
    add(svg, m('line', { class: 'atx-axis', x1: A.x0, y1: A.y1, x2: A.x0, y2: A.y0 }));
    add(svg, m('line', { class: 'atx-axis', x1: A.x0, y1: A.y0, x2: A.x1, y2: A.y0 }));
  }

  function polar(cx, cy, r, deg) {
    const a = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  function donutSlice(cx, cy, ri, ro, a0, a1) {
    const sweep = ((a1 - a0) % 360 + 360) % 360;
    if (sweep < 0.2) return '';
    const large = sweep > 180 ? 1 : 0;
    const o0 = polar(cx, cy, ro, a0);
    const o1 = polar(cx, cy, ro, a1);
    const f = (p) => p[0].toFixed(2) + ' ' + p[1].toFixed(2);
    if (ri <= 0) {
      return `M ${cx} ${cy} L ${f(o0)} A ${ro} ${ro} 0 ${large} 1 ${f(o1)} Z`;
    }
    const i1 = polar(cx, cy, ri, a1);
    const i0 = polar(cx, cy, ri, a0);
    return `M ${f(o0)} A ${ro} ${ro} 0 ${large} 1 ${f(o1)} L ${f(i1)} A ${ri} ${ri} 0 ${large} 0 ${f(i0)} Z`;
  }

  function ringPath(cx, cy, r) {
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;
  }

  /* ---- shared sample data (same portfolio the extra charts already use) */
  const QUARTERS = ["Q1 '24", "Q2 '24", "Q3 '24", "Q4 '24", "Q1 '25", "Q2 '25", "Q3 '25", "Q4 '25"];
  const UPF_SEGS = [
    { key: 'Non-UPF', color: EX, data: [120, 140, 165, 180, 210, 240, 265, 300] },
    { key: 'Minimally UPF', color: OK, data: [80, 85, 90, 88, 95, 100, 98, 92] },
    { key: 'UPF', color: PR, data: [60, 55, 52, 48, 44, 40, 36, 30] },
  ];
  const CATS = [
    { name: 'Bars', score: 72, last: 64, vol: 142, volLast: 118, q1: 52, q3: 76, d: 6 },
    { name: 'Dairy', score: 67, last: 63, vol: 96, volLast: 88, q1: 56, q3: 78, d: 4 },
    { name: 'Beverages', score: 58, last: 57, vol: 168, volLast: 174, q1: 47, q3: 70, d: 1 },
    { name: 'Cereals', score: 55, last: 57, vol: 210, volLast: 198, q1: 44, q3: 68, d: -2 },
    { name: 'Frozen', score: 52, last: 55, vol: 74, volLast: 70, q1: 41, q3: 64, d: -3 },
    { name: 'Snacks', score: 49, last: 54, vol: 188, volLast: 202, q1: 38, q3: 61, d: -5 },
  ];
  const PRODUCTS = [
    { n: 'Dark Choc Date Bar', score: 88, d: 4, spark: [80, 81, 83, 84, 85, 86, 87, 88], heat: [91, 86, 72, 80, 88, 64] },
    { n: 'Almond Sea-Salt Bar', score: 82, d: 3, spark: [76, 77, 78, 79, 80, 80, 81, 82], heat: [84, 80, 68, 78, 82, 70] },
    { n: 'Greek Yogurt', score: 79, d: 2, spark: [74, 75, 75, 76, 77, 78, 78, 79], heat: [82, 78, 70, 76, 74, 72] },
    { n: 'Maple Granola Bar', score: 74, d: 1, spark: [70, 71, 71, 72, 73, 73, 74, 74], heat: [76, 72, 64, 70, 78, 58] },
    { n: 'Sparkling Yuzu', score: 71, d: 2, spark: [66, 67, 68, 68, 69, 70, 70, 71], heat: [74, 70, 62, 68, 66, 80] },
    { n: 'Oat Milk', score: 69, d: 0, spark: [68, 68, 69, 69, 69, 70, 69, 69], heat: [72, 68, 60, 66, 64, 76] },
    { n: 'Honey Oat Cereal', score: 58, d: -2, spark: [62, 61, 61, 60, 59, 59, 58, 58], heat: [60, 56, 48, 54, 62, 44] },
    { n: 'Sea-Salt Chips', score: 47, d: -3, spark: [52, 51, 50, 50, 49, 48, 48, 47], heat: [50, 46, 38, 44, 42, 36] },
  ];
  const HEAT_COLS = ['Nutrient', 'Ingredient', 'Process', 'Additives', 'Fortify', 'Sugar'];

  function statusPill(score) {
    const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'OK' : score >= 20 ? 'Fair' : 'Poor';
    const tone = score >= 80 ? 'good' : score >= 60 ? 'primary' : score >= 40 ? 'warn' : 'alert';
    return `<span class="upf-pill upf-pill--${tone}">${label}</span>`;
  }

  /* ================= Grouped columns ================================= */
  function buildGroupedColumns() {
    const W = 720, H = 320, A = { x0: 44, x1: 700, y0: 272, y1: 18 };
    const vmax = 320;
    const yf = (v) => A.y0 - (A.y0 - A.y1) * v / vmax;
    const n = QUARTERS.length, band = (A.x1 - A.x0) / n;
    const gap = 3, inner = band * 0.72, bw = (inner - gap * (UPF_SEGS.length - 1)) / UPF_SEGS.length;
    const el = card({
      id: 'atx-group-card', eyebrow: 'Clustered', title: 'Products analyzed, side by side',
      intro: 'The same quarterly mix as the stacked columns, unstacked. Each class stands on its own so you can compare Non-UPF growth against the shrinking UPF bar. Click to replay.',
      legend: dotsHTML(UPF_SEGS.map((s) => [s.color, s.key])),
      note: 'Sample data: eight quarters of intake — the stacked-column numbers, drawn as a cluster.',
    });
    const stage = el.querySelector('.atx-stage');
    const svg = add(stage, m('svg', { class: 'atx-svg', viewBox: `0 0 ${W} ${H}` }));
    frame(svg, A, 0, vmax, 4);
    QUARTERS.forEach((c, i) => {
      const left = A.x0 + band * i + (band - inner) / 2;
      add(svg, m('text', { class: 'atx-tick atx-tick--x', 'text-anchor': 'middle', x: A.x0 + band * i + band / 2, y: A.y0 + 20 }, c));
      UPF_SEGS.forEach((s, si) => {
        const x = left + si * (bw + gap);
        const yTop = yf(s.data[i]);
        add(svg, m('rect', {
          class: 'atx-bar', x: x, y: yTop, width: bw, height: Math.max(1, A.y0 - yTop).toFixed(1),
          fill: s.color, rx: 2, style: `animation-delay:${i * 55 + si * 40}ms`,
        }));
      });
    });
    wire(el, makePlay(stage));
    return el;
  }

  /* ================= 100% stacked columns ============================ */
  function buildPctColumns() {
    const W = 720, H = 320, A = { x0: 44, x1: 700, y0: 272, y1: 18 };
    const yf = (v) => A.y0 - (A.y0 - A.y1) * v / 100;
    const n = QUARTERS.length, band = (A.x1 - A.x0) / n, bw = band * 0.56;
    const el = card({
      id: 'atx-pctcol-card', eyebrow: 'Share', title: 'Quarterly mix as a share of 100%',
      intro: 'Same quarters, same three classes — but each column is forced to 100% so the story is the mix, not the volume. Watch Non-UPF take the column. Click to replay.',
      legend: dotsHTML(UPF_SEGS.map((s) => [s.color, s.key])),
      note: 'Sample data: each quarter’s intake restated as a share of that quarter.',
    });
    const stage = el.querySelector('.atx-stage');
    const svg = add(stage, m('svg', { class: 'atx-svg', viewBox: `0 0 ${W} ${H}` }));
    frame(svg, A, 0, 100, 4, (v) => Math.round(v) + '%');
    QUARTERS.forEach((c, i) => {
      const cx = A.x0 + band * i + band / 2;
      add(svg, m('text', { class: 'atx-tick atx-tick--x', 'text-anchor': 'middle', x: cx, y: A.y0 + 20 }, c));
      const tot = UPF_SEGS.reduce((s, seg) => s + seg.data[i], 0);
      let acc = 0;
      UPF_SEGS.forEach((s, si) => {
        const pct = tot ? (s.data[i] / tot) * 100 : 0;
        const yTop = yf(acc + pct), yBot = yf(acc);
        add(svg, m('rect', {
          class: 'atx-bar', x: cx - bw / 2, y: yTop, width: bw, height: Math.max(1, yBot - yTop).toFixed(1),
          fill: s.color, rx: 2, style: `animation-delay:${i * 70 + si * 50}ms`,
        }));
        acc += pct;
      });
    });
    wire(el, makePlay(stage));
    return el;
  }

  /* ================= Floating / range columns ======================== */
  function buildRangeColumns() {
    const W = 720, H = 320, A = { x0: 44, x1: 700, y0: 272, y1: 18 };
    const yf = (v) => A.y0 - (A.y0 - A.y1) * v / 100;
    const n = CATS.length, band = (A.x1 - A.x0) / n, bw = Math.min(52, band * 0.42);
    const el = card({
      id: 'atx-range-card', eyebrow: 'Range', title: 'Score range by category',
      intro: 'A column that does not sit on zero. Each bar floats between the 25th and 75th percentile, with a tick for the median. The cousin of the box plot, drawn as columns. Click to replay.',
      legend: dotsHTML([[PRI, 'Middle 50%'], [EX, 'Median']]),
      note: 'Sample data: interquartile range of WISEscores in six categories.',
    });
    const stage = el.querySelector('.atx-stage');
    const svg = add(stage, m('svg', { class: 'atx-svg', viewBox: `0 0 ${W} ${H}` }));
    frame(svg, A, 0, 100, 4);
    CATS.forEach((c, i) => {
      const cx = A.x0 + band * i + band / 2;
      const yTop = yf(c.q3), yBot = yf(c.q1);
      add(svg, m('rect', {
        class: 'atx-bar', x: cx - bw / 2, y: yTop, width: bw, height: Math.max(2, yBot - yTop).toFixed(1),
        fill: PRI, 'fill-opacity': 0.88, rx: 3, style: `animation-delay:${i * 80}ms`,
      }));
      const med = add(svg, m('line', {
        x1: cx - bw / 2 - 2, y1: yf(c.score), x2: cx + bw / 2 + 2, y2: yf(c.score),
        stroke: EX, 'stroke-width': 3, 'stroke-linecap': 'round',
      }));
      med.classList.add('atx-fade');
      med.style.animationDelay = (i * 80 + 240) + 'ms';
      add(svg, m('text', { class: 'atx-tick atx-tick--x', 'text-anchor': 'middle', x: cx, y: A.y0 + 20 }, c.name));
    });
    wire(el, makePlay(stage));
    return el;
  }

  /* ================= Horizontal ranking bars ========================= */
  function buildHBars() {
    const ranked = CATS.slice().sort((a, b) => b.score - a.score);
    const W = 720, H = 56 + ranked.length * 42, A = { x0: 108, x1: 640, y0: H - 28, y1: 12 };
    const xf = (v) => A.x0 + (A.x1 - A.x0) * v / 100;
    const el = card({
      id: 'atx-hbar-card', eyebrow: 'Ranking', title: 'Category scores, ranked',
      intro: 'The column chart laid on its side — easier when the labels are words. Capsule bars, coloured by status tier, with the score counting up at the end. Click to replay.',
      legend: dotsHTML(TIER_LEGEND),
      note: 'Sample data: average WISEscore by category, highest first.',
    });
    const stage = el.querySelector('.atx-stage');
    const svg = add(stage, m('svg', { class: 'atx-svg', viewBox: `0 0 ${W} ${H}` }));
    frameH(svg, A, 0, 100, 4);
    const nums = [];
    ranked.forEach((c, i) => {
      const cy = 28 + i * 42;
      const bh = 18;
      add(svg, m('text', { class: 'atx-tick', 'text-anchor': 'end', x: A.x0 - 12, y: cy + 5 }, c.name));
      add(svg, m('rect', {
        class: 'atx-bar atx-bar--h', x: A.x0, y: cy - bh / 2, width: (xf(c.score) - A.x0).toFixed(1), height: bh,
        fill: tierVar(c.score), rx: bh / 2, style: `animation-delay:${i * 70}ms`,
      }));
      const t = add(svg, m('text', { class: 'atx-dot-lbl', 'text-anchor': 'start', x: xf(c.score) + 10, y: cy + 4 }, '0'));
      t.classList.add('atx-fade');
      t.style.animationDelay = (i * 70 + 200) + 'ms';
      nums.push({ node: t, to: c.score, dur: 1100, delay: i * 70 + 200 });
    });
    wire(el, makePlay(stage, { nums }));
    return el;
  }

  /* ================= Grouped horizontal bars ========================= */
  function buildGroupedHBars() {
    const W = 720, H = 64 + CATS.length * 52, A = { x0: 108, x1: 640, y0: H - 28, y1: 12 };
    const vmax = 240;
    const xf = (v) => A.x0 + (A.x1 - A.x0) * v / vmax;
    const el = card({
      id: 'atx-ghbar-card', eyebrow: 'Side by side', title: 'Volume this year vs. last',
      intro: 'Two horizontal bars per category: this year’s analysed volume against last year’s. Read across for the change, down the list for the ranking. Click to replay.',
      legend: dotsHTML([[PRI, 'This year'], [OK, 'Last year']]),
      note: 'Sample data: products analysed by category, two calendar years.',
    });
    const stage = el.querySelector('.atx-stage');
    const svg = add(stage, m('svg', { class: 'atx-svg', viewBox: `0 0 ${W} ${H}` }));
    frameH(svg, A, 0, vmax, 4);
    const nums = [];
    CATS.forEach((c, i) => {
      const cy = 30 + i * 52;
      add(svg, m('text', { class: 'atx-tick', 'text-anchor': 'end', x: A.x0 - 12, y: cy + 4 }, c.name));
      add(svg, m('rect', {
        class: 'atx-bar atx-bar--h', x: A.x0, y: cy - 16, width: (xf(c.vol) - A.x0).toFixed(1), height: 13,
        fill: PRI, rx: 3, style: `animation-delay:${i * 60}ms`,
      }));
      add(svg, m('rect', {
        class: 'atx-bar atx-bar--h', x: A.x0, y: cy + 2, width: (xf(c.volLast) - A.x0).toFixed(1), height: 13,
        fill: OK, rx: 3, style: `animation-delay:${i * 60 + 80}ms`,
      }));
      const t1 = add(svg, m('text', { class: 'atx-dot-lbl', 'text-anchor': 'start', x: xf(c.vol) + 8, y: cy - 5 }, '0'));
      const t0 = add(svg, m('text', { class: 'atx-dot-lbl', 'text-anchor': 'start', x: xf(c.volLast) + 8, y: cy + 13 }, '0'));
      t1.classList.add('atx-fade'); t0.classList.add('atx-fade');
      t1.style.animationDelay = (i * 60 + 180) + 'ms';
      t0.style.animationDelay = (i * 60 + 260) + 'ms';
      nums.push({ node: t1, to: c.vol, dur: 1000, delay: i * 60 + 180 });
      nums.push({ node: t0, to: c.volLast, dur: 1000, delay: i * 60 + 260 });
    });
    wire(el, makePlay(stage, { nums }));
    return el;
  }

  /* ================= Lollipop / dumbbell ============================= */
  function buildLollipop() {
    const W = 720, H = 56 + CATS.length * 42, A = { x0: 108, x1: 640, y0: H - 28, y1: 12 };
    const xf = (v) => A.x0 + (A.x1 - A.x0) * v / 100;
    const el = card({
      id: 'atx-lollipop-card', eyebrow: 'Before / after', title: 'Score last year → this year',
      intro: 'A dumbbell for each category: the open dot is last year’s average, the filled dot is this year’s, and the line is the move. Click to replay.',
      legend: dotsHTML([[OK, 'Last year'], [PRI, 'This year']]),
      note: 'Sample data: category averages, two consecutive years.',
    });
    const stage = el.querySelector('.atx-stage');
    const svg = add(stage, m('svg', { class: 'atx-svg', viewBox: `0 0 ${W} ${H}` }));
    frameH(svg, A, 0, 100, 4);
    const nums = [];
    CATS.forEach((c, i) => {
      const cy = 28 + i * 42;
      const x0 = xf(c.last), x1 = xf(c.score);
      add(svg, m('text', { class: 'atx-tick', 'text-anchor': 'end', x: A.x0 - 12, y: cy + 5 }, c.name));
      const line = add(svg, m('line', {
        class: 'atx-line', x1: x0, y1: cy, x2: x1, y2: cy,
        stroke: PRI, 'stroke-width': 4, 'stroke-linecap': 'round',
      }));
      const a = add(svg, m('circle', { class: 'atx-pop', cx: x0, cy: cy, r: 6, fill: 'var(--surface)', stroke: OK, 'stroke-width': 2.5 }));
      const b = add(svg, m('circle', { class: 'atx-pop', cx: x1, cy: cy, r: 6.5, fill: PRI }));
      a.style.animationDelay = (i * 70 + 180) + 'ms';
      b.style.animationDelay = (i * 70 + 260) + 'ms';
      const t = add(svg, m('text', {
        class: 'atx-dot-lbl', 'text-anchor': 'start', x: Math.max(x0, x1) + 12, y: cy + 4,
      }, c.last + ' \u2192 ' + c.score));
      t.classList.add('atx-fade');
      t.style.animationDelay = (i * 70 + 280) + 'ms';
      line.style.strokeDasharray = Math.abs(x1 - x0);
      line.style.strokeDashoffset = Math.abs(x1 - x0);
    });
    const draws = [];
    svg.querySelectorAll('.atx-line').forEach((node, i) => {
      const len = parseFloat(node.style.strokeDasharray) || 1;
      draws.push({ node, len, delay: i * 70 });
    });
    wire(el, makePlay(stage, { draws, nums }));
    return el;
  }

  /* ================= Bullet charts =================================== */
  function buildBullet() {
    const rows = [
      { label: 'Products verified', value: 68, target: 75, poor: 40, ok: 60, good: 75 },
      { label: 'Avg WISEscore', value: 71, target: 80, poor: 40, ok: 60, good: 80 },
      { label: 'GRAS coverage', value: 84, target: 90, poor: 50, ok: 70, good: 90 },
      { label: 'Non-UPF share', value: 66, target: 72, poor: 40, ok: 55, good: 72 },
    ];
    const W = 720, H = 36 + rows.length * 64, A = { x0: 168, x1: 660, y0: H - 16, y1: 8 };
    const xf = (v) => A.x0 + (A.x1 - A.x0) * v / 100;
    const el = card({
      id: 'atx-bullet-card', eyebrow: 'Vs. target', title: 'Headline metrics on a qualitative range',
      intro: 'A bullet chart for each KPI: the grey bands are poor / okay / good, the solid bar is where we are, and the tick is the target. Denser than a gauge, same story. Click to replay.',
      legend: dotsHTML([
        ['color-mix(in srgb, var(--text-subtle) 28%, transparent)', 'Poor'],
        ['color-mix(in srgb, var(--text-subtle) 18%, transparent)', 'Okay'],
        ['color-mix(in srgb, var(--text-subtle) 10%, transparent)', 'Good'],
        [PRI, 'Actual'],
        [EX, 'Target'],
      ]),
      note: 'Sample data: current portfolio KPIs against internal targets.',
    });
    const stage = el.querySelector('.atx-stage');
    const svg = add(stage, m('svg', { class: 'atx-svg', viewBox: `0 0 ${W} ${H}` }));
    const nums = [];
    rows.forEach((r, i) => {
      const cy = 28 + i * 64;
      const th = 26;
      add(svg, m('text', { class: 'atx-tick', 'text-anchor': 'end', x: A.x0 - 14, y: cy + 5 }, r.label));
      add(svg, m('rect', { x: A.x0, y: cy - th / 2, width: xf(100) - A.x0, height: th, fill: 'color-mix(in srgb, var(--text-subtle) 10%, transparent)', rx: 3 }));
      add(svg, m('rect', { x: A.x0, y: cy - th / 2, width: xf(r.good) - A.x0, height: th, fill: 'color-mix(in srgb, var(--text-subtle) 18%, transparent)' }));
      add(svg, m('rect', { x: A.x0, y: cy - th / 2, width: xf(r.ok) - A.x0, height: th, fill: 'color-mix(in srgb, var(--text-subtle) 28%, transparent)' }));
      add(svg, m('rect', {
        class: 'atx-bar atx-bar--h', x: A.x0, y: cy - 5, width: (xf(r.value) - A.x0).toFixed(1), height: 10,
        fill: PRI, rx: 2, style: `animation-delay:${i * 80}ms`,
      }));
      const tick = add(svg, m('line', {
        x1: xf(r.target), y1: cy - th / 2 - 2, x2: xf(r.target), y2: cy + th / 2 + 2,
        stroke: EX, 'stroke-width': 3, 'stroke-linecap': 'round',
      }));
      tick.classList.add('atx-fade');
      tick.style.animationDelay = (i * 80 + 220) + 'ms';
      const t = add(svg, m('text', { class: 'atx-dot-lbl', 'text-anchor': 'start', x: A.x1 + 10, y: cy + 4 }, '0'));
      t.classList.add('atx-fade');
      t.style.animationDelay = (i * 80 + 200) + 'ms';
      nums.push({ node: t, to: r.value, dur: 1100, delay: i * 80 + 200, fmt: (v) => NUM(v) + (r.label.indexOf('score') >= 0 ? '' : '%') });
    });
    wire(el, makePlay(stage, { nums }));
    return el;
  }

  /* ================= Diverging bars ================================== */
  function buildDiverging() {
    const ranked = CATS.slice().sort((a, b) => b.d - a.d);
    const W = 720, H = 56 + ranked.length * 42, A = { x0: 108, x1: 660, y0: H - 28, y1: 12 };
    const maxAbs = 8;
    const mid = (A.x0 + A.x1) / 2;
    const xf = (v) => mid + (A.x1 - mid) * v / maxAbs;
    const el = card({
      id: 'atx-div-card', eyebrow: 'Change', title: 'Quarterly score change by category',
      intro: 'Plus and minus from the center line. Green to the right is a lift this quarter; red to the left is a slide. The ranking is the change, not the score. Click to replay.',
      legend: dotsHTML([[EX, 'Improved'], [PR, 'Declined']]),
      note: 'Sample data: point change in category average versus last quarter.',
    });
    const stage = el.querySelector('.atx-stage');
    const svg = add(stage, m('svg', { class: 'atx-svg', viewBox: `0 0 ${W} ${H}` }));
    for (let i = -2; i <= 2; i++) {
      const v = i * 4;
      const x = xf(v);
      add(svg, m('line', { class: 'atx-grid', x1: x.toFixed(1), y1: A.y1, x2: x.toFixed(1), y2: A.y0 }));
      add(svg, m('text', { class: 'atx-tick atx-tick--x', 'text-anchor': 'middle', x: x.toFixed(1), y: A.y0 + 18 }, (v > 0 ? '+' : '') + v));
    }
    add(svg, m('line', { class: 'atx-axis', x1: mid, y1: A.y1, x2: mid, y2: A.y0, 'stroke-width': 1.75 }));
    const nums = [];
    ranked.forEach((c, i) => {
      const cy = 28 + i * 42;
      const bh = 16;
      add(svg, m('text', { class: 'atx-tick', 'text-anchor': 'end', x: A.x0 - 12, y: cy + 5 }, c.name));
      const x1 = xf(c.d);
      const left = Math.min(mid, x1), right = Math.max(mid, x1);
      const cls = c.d < 0 ? 'atx-bar atx-bar--h atx-bar--left' : 'atx-bar atx-bar--h';
      add(svg, m('rect', {
        class: cls, x: left, y: cy - bh / 2, width: Math.max(2, right - left).toFixed(1), height: bh,
        fill: c.d >= 0 ? EX : PR, rx: 3, style: `animation-delay:${i * 70}ms`,
      }));
      const tx = c.d >= 0 ? right + 10 : left - 10;
      const t = add(svg, m('text', {
        class: 'atx-dot-lbl', 'text-anchor': c.d >= 0 ? 'start' : 'end', x: tx, y: cy + 4,
        fill: c.d >= 0 ? EX : PR,
      }, '0'));
      t.classList.add('atx-fade');
      t.style.animationDelay = (i * 70 + 200) + 'ms';
      nums.push({
        node: t, to: c.d, dur: 1000, delay: i * 70 + 200,
        fmt: (v) => (v > 0 ? '+' : v < 0 ? '\u2212' : '') + NUM(Math.abs(v)),
      });
    });
    wire(el, makePlay(stage, { nums }));
    return el;
  }

  /* ================= Pie ============================================= */
  function buildPie() {
    const slices = [
      { key: 'Non-UPF', color: EX, v: 66 },
      { key: 'Minimally UPF', color: OK, v: 22 },
      { key: 'UPF', color: PR, v: 12 },
    ];
    const el = card({
      id: 'atx-pie-card', eyebrow: 'Share', title: 'Portfolio mix as a pie',
      intro: 'The donut’s filled twin — same three UPF classes, no hole. The Non-UPF slice is nudged out so the majority class reads first. Click to replay.',
      legend: dotsHTML(slices.map((s) => [s.color, s.key])),
      note: 'Sample data: current catalog share by UPF class (sums to 100%).',
    });
    const stage = el.querySelector('.atx-stage');
    const W = 720, H = 320, cx = 360, cy = 158, ro = 118;
    const svg = add(stage, m('svg', { class: 'atx-svg', viewBox: `0 0 ${W} ${H}` }));
    const nums = [];
    let a = -20;
    slices.forEach((s, i) => {
      const sweep = s.v * 3.6;
      const a1 = a + sweep;
      const mid = (a + a1) / 2;
      const explode = i === 0 ? 14 : 0;
      const [sx, sy] = polar(cx, cy, explode, mid);
      const d = donutSlice(sx, sy, 0, ro, a, a1);
      const p = add(svg, m('path', { class: 'atx-pop', d, fill: s.color, stroke: 'var(--surface)', 'stroke-width': 2 }));
      p.style.animationDelay = (i * 110) + 'ms';
      const [lx, ly] = polar(sx, sy, ro * 0.62, mid);
      const t = add(svg, m('text', { class: 'atx-white-lbl', 'text-anchor': 'middle', x: lx.toFixed(1), y: (ly + 4).toFixed(1) }, '0'));
      t.classList.add('atx-fade');
      t.style.animationDelay = (i * 110 + 220) + 'ms';
      nums.push({ node: t, to: s.v, dur: 1100, delay: i * 110 + 220, fmt: (v) => NUM(v) + '%' });
      a = a1;
    });
    wire(el, makePlay(stage, { nums }));
    return el;
  }

  /* ================= Half donut ====================================== */
  function buildHalfDonut() {
    const slices = [
      { key: 'Claimed', color: EX, v: 48 },
      { key: 'In review', color: OK, v: 31 },
      { key: 'Not started', color: FR, v: 21 },
    ];
    const el = card({
      id: 'atx-half-card', eyebrow: 'Composition', title: 'Claim status, as a half donut',
      intro: 'A semicircle composition — the gauge’s cousin, but segmented. Read the bands for the mix; the number in the well is how much of the catalog is already claimed. Click to replay.',
      note: 'Sample data: share of SKUs by claim-workflow stage.',
    });
    const stage = el.querySelector('.atx-stage');
    const wrap = document.createElement('div');
    wrap.className = 'atx-half';
    stage.appendChild(wrap);
    const svgHold = document.createElement('div');
    svgHold.className = 'atx-half-svg';
    wrap.appendChild(svgHold);
    const W = 420, H = 240, cx = 210, cy = 200, ri = 78, ro = 132;
    const svg = add(svgHold, m('svg', { viewBox: `0 0 ${W} ${H}` }));
    const nums = [];
    let a = 270;
    slices.forEach((s, i) => {
      const sweep = s.v * 1.8;
      const d = donutSlice(cx, cy, ri, ro, a, a + sweep);
      const p = add(svg, m('path', { class: 'atx-pop', d, fill: s.color, stroke: 'var(--surface)', 'stroke-width': 2 }));
      p.style.animationDelay = (i * 120) + 'ms';
      a += sweep;
    });
    const numT = add(svg, m('text', { class: 'atx-gauge-num', 'text-anchor': 'middle', x: cx, y: cy - 18 }, '0'));
    add(svg, m('text', { class: 'atx-alabel', 'text-anchor': 'middle', x: cx, y: cy + 2 }, 'claimed'));
    nums.push({ node: numT, to: 48, dur: 1300, fmt: (v) => NUM(v) + '%' });
    const leg = document.createElement('div');
    leg.className = 'atx-half-leg';
    slices.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'atx-half-row';
      row.innerHTML = `<span class="att-dot" style="background:${s.color}"></span><span>${escq(s.key)}</span><span class="atx-half-num">0</span>`;
      const n = row.querySelector('.atx-half-num');
      nums.push({ node: n, to: s.v, dur: 1100, delay: 180, fmt: (v) => NUM(v) + '%' });
      leg.appendChild(row);
    });
    wrap.appendChild(leg);
    wire(el, makePlay(stage, { nums }));
    return el;
  }

  /* ================= Concentric rings ================================ */
  function buildRings() {
    const rings = [
      { key: 'Nutrient Quality', color: EX, v: 80, r: 118 },
      { key: 'Ingredient Quality', color: GD, v: 71, r: 90 },
      { key: 'Processing', color: OK, v: 62, r: 62 },
    ];
    const el = card({
      id: 'atx-rings-card', eyebrow: 'Nested', title: 'Three pillars on concentric rings',
      intro: 'One well, three rings. Each ring is a pillar filling toward 100 — a nested reading of the same scores the polar chart fans out. Click to replay.',
      legend: dotsHTML(rings.map((r) => [r.color, r.key])),
      note: 'Sample data: current portfolio averages for the three scoring pillars.',
    });
    const stage = el.querySelector('.atx-stage');
    const hold = document.createElement('div');
    hold.className = 'atx-rings-wrap';
    stage.appendChild(hold);
    const cx = 160, cy = 160;
    const svg = add(hold, m('svg', { viewBox: '0 0 320 320' }));
    const gauges = [], nums = [];
    rings.forEach((r) => {
      add(svg, m('path', {
        d: ringPath(cx, cy, r.r), fill: 'none',
        stroke: 'color-mix(in srgb, var(--border) 70%, var(--surface))',
        'stroke-width': 20, 'stroke-linecap': 'round',
      }));
      const val = add(svg, m('path', {
        d: ringPath(cx, cy, r.r), fill: 'none', stroke: r.color,
        'stroke-width': 20, 'stroke-linecap': 'round',
        pathLength: 100, 'stroke-dasharray': 100, 'stroke-dashoffset': 100,
      }));
      gauges.push({ node: val, value: r.v });
    });
    const numT = add(svg, m('text', { class: 'atx-gauge-num', 'text-anchor': 'middle', x: cx, y: cy + 2 }, '0'));
    add(svg, m('text', { class: 'atx-alabel', 'text-anchor': 'middle', x: cx, y: cy + 22 }, 'overall'));
    nums.push({ node: numT, to: 71, dur: 1300 });
    wire(el, makePlay(stage, { gauges, nums }));
    return el;
  }

  /* ================= Donut strip ===================================== */
  function buildDonutStrip() {
    const items = [
      { label: 'Non-UPF', sub: 'of catalog', value: 66, color: EX },
      { label: 'GRAS coverage', sub: 'of ingredients', value: 84, color: GD },
      { label: 'Verified', sub: 'of products', value: 68, color: PRI },
      { label: 'Shield rate', sub: 'of SKUs', value: 71, color: OK },
    ];
    const el = card({
      id: 'atx-dstrip-card', eyebrow: 'Snapshot', title: 'Four headline rates, as donuts',
      intro: 'A strip of small progress donuts — one rate each. The hole holds the number; the ring is how far that rate has filled. Click to replay.',
      note: 'Sample data: current portfolio headline rates.',
    });
    const stage = el.querySelector('.atx-stage');
    const wrap = document.createElement('div');
    wrap.className = 'atx-donuts';
    stage.appendChild(wrap);
    const gauges = [], nums = [];
    const cx = 70, cy = 70, r = 48;
    items.forEach((g) => {
      const block = document.createElement('div');
      block.className = 'atx-donut';
      wrap.appendChild(block);
      const svg = add(block, m('svg', { viewBox: '0 0 140 140' }));
      add(svg, m('path', {
        d: ringPath(cx, cy, r), fill: 'none',
        stroke: 'color-mix(in srgb, var(--border) 70%, var(--surface))',
        'stroke-width': 14, 'stroke-linecap': 'round',
      }));
      const val = add(svg, m('path', {
        d: ringPath(cx, cy, r), fill: 'none', stroke: g.color,
        'stroke-width': 14, 'stroke-linecap': 'round',
        pathLength: 100, 'stroke-dasharray': 100, 'stroke-dashoffset': 100,
      }));
      const numT = add(svg, m('text', { class: 'atx-gauge-num', 'text-anchor': 'middle', x: cx, y: cy + 8 }, '0'));
      gauges.push({ node: val, value: g.value });
      nums.push({ node: numT, to: g.value, dur: 1300, fmt: (v) => NUM(v) + '%' });
      const lab = document.createElement('div');
      lab.className = 'atx-donut-lab';
      lab.textContent = g.label;
      block.appendChild(lab);
      const sub = document.createElement('div');
      sub.className = 'atx-donut-sub';
      sub.textContent = g.sub;
      block.appendChild(sub);
    });
    wire(el, makePlay(stage, { gauges, nums }));
    return el;
  }

  /* ================= Leaderboard / sparkline table =================== */
  function buildSparkTable() {
    const el = card({
      id: 'atx-spark-card', eyebrow: 'Leaderboard', title: 'Top products, with a spark in every row',
      intro: 'A table that carries two charts in each row: a capsule bar for the score against 100, and a six-month sparkline for the trend. Status and change sit beside. Click to replay.',
      note: 'Sample data: eight products, ranked by current WISEscore.',
    });
    const stage = el.querySelector('.atx-stage');
    const wrap = document.createElement('div');
    wrap.className = 'atx-tbl-wrap';
    stage.appendChild(wrap);
    const rows = PRODUCTS.slice().sort((a, b) => b.score - a.score);
    const head = '<th>Product</th><th>Score</th><th data-no-sort>Vs. 100</th><th data-no-sort>6-month trend</th><th>Change</th><th>Status</th>';
    wrap.innerHTML = `<table class="atx-tbl" data-no-paginate><thead><tr>${head}</tr></thead><tbody></tbody></table>`;
    const tb = wrap.querySelector('tbody');
    const nums = [], draws = [];
    rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      const deltaCls = r.d > 0 ? 'is-up' : r.d < 0 ? 'is-dn' : '';
      const deltaTxt = r.d > 0 ? '+' + r.d : r.d < 0 ? '\u2212' + Math.abs(r.d) : '0';
      tr.innerHTML =
        `<td><span class="atx-tbl-name">${escq(r.n)}</span></td>` +
        `<td><span class="atx-tbl-num" data-to="${r.score}">0</span></td>` +
        `<td><div class="atx-mini"><div class="atx-mini-fill" style="--atx-mini:${r.score}%;background:${tierVar(r.score)};animation-delay:${i * 55}ms"></div></div></td>` +
        `<td></td>` +
        `<td><span class="atx-tbl-delta ${deltaCls}">${deltaTxt}</span></td>` +
        `<td>${statusPill(r.score)}</td>`;
      const sparkCell = tr.children[3];
      const spark = document.createElementNS(NS, 'svg');
      spark.setAttribute('class', 'atx-spark');
      spark.setAttribute('viewBox', '0 0 92 28');
      const pts = r.spark.map((v, k) => [4 + k * 12, 24 - (v - 40) / 60 * 20]);
      const line = add(spark, m('polyline', {
        class: 'atx-line', points: ptsStr(pts), stroke: PRI, 'stroke-width': 2, fill: 'none',
      }));
      add(spark, m('circle', { class: 'atx-pop', cx: pts[pts.length - 1][0], cy: pts[pts.length - 1][1], r: 2.6, fill: PRI }));
      sparkCell.appendChild(spark);
      draws.push({ node: line, len: polyLen(pts), delay: i * 40 });
      nums.push({ node: tr.querySelector('.atx-tbl-num'), to: r.score, dur: 1100, delay: i * 40 });
      tb.appendChild(tr);
    });
    wire(el, makePlay(stage, { nums, draws }));
    return el;
  }

  /* ================= Heat table ====================================== */
  function buildHeatTable() {
    const el = card({
      id: 'atx-heat-card', eyebrow: 'Heat table', title: 'Product × pillar, coloured by status',
      intro: 'A table first, a heatmap second. Each cell is a score, and the colour is the same five-tier scale every other chart uses — so a column scan is a status scan. Click to replay.',
      legend: dotsHTML(TIER_LEGEND),
      note: 'Sample data: eight products across six scoring pillars.',
    });
    const stage = el.querySelector('.atx-stage');
    const wrap = document.createElement('div');
    wrap.className = 'atx-tbl-wrap';
    stage.appendChild(wrap);
    const head = '<th>Product</th>' + HEAT_COLS.map((c) => `<th>${escq(c)}</th>`).join('');
    wrap.innerHTML = `<table class="atx-tbl atx-heat" data-no-paginate><thead><tr>${head}</tr></thead><tbody></tbody></table>`;
    const tb = wrap.querySelector('tbody');
    const nums = [];
    PRODUCTS.forEach((r, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><span class="atx-tbl-name">${escq(r.n)}</span></td>` +
        r.heat.map((v, k) =>
          `<td class="atx-heat-cell"><span class="atx-heat-swatch atx-fade" style="background:${tierVar(v)};animation-delay:${i * 40 + k * 30}ms">0</span></td>`
        ).join('');
      tr.querySelectorAll('.atx-heat-swatch').forEach((sw, k) => {
        nums.push({ node: sw, to: r.heat[k], dur: 900, delay: i * 40 + k * 30 });
      });
      tb.appendChild(tr);
    });
    wire(el, makePlay(stage, { nums }));
    return el;
  }

  const BUILDERS = [
    buildGroupedColumns, buildPctColumns, buildRangeColumns,
    buildHBars, buildGroupedHBars, buildLollipop, buildBullet, buildDiverging,
    buildPie, buildHalfDonut, buildRings, buildDonutStrip,
    buildSparkTable, buildHeatTable,
  ];

  function mount() {
    const scroll = document.getElementById('agent-main-scroll');
    const dash = scroll && scroll.querySelector('.dash');
    if (!dash) return false;
    if (document.getElementById('atx-group-card')) return true;
    if (!document.getElementById('atx-box-card')) return false;
    const frag = document.createDocumentFragment();
    BUILDERS.forEach((b) => { try { const c = b(); if (c) frag.appendChild(c); } catch (e) { /* one bad chart never blocks the rest */ } });
    dash.appendChild(frag);
    return true;
  }

  function init() {
    if (mount()) return;
    const obs = new MutationObserver(() => { if (mount()) obs.disconnect(); });
    obs.observe(document.getElementById('agent-main-scroll') || document.body, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 16000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
