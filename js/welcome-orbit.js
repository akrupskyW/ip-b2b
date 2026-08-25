/**
 * Welcome-owl orbital constellation.
 *
 * Upgrades the shared chat welcome screen's owl from concentric pulse/orbit
 * rings into an interconnected node network — small nodes orbit the owl and are
 * linked to each other AND to the owl core with faint lines, echoing the helix
 * background so the whole surface reads as one connected system with the WISE
 * owl as its center.
 *
 * Each node carries a "food level" tier. In DARK mode the connectors become
 * live gradients that blend between their two endpoints' tier colors — WISE gold
 * (elevated), brand blue (standard) and white (top tier) — with a gentle
 * activity shimmer, so the web shifts between gold / blue / white depending on
 * which levels it is linking. LIGHT mode keeps the calm single-blue look.
 *
 * This web is also the "Orbit" background-animation style, so it follows the
 * chat ⋯ menu's Scale X / Y / Z and Nodes sliders: X / Y stretch or pinch the
 * hull around the owl, Z sharpens or flattens the 4D perspective, and Nodes
 * sizes the food photos.
 *
 * Zero markup changes: it auto-enhances every `.ws-logo-wrap` on the page (and
 * any injected later by mountWISEcodeAIChat) by dropping an <svg> overlay behind
 * the owl. The CSS-only orbit rings stay as a graceful no-JS fallback and are
 * hidden once this takes over. The marketing galaxy core is untouched (it has no
 * `.ws-logo-wrap`).
 */

const NS = 'http://www.w3.org/2000/svg';
const SIZE = 176;
const C = SIZE / 2;
const PRIMARY = '37, 80, 124';
const ACCENT = '#2f6fed';

/* Global slow-down. Everything time-driven is multiplied by these so the whole
   surface breathes slowly instead of moving abruptly. Lower = calmer. */
const T_ROT = 0.34;    // 4D tumble speed (the big driver of "fast")
const T_BREATH = 0.30; // node size breath
const T_SHIMMER = 0.28; // stroke-opacity shimmer on nodes + links

/* Tier palette — index 0 = top tier (white), 1 = elevated (WISE gold),
   2 = standard (brand blue). Used only in dark mode; light mode stays blue. */
const TIER_DARK = ['#EAF1FB', '#FFC434', '#AEC8ED'];
const TIER_GLOW_DARK = ['rgba(234,241,251,0.9)', 'rgba(255,196,52,0.9)', null];

const reduce = typeof window !== 'undefined'
  && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let uid = 0;

/* Resolve assets/ relative to THIS module (same trick the helix uses) so the
   food photos load no matter how deep the page lives. */
function assetBase() {
  try { return new URL('../assets/', import.meta.url).href; } catch (_) { return '../assets/'; }
}

/* 16 real food photos from the helix roster — one per tesseract vertex. Tiny on
   screen (by design); the tier color + glow live on each node's stroke ring. */
const FOODS = [
  'helix/ferrero-nutella.jpg',
  'helix/oreo-oreo-original.jpg',
  'helix/coca-cola-coca-cola-zero.jpg',
  'helix/kellogg-s-coco-pops.jpg',
  'helix/toblerone-milk-chocolate-large-bar.jpg',
  'helix/vita-coco-coconut-water.jpg',
  'helix/oatly-barista-edition-oat-drink.jpg',
  'helix/nature-valley-nature-valley-crunchy-oats-n-honey.jpg',
  'helix/quaker-oats-old-fashioned-oats.jpg',
  'helix/general-mills-cheerios.jpg',
  'helix/hellmann-s-mayonnaise.jpg',
  'helix/heinz-tomato-ketchup-local.jpg',
  'helix/jif-jif-peanut-butter.jpg',
  'helix/chobani-nonfat-greek-yogurt.jpg',
  'helix/doritos-doritos-nachos-cheese-flavoured-100g.jpg',
  'helix/ritz-bakery-the-original-cracker.jpg',
];

const isDark = () =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

/* ── Shared background-animation scale ────────────────────────────────────────
   The chat ⋯ menu's Scale X / Y / Z and Nodes sliders drive BOTH ambient
   styles, and Orbit is this constellation — so read the same preferences the
   helix does and follow the same broadcasts. The keys/events are duplicated
   here (rather than imported) because js/wiseai-chat.js imports THIS module:
   importing back would be circular, and this file also runs standalone.
   X / Y stretch the projected hull from the owl; Z sharpens or flattens the
   perspective so the near vertices spread and the far ones pinch. */
