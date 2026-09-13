"""Check the primary-nav Reformulation row is a live link, and shoot the nav.

Loads pages/wiseai.html in both themes, reports how the Reformulation row
rendered (locked div vs. real anchor, and where it points), then clips the
primary navigation so the row can be eyeballed. Also confirms the row lights up
as active once reformulation.html itself is open.
"""
import json
import sys
import time

sys.path.insert(0, "scripts")
from _cdp import Browser  # noqa: E402

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
} catch (e) {}
"""

ROW = r"""
(function () {
  var row = document.querySelector('[data-nav-id="reformulation"]');
  if (!row) return { found: false };
  return {
    label: (row.querySelector('.menu-nav-label') || {}).textContent || '',
    found: true,
    tag: row.tagName.toLowerCase(),
    locked: row.classList.contains('menu-nav-locked'),
    active: row.classList.contains('is-active'),
    href: (row.getAttribute('href') || '').replace(/^.*\//, ''),
    lockGlyph: !!row.querySelector('.menu-nav-lock'),
    disabled: row.getAttribute('aria-disabled') === 'true',
    box: (function () { var r = row.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }; })(),
  };
})()
"""

# The nav rail loads collapsed to icons; its own expand control is what opens
# the labelled panel, so the row can only be measured or seen after a tap.
EXPAND = r"""
(function () {
  var el = document.querySelector('#menu-panel .menu-modules-menu')
        || document.getElementById('topbar-menu-toggle');
  if (!el) return null;
  el.click();
  return el.className || el.id;
})()
"""

CLIP_NAV = r"""
(function () {
  var nav = document.getElementById('menu-panel');
  if (!nav) return null;
  var r = nav.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y),
           w: Math.round(r.width), h: Math.round(r.height) };
})()
"""

fails = []


def check(label, ok, detail=""):
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", label, (" — " + detail) if detail else ""))
    if not ok:
        fails.append(label)


b = Browser(width=1512, height=1100, out=OUT)
try:
    for theme in ("light", "dark"):
        b.on_new_document(AUTH % (theme, theme))
        print("== %s ==" % theme)

        b.goto("%s/pages/wiseai.html?v=%d" % (BASE, int(time.time() * 1000)),
               ready="!!document.querySelector('[data-nav-id=\"reformulation\"]')", settle=2.5)
        print("  expanded via", b.js(EXPAND))
        time.sleep(1.2)
        row = b.js(ROW) or {}
        print("  wiseai row", json.dumps(row))
        check("row is present", row.get("found") is True)
        check("row is on screen", (row.get("box") or {}).get("w", 0) > 0,
              json.dumps(row.get("box")))
        check("row is not locked", row.get("locked") is False)
        check("row is a real link", row.get("tag") == "a")
        check("row points at reformulation.html",
              row.get("href") == "reformulation.html", str(row.get("href")))
        check("no lock glyph", row.get("lockGlyph") is False)
        check("not aria-disabled", row.get("disabled") is False)

        nav = b.js(CLIP_NAV)
        if nav and nav["h"] > 0:
            b.cmd("Emulation.setDeviceMetricsOverride", {
                "width": 1512, "height": min(nav["h"] + nav["y"] + 40, 4000),
                "deviceScaleFactor": 2, "mobile": False})
            time.sleep(0.5)
            print("  shot", b.shot("nav-reformulation__%s" % theme))
            b.cmd("Emulation.clearDeviceMetricsOverride")

        b.goto("%s/pages/reformulation.html?v=%d" % (BASE, int(time.time() * 1000)),
               ready="!!document.querySelector('[data-nav-id=\"reformulation\"]')", settle=2.5)
        b.js(EXPAND)
        time.sleep(1.2)
        onpage = b.js(ROW) or {}
        print("  reformulation row", json.dumps(onpage))
        check("row is active on its own page", onpage.get("active") is True)
finally:
    b.close()

print("\n%d failure(s)" % len(fails))
sys.exit(1 if fails else 0)
