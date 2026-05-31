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