const ORBIT_SCALE_KEYS = {
  x: 'wise:chat-bg-anim-scale-x',
  y: 'wise:chat-bg-anim-scale-y',
  z: 'wise:chat-bg-anim-scale-z',
};
const ORBIT_NODES_KEY = 'wise:chat-bg-anim-nodes';
const clampMul = (n) => (Number.isFinite(n) ? Math.max(0.25, Math.min(4, n)) : 1);
const readPrefMul = (key) => {
  try {
    const n = parseInt(localStorage.getItem(key), 10);
    if (!isNaN(n)) return clampMul(n / 100);
  } catch (_) {}
  return 1;
};
const scaleMul = {
  x: readPrefMul(ORBIT_SCALE_KEYS.x),
  y: readPrefMul(ORBIT_SCALE_KEYS.y),
  z: readPrefMul(ORBIT_SCALE_KEYS.z),
};
let nodeMul = readPrefMul(ORBIT_NODES_KEY);
/* Every enhanced wrap registers a repaint so a slider drag shows immediately —
   including on a still (reduced-motion or off-screen) frame. */
const orbitRepaints = new Set();
const repaintOrbits = () => orbitRepaints.forEach((fn) => { try { fn(); } catch (_) {} });
if (typeof document !== 'undefined') {
  document.addEventListener('wise:chat-bg-anim-scale', (e) => {
    const d = e && e.detail;
    if (!d) return;
    if (typeof d.scaleX === 'number') scaleMul.x = clampMul(d.scaleX);
    if (typeof d.scaleY === 'number') scaleMul.y = clampMul(d.scaleY);
    if (typeof d.scaleZ === 'number') scaleMul.z = clampMul(d.scaleZ);
    repaintOrbits();
  });
  document.addEventListener('wise:chat-bg-anim-knob', (e) => {
    const d = e && e.detail;
    if (!d || d.knob !== 'nodes') return;
    const pct = typeof d.pct === 'number' ? d.pct : (typeof d.value === 'number' ? d.value * 100 : NaN);
    if (!Number.isFinite(pct)) return;
    nodeMul = clampMul(pct / 100);
    repaintOrbits();
  });
}

/* One-time stylesheet: positions the overlay behind the owl, hides the CSS
   pulse/orbit rings where JS has taken over, and defines the LIGHT-mode look.
   Dark-mode colors are applied inline by applyTheme() (inline style beats these
   presentation defaults). */
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const el = document.createElement('style');
  el.setAttribute('data-ws-orbit', '');
  el.textContent = `
    .ws-logo-wrap.is-orbit-js .ws-pulse-ring { display: none !important; }
    /* Slightly smaller owl here so the tesseract can always enclose it. */
    .ws-logo-wrap.is-orbit-js .ws-logo { width: 60px; height: 60px; padding: 12px; }
    .ws-orbit-svg {
      position: absolute; inset: 0; width: 100%; height: 100%;
      overflow: visible; pointer-events: none; z-index: 0;
    }
    /* Orbit tracks: a single gradient arc that travels around the ring and
       fades into the page (transparent gaps = background) in light and dark. */
    .ws-orbit-track {
      position: absolute; left: 50%; top: 50%; border-radius: 50%;
      --ws-tw: 1.4px; --ws-track: rgba(${PRIMARY}, 0.5);
      background: conic-gradient(from 0deg, transparent 20deg, var(--ws-track) 95deg, transparent 175deg, transparent 360deg);
      -webkit-mask: radial-gradient(closest-side, transparent calc(100% - var(--ws-tw)), #000 calc(100% - var(--ws-tw)));
      mask: radial-gradient(closest-side, transparent calc(100% - var(--ws-tw)), #000 calc(100% - var(--ws-tw)));
      transform: translate(-50%, -50%); pointer-events: none; z-index: 0;
      /* Two independent, slow rhythms: a gentle rotation of the gradient arc AND
         a slow opacity "breath" so the ring swells and softens as it travels. */
      animation: wsTrackSpin linear infinite, wsTrackBreathe ease-in-out infinite;
      will-change: transform, opacity;
    }
    html.dark .ws-orbit-track { --ws-track: rgba(174, 200, 237, 0.55); }
    @keyframes wsTrackSpin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
    @keyframes wsTrackBreathe { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .ws-orbit-track { animation: none; opacity: 0.75; } }
    .ws-orbit-link { stroke: rgba(${PRIMARY}, 0.22); stroke-width: 1; stroke-linecap: round; }
    /* Nodes are food photos; the color + glow live on the stroke RING. */
    .ws-orbit-node { fill: none; stroke: rgba(${PRIMARY}, 0.85); stroke-width: 1.4; }
    .ws-orbit-node--accent { stroke: ${ACCENT}; stroke-width: 1.6; filter: drop-shadow(0 0 4px rgba(47, 111, 237, 0.9)); }
  `;
  document.head.appendChild(el);
}

