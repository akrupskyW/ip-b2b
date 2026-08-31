/**
 * Streaming-trace DNA helix — the left-rail animation every WISEcodeAI turn
 * draws while it thinks. Shared by the live chat (`js/wiseai-chat.js`) and the
 * All Modules anatomy demo so both surfaces run the exact same rope.
 *
 *   import { makeTraceHelix, measureTraceRungCentres, TRACE_STRAND_MARKUP } from './trace-helix.js';
 */

/* Strand rail markup: a 20px gutter host, left-aligned under the
   "Thinking" / "Worked for" label. A single .sc-trace-dna span carries
   the live SVG helix — it twists while thinking, then freezes aligned to the
   milestone rows and sweeps green top-to-bottom. */
export const TRACE_STRAND_MARKUP = '<div class="sc-trace-strand" aria-hidden="true">'
  + '<span class="sc-trace-dna"></span></div>';

/* Shared twist clock — every live rope (transcript rail + output loader)
   advances at this rate so they move at the same speed. Sign is direction:
   +1 is the transcript default; the output loader passes −1 so the two
   spin opposite each other. */
export const TRACE_TWIST_SPEED = 0.0018;

function prefersReduced() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch (_) { return false; }
}

/* The streaming trace's left rail, drawn as a DNA double-helix that actually
   TWISTS. Rather than a flat sine tile scrolled downward (which reads as the
   strand merely "growing down"), this renders the helix in a side-on 3D
   projection and rotates it about its own vertical axis over time: the two
   backbones swap front-to-back at every crossover, so the rope visibly turns.

   Geometry — a strand at height y sits at angle θ = 2πy/period + phase. In
   side view its screen x is cx + amp·cos(θ) and its DEPTH (toward/away from
   the viewer) is sin(θ). The partner strand is exactly half a turn opposite.
   The depth cue is what sells the twist: the segment coming toward you is
   drawn bold and on top, the one going away is drawn faint and behind, and
   they trade places as the phase advances.

     H        strand height in px
     phase    current rotation of the whole helix (radians)
     rungsY   the y-centres at which to hang base-pair rungs + dots. During the
              live twist these are evenly spaced; in the final summary they are
              the measured centres of the milestone rows, so the green dots
              land exactly beside the elements they represent.
     greenCount  how many rungs (from the top) have gone green ("done").

   Returns raw <svg> markup for a .sc-trace-dna element's innerHTML. */
