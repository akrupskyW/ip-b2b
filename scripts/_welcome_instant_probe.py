"""Check that chat welcome headlines and intent chips are visible immediately."""
import json
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

BASE = "http://127.0.0.1:8765/pages/"
PAGES = [
    "wiseai.html",
    "add-product.html",
    "add-catalog.html",
    "product-portfolio.html",
    "product-comparison.html",
    "reformulation.html",
    "helix.html",
    "studio-ai.html",
    "progress-log.html",
    "ai-dashboard.html",
    "overview.html",
    "gras-verification.html",
    "conversation-library.html",
    "ingredient-browser.html",
    "reports.html",
    "accessibility-review.html",
]

AUTH = """
try {
  localStorage.setItem('wise-auth', JSON.stringify({
    loggedIn: true, name: 'Demo User', email: 'demo@wisealliance.com',
    title: 'Product Intelligence Lead', org: 'WISE Foods',
    initials: 'DU', at: new Date().toISOString()
  }));
  localStorage.setItem('wise-theme', 'light');
  localStorage.setItem('chat-theme', 'light');
  localStorage.setItem('wise-walkthrough', JSON.stringify({
    v: 1, completed: true, dismissed: true, doneSteps: ['*'],
    skippedGroups: [], screensSeen: {'*': true}, cursor: ''
  }));
} catch (e) {}
"""

STATE = r"""
(function(){
  var welcome = document.querySelector('.sc-welcome:not(.sc-hidden):not(.ws-hidden), #welcome-screen:not(.sc-hidden):not(.ws-hidden)');
  if (welcome && welcome.style.display === 'none') welcome = null;
  var heading = welcome && welcome.querySelector('.ws-heading');
  var chips = welcome ? Array.from(welcome.querySelectorAll('.ws-chips .chip, .ws-intent-chip')).filter(function(c){
    return !c.closest('.sc-reply-chips, .sc-inline-chips');
  }) : [];
  function vis(el){
    if (!el) return {ok:false};
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    return {
      ok: !el.hidden && cs.opacity !== '0' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0,
      opacity: cs.opacity,
      hidden: !!el.hidden,
      w: Math.round(r.width),
      h: Math.round(r.height),
      font: heading && el === heading ? cs.fontFamily : undefined
    };
  }
  var chipVis = chips.map(function(c){
    var v = vis(c);
    return {label: (c.textContent||'').replace(/\s+/g,' ').trim().slice(0,40), ok: v.ok, opacity: v.opacity, hidden: v.hidden};
  });
  var hv = vis(heading);
  return {
    welcome: !!welcome,
    heading: heading ? (heading.textContent||'').replace(/\s+/g,' ').trim().slice(0,80) : null,
    headingOk: hv.ok,
    headingOpacity: hv.opacity,
    headingHidden: hv.hidden,
    headingFont: hv.font || null,
    chips: chips.length,
    chipsVisible: chipVis.filter(function(c){ return c.ok; }).length,
    chipsHidden: chipVis.filter(function(c){ return c.hidden; }).length,
    chipsInvisible: chipVis.filter(function(c){ return !c.ok && !c.hidden; }).map(function(c){ return c.label; })
  };
})()
"""

b = Browser(width=1440, height=900, out="/tmp/wise-welcome")
try:
    b.on_new_document(AUTH)
    fail = 0
    for pg in PAGES:
        b.goto(BASE + pg, ready="!!document.querySelector('.ws-heading, .ws-intent-chip, .sc-composer, textarea.fl-input')", settle=0.2)
        st = b.js(STATE) or {}
        bad = []
        if not st.get("welcome"):
            bad.append("no-welcome")
        if not st.get("headingOk"):
            bad.append("heading")
        if st.get("chips", 0) == 0:
            bad.append("no-chips")
        if st.get("chipsInvisible"):
            bad.append("invisible:" + ",".join(st["chipsInvisible"][:4]))
        mark = "FAIL" if bad else "ok"
        if bad:
            fail += 1
        print("%-28s %s  head=%-42s chips=%s/%s hidden=%s  %s" % (
            pg, mark,
            (st.get("heading") or "-")[:42],
            st.get("chipsVisible"), st.get("chips"),
            st.get("chipsHidden"),
            json.dumps({k: st.get(k) for k in ("headingOpacity", "headingFont", "chipsInvisible")})
        ))
    print("failures", fail)
finally:
    b.close()