function svgEl(name, attrs) {
  const n = document.createElementNS(NS, name);
  if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

/* The shape is a TESSERACT (4-cube) — the canonical "four-dimensional" object.
   16 vertices at every (±1, ±1, ±1, ±1); the 4th axis (w) doubles as the food
   "level", so a vertex's tier follows how many of its coords are +1 (0–1 → blue
   standard, 2 → gold elevated, 3–4 → white top tier, all-+1 → the hero node). */
function buildTesseract() {
  const verts = [];
  for (let i = 0; i < 16; i++) {
    const x = (i & 1) ? 1 : -1;
    const y = (i & 2) ? 1 : -1;
    const z = (i & 4) ? 1 : -1;
    const w = (i & 8) ? 1 : -1;
    const plus = (x > 0) + (y > 0) + (z > 0) + (w > 0);
    const tier = plus <= 1 ? 2 : (plus === 2 ? 1 : 0);
    verts.push({ p: [x, y, z, w], tier, accent: plus === 4, img: FOODS[i % FOODS.length] });
  }
  return verts;
}

/* Hypercube edges: the 32 pairs of vertices that differ in exactly one axis. */
function buildEdges() {
  const popcount = (n) => { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; };
  const edges = [];
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      if (popcount(i ^ j) === 1) edges.push([i, j]);
    }
  }
  return edges;
}

/* 4D rotation (in the x–w, y–z and z–w planes) followed by a 4D→3D→2D
   perspective projection centered on the owl. Returns per-vertex screen
   position, on-screen dot size (nearer = bigger) and a depth scalar. */
const PROJ = { distW: 3.0, distZ: 3.6, scale: 260 };
const OWL_R = 30;      // owl circle radius in this mode (see injectStyles)
const OWL_MARGIN = 9;  // keep the hull comfortably outside the owl + its circle
const MAX_CONTAIN = 2.8; // allow enough growth that the 4D hull ALWAYS encloses the owl

/* Smallest hull-edge distance from the owl center = the radius of the biggest
   circle that fits inside the projected tesseract. */
function convexHull(pts) {
  const p = pts.slice().sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  const hi = [];
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  lo.pop(); hi.pop();
  return lo.concat(hi);
}

/* Uniform scale (≥1, capped) that keeps the owl circle inside the hull. */
function containScale(pts) {
  const hull = convexHull(pts);
  if (hull.length < 3) return 1;
  let inradius = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length];
    const abx = b[0] - a[0], aby = b[1] - a[1];
    const len = Math.hypot(abx, aby) || 1;
    const d = Math.abs(abx * (a[1] - C) - aby * (a[0] - C)) / len;
    if (d < inradius) inradius = d;
  }
  const target = OWL_R + OWL_MARGIN;
  if (inradius >= target) return 1;
  return Math.min(MAX_CONTAIN, target / inradius);
}

function project(p, t) {
  let [x, y, z, w] = p;
  const rot = (a, b, ang) => [a * Math.cos(ang) - b * Math.sin(ang), a * Math.sin(ang) + b * Math.cos(ang)];
  [x, w] = rot(x, w, t * 0.28);   // x–w plane (a true 4D turn)
  [y, z] = rot(y, z, t * 0.19);   // y–z plane
  [z, w] = rot(z, w, t * 0.13);   // z–w plane (inside-out tumble)
  const fw = 1 / (PROJ.distW - w);
  const x3 = x * fw, y3 = y * fw, z3 = z * fw;
  /* Scale Z pulls the eye toward the hull (stronger perspective — near vertices
     spread, far ones pinch) or pushes it back for a flat, even web. The divisor
     stays comfortably above the largest |z3| (0.5) at every setting. */
  const distZ = PROJ.distZ / (0.4 + 0.6 * scaleMul.z);
  const fz = 1 / (distZ - z3);
  const depth = fw * fz;
  return {
    x: C + x3 * fz * PROJ.scale,
    y: C + y3 * fz * PROJ.scale,
    // Wider spread than before so nearer vertices read clearly larger.
    size: 1.5 + depth * 22,
    depth,
  };
}

