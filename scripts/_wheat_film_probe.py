"""Drive the chat module's Field segment onto the Wheat film and check it.

Confirms the new option is in the three-dot popover beside Helix / Ten / Orbit /
Video, that picking it covers the whole chat module (not the hero's left bleed),
that it lands at 35% opacity and a slowed playback rate, that the Film rows
stand in for the field's own Opacity / Wash while a film runs and really move
the film, and that each clip keeps its own numbers. Shoots both themes.
"""
import json
import sys
import time

sys.path.insert(0, "scripts")
from _cdp import Browser

BASE = "http://127.0.0.1:8099"
OUT = "screenshots/_diag"

INIT = """
try {
  localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Demo User',
    email:'demo@wisealliance.com',initials:'DU'}));
  localStorage.setItem('wise-walkthrough', JSON.stringify({v:1,completed:true,
    dismissed:true,doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));
  localStorage.setItem('wise-theme', '%s');
  localStorage.setItem('chat-theme', '%s');
  localStorage.setItem('wise:chat-bg-anim', '1');
  localStorage.setItem('wise:chat-bg-anim-paused', '0');
  localStorage.setItem('wise:chat-bg-anim-style', 'helix');
  ['opacity', 'speed'].forEach(function (part) {
    ['video', 'wheat'].forEach(function (clip) {
      localStorage.removeItem('wise:chat-bg-anim-film-' + part + '-' + clip);
    });
  });
} catch (e) {}
window.__wiseErrs = [];
window.addEventListener('error', function (e) {
  window.__wiseErrs.push(String((e && e.message) || e));
});
window.addEventListener('unhandledrejection', function (e) {
  window.__wiseErrs.push('rejection: ' + String(e && e.reason));
});
"""

MEASURE = r"""
(function () {
  function shown(sel) {
    var el = document.querySelector(sel);
    if (!el) return null;
    if (el.hidden) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  var host = document.querySelector('.sc-card');
  var video = document.querySelector('.sc-bganim-video-wrap:not([hidden]) .sc-bganim-video');
  var wrap = video && video.parentElement;
  var hr = host ? host.getBoundingClientRect() : null;
  var vr = video ? video.getBoundingClientRect() : null;
  return {
    errors: window.__wiseErrs || [],
    field: Array.prototype.map.call(
      document.querySelectorAll('[data-sc="bg-anim-style"]'),
      function (b) { return b.dataset.style + (b.classList.contains('is-on') ? '*' : ''); }),
    styleAttr: document.documentElement.getAttribute('data-chat-bg-style'),
    videoLive: !!document.querySelector('.sc-video-live'),
    clip: video ? (video.currentSrc || '').split('/').slice(-2).join('/') : null,
    fill: video ? video.classList.contains('sc-bganim-video--fill') : null,
    loop: video ? video.loop : null,
    playing: video ? !video.paused : null,
    rate: video ? Math.round(video.playbackRate * 1000) / 1000 : null,
    opacity: wrap ? wrap.style.opacity : null,
    coverDelta: (hr && vr) ? [Math.round(vr.left - hr.left), Math.round(vr.top - hr.top),
                              Math.round(vr.width - hr.width), Math.round(vr.height - hr.height)] : null,
    rows: {
      filmOpacity: shown('.sc-bganim-film-opacity'),
      filmSpeed: shown('.sc-bganim-film-speed'),
      fieldOpacity: shown('.sc-bganim-detail:has(.sc-bganim-opacity)'),
      wash: shown('.sc-bganim-wash'),
    },
    reads: [(document.querySelector('.sc-bganim-film-opacity-val') || {}).textContent,
            (document.querySelector('.sc-bganim-film-speed-val') || {}).textContent],
    menuOpen: (function () {
      var b = document.querySelector('.sc-card .chat-topbar .panel-more-btn');
      return b ? b.getAttribute('aria-expanded') : null;
    })(),
  };
})()
"""

DRAG = """
(function (sel, v) {
  var r = document.querySelector(sel);
  if (!r) return false;
  r.value = String(v);
  r.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})(%s, %s)
"""


def openmenu(b):
    b.js("(function(){var x=document.querySelector('.sc-card .chat-topbar .panel-more-btn');"
         "if(x)x.click();})()")
    time.sleep(1.4)


b = Browser(port=9421, width=1600, height=1100, out=OUT)
try:
    for theme in ("light", "dark"):
        b.on_new_document(INIT % (theme, theme))
        b.goto("%s/pages/wiseai.html?v=%d" % (BASE, int(time.time() * 1000)),
               ready="!!document.querySelector('[data-sc=\"bg-anim-style\"]')", settle=3.0)
        print(theme, "helix ", json.dumps(b.js(MEASURE)))

        b.click_sel('[data-sc="bg-anim-style"][data-style="wheat"]')
        time.sleep(3.0)
        print(theme, "wheat ", json.dumps(b.js(MEASURE)))
        print("  shot", b.shot("wheat-film__%s" % theme))

        openmenu(b)
        print(theme, "menu  ", json.dumps(b.js(MEASURE)))
        print("  shot", b.shot("wheat-film-menu__%s" % theme))

        b.js(DRAG % (json.dumps('.sc-bganim-film-speed-range'), 150))
        b.js(DRAG % (json.dumps('.sc-bganim-film-opacity-range'), 80))
        time.sleep(1.0)
        print(theme, "dragged", json.dumps(b.js(MEASURE)))

        b.click_sel('[data-sc="bg-anim-style"][data-style="video"]')
        time.sleep(2.5)
        print(theme, "hero  ", json.dumps(b.js(MEASURE)))

        b.click_sel('[data-sc="bg-anim-style"][data-style="helix"]')
        time.sleep(2.0)
        print(theme, "back  ", json.dumps(b.js(MEASURE)))
finally:
    b.close()
