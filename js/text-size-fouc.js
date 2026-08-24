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
