/**
 * Helix metrics pane — live load, file, image, and processing readout for
 * pages/helix.html. Reads the Performance APIs plus the Helix canvas so the
 * numbers match what this page actually fetched and is drawing.
 */

import {
  listHelixInstances,
  saveHelixInstance,
  revertHelixInstance,
  deleteHelixInstance,
  formatHelixInstanceLabel,
} from './wiseai-chat.js';

const HELIX_IMG_RE = /\/assets\/(?:helix|portfolio|verification)\//i;
const HELIX_IMG_NAME_RE = /(?:^|\/)(?:top5-|date-better-)/i;
const IMG_EXT_RE = /\.(?:png|jpe?g|webp|gif|svg|avif|ico)(?:$|\?)/i;
const FONT_EXT_RE = /\.(?:woff2?|ttf|otf|eot)(?:$|\?)/i;
const CSS_EXT_RE = /\.css(?:$|\?)/i;
const JS_EXT_RE = /\.(?:m?js)(?:$|\?)/i;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtBytes(n) {
  const v = Number(n) || 0;
  if (v < 1024) return v + ' B';
  if (v < 1024 * 1024) return (v / 1024).toFixed(v < 10 * 1024 ? 1 : 0) + ' KB';
  return (v / (1024 * 1024)).toFixed(v < 10 * 1024 * 1024 ? 2 : 1) + ' MB';
}

function fmtMs(n) {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1000) return Math.round(n) + ' ms';
  return (n / 1000).toFixed(n < 10000 ? 2 : 1) + ' s';
}

