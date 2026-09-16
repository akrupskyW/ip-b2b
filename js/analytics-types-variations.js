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

import { roundedSector } from './chart-arcs.js';
import {
  escq, NUM, card, makePlay, wire, tierVar, statusPill, dotsHTML, TIER_LEGEND,
  EX, GD, OK, FR, PR, PRI,
} from './analytics-card-kit.js';

(function () {
  const NS = 'http://www.w3.org/2000/svg';

  function m(tag, attrs, txt) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  const add = (parent, child) => (parent.appendChild(child), child);

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

  /* Slice corner radius. The pie and the half donut are the same family of
     shape as the UPF / GRAS donuts, so they round their corners the same way
     — through the shared sector geometry, at a radius that reads on a stage
     this size. `polar` here puts 0° at 12 o'clock; the shared helper measures
     from 3 o'clock, so every angle handed to it is shifted by 90°. */
  const SLICE_CR = 10;
  const sliceD = (cx, cy, ri, ro, a0, a1) =>
    (((a1 - a0) % 360 + 360) % 360) < 0.2
      ? ''
      : roundedSector(cx, cy, ri, ro, a0 - 90, a1 - 90, SLICE_CR);

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

  /* ================= Grouped columns ================================= */
  function buildGroupedColumns() {
    const W = 720, H = 320, A = { x0: 44, x1: 700, y0: 272, y1: 18 };
    const vmax = 320;
    const yf = (v) => A.y0 - (A.y0 - A.y1) * v / vmax;
    const n = QUARTERS.length, band = (A.x1 - A.x0) / n;
    const gap = 3, inner = band * 0.72, bw = (inner - gap * (UPF_SEGS.length - 1)) / UPF_SEGS.length;
    const el = card({
      id: 'atx-group-card', eyebrow: 'Clustered', title: 'Products analyzed, side by side',
      chartType: 'Grouped column chart',
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
      chartType: '100% stacked column chart',
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
      chartType: 'Floating column chart',
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
      chartType: 'Horizontal bar chart',
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
      chartType: 'Grouped bar chart',
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
      chartType: 'Dumbbell chart',
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
      chartType: 'Bullet chart',
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
      chartType: 'Diverging bar chart',
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
      chartType: 'Pie chart',
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
      const d = sliceD(sx, sy, 0, ro, a, a1);
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
      chartType: 'Half donut chart',
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
      const d = sliceD(cx, cy, ri, ro, a, a + sweep);
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
      chartType: 'Concentric ring chart',
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
    /* The number above this is 27px, so its line reaches ~9px past its own
       baseline. Sit the caption clear of that rather than against it — a
       larger text scale grows both and closes any gap this one does not have. */
    add(svg, m('text', { class: 'atx-alabel', 'text-anchor': 'middle', x: cx, y: cy + 27 }, 'overall'));
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
      chartType: 'Donut strip',
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
      chartType: 'Leaderboard table',
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
      chartType: 'Heat table',
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

  /* ================= Ingredients wheel =============================== */
  /* ── helpers ──────────────────────────────────────────────────────── */
  const f1 = v => v.toFixed(1);

  function buildIngredientsWheel() {
    /* ── layout constants ─────────────────────────────────── */
    const W = 720, H = 720, CX = 360, CY = 360;
    const R0 = 62;   /* center hole */
    const R1 = 148;  /* inner  → middle ring boundary */
    const R2 = 212;  /* middle → outer  ring boundary */
    const R3 = 270;  /* outer edge of outermost ring */
    const TAU = Math.PI * 2, START = -Math.PI / 2, DEG = 180 / Math.PI;
    /* Corner radii per ring — outer ring gets the most visible rounding */
    const CR0 = 2, CR1 = 2, CR2 = 5;
    /* Radial gaps between segments (radians) */
    const IGAP = 0.025, MGAP = 0.015, OGAP = 0.010;
    /* Minimum arc-length (px) to show an inside label */
    const MIN_INNER = 22, MIN_MID = 36;

    /* Convert radians to degrees for roundedSector (which uses degrees from 3 o'clock) */
    const r2d = r => r * DEG;

    /* ── portfolio ingredient data ─────────────────────────────────────
       8 top-level categories that sum to 100 %.
       Each category has subcategories that sum to the category pct.
       Each subcategory has items that sum to the subcategory pct.
    ──────────────────────────────────────────────────────────────────── */
    const CATS = [
      {
        name: 'Additives', color: '#4f84c4', pct: 38, subs: [
          { name: 'Functional Additives', pct: 22, items: [
            { name: 'Citric Acid', pct: 3.8 },
            { name: 'Natural Flavor', pct: 3.4 },
            { name: 'Vitamin B-3', pct: 2.3 },
            { name: 'Vitamin B-1', pct: 2.0 },
            { name: 'Soy Lecithin', pct: 1.9 },
            { name: 'Vitamin B-9', pct: 1.5 },
            { name: 'Vitamin B-2', pct: 1.4 },
            { name: 'Sea Salt', pct: 1.3 },
            { name: 'Iron', pct: 1.2 },
            { name: 'Other', pct: 3.2 },
          ] },
          { name: 'Spices', pct: 9, items: [
            { name: 'Paprika', pct: 2.4 },
            { name: 'Black Pepper', pct: 2.1 },
            { name: 'Cumin', pct: 1.6 },
            { name: 'Turmeric', pct: 1.3 },
            { name: 'Other', pct: 1.6 },
          ] },
          { name: 'Herbs', pct: 4, items: [
            { name: 'Parsley', pct: 1.4 },
            { name: 'Oregano', pct: 1.1 },
            { name: 'Thyme', pct: 0.9 },
            { name: 'Basil', pct: 0.6 },
          ] },
          { name: 'Other Additives', pct: 3, items: [
            { name: 'Sugar', pct: 1.7 },
            { name: 'Salt', pct: 1.3 },
          ] },
        ],
      },
      {
        name: 'Vegetable', color: '#b5534a', pct: 17, subs: [
          { name: 'Allium Veg.', pct: 7, items: [
            { name: 'Garlic', pct: 2.4 },
            { name: 'Onion', pct: 2.1 },
            { name: 'Onion Powder', pct: 1.5 },
            { name: 'Garlic Powder', pct: 1.0 },
          ] },
          { name: 'Nightshades', pct: 5, items: [
            { name: 'Tomato', pct: 2.2 },
            { name: 'Bell Pepper', pct: 1.5 },
            { name: 'Chili Pepper', pct: 1.3 },
          ] },
          { name: 'Root Vegetables', pct: 3, items: [
            { name: 'Carrot', pct: 1.5 },
            { name: 'Potato', pct: 1.0 },
            { name: 'Beet', pct: 0.5 },
          ] },
          { name: 'Other Veg.', pct: 2, items: [
            { name: 'Celery', pct: 0.8 },
            { name: 'Broccoli', pct: 0.6 },
            { name: 'Corn', pct: 0.6 },
          ] },
        ],
      },
      {
        name: 'Fats & Oils', color: '#4a8c4a', pct: 11, subs: [
          { name: 'Plant Based Oils', pct: 8, items: [
            { name: 'Canola Oil', pct: 2.8 },
            { name: 'Sunflower Oil', pct: 2.2 },
            { name: 'Soybean Oil', pct: 1.9 },
            { name: 'Palm Oil', pct: 1.1 },
          ] },
          { name: 'Other Fats', pct: 3, items: [
            { name: 'Cocoa Butter', pct: 1.4 },
            { name: 'Coconut Oil', pct: 1.0 },
            { name: 'Butter', pct: 0.6 },
          ] },
        ],
      },
      {
        name: 'Protein', color: '#d4954a', pct: 10, subs: [
          { name: 'Animal Proteins', pct: 4, items: [
            { name: 'Egg', pct: 1.6 },
            { name: 'Whey', pct: 1.4 },
            { name: 'Albumin', pct: 1.0 },
          ] },
          { name: 'Nut & Seed', pct: 4, items: [
            { name: 'Almond', pct: 1.6 },
            { name: 'Peanut', pct: 1.3 },
            { name: 'Sunflower Seed', pct: 0.7 },
            { name: 'Cashew', pct: 0.4 },
          ] },
          { name: 'Legumes', pct: 2, items: [
            { name: 'Soy Protein', pct: 1.1 },
            { name: 'Pea Protein', pct: 0.9 },
          ] },
        ],
      },
      {
        name: 'Dairy', color: '#6888c4', pct: 9, subs: [
          { name: 'Milks', pct: 9, items: [
            { name: 'Skim Milk', pct: 2.8 },
            { name: 'Whole Milk', pct: 2.3 },
            { name: 'Cream', pct: 1.8 },
            { name: 'Buttermilk', pct: 1.3 },
            { name: 'Nonfat Milk', pct: 0.8 },
          ] },
        ],
      },
      {
        name: 'Grain', color: '#8896b0', pct: 8, subs: [
          { name: 'Wheat Flour', pct: 5, items: [
            { name: 'Enriched Flour', pct: 1.8 },
            { name: 'Whole Wheat', pct: 1.6 },
            { name: 'Wheat Flour', pct: 1.2 },
            { name: 'Barley Flour', pct: 0.4 },
          ] },
          { name: 'Other Grains', pct: 3, items: [
            { name: 'Rolled Oats', pct: 1.1 },
            { name: 'Brown Rice', pct: 0.9 },
            { name: 'Corn Meal', pct: 0.7 },
            { name: 'Barley', pct: 0.3 },
          ] },
        ],
      },
      {
        name: 'Fruit', color: '#8264b0', pct: 5, subs: [
          { name: 'Citrus', pct: 2, items: [
            { name: 'Lemon Juice', pct: 0.9 },
            { name: 'Orange Zest', pct: 0.7 },
            { name: 'Lime', pct: 0.4 },
          ] },
          { name: 'Berry', pct: 2, items: [
            { name: 'Blueberry', pct: 0.9 },
            { name: 'Strawberry', pct: 0.7 },
            { name: 'Cranberry', pct: 0.4 },
          ] },
          { name: 'Other Fruit', pct: 1, items: [
            { name: 'Apple', pct: 0.5 },
            { name: 'Raisin', pct: 0.5 },
          ] },
        ],
      },
      {
        name: 'Water', color: '#6aaed6', pct: 2, subs: [
          { name: 'Water', pct: 2, items: [
            { name: 'Water', pct: 1.4 },
            { name: 'Yeast', pct: 0.6 },
          ] },
        ],
      },
    ];

    const el = card({
      id: 'atx-wheel-card',
      eyebrow: 'Composition',
      chartType: 'Ingredients wheel',
      title: 'Portfolio ingredient breakdown',
      intro: 'All ingredients across the portfolio mapped onto three concentric rings. Innermost: broad ingredient category. Middle: subcategory. Outermost: every individual ingredient — arc width proportional to the share of products containing it. Use the filter chips to isolate any category; click the chart to replay the clockwise reveal.',
      note: 'Sample data — 847 products, 8 categories, 21 subcategories, 72 individual ingredients.',
    });

    const stage = el.querySelector('.atx-stage');

    /* ── filter chips ──────────────────────────────────────── */
    const filtersDiv = document.createElement('div');
    filtersDiv.className = 'atx-wheel-filters';
    CATS.forEach((cat, ci) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'atx-wfbtn atx-wfbtn--on';
      btn.dataset.wcat = String(ci);
      const dot = document.createElement('span');
      dot.className = 'atx-wfbtn-dot';
      dot.style.background = cat.color;
      btn.appendChild(dot);
      btn.appendChild(document.createTextNode(cat.name));
      filtersDiv.appendChild(btn);
    });
    stage.before(filtersDiv);

    /* ── SVG canvas ────────────────────────────────────────── */
    const svg = add(stage, m('svg', {
      class: 'atx-svg atx-wheel-svg',
      viewBox: `0 0 ${W} ${H}`,
      style: 'overflow:visible',
    }));
    const defs = add(svg, m('defs', {}));

    /* Drop-shadow makes white inner labels legible on any arc colour */
    const flt = add(defs, m('filter', {
      id: 'atx-whl-shd', x: '-30%', y: '-30%', width: '160%', height: '160%',
    }));
    add(flt, m('feDropShadow', {
      dx: '0', dy: '0', stdDeviation: '2',
      'flood-color': 'rgba(0,0,0,0.65)', 'flood-opacity': '1',
    }));

    /* Clip path for clock-sweep animation — starts as a zero-area point.
       The clipPath is applied to the <g transform="translate(CX,CY)"> element,
       so all coordinates here are in g-local space (origin = wheel centre = 0,0). */
    const cpEl = add(defs, m('clipPath', { id: 'atx-whl-clip' }));
    const clipShape = add(cpEl, m('path', { d: 'M0,0 Z' }));

    /* All geometry lives in a group centred at (CX, CY) */
    const g = add(svg, m('g', {
      transform: `translate(${CX},${CY})`,
      'clip-path': 'url(#atx-whl-clip)',
    }));

    /* ── helper: white label rotated radially inside an arc ── */
    function innerLabel(midA, midR, name, fontSize) {
      const lx = midR * Math.cos(midA), ly = midR * Math.sin(midA);
      let rot = midA * DEG;
      if (midA > Math.PI / 2 && midA < 3 * Math.PI / 2) rot += 180;
      const words = name.split(' ');
      const half = Math.ceil(words.length / 2);
      const t = m('text', {
        'text-anchor': 'middle',
        fill: 'rgba(255,255,255,0.95)',
        filter: 'url(#atx-whl-shd)',
        transform: `translate(${f1(lx)},${f1(ly)}) rotate(${rot.toFixed(1)})`,
      });
      if (fontSize) t.style.fontSize = fontSize;
      const ts1 = m('tspan', { x: '0', dy: words.length > 1 ? '-0.55em' : '0.35em' });
      ts1.textContent = words.slice(0, half).join(' ');
      t.appendChild(ts1);
      if (words.length > 1) {
        const ts2 = m('tspan', { x: '0', dy: '1.2em' });
        ts2.textContent = words.slice(half).join(' ');
        t.appendChild(ts2);
      }
      return t;
    }

    /* ── draw three concentric rings ───────────────────────── */
    let catA = START;
    CATS.forEach((cat, ci) => {
      const catSpan = TAU * cat.pct / 100;
      const ia1 = catA + IGAP / 2, ia2 = catA + catSpan - IGAP / 2;
      catA += catSpan;
      if (ia2 <= ia1) return;

      /* Inner ring: top-level category */
      const innerP = m('path', {
        d: roundedSector(0, 0, R0, R1, r2d(ia1), r2d(ia2), CR0),
        fill: cat.color, class: `atx-wcat-${ci}`,
        'data-wlevel': 'cat', 'data-wname': cat.name,
        'data-wpct': String(cat.pct), 'data-wcolor': cat.color,
        style: 'cursor:pointer',
      });
      add(g, innerP);

      if (catSpan * (R0 + R1) / 2 > MIN_INNER) {
        const lbl = innerLabel((ia1 + ia2) / 2, (R0 + R1) / 2, cat.name, '10.5px');
        lbl.classList.add('atx-wheel-lbl', `atx-wcat-${ci}`);
        add(g, lbl);
      }

      /* Middle + outer rings: loop through subcategories */
      let subA = ia1;
      cat.subs.forEach((sub) => {
        const subSpan = (ia2 - ia1) * sub.pct / cat.pct;
        const sa1 = subA + MGAP / 2, sa2 = subA + subSpan - MGAP / 2;
        subA += subSpan;
        if (sa2 <= sa1) return;
        const midSA = (sa1 + sa2) / 2;

        /* Middle ring: subcategory */
        const midP = m('path', {
          d: roundedSector(0, 0, R1 + 3, R2, r2d(sa1), r2d(sa2), CR1),
          fill: cat.color, 'fill-opacity': '0.72',
          class: `atx-wcat-${ci}`,
          'data-wlevel': 'sub', 'data-wname': sub.name,
          'data-wpct': String(sub.pct), 'data-wcolor': cat.color,
          'data-wparent': cat.name,
          style: 'cursor:pointer',
        });
        add(g, midP);

        if (subSpan * (R1 + R2) / 2 > MIN_MID) {
          const mlbl = innerLabel(midSA, (R1 + R2) / 2, sub.name, '9.5px');
          mlbl.classList.add('atx-wheel-lbl', `atx-wcat-${ci}`);
          add(g, mlbl);
        }

        /* Outer ring: individual ingredients with rounded outer corners */
        let ingA = sa1;
        sub.items.forEach((ing) => {
          const ingSpan = (sa2 - sa1) * ing.pct / sub.pct;
          const oa1 = ingA + OGAP / 2, oa2 = ingA + ingSpan - OGAP / 2;
          ingA += ingSpan;
          if (oa2 <= oa1 + 0.001) return;
          const midOA = (oa1 + oa2) / 2;

          const outerP = m('path', {
            d: roundedSector(0, 0, R2 + 3, R3, r2d(oa1), r2d(oa2), CR2),
            fill: cat.color, 'fill-opacity': '0.5',
            class: `atx-wcat-${ci}`,
            'data-wlevel': 'ing', 'data-wname': ing.name,
            'data-wpct': f1(ing.pct), 'data-wcolor': cat.color,
            'data-wparent': sub.name,
            style: 'cursor:pointer',
          });
          add(g, outerP);

          /* Radial spoke label beyond the outer ring */
          if (oa2 - oa1 > 0.004) {
            const lx = (R3 + 11) * Math.cos(midOA);
            const ly = (R3 + 11) * Math.sin(midOA);
            const inLeft = midOA > Math.PI / 2 && midOA < 3 * Math.PI / 2;
            let rot = midOA * DEG;
            if (inLeft) rot += 180;
            const lbl = m('text', {
              class: 'atx-wheel-ing',
              'text-anchor': inLeft ? 'end' : 'start',
              'dominant-baseline': 'middle',
              fill: cat.color,
              transform: `translate(${f1(lx)},${f1(ly)}) rotate(${rot.toFixed(1)})`,
            });
            lbl.textContent = ing.name;
            add(g, lbl);
          }
        });
      });
    });

    /* Center circle + "Portfolio / Ingredients" label */
    add(g, m('circle', {
      cx: '0', cy: '0', r: String(R0 - 2),
      fill: 'var(--surface)', stroke: 'var(--border)', 'stroke-width': '1.5',
    }));
    const ct = m('text', {
      class: 'atx-wheel-center-lbl', 'text-anchor': 'middle', fill: 'var(--text)',
    });
    const cts1 = m('tspan', { x: '0', dy: '-0.55em' }); cts1.textContent = 'Portfolio';
    const cts2 = m('tspan', { x: '0', dy: '1.25em' }); cts2.textContent = 'Ingredients';
    ct.appendChild(cts1); ct.appendChild(cts2);
    add(g, ct);

    /* ── filter chip toggle ────────────────────────────────── */
    filtersDiv.addEventListener('click', (e) => {
      const btn = e.target.closest('.atx-wfbtn');
      if (!btn) return;
      const ci = +btn.dataset.wcat;
      const on = btn.classList.toggle('atx-wfbtn--on');
      svg.querySelectorAll(`.atx-wcat-${ci}`).forEach((el) => {
        el.style.opacity = on ? '' : '0.07';
      });
    });

    /* ── clockwise sweep animation ─────────────────────────── */
    let raf = null;
    function sweepD(endA) {
      /* Full reveal: a rectangle that covers the entire wheel in g-local space
         (wheel centre = 0,0; arcs span ±R3 in every direction). */
      const PAD = R3 + 80;
      if (endA >= START + TAU - 0.001) return `M${-PAD},${-PAD} h${PAD * 2} v${PAD * 2} h${-PAD * 2} Z`;
      const R = R3 + 60, lg = endA - START > Math.PI ? 1 : 0;
      const fx = v => v.toFixed(3);
      /* Wedge centred at g-local origin (0,0) = wheel centre */
      return `M0,0 L${fx(R * Math.cos(START))},${fx(R * Math.sin(START))} A${R},${R},0,${lg},1,${fx(R * Math.cos(endA))},${fx(R * Math.sin(endA))} Z`;
    }

    function play(snap) {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (snap || reduced) { clipShape.setAttribute('d', sweepD(START + TAU)); return; }
      clipShape.setAttribute('d', 'M0,0 Z');
      const dur = 1500, t0 = performance.now();
      (function frame(now) {
        const t = Math.min((now - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - t, 3); /* ease-out cubic */
        clipShape.setAttribute('d', sweepD(START + TAU * ease));
        if (t < 1) raf = requestAnimationFrame(frame);
      }(t0));
    }

    /* ── hover / tap tooltip ──────────────────────────────── */
    const TOTAL_PROD = 847;
    let wTipEl = null;
    function getWTip() {
      if (!wTipEl) {
        wTipEl = document.getElementById('atx-wheel-tip');
        if (!wTipEl) {
          wTipEl = document.createElement('div');
          wTipEl.id = 'atx-wheel-tip';
          wTipEl.setAttribute('role', 'tooltip');
          document.body.appendChild(wTipEl);
        }
      }
      return wTipEl;
    }
    function posWTip(tip, cx, cy) {
      const PAD = 14, TW = 220, TH = 96;
      const vw = window.innerWidth, vh = window.innerHeight;
      let x = cx + PAD, y = cy - TH / 2;
      if (x + TW > vw - PAD) x = cx - TW - PAD;
      if (y < PAD) y = PAD;
      if (y + TH > vh - PAD) y = vh - TH - PAD;
      tip.style.left = x + 'px';
      tip.style.top  = y + 'px';
    }
    function showWTip(e, arc) {
      const tip = getWTip();
      const pct  = +arc.dataset.wpct;
      const count = Math.max(1, Math.round(TOTAL_PROD * pct / 100));
      const levelMap = { cat: 'Category', sub: 'Subcategory', ing: 'Ingredient' };
      const level  = levelMap[arc.dataset.wlevel] || arc.dataset.wlevel;
      const name   = arc.dataset.wname;
      const parent = arc.dataset.wparent || '';
      tip.style.background = arc.dataset.wcolor;
      tip.style.color = '#fff';
      tip.innerHTML =
        `<div class="whl-tip-level">${level}${parent ? ' · ' + parent : ''}</div>` +
        `<div class="whl-tip-name">${name}</div>` +
        `<div class="whl-tip-row">${pct.toFixed(1)}% of portfolio</div>` +
        `<div class="whl-tip-row">~${count.toLocaleString()} of ${TOTAL_PROD.toLocaleString()} products</div>`;
      posWTip(tip, e.clientX, e.clientY);
      tip.classList.add('is-visible');
    }
    function hideWTip() {
      if (wTipEl) wTipEl.classList.remove('is-visible');
    }

    /* Mouse: follow cursor inside SVG, hide on leave */
    svg.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const arc = e.target.closest('[data-wlevel]');
      if (arc) showWTip(e, arc);
      else hideWTip();
    });
    svg.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'touch') hideWTip();
    });

    /* Touch: tap to show, tap same arc or outside to dismiss */
    let lastTapArc = null;
    svg.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      const arc = e.target.closest('[data-wlevel]');
      if (!arc) { hideWTip(); lastTapArc = null; return; }
      if (arc === lastTapArc) { hideWTip(); lastTapArc = null; }
      else { showWTip(e, arc); lastTapArc = arc; }
    });
    document.addEventListener('pointerdown', (e) => {
      if (lastTapArc && !svg.contains(e.target)) { hideWTip(); lastTapArc = null; }
    }, { capture: true });

    wire(el, play);
    return el;
  }

  /* ================= Treemap ======================================= */
  function buildTreemap() {
    const GAP = 2;

    /* Two-level portfolio food categories, sized by distinct-product count */
    const TMAP = [
      { name: 'Pantry',      color: '#4a8854', pct: 22, items: [
        { name: 'Spices & Seasoning', pct: 5.5 },
        { name: 'Sauces',             pct: 4.0 },
        { name: 'Bagged Tea',         pct: 2.5 },
        { name: 'Baking',             pct: 2.5 },
        { name: 'Canned Veggies',     pct: 2.0 },
        { name: 'Pasta',              pct: 1.5 },
        { name: 'Soup',               pct: 1.5 },
        { name: 'Other',              pct: 2.5 },
      ] },
      { name: 'Snacks',      color: '#c4844a', pct: 20, items: [
        { name: 'Nuts & Seeds', pct: 4.5 },
        { name: 'Cookies',      pct: 4.0 },
        { name: 'Chips',        pct: 3.5 },
        { name: 'Crackers',     pct: 3.0 },
        { name: 'Bars',         pct: 2.5 },
        { name: 'Dried Fruit',  pct: 1.5 },
        { name: 'Other',        pct: 1.0 },
      ] },
      { name: 'Candy',       color: '#b55c8a', pct: 14, items: [
        { name: 'Chocolate',  pct: 5.0 },
        { name: 'Gummy',      pct: 3.5 },
        { name: 'Fruity',     pct: 2.5 },
        { name: 'Hard Candy', pct: 1.5 },
        { name: 'Other',      pct: 1.5 },
      ] },
      { name: 'Dairy & Eggs', color: '#6888c4', pct: 12, items: [
        { name: 'Cheese',  pct: 3.5 },
        { name: 'Yogurt',  pct: 3.0 },
        { name: 'Milk',    pct: 2.5 },
        { name: 'Eggs',    pct: 1.5 },
        { name: 'Other',   pct: 1.5 },
      ] },
      { name: 'Drinks',      color: '#4f84c4', pct: 10, items: [
        { name: 'Juice',  pct: 3.0 },
        { name: 'Tea',    pct: 2.5 },
        { name: 'Energy', pct: 2.0 },
        { name: 'Soda',   pct: 1.5 },
        { name: 'Other',  pct: 1.0 },
      ] },
      { name: 'Bakery',      color: '#c47a3a', pct: 8, items: [
        { name: 'Bread',    pct: 2.8 },
        { name: 'Desserts', pct: 2.4 },
        { name: 'Rolls',    pct: 1.6 },
        { name: 'Other',    pct: 1.2 },
      ] },
      { name: 'Frozen',      color: '#5a9cb5', pct: 7, items: [
        { name: 'Ice Cream', pct: 2.5 },
        { name: 'Pizza',     pct: 2.0 },
        { name: 'Meals',     pct: 1.5 },
        { name: 'Other',     pct: 1.0 },
      ] },
      { name: 'Meat & Fish', color: '#9c5a4a', pct: 4, items: [
        { name: 'Beef',    pct: 1.3 },
        { name: 'Poultry', pct: 1.1 },
        { name: 'Sausage', pct: 0.8 },
        { name: 'Fish',    pct: 0.8 },
      ] },
      { name: 'Produce',     color: '#5ca050', pct: 2, items: [
        { name: 'Vegetables', pct: 1.2 },
        { name: 'Fruit',      pct: 0.8 },
      ] },
      { name: 'Prepared',    color: '#a08060', pct: 1, items: [
        { name: 'Ready Meals', pct: 0.5 },
        { name: 'Deli',        pct: 0.5 },
      ] },
    ];

    const el = card({
      id: 'atx-tmap-card',
      eyebrow: 'Assortment',
      chartType: 'Treemap',
      title: 'Portfolio categories',
      intro: 'Food categories two levels deep, sized by distinct products in the current portfolio scope. Each outer rectangle is a top-level category; inner tiles are its subcategories. Click to replay.',
      note: 'Sample data — 847 products across 10 top-level food categories.',
    });

    const stage = el.querySelector('.atx-stage');

    /* ── responsive render ─────────────────────────────────────────────
       The viewBox always matches the stage's pixel width so every label
       renders at its designed pt size regardless of screen width.
       Narrow (<= 520 px): 3-row layout — bigger cells, legible text.
       Wide:               2-row layout — current desktop split.
    ─────────────────────────────────────────────────────────────────── */
    function renderAt(W) {
      const old = stage.querySelector('svg');
      if (old) old.remove();

      const mobile = W <= 520;

      /* Row groupings ------------------------------------------------ */
      const rows = mobile
        ? [TMAP.slice(0, 2), TMAP.slice(2, 5), TMAP.slice(5)]   /* 2 + 3 + 5 */
        : [TMAP.slice(0, 4), TMAP.slice(4)];                     /* 4 + 6 */

      /* Height proportional to content: 380/720 ratio on desktop,
         taller on mobile to give each row enough room              */
      const H = mobile ? Math.round(W * 1.38) : Math.round(W * 380 / 720);

      const svg = add(stage, m('svg', { class: 'atx-svg', viewBox: `0 0 ${W} ${H}` }));
      let delay = 0, yOff = 0;

      rows.forEach((row) => {
        const rowPct = row.reduce((s, c) => s + c.pct, 0);
        const rowH   = H * rowPct / 100;
        let xOff = 0;

        row.forEach((cat) => {
          const catW  = W * cat.pct / rowPct;
          const headH = Math.min(20, rowH * 0.16);
          const bx    = xOff + GAP, by = yOff + GAP;
          const bw    = catW - GAP * 2, bh = rowH - GAP * 2;

          /* Background tint */
          const bg = m('rect', {
            class: 'atx-fade', x: f1(bx), y: f1(by),
            width: f1(bw), height: f1(bh), rx: '3',
            fill: cat.color, 'fill-opacity': '0.14',
          });
          bg.style.animationDelay = `${delay}ms`;
          add(svg, bg);

          /* Header strip */
          const hd = m('rect', {
            class: 'atx-fade', x: f1(bx), y: f1(by),
            width: f1(bw), height: f1(headH), rx: '2',
            fill: cat.color,
          });
          hd.style.animationDelay = `${delay + 25}ms`;
          add(svg, hd);

          /* Category label */
          if (bw > 38) {
            const catLbl = m('text', {
              class: 'atx-tmap-cat-lbl atx-fade',
              x: f1(bx + 5), y: f1(by + headH / 2 + 4),
              fill: '#fff',
            });
            catLbl.style.animationDelay = `${delay + 45}ms`;
            catLbl.textContent = cat.name;
            add(svg, catLbl);
          }

          /* Subcategory items */
          const bodyY  = by + headH + 2;
          const bodyH  = bh - headH - 2;
          const ncols  = bw > 110 ? 2 : 1;
          const nrows2 = Math.ceil(cat.items.length / ncols);
          const cellW  = bw / ncols;
          const cellH  = bodyH / nrows2;

          cat.items.forEach((item, ii) => {
            const col = ii % ncols, ri2 = Math.floor(ii / ncols);
            const ix  = bx + col * cellW;
            const iy  = bodyY + ri2 * cellH;
            const iw  = cellW - 1, ih = cellH - 1;
            if (iw < 8 || ih < 8) return;

            const ir = m('rect', {
              class: 'atx-fade', x: f1(ix), y: f1(iy),
              width: f1(iw), height: f1(ih), rx: '2',
              fill: cat.color, 'fill-opacity': '0.22',
            });
            ir.style.animationDelay = `${delay + 70 + ii * 18}ms`;
            add(svg, ir);

            if (iw > 28 && ih > 12) {
              const ilbl = m('text', {
                class: 'atx-tmap-item-lbl atx-fade',
                x: f1(ix + 5), y: f1(iy + ih / 2 + 3.5),
                fill: cat.color,
              });
              ilbl.style.animationDelay = `${delay + 90 + ii * 18}ms`;
              ilbl.textContent = item.name;
              add(svg, ilbl);
            }
          });

          xOff  += catW;
          delay += 55;
        });

        yOff += rowH;
      });
    }

    /* Replay helper — re-renders then triggers CSS enter animation */
    function playNow(snap) {
      const w = stage.getBoundingClientRect().width || stage.offsetWidth || 720;
      renderAt(Math.round(w));
      if (snap) {
        stage.classList.add('is-in');
      } else {
        stage.classList.remove('is-in');
        void stage.offsetWidth;
        stage.classList.add('is-in');
      }
    }

    /* ResizeObserver: re-render when the stage width changes by > 10 px
       so the viewBox always matches the real container width           */
    let lastW = 0;
    if (window.ResizeObserver) {
      const ro = new ResizeObserver((entries) => {
        const w = Math.round(entries[0].contentRect.width);
        if (Math.abs(w - lastW) < 10) return;
        lastW = w;
        renderAt(w);
        stage.classList.remove('is-in');
        void stage.offsetWidth;
        stage.classList.add('is-in');
      });
      ro.observe(stage);
    }

    wire(el, playNow);
    return el;
  }

  const BUILDERS = [
    buildGroupedColumns, buildPctColumns, buildRangeColumns,
    buildHBars, buildGroupedHBars, buildLollipop, buildBullet, buildDiverging,
    buildPie, buildHalfDonut, buildRings, buildDonutStrip,
    buildSparkTable, buildHeatTable, buildIngredientsWheel, buildTreemap,
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
