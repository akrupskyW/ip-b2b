/**
 * Compact brand charts for the large welcome overview cards.
 *
 * Same Date Better Snacks numbers and ring geometry as the Overview
 * dashboard (js/dashboard-home.js DATA.upf / DATA.wisescore) — a card-sized
 * double donut and the three WISEscore pillar bars, so the welcome rail
 * shows the values before anyone opens a module.
 */

import { roundedSector } from './chart-arcs.js';
import { esc } from './escape-html.js';

const C = {
  green: 'var(--sec-green)',
  greenLight: 'var(--chart-status-good)',
  teal: 'var(--ter-cyan)',
  tealSoft: 'color-mix(in srgb, var(--ter-cyan) 50%, #fff)',
  amber: 'var(--ter-amber)',
  orange: 'var(--chart-status-fair)',
  red: 'var(--sec-red)',
};

/* Mirrors dashboard-home.js DATA.upf / DATA.wisescore. */
const UPF = {
  pct: 92,
  nonCount: 22,
  total: 24,
  split: [
    { label: 'Non-UPF', value: 22, color: C.teal },
    { label: 'UPF', value: 2, color: C.tealSoft },
  ],
  distribution: [
    { label: 'Minimally Processed', value: 14, color: C.green },
    { label: 'Lightly Processed', value: 8, color: C.greenLight },
    { label: 'Moderately Processed', value: 0, color: C.amber },
    { label: 'Ultra-Processed', value: 1, color: C.orange },
    { label: 'Super Ultra-Processed', value: 1, color: C.red },
  ],
};

const WISESCORE = {
  average: 79,
  rating: 'Good',
  pillars: [
    { name: 'Nutrient Quality', icon: 'eco', score: 75 },
    { name: 'Ingredient Quality', icon: 'biotech', score: 89 },
    { name: 'Health Outcomes', icon: 'favorite', score: 72 },
  ],
};

const TIER_COLORS = {
  excellent: C.green,
  good: C.greenLight,
  okay: C.amber,
  fair: C.orange,
  poor: C.red,
};

function scoreTone(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'okay';
  if (score >= 20) return 'fair';
  return 'poor';
}

function scoreColor(score) {
  return TIER_COLORS[scoreTone(score)];
}

function donutRing(parts, ring, cx, cy, r, sw, gapPx) {
  const circ = 2 * Math.PI * r;
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const ro = r + sw / 2;
  const ri = r - sw / 2;
  const gapDeg = (gapPx / circ) * 360;
  const minDeg = (4 / circ) * 360;
  const cr = 7;
  let acc = 0;
  return parts
    .filter((p) => p.value > 0)
    .map((p) => {
      const startDeg = (acc / total) * 360;
      const endDeg = ((acc + p.value) / total) * 360;
      acc += p.value;
      let a0 = startDeg + gapDeg / 2;
      let a1 = endDeg - gapDeg / 2;
      if (a1 - a0 < minDeg) {
        const mid = (startDeg + endDeg) / 2;
        a0 = mid - minDeg / 2;
        a1 = mid + minDeg / 2;
      }
      const pct = Math.round((p.value / total) * 100);
      const d = roundedSector(cx, cy, ri, ro, a0, a1, cr);
      return `<path class="dash-donut-arc" d="" data-full-d="${esc(d)}" data-a0="${a0}" data-a1="${a1}" data-ri="${ri}" data-ro="${ro}" data-cr="${cr}" data-cx="${cx}" data-cy="${cy}" fill="${p.color}" data-ring="${esc(ring)}" data-label="${esc(p.label)}" data-value="${p.value}" data-pct="${pct}" data-color="${esc(p.color)}"></path>`;
    })
    .join('');
}

function upfChartHtml() {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const sw = 26;
  return `
    <div class="ws-sc-chart ws-sc-chart--upf" data-ws-chart="upf">
      <div class="dash-donut dash-donut-double ws-sc-donut">
        <svg class="dash-donut-svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Non-UPF ${UPF.pct} percent, ${UPF.nonCount} of ${UPF.total} products">
          <g transform="rotate(-90 ${cx} ${cy})">
            ${donutRing(UPF.split, 'Health status', cx, cy, 124, sw, 11)}
            ${donutRing(UPF.distribution, 'Processing level', cx, cy, 90, sw, 10)}
          </g>
        </svg>
        <div class="dash-donut-center">
          <span class="dash-pct-wrap"><span class="dash-donut-num is-teal ws-sc-chart-num" data-countup>${UPF.pct}</span><span class="dash-pct">%</span></span>
          <span class="dash-donut-label">Non-UPF</span>
          <span class="dash-donut-sub">${UPF.nonCount} of ${UPF.total} products</span>
        </div>
      </div>
    </div>`;
}