export function enhanceWelcomeOrbit(wrap) {
  if (!wrap || wrap.__wsOrbit) return;
  wrap.__wsOrbit = true;
  injectStyles();
  wrap.classList.add('is-orbit-js');
  const myId = uid++;

  const svg = svgEl('svg', {
    class: 'ws-orbit-svg', viewBox: `0 0 ${SIZE} ${SIZE}`,
    'aria-hidden': 'true', focusable: 'false',
  });
  const defs = svgEl('defs');
  svg.appendChild(defs);

  const nodes = buildTesseract();

  // Build a per-link gradient (used in dark mode) with two color stops.
  function makeGrad(i) {
    const id = `wsg-${myId}-${i}`;
    const g = svgEl('linearGradient', { id, gradientUnits: 'userSpaceOnUse' });
    const s0 = svgEl('stop', { offset: '0' });
    const s1 = svgEl('stop', { offset: '1' });
    g.appendChild(s0); g.appendChild(s1);
    defs.appendChild(g);
    return { id, s0, s1, el: g };
  }

  // The 32 hypercube edges — drawn beneath the vertices.
  const links = buildEdges().map(([a, b], i) => {
    const l = svgEl('line', { class: 'ws-orbit-link' });
    svg.appendChild(l);
    return { l, a, b, grad: makeGrad(i), ph: i * 0.55 };
  });

  // Each vertex = a tiny circular food photo (clipped) with a colored stroke
  // ring drawn on top. Photos sit above the edges; rings above the photos.
  const foodBase = assetBase();
  const clips = [];
  const foods = [];
  const rings = [];
  nodes.forEach((nd, i) => {
    const clipId = `wsclip-${myId}-${i}`;
    const cp = svgEl('clipPath', { id: clipId });
    const cc = svgEl('circle', { r: 3 });
    cp.appendChild(cc);
    defs.appendChild(cp);

    const im = svgEl('image', {
      class: 'ws-orbit-food', 'clip-path': `url(#${clipId})`,
      preserveAspectRatio: 'xMidYMid slice',
    });
    const href = foodBase + nd.img;
    im.setAttribute('href', href);
    try { im.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href); } catch (_) {}
    svg.appendChild(im);

    const ring = svgEl('circle', {
      class: 'ws-orbit-node' + (nd.accent ? ' ws-orbit-node--accent' : ''), r: 3,
    });
    svg.appendChild(ring);

    clips.push(cc); foods.push(im); rings.push(ring);
  });

  // Owl sits above the overlay; insert svg first so it renders behind the logo.
  wrap.insertBefore(svg, wrap.firstChild);

  // Gradient orbit tracks live behind the node web (diameters match the node
  // orbits at r = 46/66/82). Each drifts slowly so its arc breathes around the
  // ring rather than racing. [diameter, spinSecs, reverse, breatheSecs]
  [[92, 64, false, 11], [132, 84, true, 13], [164, 108, false, 15]].forEach(([d, dur, rev, breathe]) => {
    const tr = document.createElement('span');
    tr.className = 'ws-orbit-track';
    tr.setAttribute('aria-hidden', 'true');
    tr.style.width = d + 'px';
    tr.style.height = d + 'px';
    // First duration → spin, second → the opacity breathe (comma-matched).
    tr.style.animationDuration = dur + 's, ' + breathe + 's';
    if (rev) tr.style.animationDirection = 'reverse, normal';
    wrap.insertBefore(tr, svg);
  });

  /* Paint node fills + link gradient stops for the current theme. In light mode
     we clear inline styles so the CSS classes (single blue) take over. */
  function applyTheme() {
    const dark = isDark();
    nodes.forEach((nd, i) => {
      const ring = rings[i];
      if (dark) {
        ring.style.stroke = TIER_DARK[nd.tier];
        const glow = TIER_GLOW_DARK[nd.tier] || 'rgba(174,200,237,0.85)';
        ring.style.filter = `drop-shadow(0 0 ${nd.accent ? 4.5 : 3}px ${glow})`;
      } else {
        ring.style.stroke = '';
        ring.style.filter = '';
      }
    });
    // Links: dark → tier-to-tier gradient stroke; light → CSS class.
    for (const e of links) {
      if (dark) {
        e.grad.s0.setAttribute('stop-color', TIER_DARK[nodes[e.a].tier]);
        e.grad.s1.setAttribute('stop-color', TIER_DARK[nodes[e.b].tier]);
        e.l.style.stroke = `url(#${e.grad.id})`;
      } else {
        e.l.style.stroke = '';
        e.l.style.strokeOpacity = '';
      }
    }
  }

  const pos = new Array(nodes.length);
  const raw = new Array(nodes.length);
  const pts = new Array(nodes.length);
  let lastT = 0;
  function frame(t) {
    lastT = t;
    const dark = isDark();
    const tr = t * T_ROT; // slowed rotation time for the 4D tumble
    for (let i = 0; i < nodes.length; i++) {
      const pr = project(nodes[i].p, tr);
      raw[i] = pr;
      // Scale X / Y stretch the hull from the owl BEFORE containment, so the
      // owl still sits inside however far the member pinches the web in.
      pts[i] = [C + (pr.x - C) * scaleMul.x, C + (pr.y - C) * scaleMul.y];
    }
    // Enlarge the whole shape just enough to keep the owl circle inside it.
    const s = containScale(pts);
    for (let i = 0; i < nodes.length; i++) {
      const pr = raw[i];
      const x = C + (pr.x - C) * scaleMul.x * s;
      const y = C + (pr.y - C) * scaleMul.y * s;
      // Depth-driven radius + a slow, gentle breath so the photos ease in and
      // out of size rather than flickering. The Nodes slider sizes them.
      const r = Math.max(1.4, (pr.size + 0.45 * Math.sin(t * T_BREATH + i * 0.6)) * nodeMul);
      pos[i] = { x, y, depth: pr.depth };
      clips[i].setAttribute('cx', x);
      clips[i].setAttribute('cy', y);
      clips[i].setAttribute('r', r.toFixed(2));
      const im = foods[i];
      im.setAttribute('x', (x - r).toFixed(2));
      im.setAttribute('y', (y - r).toFixed(2));
      im.setAttribute('width', (r * 2).toFixed(2));
      im.setAttribute('height', (r * 2).toFixed(2));
      const ring = rings[i];
      ring.setAttribute('cx', x);
      ring.setAttribute('cy', y);
      ring.setAttribute('r', r.toFixed(2));
      if (dark) {
        ring.style.strokeOpacity = (0.7 + 0.3 * Math.sin(t * T_SHIMMER + i)).toFixed(3);
      } else {
        ring.style.strokeOpacity = '';
      }
    }
    for (const e of links) {
      const a = pos[e.a], b = pos[e.b];
      e.l.setAttribute('x1', a.x); e.l.setAttribute('y1', a.y);
      e.l.setAttribute('x2', b.x); e.l.setAttribute('y2', b.y);
      // Fainter for edges pushed to the "back" (deeper in w/z).
      const near = Math.min(1, (a.depth + b.depth) * 3.2);
      if (dark) {
        const g = e.grad.el;
        g.setAttribute('x1', a.x); g.setAttribute('y1', a.y);
        g.setAttribute('x2', b.x); g.setAttribute('y2', b.y);
        e.l.style.strokeOpacity = (0.28 + 0.5 * near + 0.08 * Math.sin(t * T_SHIMMER + e.ph)).toFixed(3);
      } else {
        e.l.style.strokeOpacity = (0.2 + 0.45 * near).toFixed(3);
      }
    }
  }

  applyTheme();

  // Re-tint live when the theme is toggled.
  const themeObs = new MutationObserver(() => applyTheme());
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  /* Repaint on a Scale / Nodes drag so a still frame (reduced motion, or a web
     parked off-screen) follows the sliders too. Drops itself once the wrap is
     gone so a torn-down chat leaves nothing behind. */
  const repaint = () => {
    if (!wrap.isConnected) { orbitRepaints.delete(repaint); return; }
    frame(lastT);
  };
  orbitRepaints.add(repaint);

  if (reduce) {
    frame(0);
    return;
  }

  let raf = 0;
  let running = false;
  let start = 0;
  const tick = (now) => {
    if (!running) return;
    if (!start) start = now;
    frame((now - start) / 1000);
    raf = requestAnimationFrame(tick);
  };
  const play = () => {
    if (running || !wrap.isConnected) return;
    running = true; start = 0; raf = requestAnimationFrame(tick);
  };
  const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };

  // Only animate while on-screen; pause with the tab.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) en.isIntersecting ? play() : stop();
    }, { threshold: 0.01 });
    io.observe(wrap);
  } else {
    play();
  }
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : play();
  });
  frame(0);
}

function scan(root) {
  const scope = root && root.querySelectorAll ? root : document;
  scope.querySelectorAll('.ws-logo-wrap').forEach(enhanceWelcomeOrbit);
}

function init() {
  scan(document);
  // The shared chat mounts its welcome screen dynamically; catch those too.
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.classList && node.classList.contains('ws-logo-wrap')) {
          enhanceWelcomeOrbit(node);
        } else if (node.querySelectorAll) {
          scan(node);
        }
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
