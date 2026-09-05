"""Timeline probe for one chat turn.

Clicks an intent chip on wiseai.html and records, with millisecond stamps, when
each stage of the turn becomes visible: the member's prompt finishing its
reveal, the thinking indicator, the answer line, the references list at the end
of the answer, and the carousel of output cards. Used to confirm the stages
land one after another rather than on top of each other.
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
INTENT = sys.argv[1] if len(sys.argv) > 1 else "atlas"
WATCH_MS = int(sys.argv[2]) if len(sys.argv) > 2 else 60000
THEME = sys.argv[3] if len(sys.argv) > 3 else "light"

PROBE = r"""
(function(){
  window.__T = [];
  var t0 = performance.now();
  var seen = {};
  function log(tag, extra){
    if (seen[tag]) return;
    seen[tag] = 1;
    window.__T.push([Math.round(performance.now() - t0), tag, extra || '']);
  }
  window.__mark = log;
  window.__t0 = function(){ t0 = performance.now(); window.__T.length = 0; seen = {}; };
  function vis(el){
    var o = el.style && el.style.opacity;
    return o === '' || o === '1';
  }
  setInterval(function(){
    window.__host = window.__host || document.querySelector('[id$="-messages"]');
    if (!window.__host) return;
    var h = window.__host;
    var you = h.querySelectorAll('.sc-line-you');
    if (you.length) {
      log('prompt.line', you.length + ' you-lines');
      var last = you[you.length - 1];
      var units = last.querySelectorAll('.sc-prompt > *');
      if (units.length) {
        var shown = 0;
        units.forEach(function(u){ if (vis(u)) shown++; });
        if (shown === units.length) log('prompt.revealed', shown + '/' + units.length + ' units');
      }
    }
    if (h.querySelector('.sc-line-typing')) log('thinking.start');
    var trace = h.querySelector('.sc-trace, .ts-trace, [class*="trace"]');
    if (trace) log('trace.present', trace.className);
    var ai = h.querySelectorAll('.sc-line-wiseai:not(.sc-line-typing)');
    if (ai.length) log('answer.firstline');
    var card = h.querySelector('.sc-surface-card');
    if (card) log('output.card');
    var rail = h.querySelector('.sc-surface-rail');
    if (rail) log('carousel.appears');
    if (rail) {
      var cards = rail.querySelectorAll('.sc-surface-card');
      if (cards.length >= 6) log('carousel.six');
    }
    var mini = h.querySelector('.wa-refs-mini');
    if (mini) {
      log('answer.refs.dom');
      var rows = mini.querySelectorAll('.wa-refs-mini-item');
      var lastRow = rows.length ? rows[rows.length - 1] : null;
      if (lastRow && vis(lastRow)) log('answer.refs.visible', rows.length + ' sources');
    }
    var chips = h.querySelector('.sc-inline-chips, .sc-reply-chips');
    if (chips) {
      var c0 = chips.querySelector('.chip');
      if (c0 && vis(c0)) log('chips.appear', h.lastElementChild === chips ? 'last in thread' : 'NOT last');
    }
  }, 50);
})()
"""

b = Browser(port=9341 if THEME == "dark" else 9340,
            width=1600, height=1000, out="/tmp/wise-turn")
try:
    b.on_new_document(
        "try{localStorage.setItem('wise-auth','1');localStorage.setItem('wise-authed','1');"
        "localStorage.setItem('wise-theme','%s');localStorage.setItem('chat-theme','%s');}catch(e){}"
        "%s" % (THEME, THEME,
                "document.documentElement.classList.add('dark');" if THEME == "dark" else "")
    )
    b.goto(URL, ready="!!document.querySelector('.ws-intent-chip, .sc-composer')", settle=3.0)
    b.js(PROBE)
    print("host:", b.js("!!window.__host && window.__host.className"))
    print("chips:", b.js(
        "Array.from(document.querySelectorAll('.ws-intent-chip')).map(n=>n.textContent.trim()).slice(0,40)"
    ))
    b.js("window.__t0()")
    clicked = b.js(
        "(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip'))"
        ".find(function(c){return /%s/i.test(c.textContent)});"
        "if(!n)return false;n.click();return true})()" % INTENT
    )
    print("clicked:", clicked)
    deadline = time.time() + WATCH_MS / 1000.0
    while time.time() < deadline:
        time.sleep(1.0)
    rows = b.js("JSON.stringify(window.__T)")
    for ms, tag, extra in json.loads(rows or "[]"):
        print("%7d ms  %-20s %s" % (ms, tag, extra))
    b.js("(function(){var h=window.__host;if(h)h.scrollTop=h.scrollHeight;})()")
    time.sleep(1.0)
    print(b.shot("turn-end__%s__%s" % (INTENT.split()[0].lower(), THEME)))
finally:
    b.close()