export function scBuildHelixSVG(H, phase, rungsY, greenCount, uid, geom) {
  const g = geom || {};
  const W = Number.isFinite(g.width) ? g.width : 20;
  const PERIOD = Number.isFinite(g.period) ? g.period : 36;
  /* Axis sits left of center so the helix's left swell lines up with the
     "Thinking" / "Worked for" label, instead of floating in the rail.
     Overlay loaders pass cx = width/2 so the rope sits in the middle. */
  const cx = Number.isFinite(g.cx) ? g.cx : 7;
  uid = uid || 'h';
  const h = Math.max(20, Math.round(H));
  const AMP_BASE = Number.isFinite(g.amp) ? g.amp : 4.8;
  const frontStroke = Number.isFinite(g.stroke) ? g.stroke : 1.15;
  const backStroke = Number.isFinite(g.backStroke) ? g.backStroke : 0.5;
  const rungStroke = Number.isFinite(g.rungStroke) ? g.rungStroke : 0.65;
  const dotR = Number.isFinite(g.dotR) ? g.dotR : 1.55;
  const dotRange = Number.isFinite(g.dotRange) ? g.dotRange : 0.9;
  const axisSway = 0.8 * (AMP_BASE / 4.8);
  const TWO_PI = Math.PI * 2;
  /* Theme-aware ink: brand navy on light, a bright periwinkle on dark (the deep
     --primary is invisible over the dark-mode navy surface). */
  const dark = typeof document !== 'undefined'
    && document.documentElement.classList.contains('dark');
  const blueRGB = dark ? '150,178,220' : '37,80,124';
  const dotBlue = dark ? '#AEC8ED' : '#25507C';
  const dotGreen = dark ? '#3DD68C' : '#12b76a';
  /* Dark mode only: scatter WISE gold through the still-pending dots so the
     spinning rail reads as gold + blue circles orbiting together (echoing the
     welcome-owl constellation's tier mix). Light mode stays a single calm blue.
     Done dots always stay green — that's the completion signal. */
  const dotGold = '#FFC434';
  const pendCol = (i, slot) => (dark && (((i + slot) % 3) === 1)) ? dotGold : dotBlue;
  /* The helix's DIAMETER (not just its on-screen width, which the twist already
     pinches to zero at each crossover) is the star of the show: it swells and
     contracts as a wave that TRAVELS DOWN the rail. To keep it from ever looking
     like the same loop repeating, the envelope is the SUM of two waves whose
     periods don't divide each other (88 & 133) drifting at different speeds — so
     the swell pattern never lines back up. A gentle PERSPECTIVE widens the strand
     toward the bottom (depth on descent), and a whisper of AXIS SWAY plus a
     NON-UNIFORM twist (turns subtly tighten and loosen along the length) break
     the mirror symmetry so no two turns are identical. */
  /* Breathing: a smaller, gentler swell than before — shallower depth over
     longer periods (wider, more gradual taper) that drifts down more slowly,
     so the diameter eases in and out rather than pumping. */
  const env = (y) => 1
    + 0.15 * Math.sin((TWO_PI * y) / 104 - phase * 0.34)
    + 0.08 * Math.sin((TWO_PI * y) / 150 - phase * 0.2 + 1.7);
  const persp = (y) => 1 + 0.14 * (y / h);                 /* depth on descent */
  const amp = (y) => AMP_BASE * env(y) * persp(y);
  const axis = (y) => cx + axisSway * Math.sin((TWO_PI * y) / 150 + phase * 0.24);
  /* Non-uniform twist: local turn spacing warps ±~20% down the length, so the
     rope never reads as one tile stamped over and over. Stays monotonic. */
  const theta = (y) => (TWO_PI / PERIOD) * (y + 6 * Math.sin((TWO_PI * y) / 165 + phase * 0.2)) + phase;
  const xA = (y) => axis(y) + amp(y) * Math.cos(theta(y));
  const xB = (y) => axis(y) - amp(y) * Math.cos(theta(y));
  /* Depth also deepens toward the bottom (perspective), so lower turns push
     further front-to-back than upper ones. */
  const depthA = (y) => Math.sin(theta(y)) * (0.82 + 0.18 * (y / h));

  /* Each backbone is drawn as SMOOTH Bézier arcs, one per span between depth
     crossings (the widest points, where a strand lies in the plane of the
     screen). Across a span a strand dives from the screen plane, through its
     nearest/farthest point (the on-screen crossover, mid-span), and back — so
     depth varies smoothly 0→±1→0. We shade each arc with a vertical gradient
     that tracks exactly that: the strand in front is brightest and boldest at
     mid-span (closest to you) and fades to the plane tone at the ends; its
     partner is faintest at mid-span (farthest) and rises to the same plane
     tone at the ends. The two therefore meet seamlessly at every widest point
     and separate into real depth through each crossover — a continuous rope
     turning, with no hard steps. */
  const smooth = (fx, y0, y1) => {
    const span = y1 - y0;
    const n = Math.max(2, Math.round(span / 4) + 1);
    const pts = [];
    for (let i = 0; i < n; i++) { const y = y0 + (span * i) / (n - 1); pts.push([fx(y), y]); }
    let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
    }
    return d;
  };
  /* Depth crossings (sin(θ)=0) — found numerically now that the twist warps, so
     the front/back arc split still lands exactly where each strand passes
     through the screen plane whatever the local turn spacing. */
  const bounds = [0];
  const SCAN = 1.5;
  let prev = Math.sin(theta(0));
  for (let y = SCAN; y <= h; y += SCAN) {
    const cur = Math.sin(theta(y));
    if ((prev < 0) !== (cur < 0)) {
      const yc = y - SCAN * (cur / (cur - prev));   /* linear-interpolate the zero */
      if (yc > 0.3 && yc < h - 0.3) bounds.push(yc);
    }
    prev = cur;
  }
  bounds.push(h);
  const RGB = blueRGB;
  const grad = (id, y0, y1, oEnd, oMid) =>
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y0.toFixed(1)}" x2="0" y2="${y1.toFixed(1)}">`
    + `<stop offset="0" stop-color="rgb(${RGB})" stop-opacity="${oEnd}"/>`
    + `<stop offset="0.5" stop-color="rgb(${RGB})" stop-opacity="${oMid}"/>`
    + `<stop offset="1" stop-color="rgb(${RGB})" stop-opacity="${oEnd}"/></linearGradient>`;
  let defs = '', backPaths = '', frontPaths = '';
  for (let i = 0; i < bounds.length - 1; i++) {
    const y0 = bounds[i], y1 = bounds[i + 1];
    if (y1 - y0 < 0.5) continue;
    const aFront = depthA((y0 + y1) / 2) >= 0;
    const frontFx = aFront ? xA : xB;   /* the strand in front on this span */
    const backFx = aFront ? xB : xA;    /* its partner, behind */
    const gF = `${uid}f${i}`, gB = `${uid}b${i}`;
    defs += grad(gF, y0, y1, 0.42, 1) + grad(gB, y0, y1, 0.42, 0.05);
    frontPaths += `<path d="${smooth(frontFx, y0, y1)}" stroke="url(#${gF})"/>`;
    backPaths += `<path d="${smooth(backFx, y0, y1)}" stroke="url(#${gB})"/>`;
  }

  /* Base-pair rungs + their two end dots, hung at the requested y-centres. The
     nearer dot is larger, brighter and drawn last (in front); the far one is
     smaller and dimmer. Done rungs are green, pending rungs blue. */
  let rungs = '', dots = '';
  (rungsY || []).forEach((ry, i) => {
    const ax = xA(ry), bx = xB(ry);
    const done = i < (greenCount || 0);
    rungs += `<line x1="${bx.toFixed(2)}" y1="${ry.toFixed(1)}" x2="${ax.toFixed(2)}" y2="${ry.toFixed(1)}"/>`;
    const dA = depthA(ry), dB = -dA;
    /* Each base-pair end (slot 0 = A strand, 1 = B strand) picks its own pending
       tint, so gold and blue circles intermix as the rope turns. */
    const dot = (x, d, slot) => {
      const col = done ? dotGreen : pendCol(i, slot);
      return `<circle cx="${x.toFixed(2)}" cy="${ry.toFixed(1)}" r="${(dotR + dotRange * d).toFixed(2)}"`
        + ` fill="${col}" fill-opacity="${(0.58 + 0.42 * d).toFixed(2)}"/>`;
    };
    dots += dA >= dB ? (dot(bx, dB, 1) + dot(ax, dA, 0)) : (dot(ax, dA, 0) + dot(bx, dB, 1));
  });

  const rungCol = `rgba(${blueRGB},0.28)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}">`
    + `<defs>${defs}</defs>`
    + `<g fill="none" stroke-width="${backStroke}" stroke-linecap="round" stroke-linejoin="round">${backPaths}</g>`
    + `<g stroke="${rungCol}" stroke-width="${rungStroke}" stroke-linecap="round">${rungs}</g>`
    + `<g fill="none" stroke-width="${frontStroke}" stroke-linecap="round" stroke-linejoin="round">${frontPaths}</g>`
    + dots
    + `</svg>`;
}

