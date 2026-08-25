/** FOUC guard — set text-scale CSS variables before first paint. Keep in sync with js/text-size.js */
(function () {
  var scales = { sm: 0.82, md: 1, lg: 1.18, xl: 1.36 };
  var lines = { sm: 1.45, md: 1.6, lg: 1.65, xl: 1.7 };
  try {
    var s = localStorage.getItem('chat-font-size');
    if (!scales[s]) s = 'md';
    document.documentElement.style.setProperty('--wise-text-scale', String(scales[s]));
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
      var v = localStorage.getItem(KEY);
      return v === null ? true : v === '1';
    } catch (_) { return true; }
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
    /* Search (wise-app-search) suspends both full-bleed modes — keep the first
       paint contained so the search row does not flash edge-to-edge. */
    if (mode === 'off' || localStorage.getItem('wise-app-search') === '1') {
      root.classList.remove('full-bleed', 'fb-chat-only');
    } else {
      root.classList.add('full-bleed');
      root.classList.toggle('fb-chat-only', mode === 'chat');
    }
  } catch (_) {}
})();

/** FOUC guard — Menu icon (wise-nav-hamburger) paints from <html> so the
    collapsed search+rail wordmark does not flash the 54px icon list first.
    Keep in sync with isNavHamburgerOn() in js/nav-hamburger.js. */
(function () {
  try {
    if (localStorage.getItem('wise-nav-hamburger') === '1') {
      document.documentElement.classList.add('nav-hamburger');
    }
  } catch (_) {}
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
  function emptyStore() { return { light: {}, dark: {} }; }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return emptyStore();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyStore();
      return {
        light: parsed.light && typeof parsed.light === 'object' ? parsed.light : {},
        dark: parsed.dark && typeof parsed.dark === 'object' ? parsed.dark : {}
      };
    } catch (_) { return emptyStore(); }
  }
  function save(store) {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (_) {}
  }
  function hexToRgb(hex) {
    var m = String(hex || '').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return null;
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbaFromHex(hex, a) {
    var rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + a + ')';
  }
  function parseColor(value) {
    var v = String(value || '').trim();
    if (hexToRgb(v)) {
      var rgb = hexToRgb(v);
      var hex = '#' + [rgb.r, rgb.g, rgb.b].map(function (n) {
        return n.toString(16).padStart(2, '0').toUpperCase();
      }).join('');
      return hex;
    }
    var m = v.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i);
    if (!m) return '';
    var hex = '#' + [m[1], m[2], m[3]].map(function (n) {
      return Math.round(parseFloat(n)).toString(16).padStart(2, '0').toUpperCase();
    }).join('');
    return hex;
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
        root.style.setProperty(dep.token, rgbaFromHex(map[src], a));
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
    var parsed = parseColor(value);
    if (!parsed || TOKENS.indexOf(token) === -1) return false;
    var store = load();
    var theme = themeOf();
    store[theme][token] = parsed;
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

/** FOUC guard — chat module default width. Laptop-class viewports
    (≤ 1512 CSS px, 14" MacBook Pro) stay single pane; wider viewports
    default to double. Keep in sync with WPaneWidth.defaultChatTier() in
    js/pane-width.js. Stops once the chat host exists so a later in-session
    toggle back to single is not overwritten. */
(function () {
  var SINGLE_MAX = 1512;
  function defaultTier() {
    return (window.innerWidth || 0) > SINGLE_MAX ? 1 : 0;
  }
  window.WISE_CHAT_SINGLE_MAX_PX = SINGLE_MAX;
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
