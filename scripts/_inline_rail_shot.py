"""Drive the Inline NFP chip on wiseai.html and screenshot the inline module
rail in both themes — at rest, and after cycling a width + growing the height."""
import json
import sys
import time

sys.path.insert(0, "scripts")
from _cdp import Browser

BASE = "http://127.0.0.1:8099"
OUT = "screenshots/_diag"

AUTH = """
try {
  localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Demo User',
    email:'demo@wisealliance.com',initials:'DU'}));
  localStorage.setItem('wise-walkthrough', JSON.stringify({v:1,completed:true,
    dismissed:true,doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));
  localStorage.setItem('wise-theme', '%s');
  localStorage.setItem('chat-theme', '%s');
  if ('%s' === 'dark') document.documentElement.classList.add('dark');
} catch (e) {}
"""

FIND_CHIP = r"""
(function(){
  var btns = Array.prototype.slice.call(document.querySelectorAll('.ws-intent-chip, .chip'));
  var hit = btns.find(function(b){ return /Inline NFP/i.test(b.textContent||''); });
  if (!hit) return false;
  hit.scrollIntoView({block:'center'});
  hit.click();
  return true;
})()
"""

RAIL_READY = "!!document.querySelector('.sc-inline-rail .sc-inline-mod .imr-nf')"

RAIL_INTO_VIEW = r"""
(function(){
  var r = document.querySelector('.sc-inline-rail');
  if (!r) return null;
  r.scrollIntoView({block:'center'});
  var mods = document.querySelectorAll('.sc-inline-mod').length;
  var box = r.getBoundingClientRect();
  return {mods: mods, h: Math.round(box.height)};
})()
"""

# Cycle module 2 to 'wide', and grow the rail height toward the cap to show the
# limit holds.
INTERACT = r"""
(function(){
  var rail = document.querySelector('.sc-inline-rail');
  if (!rail) return null;
  var mods = document.querySelectorAll('.sc-inline-mod');
  // cycle the middle module's width twice (med -> wide)
  var wbtn = mods[1] && mods[1].querySelector('[data-imr-width]');
  if (wbtn) { wbtn.click(); wbtn.click(); }
  // push height well past the ceiling to prove it clamps to the max
  rail.style.setProperty('--imr-h', '1200px');
  var applied = Math.round(rail.getBoundingClientRect().height);
  var maxH = window.WiseInlineRail ? window.WiseInlineRail.MAX_H : null;
  var w = mods[1] ? Math.round(mods[1].getBoundingClientRect().width) : null;
  rail.scrollIntoView({block:'center'});
  return {applied: applied, maxH: maxH, midWidth: w};
})()
"""

def run(theme, b):
    b.on_new_document(AUTH % (theme, theme, theme))
    b.goto("%s/pages/wiseai.html?v=%d" % (BASE, int(time.time() * 1000)),
           ready="!!document.querySelector('.ws-intent-chip, .chip')", settle=2.2)
    if not b.js(FIND_CHIP):
        print(theme, "CHIP NOT FOUND")
        return
    # streaming: wait real time for the answer + rail to land
    deadline = time.time() + 30
    while time.time() < deadline:
        if b.js(RAIL_READY):
            break
        time.sleep(0.5)
    time.sleep(2.0)  # count-ups settle
    print(theme, "rest", json.dumps(b.js(RAIL_INTO_VIEW)))
    time.sleep(0.4)
    print(theme, "shot", b.shot("inline-rail__rest__%s" % theme))
    print(theme, "interact", json.dumps(b.js(INTERACT)))
    time.sleep(0.6)
    print(theme, "shot", b.shot("inline-rail__resized__%s" % theme))


b = Browser(port=9418, width=1440, height=1000, out=OUT)
try:
    for theme in ("light", "dark"):
        run(theme, b)
finally:
    b.close()