function fmtNum(n) {
  if (!Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
}

function fileName(url) {
  try {
    const u = new URL(url, location.href);
    const last = (u.pathname.split('/').pop() || u.hostname || url).replace(/\+/g, ' ');
    return decodeURIComponent(last);
  } catch (_) {
    const parts = String(url).split('/');
    return parts[parts.length - 1] || url;
  }
}

function humanFile(url) {
  return fileName(url)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHelixPhoto(url) {
  return HELIX_IMG_RE.test(url) || HELIX_IMG_NAME_RE.test(url);
}

function kindOf(entry) {
  const url = entry.name || '';
  const t = (entry.initiatorType || '').toLowerCase();
  if (t === 'img' || t === 'image' || t === 'cssimage' || IMG_EXT_RE.test(url)) return 'image';
  if (t === 'script' || JS_EXT_RE.test(url)) return 'script';
  if (t === 'css' || CSS_EXT_RE.test(url) || /fonts\.googleapis\.com/i.test(url)) return 'style';
  if (t === 'link' && (CSS_EXT_RE.test(url) || /fonts\.googleapis\.com/i.test(url))) return 'style';
  if (t === 'font' || FONT_EXT_RE.test(url) || /fonts\.gstatic\.com/i.test(url)) return 'font';
  if (t === 'navigation' || t === 'document') return 'document';
  return 'other';
}

function sizesOf(entry) {
  const transfer = Number(entry.transferSize) || 0;
  const encoded = Number(entry.encodedBodySize) || 0;
  const decoded = Number(entry.decodedBodySize) || 0;
  const cached = transfer === 0 && (encoded > 0 || decoded > 0);
  const shown = transfer || encoded || decoded;
  return { transfer, encoded, decoded, cached, shown };
}

function navTiming() {
  const list = performance.getEntriesByType && performance.getEntriesByType('navigation');
  const n = list && list[0];
  if (n) {
    return {
      ttfb: n.responseStart,
      dns: Math.max(0, n.domainLookupEnd - n.domainLookupStart),
      tcp: Math.max(0, n.connectEnd - n.connectStart),
      tls: n.secureConnectionStart > 0 ? Math.max(0, n.connectEnd - n.secureConnectionStart) : 0,
      download: Math.max(0, n.responseEnd - n.responseStart),
      domInteractive: n.domInteractive,
      dcl: n.domContentLoadedEventEnd,
      load: n.loadEventEnd > 0 ? n.loadEventEnd : (n.duration > 0 ? n.duration : performance.now()),
      transfer: n.transferSize || 0,
      decoded: n.decodedBodySize || 0,
      type: n.type || 'navigate',
    };
  }
  const t = performance.timing;
  if (!t || !t.navigationStart) return null;
  const start = t.navigationStart;
  return {
    ttfb: t.responseStart - start,
    dns: Math.max(0, t.domainLookupEnd - t.domainLookupStart),
    tcp: Math.max(0, t.connectEnd - t.connectStart),
    tls: 0,
    download: Math.max(0, t.responseEnd - t.responseStart),
    domInteractive: t.domInteractive - start,
    dcl: t.domContentLoadedEventEnd - start,
    load: t.loadEventEnd ? t.loadEventEnd - start : Date.now() - start,
    transfer: 0,
    decoded: 0,
    type: 'navigate',
  };
}

function paintMap() {
  const out = { fp: null, fcp: null, lcp: null };
  try {
    (performance.getEntriesByType('paint') || []).forEach((e) => {
      if (e.name === 'first-paint') out.fp = e.startTime;
      if (e.name === 'first-contentful-paint') out.fcp = e.startTime;
    });
    const lcps = performance.getEntriesByType('largest-contentful-paint');
    if (lcps && lcps.length) out.lcp = lcps[lcps.length - 1].startTime;
  } catch (_) {}
  return out;
}

function collectResources() {
  const entries = [];
  try {
    (performance.getEntriesByType('resource') || []).forEach((e) => entries.push(e));
    (performance.getEntriesByType('navigation') || []).forEach((e) => entries.push(e));
  } catch (_) {}
  return entries;
}

function summarize(entries) {
  const buckets = {
    document: { count: 0, bytes: 0, transfer: 0 },
    script: { count: 0, bytes: 0, transfer: 0 },
    style: { count: 0, bytes: 0, transfer: 0 },
    font: { count: 0, bytes: 0, transfer: 0 },
    image: { count: 0, bytes: 0, transfer: 0 },
    other: { count: 0, bytes: 0, transfer: 0 },
  };
  let cached = 0;
  let helixCount = 0;
  let helixBytes = 0;
  const images = [];
  const seen = new Set();

  entries.forEach((e) => {
    const url = e.name || '';
    if (seen.has(url)) return;
    seen.add(url);
    const kind = kindOf(e);
    const sz = sizesOf(e);
    const b = buckets[kind] || buckets.other;
    b.count += 1;
    b.bytes += sz.shown;
    b.transfer += sz.transfer;
    if (sz.cached) cached += 1;
    if (kind === 'image') {
      const helix = isHelixPhoto(url);
      if (helix) {
        helixCount += 1;
        helixBytes += sz.shown;
      }
      images.push({
        url,
        name: fileName(url),
        label: humanFile(url),
        helix,
        ...sz,
        duration: e.duration || 0,
      });
    }
  });

  images.sort((a, b) => b.shown - a.shown);
  const totalCount = Object.values(buckets).reduce((s, x) => s + x.count, 0);
  const totalBytes = Object.values(buckets).reduce((s, x) => s + x.bytes, 0);
  const totalTransfer = Object.values(buckets).reduce((s, x) => s + x.transfer, 0);
  return { buckets, cached, helixCount, helixBytes, images, totalCount, totalBytes, totalTransfer };
}

function fillImageDims(images) {
  images.forEach((im) => {
    if (im.w && im.h) return;
    try {
      const probe = new Image();
      probe.src = im.url;
      if (probe.complete && probe.naturalWidth) {
        im.w = probe.naturalWidth;
        im.h = probe.naturalHeight;
      }
    } catch (_) {}
  });
}

function hardware() {
  const nav = navigator;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  const mem = performance.memory;
  return {
    cores: nav.hardwareConcurrency || 0,
    deviceMem: nav.deviceMemory || 0,
    platform: nav.platform || '',
    ua: nav.userAgent || '',
    dpr: window.devicePixelRatio || 1,
    screenW: (window.screen && screen.width) || 0,
    screenH: (window.screen && screen.height) || 0,
    innerW: window.innerWidth || 0,
    innerH: window.innerHeight || 0,
    colorDepth: (window.screen && screen.colorDepth) || 0,
    connType: conn ? (conn.effectiveType || '') : '',
    downlink: conn && Number.isFinite(conn.downlink) ? conn.downlink : null,
    rtt: conn && Number.isFinite(conn.rtt) ? conn.rtt : null,
    saveData: !!(conn && conn.saveData),
    heapUsed: mem ? mem.usedJSHeapSize : 0,
    heapTotal: mem ? mem.totalJSHeapSize : 0,
    heapLimit: mem ? mem.jsHeapSizeLimit : 0,
    reduced: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    nodes: document.getElementsByTagName('*').length,
  };
}

function helixCanvas() {
  const canvas = document.querySelector('#wa-chat .sc-bganim-canvas');
  if (!canvas) return null;
  return {
    cssW: Math.round(canvas.clientWidth || 0),
    cssH: Math.round(canvas.clientHeight || 0),
    bufW: canvas.width || 0,
    bufH: canvas.height || 0,
  };
}

function row(label, value, note) {
  return '<div class="hx-met-row">'
    + '<span class="hx-met-k">' + esc(label) + '</span>'
    + '<span class="hx-met-v">' + value + '</span>'
    + (note ? '<span class="hx-met-note">' + esc(note) + '</span>' : '')
    + '</div>';
}

function section(title, body) {
  return '<section class="hx-met-sec">'
    + '<h3 class="hx-met-h">' + esc(title) + '</h3>'
    + body
    + '</section>';
}

function statCard(id, numHtml, label) {
  return '<button type="button" class="wmod-stat" data-hx-stat="' + esc(id) + '">'
    + '<span class="wmod-stat-num" data-hx-num="' + esc(id) + '">' + numHtml + '</span>'
    + '<span class="wmod-stat-label">' + esc(label) + '</span>'
    + '</button>';
}

function snapshotText(snap) {
  const n = snap.nav || {};
  const s = snap.sum;
  const h = snap.hw;
  const lines = [
    'Helix metrics · ' + new Date().toISOString(),
    'Files: ' + s.totalCount + ' · ' + fmtBytes(s.totalBytes),
    'Load: ' + fmtMs(n.load),
    'Images: ' + s.buckets.image.count + ' · ' + fmtBytes(s.buckets.image.bytes),
    'Helix photos: ' + s.helixCount + ' · ' + fmtBytes(s.helixBytes),
    'Scripts: ' + s.buckets.script.count + ' · ' + fmtBytes(s.buckets.script.bytes),
    'Styles: ' + s.buckets.style.count + ' · ' + fmtBytes(s.buckets.style.bytes),
    'Fonts: ' + s.buckets.font.count + ' · ' + fmtBytes(s.buckets.font.bytes),
    'Cached: ' + s.cached,
    'FPS: ' + (snap.fps || '—'),
    'CPU cores: ' + (h.cores || '—'),
    'JS heap: ' + (h.heapUsed ? fmtBytes(h.heapUsed) : '—'),
    'Long tasks: ' + snap.longTasks,
  ];
  return lines.join('\n');
}

function renderStatic(root, snap) {
  const n = snap.nav || {};
  const p = snap.paint;
  const s = snap.sum;
  const h = snap.hw;
  const c = snap.canvas;
  const b = s.buckets;
  const loadMs = n.load > 0 ? n.load : performance.now();

  const hero = '<div class="wmod-stats hx-met-stats" style="--wmod-cols:2">'
    + statCard('files', fmtNum(s.totalCount), 'Files')
    + statCard('load', fmtNum(loadMs), 'Milliseconds to load')
    + statCard('images', fmtNum(b.image.count), 'Images')
    + statCard('bytes', (s.totalBytes / (1024 * 1024)).toFixed(1), 'Megabytes')
    + '</div>';

  const load = section('Load',
    '<div class="hx-met-rows">'
    + row('Time to first byte', esc(fmtMs(n.ttfb)))
    + row('DNS lookup', esc(fmtMs(n.dns)))
    + row('TCP connect', esc(fmtMs(n.tcp)))
    + (n.tls ? row('TLS handshake', esc(fmtMs(n.tls))) : '')
    + row('Document download', esc(fmtMs(n.download)))
    + row('DOM interactive', esc(fmtMs(n.domInteractive)))
    + row('DOM content loaded', esc(fmtMs(n.dcl)))
    + row('First paint', esc(fmtMs(p.fp)))
    + row('First contentful paint', esc(fmtMs(p.fcp)))
    + row('Largest contentful paint', esc(fmtMs(p.lcp)))
    + row('Window load', esc(fmtMs(n.load)))
    + row('Helix canvas up', snap.canvasAt != null ? esc(fmtMs(snap.canvasAt)) : 'Waiting')
    + row('Navigation', esc(n.type || 'navigate'))
    + '</div>');

  const files = section('Files',
    '<div class="hx-met-rows">'
    + row('Everything fetched', esc(fmtNum(s.totalCount)), fmtBytes(s.totalBytes))
    + row('Transferred on the wire', esc(fmtNum(s.totalCount)), fmtBytes(s.totalTransfer))
    + row('Scripts', esc(fmtNum(b.script.count)), fmtBytes(b.script.bytes))
    + row('Stylesheets', esc(fmtNum(b.style.count)), fmtBytes(b.style.bytes))
    + row('Fonts', esc(fmtNum(b.font.count)), b.font.count ? fmtBytes(b.font.bytes) : 'not reported')
    + row('Images', esc(fmtNum(b.image.count)), fmtBytes(b.image.bytes))
    + row('Helix product photos', esc(fmtNum(s.helixCount)), fmtBytes(s.helixBytes))
    + row('Other', esc(fmtNum(b.other.count + b.document.count)), fmtBytes(b.other.bytes + b.document.bytes))
    + row('Served from cache', esc(fmtNum(s.cached)))
    + '</div>');

  const imgRows = s.images.map((im) => {
    const dim = (im.w && im.h) ? (im.w + '×' + im.h) : '';
    const cache = im.cached ? ' · cache' : '';
    const meta = [fmtBytes(im.shown), dim, im.duration ? fmtMs(im.duration) : '']
      .filter(Boolean).join(' · ') + cache;
    const thumb = IMG_EXT_RE.test(im.url) && !/\.svg(?:$|\?)/i.test(im.url)
      ? '<span class="hx-met-thumb" style="background-image:url(\'' + esc(im.url) + '\')"></span>'
      : '<span class="hx-met-thumb hx-met-thumb--empty" aria-hidden="true"></span>';
    return '<li class="hx-met-img' + (im.helix ? ' is-helix' : '') + '">'
      + thumb
      + '<span class="hx-met-img-copy">'
      + '<span class="hx-met-img-name">' + esc(im.label || im.name) + '</span>'
      + '<span class="hx-met-img-meta">' + esc(meta) + '</span>'
      + '</span></li>';
  }).join('');

  const images = section('Images',
    '<p class="hx-met-lead">'
    + esc(s.helixCount + ' product photos on the strand · '
      + (b.image.count - s.helixCount) + ' other images · '
      + fmtBytes(b.image.bytes) + ' together')
    + '</p>'
    + (imgRows
      ? '<ol class="hx-met-imgs" data-hx-imgs>' + imgRows + '</ol>'
      : '<p class="hx-met-lead">No image responses recorded yet.</p>'));

  const proc = section('Processing',
    '<div class="hx-met-rows">'
    + row('Frames per second', '<span data-hx-live="fps">' + esc(snap.fps ? String(snap.fps) : '—') + '</span>')
    + row('Frame time', '<span data-hx-live="frame">' + esc(snap.fps ? Math.round(1000 / snap.fps) + ' ms' : '—') + '</span>')
    + row('CPU cores', esc(h.cores ? String(h.cores) : '—'))
    + row('Device memory', esc(h.deviceMem ? (h.deviceMem + ' GB') : 'Not reported'))
    + row('JS heap used', '<span data-hx-live="heap">' + esc(h.heapUsed ? fmtBytes(h.heapUsed) : 'Not reported') + '</span>')
    + row('JS heap total', '<span data-hx-live="heapTotal">' + esc(h.heapTotal ? fmtBytes(h.heapTotal) : '—') + '</span>')
    + row('JS heap limit', esc(h.heapLimit ? fmtBytes(h.heapLimit) : '—'))
    + row('Long tasks', '<span data-hx-live="long">' + esc(String(snap.longTasks)) + '</span>')
    + row('Longest task', '<span data-hx-live="longest">' + esc(fmtMs(snap.longestTask)) + '</span>')
    + row('Reduced motion', esc(h.reduced ? 'On' : 'Off'))
    + '</div>');

  const page = section('Page & machine',
    '<div class="hx-met-rows">'
    + row('DOM nodes', esc(fmtNum(h.nodes)))
    + row('Viewport', esc(h.innerW + ' × ' + h.innerH))
    + row('Display', esc(h.screenW + ' × ' + h.screenH))
    + row('Device pixel ratio', esc(String(h.dpr)))
    + row('Color depth', esc(h.colorDepth ? (h.colorDepth + '-bit') : '—'))
    + row('Connection', esc(h.connType || 'Not reported'))
    + row('Downlink', esc(h.downlink != null ? (h.downlink + ' Mbps') : '—'))
    + row('Round trip', esc(h.rtt != null ? (h.rtt + ' ms') : '—'))
    + row('Data saver', esc(h.saveData ? 'On' : 'Off'))
    + row('Platform', esc(h.platform || '—'))
    + '</div>');

  const helix = section('Helix canvas',
    '<div class="hx-met-rows">'
    + row('Canvas on screen', c ? esc(c.cssW + ' × ' + c.cssH) : 'Not yet')
    + row('Drawing buffer', c ? esc(c.bufW + ' × ' + c.bufH) : '—')
    + row('Photos decoded', '<span data-hx-live="decoded">' + esc(fmtNum(snap.decodedPhotos)) + '</span>')
    + row('Photos still loading', '<span data-hx-live="pending">' + esc(fmtNum(Math.max(0, s.helixCount - snap.decodedPhotos))) + '</span>')
    + '</div>');

  const instances = section('Instances',
    '<p class="hx-met-lead">Save the look on the card, then revert to any past instance. Revert loads it here — Apply still has to confirm twice before every other chat gets it.</p>'
    + '<div class="hx-inst-bar">'
    + '<button type="button" class="hx-inst-save" data-hx-inst="save">'
    + '<span class="material-symbols-outlined" aria-hidden="true">bookmark</span>Save this look'
    + '</button></div>'
    + '<div data-hx-instances></div>');

  root.innerHTML = hero + instances + load + files + images + proc + page + helix;
  paintInstances(root);
}

function paintInstances(root) {
  const host = root && root.querySelector('[data-hx-instances]');
  if (!host) return;
  const list = listHelixInstances();
  if (!list.length) {
    host.innerHTML = '<p class="hx-met-lead">No saved instances yet.</p>';
    return;
  }
  host.innerHTML = '<ol class="hx-inst-list">' + list.map((item) => {
    const kind = item.published ? 'Published' : 'Saved';
    return '<li class="hx-inst-item" data-inst="' + esc(item.id) + '">'
      + '<span class="hx-inst-copy">'
      + '<span class="hx-inst-name">' + esc(formatHelixInstanceLabel(item)) + '</span>'
      + '<span class="hx-inst-when">' + esc(kind) + '</span>'
      + '</span>'
      + '<button type="button" class="hx-inst-act" data-hx-inst="revert" data-inst="' + esc(item.id) + '">Revert</button>'
      + '<button type="button" class="hx-inst-del" data-hx-inst="delete" data-inst="' + esc(item.id) + '" aria-label="Delete instance">'
      + '<span class="material-symbols-outlined" aria-hidden="true">close</span></button>'
      + '</li>';
  }).join('') + '</ol>';
}

function updateLive(root, snap) {
  const set = (key, text) => {
    const el = root.querySelector('[data-hx-live="' + key + '"]');
    if (el) el.textContent = text;
  };
  set('fps', snap.fps ? String(snap.fps) : '—');
  set('frame', snap.fps ? (Math.round(1000 / snap.fps) + ' ms') : '—');
  set('heap', snap.hw.heapUsed ? fmtBytes(snap.hw.heapUsed) : 'Not reported');
  set('heapTotal', snap.hw.heapTotal ? fmtBytes(snap.hw.heapTotal) : '—');
  set('long', String(snap.longTasks));
  set('longest', fmtMs(snap.longestTask));
  set('decoded', fmtNum(snap.decodedPhotos));
  set('pending', fmtNum(Math.max(0, snap.sum.helixCount - snap.decodedPhotos)));
}

function countDecodedPhotos(images) {
  let n = 0;
  images.forEach((im) => {
    if (!im.helix) return;
    try {
      const probe = new Image();
      probe.src = im.url;
      if (probe.complete && probe.naturalWidth) n += 1;
    } catch (_) {}
  });
  return n;
}

function keepHelixCardOffPane(pane) {
  const chat = document.getElementById('wa-chat');
  const shell = document.querySelector('.sc-helix-float');
  if (!pane || !chat || !shell) return;
  const chatR = chat.getBoundingClientRect();
  const paneR = pane.getBoundingClientRect();
  const w = shell.offsetWidth || 460;
  const pad = 16;
  const maxRight = Math.min(chatR.right, paneR.left) - pad;
  const left = Math.max(chatR.left + pad, maxRight - w);
  shell.style.left = Math.round(left) + 'px';
}

function wireChrome(pane) {
  const btn = pane.querySelector('[data-pane-width="metrics"]');
  const moreBtn = pane.querySelector('.panel-more-btn');
  const pop = pane.querySelector('.topbar-popover');
  const PW = window.WPaneWidth;

  if (btn && PW) {
    PW.syncButton(btn, PW.tierOfEl(pane));
    btn.addEventListener('click', () => {
      const next = PW.next(PW.tierOfEl(pane));
      PW.applyClasses(pane, next, 'pane');
      PW.syncButton(btn, next);
    });
  }

  if (moreBtn && pop) {
    const close = () => {
      pop.classList.add('hidden');
      moreBtn.classList.remove('is-open');
      moreBtn.setAttribute('aria-expanded', 'false');
    };
    const open = () => {
      pop.classList.remove('hidden');
      moreBtn.classList.add('is-open');
      moreBtn.setAttribute('aria-expanded', 'true');
    };
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (pop.classList.contains('hidden')) open();
      else close();
    });
    document.addEventListener('click', (e) => {
      if (pop.classList.contains('hidden')) return;
      if (pane.contains(e.target)) return;
      close();
    });
    pop.addEventListener('click', (e) => {
      const act = e.target.closest('[data-pane-act]');
      if (!act) return;
      e.stopPropagation();
      const name = act.getAttribute('data-pane-act');
      if (name === 'refresh') pane.dispatchEvent(new CustomEvent('hx-metrics-refresh'));
      if (name === 'copy') pane.dispatchEvent(new CustomEvent('hx-metrics-copy'));
      if (name === 'save-instance') saveHelixInstance('Saved');
      close();
    });
  }
}