/* Drives one strand element: spins the helix while thinking (rAF, ~30fps), then
   freezes it aligned to the milestone rows and sweeps it green from the top. */
export function makeTraceHelix(bodyEl, opts = {}) {
  const reduced = opts.prefersReducedMotion != null ? !!opts.prefersReducedMotion : prefersReduced();
  const geom = opts.geom || null;
  const dir = opts.dir < 0 ? -1 : 1;
  const speed = Number.isFinite(opts.speed) ? opts.speed : TRACE_TWIST_SPEED;
  let raf = null, phase = Number.isFinite(opts.phase) ? opts.phase : 0, last = 0, lastDraw = 0, running = false;
  let mode = 'live', staticRungs = null, greenCount = 0;
  const uid = 'h' + Math.random().toString(36).slice(2, 7);   /* unique gradient ns */
  const dnaEl = () => bodyEl.querySelector('.sc-trace-dna');
  const draw = () => {
    const el = dnaEl(); if (!el) return;
    const strand = el.parentElement;
    const h = (strand && strand.clientHeight) || el.clientHeight || 40;
    if (strand && geom && Number.isFinite(geom.width)) strand.style.width = geom.width + 'px';
    let rungsY;
    if (mode === 'static' && staticRungs) rungsY = staticRungs;
    else {
      const start = (geom && Number.isFinite(geom.rungStart)) ? geom.rungStart : 11;
      const step = (geom && Number.isFinite(geom.rungStep)) ? geom.rungStep : 22;
      rungsY = []; for (let y = start; y < h; y += step) rungsY.push(y);
    }
    el.innerHTML = scBuildHelixSVG(h, phase, rungsY, mode === 'static' ? greenCount : 0, uid, geom);
  };
  const frame = (t) => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (!last) last = t;
    phase += (t - last) * speed * dir;
    last = t;
    if (t - lastDraw < 33) return;   /* ~30fps redraw */
    lastDraw = t;
    draw();
  };
  /* Re-bind the ResizeObserver whenever the strand node is rebuilt (finish()
     replaces body innerHTML). Fires when a collapsed accordion opens so the
     helix isn't stuck at height 0. */
  let ro = null;
  const attach = () => {
    if (typeof ResizeObserver === 'undefined') return;
    if (!ro) ro = new ResizeObserver(() => draw());
    ro.disconnect();
    const strand = bodyEl.querySelector('.sc-trace-strand');
    if (strand) ro.observe(strand);
  };
  return {
    startLive() {
      this.stop();
      mode = 'live'; staticRungs = null; greenCount = 0;
      attach();
      if (reduced) { draw(); return; }
      running = true; last = 0; lastDraw = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; },
    /* Freeze the spin and re-hang the rungs on the measured milestone centres
       so every dot lines up with its row. */
    freezeAligned(rungsY) { this.stop(); mode = 'static'; staticRungs = rungsY; attach(); draw(); },
    setGreen(n) { greenCount = n; draw(); },
    redraw: draw,
    destroy() { this.stop(); if (ro) { ro.disconnect(); ro = null; } },
  };
}

/* Measure the vertical centre of each milestone row, in the strand's own
   coordinate space, so the frozen helix can drop a base-pair dot on each. */
export function measureTraceRungCentres(bodyEl) {
  const strand = bodyEl.querySelector('.sc-trace-strand');
  const st = strand ? strand.offsetTop : 0;
  return Array.from(bodyEl.querySelectorAll('.sc-trace-step'))
    .map((li) => li.offsetTop + li.offsetHeight / 2 - st);
}
