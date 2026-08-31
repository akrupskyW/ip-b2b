/* ------------------------------------------------------------------ */
/* Loading animation — helix vs striped skeleton                       */
/* ------------------------------------------------------------------ */
/*
 * While output and comparison boards assemble, the streaming helix plays in
 * place of the striped skeleton. Default is the helix. It covers the output
 * module on wiseai.html plus every Compare Foods board (product-comparison,
 * portfolio, and the copy on the WISEcodeAI page).
 */

import { makeTraceHelix, TRACE_STRAND_MARKUP, TRACE_TWIST_SPEED } from './trace-helix.js';

const KEY = 'wise-helix-loading';
const HOST_SEL = '.wa-pane-skel, .cmp-empty';

/* Larger than the chat's 20px thinking rail so the rope can be the loading
   pose, not a gutter accent. Centered, with fewer, bigger turns. */
const LOAD_GEOM = {
  width: 128,
  cx: 64,
  period: 68,
  amp: 40,
  stroke: 3.4,
  backStroke: 1.5,
  rungStroke: 2,
  dotR: 4.6,
  dotRange: 2.6,
  rungStart: 22,
  rungStep: 36,
};

const instances = new WeakMap();

/** Helix loading is on unless the user last left it off. */
export function isHelixLoadOn() {
  try { return localStorage.getItem(KEY) !== '0'; } catch { return true; }
}

function applyClass(on) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('load-anim-helix', !!on);
  root.classList.toggle('load-anim-stripes', !on);
}

/** Persist the choice, stamp it on <html>, and restyle any live loaders. */
export function applyLoadAnim(on) {
  const next = !!on;
  try { localStorage.setItem(KEY, next ? '1' : '0'); } catch {}
  applyClass(next);
  try {
    document.dispatchEvent(new CustomEvent('wise:load-anim', { detail: { on: next } }));
  } catch {}
  syncLoadAnim();
}

/** Restore the persisted choice onto the document. */
export function restoreLoadAnim() {
  applyClass(isHelixLoadOn());
  syncLoadAnim();
}

function hostVisible(host) {
  if (!host || !host.isConnected) return false;
  const r = host.getBoundingClientRect();
  return r.width > 12 && r.height > 12;
}

function teardown(host) {
  const rec = instances.get(host);
  if (!rec) return;
  try { rec.ro?.disconnect(); } catch {}
  try { rec.helix?.destroy(); } catch {}
  try { rec.el?.remove(); } catch {}
  instances.delete(host);
}

function ensure(host) {
  if (!host || instances.has(host)) {
    const rec = instances.get(host);
    if (rec) setRunning(host, rec);
    return;
  }
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const wrap = document.createElement('div');
  wrap.className = 'load-helix';
  wrap.setAttribute('data-load-helix', '1');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = TRACE_STRAND_MARKUP;
  host.appendChild(wrap);
  /* Same twist clock as the transcript rail, opposite spin so the two
     ropes turn against each other while a board is assembling. */
  const helix = makeTraceHelix(wrap, { geom: LOAD_GEOM, speed: TRACE_TWIST_SPEED, dir: -1 });
  const rec = { el: wrap, helix, ro: null };
  if (typeof ResizeObserver !== 'undefined') {
    rec.ro = new ResizeObserver(() => setRunning(host, rec));
    rec.ro.observe(host);
  }
  instances.set(host, rec);
  setRunning(host, rec);
}

function setRunning(host, rec) {
  if (!rec || !rec.helix) return;
  const want = isHelixLoadOn() && hostVisible(host);
  if (want) {
    if (!rec.running) {
      rec.helix.startLive();
      rec.running = true;
    }
  } else if (rec.running) {
    rec.helix.stop();
    rec.running = false;
  }
}

/** Mount or tear down helix overlays to match the current preference. */
export function syncLoadAnim(root) {
  const scope = root && root.querySelectorAll ? root : document;
  if (!scope || typeof scope.querySelectorAll !== 'function') return;
  const helixOn = isHelixLoadOn();
  const live = new Set();
  scope.querySelectorAll(HOST_SEL).forEach((host) => {
    if (helixOn) {
      ensure(host);
      live.add(host);
    } else {
      teardown(host);
    }
  });
  if (scope === document) {
    document.querySelectorAll('[data-load-helix]').forEach((el) => {
      const host = el.parentElement;
      if (host && !live.has(host)) teardown(host);
    });
  }
}

function boot() {
  if (typeof document === 'undefined' || document.__wiseLoadAnimBoot) return;
  document.__wiseLoadAnimBoot = true;
  restoreLoadAnim();
  const scan = () => syncLoadAnim();
  if (typeof MutationObserver !== 'undefined') {
    let scheduled = false;
    const mo = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; scan(); });
    });
    const start = () => {
      const root = document.body || document.documentElement;
      if (!root) return;
      mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
      scan();
    };
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }
  document.addEventListener('wise:load-anim', scan);
  window.addEventListener('resize', scan);
}

boot();

if (typeof window !== 'undefined') {
  window.WiseLoadAnim = { isHelixLoadOn, applyLoadAnim, restoreLoadAnim, syncLoadAnim };
}
