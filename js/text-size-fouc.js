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
    if (mode === 'off') {
      root.classList.remove('full-bleed', 'fb-chat-only');
    } else {
      root.classList.add('full-bleed');
      root.classList.toggle('fb-chat-only', mode === 'chat');
    }
  } catch (_) {}
})();