function pillarsChartHtml() {
  const rows = WISESCORE.pillars.map((p) => {
    const color = scoreColor(p.score);
    return `
      <div class="ws-sc-pillar">
        <span class="ws-sc-pillar-name"><span class="material-symbols-outlined" style="color:${color}">${esc(p.icon)}</span>${esc(p.name)}</span>
        <div class="ws-sc-pillar-track" style="--bar-color:${color}">
          <div class="ws-sc-pillar-fill" data-target-width="${p.score}%" style="width:0;background:${color}"></div>
        </div>
        <span class="ws-sc-pillar-score ws-sc-chart-num" data-countup>${p.score}</span>
      </div>`;
  }).join('');
  return `
    <div class="ws-sc-chart ws-sc-chart--pillars" data-ws-chart="pillars">
      <div class="ws-sc-ws-head">
        <span class="ws-sc-ws-label">WISEscore</span>
        <div class="ws-sc-ws-num">
          <span class="ws-sc-chart-num" data-countup>${WISESCORE.average}</span>
          <span class="ws-sc-ws-unit">/100</span>
          <span class="ws-sc-ws-rating">${esc(WISESCORE.rating)}</span>
        </div>
      </div>
      <div class="ws-sc-pillars">${rows}</div>
    </div>`;
}

export function overviewCardChartHtml(kind) {
  if (kind === 'upf') return upfChartHtml();
  if (kind === 'pillars') return pillarsChartHtml();
  return '';
}

function prefersReducedMotion() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) {
    return false;
  }
}

function snapDonut(card) {
  card.querySelectorAll('.dash-donut-arc[data-full-d]').forEach((arc) => {
    const full = arc.getAttribute('data-full-d');
    if (full) arc.setAttribute('d', full);
  });
}

function animateDonutSweep(card, duration) {
  const arcs = card.querySelectorAll('.dash-donut-arc[data-full-d]');
  if (!arcs.length) return;
  const gen = (Number(card.dataset.wsSweepGen) || 0) + 1;
  card.dataset.wsSweepGen = String(gen);
  const start = performance.now();
  const tick = (now) => {
    if (Number(card.dataset.wsSweepGen) !== gen) return;
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const sweep = eased * 360;
    arcs.forEach((arc) => {
      const fullD = arc.getAttribute('data-full-d');
      const a0 = parseFloat(arc.dataset.a0);
      const a1 = parseFloat(arc.dataset.a1);
      if (!fullD || !Number.isFinite(a0) || !Number.isFinite(a1)) return;
      if (sweep <= a0) { arc.setAttribute('d', ''); return; }
      if (sweep >= a1) { arc.setAttribute('d', fullD); return; }
      const ri = parseFloat(arc.dataset.ri);
      const ro = parseFloat(arc.dataset.ro);
      const cr = parseFloat(arc.dataset.cr);
      const cx = parseFloat(arc.dataset.cx);
      const cy = parseFloat(arc.dataset.cy);
      arc.setAttribute('d', roundedSector(cx, cy, ri, ro, a0, sweep, cr));
    });
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function playFills(root) {
  root.querySelectorAll('.ws-sc-pillar-fill[data-target-width]').forEach((fill) => {
    const target = fill.getAttribute('data-target-width');
    if (target) fill.style.width = target;
  });
}

/* Sweep the welcome-card donuts and grow the pillar bars. Safe to call more
   than once — a finished donut is left alone. */
export function playOverviewCardCharts(root) {
  if (!root) return;
  const apply = () => {
    root.querySelectorAll('.ws-sc-chart--upf .dash-donut, .ws-scorecard--chart .dash-donut').forEach((card) => {
      if (prefersReducedMotion()) { snapDonut(card); return; }
      const done = [...card.querySelectorAll('.dash-donut-arc')].every((arc) => {
        const full = arc.getAttribute('data-full-d');
        return full && arc.getAttribute('d') === full;
      });
      if (done) return;
      animateDonutSweep(card, 1400);
    });
    playFills(root);
  };
  requestAnimationFrame(() => requestAnimationFrame(apply));
}
