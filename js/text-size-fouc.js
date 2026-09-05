/** FOUC guard — set text-scale CSS variables before first paint. Keep in sync with js/text-size.js */
(function () {
  var scales = { sm: 0.82, md: 1, lg: 1.18, xl: 1.36 };
  var lines = { sm: 1.45, md: 1.6, lg: 1.65, xl: 1.7 };
  try {
    var s = localStorage.getItem('chat-font-size');
    if (!scales[s]) s = 'md';
    document.documentElement.style.setProperty('--wise-text-scale', String(scales[s]));
    document.documentElement.style.setProperty('--wise-icon-scale', String(scales[s]));
    document.documentElement.style.setProperty('--chat-line-height', String(lines[s]));
  } catch (_) {}
})();

/** FOUC guard — Minimal UI is on by default. Keep in sync with
    isMinimalUiOn() in js/topbar.js so the first paint already has
    `minimal-ui` on #menu-panel instead of flashing the full nav. */
(function () {
  var KEY = 'wise-minimal-ui-v2';
  function wantOn() {
    try {
      /* Pivot Navigation always comes on with Minimal UI. If the top bar
         is persisted, paint the strip even when Nav & History icons is on
         so the four-icon rail cannot flash first. */
      if (localStorage.getItem('wise-menu-pivot') === '1') return true;
      /* Nav & History icons owns the collapsed chrome (default ON); don't
         paint Minimal UI over that four-icon rail. Keep in sync with
         isNavModulesOn() in js/nav-modules.js. */
      var nm = localStorage.getItem('wise-nav-modules-v2');
      if (nm === null ? true : nm === '1') return false;
      var v = localStorage.getItem(KEY);
      return v === null ? true : v === '1';
    } catch (_) { return false; }
  }
  function apply() {
    var panel = document.getElementById('menu-panel');
    if (!panel) return false;
    panel.classList.toggle('minimal-ui', wantOn());
    return true;
  }
  if (apply()) return;
  var mo = new MutationObserver(function () {
    if (apply()) mo.disconnect();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  function stop() {
    apply();
    mo.disconnect();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', stop);
  else stop();
})();

/** FOUC guard — Chat-only full bleed is on by default. Keep in sync with
    resolveFullBleedMode() in js/topbar.js so the first paint already has
    `full-bleed` + `fb-chat-only` instead of flashing contained chat. */
(function () {
  try {
    var mode = localStorage.getItem('wise-fb-mode');
    if (mode !== 'chat' && mode !== 'all' && mode !== 'off') {
      var everything = localStorage.getItem('wise-full-bleed') === '1';
      var chatOnly = localStorage.getItem('wise-fb-chat-only');
      mode = (everything && chatOnly === '0') ? 'all' : 'chat';
    }
    var root = document.documentElement;
    /* Search is locked off. Drop a leftover wise-app-search=1 so it cannot
       suppress full-bleed on first paint. */
    try { localStorage.removeItem('wise-app-search'); } catch (_) {}
    if (mode === 'off') {
      root.classList.remove('full-bleed', 'fb-chat-only');
    } else {
      root.classList.add('full-bleed');
      root.classList.toggle('fb-chat-only', mode === 'chat');
    }
  } catch (_) {}
})();

/** FOUC guard — Menu icon (wise-nav-hamburger) paints from <html> so the
    collapsed search+rail wordmark does not flash the 54px icon list first.
    Keep in sync with isNavHamburgerOn() in js/nav-hamburger.js: only on
    when Search is also on. Search off clears a leftover on-state. */
(function () {
  try {
    var searchOn = localStorage.getItem('wise-app-search') === '1';
    if (localStorage.getItem('wise-nav-hamburger') === '1' && searchOn) {
      document.documentElement.classList.add('nav-hamburger');
    } else {
      document.documentElement.classList.remove('nav-hamburger');
      if (!searchOn) localStorage.removeItem('wise-nav-hamburger');
    }
  } catch (_) {}
})();

/** FOUC guard — Nav & History icons (wise-nav-modules-v2) is on by default
    so the collapsed rail does not flash the full icon list first.
    Keep in sync with isNavModulesOn() in js/nav-modules.js. */
(function () {
  try {
    var v = localStorage.getItem('wise-nav-modules-v2');
    if (v === null ? true : v === '1') {
      document.documentElement.classList.add('nav-modules');
    }
  } catch (_) {
    document.documentElement.classList.add('nav-modules');
  }
})();

/** FOUC guard — Icons only (wise-menu-rail) is on by default, and Nav &
    History icons owns the four-icon collapsed rail on load. Keep in sync
    with isIconRailOn() in js/topbar.js and isNavModulesOn() in js/nav-modules.js
    so the labelled nav does not flash before the module scripts run. */
(function () {
  function wantOn() {
    try {
      var nm = localStorage.getItem('wise-nav-modules-v2');
      if (nm === null ? true : nm === '1') return true;
      var v = localStorage.getItem('wise-menu-rail');
      return v === null ? true : v === '1';
    } catch (_) { return true; }
  }
  function apply() {
    var panel = document.getElementById('menu-panel');
    if (!panel) return false;
    var rail = wantOn();
    panel.classList.toggle('mp-rail', rail);
    panel.classList.toggle('mp-rail-settled', rail);
    return true;
  }
  if (apply()) return;
  var mo = new MutationObserver(function () {
    if (apply()) mo.disconnect();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  function stop() {
    apply();
    mo.disconnect();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', stop);
  else stop();
})();

/** Design-token color overrides — persist per theme and apply before paint so
    every page (and a theme flip) picks up the Design System swatch edits. */
(function () {
  var KEY = 'wise-ds-tokens';
  var TOKENS = [
    '--bg', '--surface', '--surface-2', '--surface-3',
    '--text', '--text-muted', '--text-subtle',
    '--primary', '--primary-bright', '--primary-10', '--primary-20', '--primary-soft',
    '--sec-green', '--sec-green-text', '--sec-green-10',
    '--sec-red', '--sec-red-text', '--sec-red-10',
    '--ter-amber', '--ter-amber-text', '--ter-amber-10',
    '--border', '--border-strong'
  ];
  var DERIVE = {
    '--primary': [
      { token: '--primary-10', a: 0.10 },
      { token: '--primary-20', a: 0.20 },
      { token: '--primary-soft', aLight: 0.08, aDark: 0.18 }
    ],
    '--sec-green': [{ token: '--sec-green-10', a: 0.12 }],
    '--sec-red': [{ token: '--sec-red-10', a: 0.12 }],
    '--ter-amber': [{ token: '--ter-amber-10', a: 0.14 }]
  };
  /* Tokens that always mirror another — stale per-token overrides are dropped. */
  var ALIAS = {
    '--text-subtle': '--text-muted'
  };
  var listeners = [];
  var DEFAULTS = { light: null, dark: null };

  var themeLockedToClass = document.documentElement.classList.contains('dark');
  function themeOf() {
    if (document.documentElement.classList.contains('dark')) return 'dark';
    if (themeLockedToClass) return 'light';
    try {
      var t = localStorage.getItem('wise-theme');
      if (t === 'dark') return 'dark';
      if (t === 'light') return 'light';
      if (localStorage.getItem('chat-theme') === 'dark') return 'dark';
    } catch (_) {}
    return 'light';
  }
  function pruneAliases(store) {
    ['light', 'dark'].forEach(function (theme) {
      var map = store[theme];
      if (!map) return;
      Object.keys(ALIAS).forEach(function (alias) {
        delete map[alias];
      });
    });
  }
  function emptyStore() { return { light: {}, dark: {} }; }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return emptyStore();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyStore();
      var store = {
        light: parsed.light && typeof parsed.light === 'object' ? parsed.light : {},
        dark: parsed.dark && typeof parsed.dark === 'object' ? parsed.dark : {}
      };
      pruneAliases(store);
      if (JSON.stringify(store) !== raw) save(store);
      return store;
    } catch (_) { return emptyStore(); }
  }
  function save(store) {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (_) {}
  }
  function clamp255(n) { return Math.max(0, Math.min(255, Math.round(n))); }
  function clampAlpha(n) { return isNaN(n) ? 1 : Math.max(0, Math.min(1, n)); }
  function hexToRgb(hex) {
    var m = String(hex || '').trim().match(/^#?([0-9a-f]{3,8})$/i);
    if (!m) return null;
    var h = m[1];
    if (h.length === 3 || h.length === 4) {
      h = h.replace(/./g, function (c) { return c + c; });
    }
    if (h.length !== 6 && h.length !== 8) return null;
    var n = parseInt(h.slice(0, 6), 16);
    return {
      r: (n >> 16) & 255,
      g: (n >> 8) & 255,
      b: n & 255,
      a: h.length === 8 ? clampAlpha(parseInt(h.slice(6), 16) / 255) : 1
    };
  }
  /* Any hex (3/4/6/8 digit) or rgb()/rgba() string → { r, g, b, a }. */
  function toRgba(value) {
    var v = String(value || '').trim();
    var hex = hexToRgb(v);
    if (hex) return hex;
    var m = v.match(/^rgba?\(([^)]*)\)$/i);
    if (!m) return null;
    var parts = m[1].split(/[,/]/).map(function (p) { return p.trim(); })
      .filter(function (p) { return p !== ''; });
    if (parts.length < 3) return null;
    var chan = function (p) { return /%$/.test(p) ? parseFloat(p) * 2.55 : parseFloat(p); };
    var r = chan(parts[0]), g = chan(parts[1]), b = chan(parts[2]);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    var a = 1;
    if (parts.length > 3) {
      a = /%$/.test(parts[3]) ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    }
    return { r: clamp255(r), g: clamp255(g), b: clamp255(b), a: clampAlpha(a) };
  }
  function roundAlpha(a) { return Math.round(clampAlpha(a) * 1000) / 1000; }
  /* Opaque colors stay hex so older saved overrides round-trip unchanged;
     anything translucent serializes as rgba() so the alpha survives. */
  function formatColor(rgb) {
    if (!rgb) return '';
    var a = roundAlpha(rgb.a == null ? 1 : rgb.a);
    if (a === 1) {
      return '#' + [rgb.r, rgb.g, rgb.b].map(function (n) {
        return n.toString(16).padStart(2, '0').toUpperCase();
      }).join('');
    }
    return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + a + ')';
  }
  /* Derived tints multiply their own alpha by the base color's, so a
     half-transparent --primary yields a half-strength --primary-10. */
  function tintFrom(value, a) {
    var rgb = toRgba(value);
    if (!rgb) return value;
    return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', '
      + roundAlpha(a * (rgb.a == null ? 1 : rgb.a)) + ')';
  }
  /* Keep an explicit rgba()/rgb() paste as rgba so Design System hex→RGBA
     conversion survives storage; hex input still round-trips as hex. */
  function parseColor(value) {
    var rgb = toRgba(value);
    if (!rgb) return '';
    if (/^rgba?\(/i.test(String(value || '').trim())) {
      return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', '
        + roundAlpha(rgb.a == null ? 1 : rgb.a) + ')';
    }
    return formatColor(rgb);
  }
  function clearInline(root) {
    TOKENS.forEach(function (t) { root.style.removeProperty(t); });
  }
  function applyDerived(root, map, theme) {
    Object.keys(DERIVE).forEach(function (src) {
      if (!map[src]) return;
      DERIVE[src].forEach(function (dep) {
        if (map[dep.token]) return;
        var a = dep.a;
        if (dep.aLight != null) a = theme === 'dark' ? dep.aDark : dep.aLight;
        root.style.setProperty(dep.token, tintFrom(map[src], a));
      });
    });
  }
  function apply() {
    var root = document.documentElement;
    var theme = themeOf();
    var store = load();
    var map = store[theme] || {};
    clearInline(root);
    Object.keys(map).forEach(function (t) {
      if (TOKENS.indexOf(t) === -1) return;
      root.style.setProperty(t, map[t]);
    });
    applyDerived(root, map, theme);
    listeners.forEach(function (fn) { try { fn(theme, map); } catch (_) {} });
  }
  function setToken(token, value) {
    if (ALIAS[token]) token = ALIAS[token];
    var parsed = parseColor(value);
    if (!parsed || TOKENS.indexOf(token) === -1) return false;
    var store = load();
    var theme = themeOf();
    store[theme][token] = parsed;
    pruneAliases(store);
    save(store);
    apply();
    return true;
  }
  function resetToken(token) {
    var store = load();
    var theme = themeOf();
    delete store[theme][token];
    save(store);
    apply();
  }
  function resetTheme() {
    var store = load();
    store[themeOf()] = {};
    save(store);
    apply();
  }
  function resetAll() {
    save(emptyStore());
    apply();
  }
  function isCustom(token) {
    var map = load()[themeOf()] || {};
    return !!map[token];
  }
  function getToken(token) {
    return (load()[themeOf()] || {})[token] || '';
  }
  /* Snapshot stylesheet defaults (after CSS has loaded) so the Design System
     can show the original chip next to a live override. Inline overrides are
     stripped and restored in the same turn, so nothing paints in between. */
  function captureDefaults() {
    var theme = themeOf();
    if (DEFAULTS[theme]) return DEFAULTS[theme];
    var root = document.documentElement;
    var saved = {};
    TOKENS.forEach(function (t) {
      var v = root.style.getPropertyValue(t);
      if (v) saved[t] = v;
      root.style.removeProperty(t);
    });
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;pointer-events:none;';
    (document.body || root).appendChild(probe);
    var map = {};
    var any = false;
    TOKENS.forEach(function (t) {
      probe.style.backgroundColor = '';
      probe.style.color = '';
      probe.style.borderColor = '';
      probe.style.backgroundColor = 'var(' + t + ')';
      var v = getComputedStyle(probe).backgroundColor;
      map[t] = (v && v !== 'rgba(0, 0, 0, 0)' && v !== 'transparent') ? v : '';
      if (map[t]) any = true;
    });
    probe.remove();
    Object.keys(saved).forEach(function (t) {
      root.style.setProperty(t, saved[t]);
    });
    if (!any) return map;
    DEFAULTS[theme] = map;
    return map;
  }
  function defaultValue(token) {
    return (captureDefaults() || {})[token] || '';
  }
  function countCustom() {
    return Object.keys(load()[themeOf()] || {}).length;
  }

  window.WiseTokenTheme = {
    KEY: KEY,
    TOKENS: TOKENS,
    theme: themeOf,
    load: load,
    apply: apply,
    set: setToken,
    reset: resetToken,
    resetTheme: resetTheme,
    resetAll: resetAll,
    isCustom: isCustom,
    get: getToken,
    default: defaultValue,
    captureDefaults: captureDefaults,
    count: countCustom,
    parse: parseColor,
    rgba: toRgba,
    format: formatColor,
    alphaOf: function (value) {
      var rgb = toRgba(value);
      return rgb ? (rgb.a == null ? 1 : rgb.a) : 1;
    },
    withAlpha: function (value, a) {
      var rgb = toRgba(value);
      if (!rgb) return '';
      return formatColor({ r: rgb.r, g: rgb.g, b: rgb.b, a: clampAlpha(a) });
    },
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };

  apply();
  try {
    new MutationObserver(function () {
      themeLockedToClass = true;
      apply();
    }).observe(document.documentElement, {
      attributes: true, attributeFilter: ['class']
    });
  } catch (_) {}
  if (!themeLockedToClass) {
    requestAnimationFrame(function () {
      themeLockedToClass = true;
      apply();
    });
  }
  try {
    window.addEventListener('storage', function (e) {
      if (e.key === KEY) apply();
    });
  } catch (_) {}
})();

/** FOUC guard — chat module default width. Laptop-class SCREENS
    (≤ 1512 CSS px, 14" MacBook Pro) stay single pane; larger screens
    default to double. Keep in sync with WPaneWidth.defaultChatTier() in
    js/pane-width.js. Stops once the chat host exists so a later in-session
    toggle back to single is not overwritten. */
(function () {
  var SINGLE_MAX = 1512;

  /* Measure the DISPLAY, not the browser window.

     This used to read window.innerWidth, which is the viewport — it changes
     every time the window is resized, opened un-maximised, or has devtools
     docked. On a single 1512 px laptop that made the chat flip between single
     and double for no reason the user could see.

     screen.width is the logical width of the monitor the window is on, so the
     default is stable for a given screen and only changes if the window moves
     to a different display. innerWidth remains the fallback for the rare
     browser that will not report a screen. */
  function screenWidthPx() {
    var w = 0;
    try { w = (window.screen && +window.screen.width) || 0; } catch (_) { w = 0; }
    return w > 0 ? w : (window.innerWidth || 0);
  }
  function defaultTier() {
    return screenWidthPx() > SINGLE_MAX ? 1 : 0;
  }
  window.WISE_CHAT_SINGLE_MAX_PX = SINGLE_MAX;
  window.WISE_CHAT_SCREEN_WIDTH_PX = screenWidthPx;
  window.wiseDefaultChatTier = defaultTier;

  var CHAT_SEL = [
    '#wa-chat', '#chat-shell', '#rf-chat', '#gs-chat', '#sa-chat',
    '#aid-chat', '#pl-chat', '#ar-chat', '.ap-chat', '#mkt-wiseai',
    '.wiseai-dock', '#wiseai-dock-panel', '#wiseai-panel', '#pf-chat-panel'
  ].join(',');

  function apply() {
    var want = defaultTier() >= 1;
    document.documentElement.classList.toggle('chat-default-double', want);
    var nodes = document.querySelectorAll(CHAT_SEL);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.classList.contains('panel-triple') || el.classList.contains('panel-fill')) continue;
      el.classList.toggle('panel-wide', want);
    }
    if (want && document.body && document.getElementById('mkt-chat-rail')) {
      document.body.classList.add('mkt-chat-wide');
    }
    return document.querySelector(CHAT_SEL);
  }

  /* Moving the window to a different display (or changing that display's
     resolution) is the only thing that can legitimately change the screen
     tier now. Re-apply the default in exactly that case — ordinary window
     resizing no longer affects the tier, and a manual in-session toggle is
     never overwritten (js/pane-width.js sets the user-set flag). */
  (function watchDisplayChange() {
    var lastTier = defaultTier();
    var pending = 0;
    function check() {
      pending = 0;
      var t = defaultTier();
      if (t === lastTier) return;
      lastTier = t;
      if (document.documentElement.getAttribute('data-chat-width-user-set') === '1') return;
      apply();
    }
    try {
      window.addEventListener('resize', function () {
        if (pending) return;
        pending = requestAnimationFrame(check);
      }, { passive: true });
    } catch (_) {}
  })();

  if (apply()) return;
  var mo = new MutationObserver(function () {
    if (apply()) mo.disconnect();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  function stop() {
    apply();
    mo.disconnect();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', stop);
  else stop();
})();

/** FOUC guard — Serif headlines are on by default. Keep in sync with
    isSerifHeadlinesOn() / applySerifHeadlines() in js/topbar.js so titles do
    not flash Noto Serif when the user has switched them to DM Sans. */
(function () {
  var KEY = 'wise-serif-headlines';
  var STYLE_ID = 'wise-sans-headlines-faces';
  var CSS = "@font-face{font-family:'Noto Serif';font-style:italic;font-weight:300 800;font-display:swap;src:url(https://fonts.gstatic.com/s/dmsans/v17/rP2Fp2ywxg089UriCZa4ET-DJF4e8BH9.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}"
    + "@font-face{font-family:'Noto Serif';font-style:italic;font-weight:300 800;font-display:swap;src:url(https://fonts.gstatic.com/s/dmsans/v17/rP2Fp2ywxg089UriCZa4Hz-DJF4e8A.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}"
    + "@font-face{font-family:'Noto Serif';font-style:normal;font-weight:300 800;font-display:swap;src:url(https://fonts.gstatic.com/s/dmsans/v17/rP2Hp2ywxg089UriCZ2IHTWEBlwu8Q.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}"
    + "@font-face{font-family:'Noto Serif';font-style:normal;font-weight:300 800;font-display:swap;src:url(https://fonts.gstatic.com/s/dmsans/v17/rP2Hp2ywxg089UriCZOIHTWEBlw.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}"
    + "@font-face{font-family:'Noto Serif Fallback';font-style:italic;font-weight:300 800;font-display:swap;src:url(https://fonts.gstatic.com/s/dmsans/v17/rP2Fp2ywxg089UriCZa4Hz-DJF4e8A.woff2) format('woff2')}"
    + "@font-face{font-family:'Noto Serif Fallback';font-style:normal;font-weight:300 800;font-display:swap;src:url(https://fonts.gstatic.com/s/dmsans/v17/rP2Hp2ywxg089UriCZOIHTWEBlw.woff2) format('woff2')}";
  function wantSans() {
    try { return localStorage.getItem(KEY) === '0'; } catch (_) { return false; }
  }
  function ensureFaces() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  function disableNoto() {
    var nodes = document.querySelectorAll('link[rel="stylesheet"][href*="Noto+Serif"], link[rel="stylesheet"][href*="Noto%20Serif"]');
    for (var i = 0; i < nodes.length; i++) nodes[i].disabled = true;
  }
  if (!wantSans()) return;
  document.documentElement.classList.add('sans-headlines');
  ensureFaces();
  disableNoto();
  var mo = new MutationObserver(function () {
    ensureFaces();
    disableNoto();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  function stop() {
    ensureFaces();
    disableNoto();
    mo.disconnect();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', stop);
  else stop();
})();

/** FOUC guard — Header float is off by default. Keep in sync with
    isHeaderFloatOn() / applyHeaderFloat() in js/topbar.js so a stored-on
    preference paints `header-float` before module headers can flash. */
(function () {
  try {
    if (localStorage.getItem('wise-header-float') === '1') {
      document.documentElement.classList.add('header-float');
    } else {
      document.documentElement.classList.remove('header-float');
    }
  } catch (_) {}
})();

/** FOUC guard — Guides are off by default. Keep in sync with isGuidesOn()
    / applyGuides() in js/topbar.js so a stored-on preference paints
    `guides-on` before the first toast can flash hidden. */
(function () {
  try {
    if (localStorage.getItem('wise-guides') === '1') {
      document.documentElement.classList.add('guides-on');
    }
  } catch (_) {}
})();

/** FOUC guard — Flush sticky modules is on by default. Keep in sync with
    isStickyFlushOn() / applyStickyFlush() in js/topbar.js. Only a stored
    off (`0`) skips the class. */
(function () {
  try {
    if (localStorage.getItem('wise-sticky-flush') !== '0') {
      document.documentElement.classList.add('sticky-flush');
    }
  } catch (_) {}
})();

/** FOUC guard — Blue chat surface (wise-chat-tint) is on by default. Keep
    in sync with isChatTintOn() / applyChatTint() in js/topbar.js so the
    brand-blue wash is on the first paint of every page, not only after
    the Appearance module restores. Only a stored off (`0`) skips it. */
(function () {
  try {
    if (localStorage.getItem('wise-chat-tint') !== '0') {
      document.documentElement.classList.add('chat-tint');
    }
  } catch (_) {
    document.documentElement.classList.add('chat-tint');
  }
})();

/** FOUC guard — Helix loading is on by default. Keep in sync with
    isHelixLoadOn() in js/load-anim.js so the striped skeleton never flashes
    before the overlay module runs. */
(function () {
  try {
    var helix = localStorage.getItem('wise-helix-loading') !== '0';
    document.documentElement.classList.toggle('load-anim-helix', helix);
    document.documentElement.classList.toggle('load-anim-stripes', !helix);
  } catch (_) {}
})();

/** FOUC guard — chat background-animation style. Helix is the published
    Scene default. Keep in sync with readBgAnimStyle() in js/wiseai-chat.js
    so the welcome owl constellation cannot paint before the helix starts. */
(function () {
  try {
    var s = localStorage.getItem('wise:chat-bg-anim-style');
    if (s === 'stamp' || (s !== 'helix' && s !== 'helix-ten' && s !== 'orbit')) s = 'helix';
    document.documentElement.setAttribute('data-chat-bg-style', s || 'helix');
  } catch (_) {
    document.documentElement.setAttribute('data-chat-bg-style', 'helix');
  }
})();
