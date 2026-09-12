"""Verify a sent ask wash hits the module edges; composer and type stay put."""
import json
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
URL = "http://127.0.0.1:8099/pages/wiseai.html"
OUT = "screenshots/_diag"

MEASURE = """(function(){
  var card = document.querySelector('.sc-card, #chat-shell, .wa-chat');
  var wrap = document.querySelector('.chat-input-rail .fl-input-wrap');
  var area = document.querySelector('.chat-messages-area');
  var you = document.querySelector('.chat-messages-area > .sc-line-you:not(.sc-line-event)');
  var ai = document.querySelector('.chat-messages-area > .sc-line-wiseai');
  var youBody = you && you.querySelector('.sc-line-body');
  var aiBody = ai && ai.querySelector('.sc-line-body');
  if (!card || !wrap || !area) return JSON.stringify({ok:false, why:'missing'});
  var c = card.getBoundingClientRect();
  var w = wrap.getBoundingClientRect();
  var a = area.getBoundingClientRect();
  var y = you && you.getBoundingClientRect();
  var yb = youBody && youBody.getBoundingClientRect();
  var ab = aiBody && aiBody.getBoundingClientRect();
  var before = you ? getComputedStyle(you, '::before') : null;
  var bleed = you ? parseFloat(getComputedStyle(you).getPropertyValue('--sc-you-bleed')) : 0;
  var washLeft = y && before ? Math.round(y.left + parseFloat(before.left) - c.left) : null;
  var washRight = y && before ? Math.round(c.right - (y.right - parseFloat(before.right))) : null;
  return JSON.stringify({
    ok: true,
    wrapLeft: Math.round(w.left - c.left),
    wrapRight: Math.round(c.right - w.right),
    wrapRadius: getComputedStyle(wrap).borderRadius,
    youLeft: y ? Math.round(y.left - c.left) : null,
    aiLeft: ai ? Math.round(ai.getBoundingClientRect().left - c.left) : null,
    youBodyLeft: yb ? Math.round(yb.left - c.left) : null,
    aiBodyLeft: ab ? Math.round(ab.left - c.left) : null,
    washLeft: washLeft,
    washRight: washRight,
    washBg: before && before.backgroundColor,
    youBleed: bleed,
    areaPad: getComputedStyle(area).paddingLeft
  });
})()"""

SEED = """(function(){
  var m = document.querySelector('.chat-messages-area');
  var wel = document.querySelector('.sc-welcome');
  if (!m) return 'no messages';
  if (wel) wel.classList.add('sc-hidden');
  var you = document.querySelector('.sc-avatar-you');
  var owl = document.querySelector('.sc-avatar-wiseai');
  var youHtml = you ? you.outerHTML : '<span class="sc-avatar sc-avatar-you">AK</span>';
  var owlHtml = owl ? owl.outerHTML : '<span class="sc-avatar sc-avatar-wiseai"></span>';
  m.innerHTML =
    '<div class="sc-line sc-line-you">' + youHtml +
      '<div class="sc-line-body">How many ingredients have a GRAS classification?' +
      '<div class="sc-line-meta"><span class="sc-line-time">Just now</span></div></div></div>' +
    '<div class="sc-line sc-line-wiseai">' + owlHtml +
      '<div class="sc-line-body">About 1,840 ingredients in the registry currently carry a GRAS classification. That is the count across the live foods database, not a claim about your portfolio.' +
      '<div class="sc-line-meta"><span class="sc-line-time">Just now</span></div></div></div>';
  return 'seeded';
})()"""

os.makedirs(OUT, exist_ok=True)
b = Browser(port=9391 if THEME == "dark" else 9390, width=1440, height=980, out=OUT)
try:
    dark = THEME == "dark"
    b.on_new_document(
        "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
        "localStorage.setItem('wise-authed','1');"
        "localStorage.setItem('wise-theme','%s');"
        "localStorage.setItem('chat-theme','%s');"
        "%s}catch(e){}"
        % (THEME, THEME, "document.documentElement.classList.add('dark');" if dark else "")
    )
    b.goto(URL, ready="!!document.querySelector('.fl-input-wrap')", settle=2.5)
    print("welcome:", b.js(MEASURE))
    b.shot("user-ask-edge__welcome__%s" % THEME)
    print("seed:", b.js(SEED))
    time.sleep(0.6)
    print("thread:", b.js(MEASURE))
    b.shot("user-ask-edge__thread__%s" % THEME)
finally:
    b.close()