export function mountHelixMetrics(pane) {
  if (!pane || pane.dataset.hxMetricsMounted) return;
  pane.dataset.hxMetricsMounted = '1';
  const body = pane.querySelector('#hx-metrics-body');
  const meta = pane.querySelector('#hx-metrics-meta');
  if (!body) return;

  let fps = 0;
  let frames = 0;
  let fpsMark = performance.now();
  let longTasks = 0;
  let longestTask = 0;
  let canvasAt = null;
  let lastSig = '';
  let lastSnap = null;

  function tick(now) {
    frames += 1;
    if (now - fpsMark >= 1000) {
      fps = Math.round((frames * 1000) / (now - fpsMark));
      frames = 0;
      fpsMark = now;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function build(full) {
    const entries = collectResources();
    const sum = summarize(entries);
    fillImageDims(sum.images);
    if (!canvasAt && document.querySelector('#wa-chat .sc-bganim-canvas')) {
      canvasAt = performance.now();
    }
    const snap = {
      nav: navTiming() || {},
      paint: paintMap(),
      sum,
      hw: hardware(),
      canvas: helixCanvas(),
      fps,
      longTasks,
      longestTask,
      canvasAt,
      decodedPhotos: countDecodedPhotos(sum.images),
    };
    lastSnap = snap;
    const sig = [sum.totalCount, sum.helixCount, sum.totalBytes, snap.canvasAt ? 1 : 0].join(':');
    if (full || !body.childElementCount || sig !== lastSig) {
      const list = body.querySelector('[data-hx-imgs]');
      const keepScroll = list ? list.scrollTop : 0;
      renderStatic(body, snap);
      const next = body.querySelector('[data-hx-imgs]');
      if (next) next.scrollTop = keepScroll;
      lastSig = sig;
    } else {
      updateLive(body, snap);
    }
    if (meta) {
      meta.textContent = snap.sum.totalCount + ' files · '
        + fmtBytes(snap.sum.totalBytes) + ' · '
        + (snap.fps ? (snap.fps + ' fps') : 'timing…');
    }
  }

  pane.addEventListener('click', (e) => {
    const act = e.target.closest('[data-hx-inst]');
    if (!act || !pane.contains(act)) return;
    const kind = act.getAttribute('data-hx-inst');
    const id = act.getAttribute('data-inst');
    if (kind === 'save') saveHelixInstance('Saved');
    else if (kind === 'revert' && id) revertHelixInstance(id);
    else if (kind === 'delete' && id) deleteHelixInstance(id);
    paintInstances(body);
  });
  document.addEventListener('wise:helix-instances', () => paintInstances(body));

  pane.addEventListener('hx-metrics-refresh', () => build(true));
  pane.addEventListener('hx-metrics-copy', async () => {
    if (!lastSnap) return;
    const text = snapshotText(lastSnap);
    try {
      await navigator.clipboard.writeText(text);
      if (meta) meta.textContent = 'Copied a snapshot';
    } catch (_) {
      if (meta) meta.textContent = 'Could not copy';
    }
  });

  try {
    const po = new PerformanceObserver((list) => {
      list.getEntries().forEach((e) => {
        if (e.entryType === 'longtask') {
          longTasks += 1;
          longestTask = Math.max(longestTask, e.duration || 0);
        }
      });
      build(false);
    });
    ['resource', 'paint', 'largest-contentful-paint', 'longtask', 'navigation'].forEach((type) => {
      try { po.observe({ type, buffered: true }); } catch (_) {}
    });
  } catch (_) {}

  wireChrome(pane);
  build(true);
  const placeHelix = () => {
    const shell = document.querySelector('.sc-helix-float');
    if (!shell || shell.classList.contains('is-dragging') || shell.dataset.hxMetricsPlaced) return;
    keepHelixCardOffPane(pane);
    shell.dataset.hxMetricsPlaced = '1';
  };
  [0, 80, 200, 500, 1200].forEach((t) => setTimeout(placeHelix, t));
  window.addEventListener('resize', () => {
    const shell = document.querySelector('.sc-helix-float');
    if (shell) delete shell.dataset.hxMetricsPlaced;
    placeHelix();
  });
  [200, 600, 1400, 3000, 6000].forEach((t) => setTimeout(() => build(true), t));
  setInterval(() => {
    if (document.hidden) return;
    build(false);
  }, 800);
}
