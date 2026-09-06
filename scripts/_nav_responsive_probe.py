"""Drive the primary navigation across phone, tablet and desktop widths.

Prints, for each width and theme, the measured geometry of #menu-panel and the
classes that decide its layout, then taps the nav's own expand control and
measures again. A left-side rail that stays a left-side rail shows up as a
panel whose left edge hugs the page and whose height fills the shell at every
width; a pivot that leaked through shows up as a panel as wide as the viewport.

Usage:  python3 scripts/_nav_responsive_probe.py [--pivot] [--page wiseai.html]
"""
import argparse
import json
import sys
import time

sys.path.insert(0, "scripts")
from _cdp import Browser  # noqa: E402

BASE = "http://127.0.0.1:8765"
WIDTHS = [("phone", 390, 844), ("phablet", 560, 900), ("tablet", 820, 1180),
          ("tablet-wide", 1024, 1180), ("desktop", 1440, 900)]

MEASURE = r"""
(function () {
  var p = document.getElementById('menu-panel');
  if (!p) return null;
  var r = p.getBoundingClientRect();
  var inner = p.querySelector('.menu-inner');
  var ir = inner ? inner.getBoundingClientRect() : null;
  var body = p.querySelector('.menu-panel-body');
  var br = body ? body.getBoundingClientRect() : null;
  var cs = getComputedStyle(p);
  var ics = inner ? getComputedStyle(inner) : null;
  var wrap = document.getElementById('chat-shell-wrap')
         || document.getElementById('agent-shell-wrap');
  var label = p.querySelector('.menu-nav-label');
  return {
    panel: { x: Math.round(r.x), y: Math.round(r.y),
             w: Math.round(r.width), h: Math.round(r.height) },
    inner: ir ? { w: Math.round(ir.width), h: Math.round(ir.height),
                  pad: ics.padding } : null,
    body: br ? { w: Math.round(br.width), h: Math.round(br.height),
                 vis: getComputedStyle(body).display } : null,
    position: cs.position,
    panelClasses: p.className,
    wrapClasses: wrap ? wrap.className : null,
    htmlClasses: document.documentElement.className,
    labelsVisible: !!(label && label.offsetParent),
    scrimOpen: !!document.querySelector('#mnav-scrim.is-open'),
    navItems: p.querySelectorAll('.menu-nav-item').length,
    viewport: window.innerWidth
  };
})()
"""


def auth(dark, pivot):
    """Init script for one case.

    Clears storage first: pivot writes preferences of its own (Minimal UI,
    Nav & History icons), and a Chrome session shares one origin across
    navigations, so without this a later case inherits an earlier one's nav
    state and the run reads as a bug that isn't there.
    """
    theme = "dark" if dark else "light"
    return r"""
try {
  localStorage.clear();
  localStorage.setItem("wise-auth", JSON.stringify({loggedIn:true,name:"Demo User",
    email:"demo@wisealliance.com",initials:"DU"}));
  localStorage.setItem("wise-walkthrough", JSON.stringify({v:1,completed:true,
    dismissed:true,doneSteps:["*"],skippedGroups:[],screensSeen:{"*":true},cursor:""}));
  localStorage.setItem("wise-theme","%s");
  localStorage.setItem("chat-theme","%s");
  localStorage.setItem("wise-menu-pivot","%s");
} catch (e) {}
document.documentElement.classList.%s("dark");
""" % (theme, theme, "1" if pivot else "0", "add" if dark else "remove")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pivot", action="store_true",
                    help="load with the pivot preference stored on")
    ap.add_argument("--page", default="wiseai.html")
    ap.add_argument("--out", default="screenshots/_diag")
    args = ap.parse_args()

    tag = "pivot" if args.pivot else "plain"
    b = Browser(port=9377, width=1440, height=900, out=args.out)
    results = {}
    try:
        for theme_dark in (False, True):
            theme = "dark" if theme_dark else "light"
            b.on_new_document(auth(theme_dark, args.pivot))
            for name, w, h in WIDTHS:
                b.cmd("Emulation.setDeviceMetricsOverride",
                      {"width": w, "height": h, "deviceScaleFactor": 1,
                       "mobile": w <= 768})
                b.goto("%s/pages/%s?v=%d" % (BASE, args.page, int(time.time() * 1000)),
                       ready="!!document.querySelector('#menu-panel .menu-nav-item')",
                       settle=2.0, timeout=30)
                key = "%s__%s__%s" % (tag, name, theme)
                results[key + "__collapsed"] = b.js(MEASURE)
                b.shot("nav-resp__%s__%s__%s__collapsed" % (tag, name, theme))

                # Tap the nav's own expand control, whichever one this mode shows.
                clicked = b.js(
                    "(function(){var el=document.querySelector("
                    "'#menu-panel .menu-modules-menu')"
                    "||document.getElementById('topbar-menu-toggle');"
                    "if(!el)return null;el.click();return el.className||el.id})()")
                time.sleep(1.2)
                results[key + "__expanded"] = b.js(MEASURE)
                results[key + "__expanded"]["clicked"] = clicked
                b.shot("nav-resp__%s__%s__%s__expanded" % (tag, name, theme))

        # Dragging a window between displays is the only thing allowed to
        # change which layouts the nav may take. With pivot stored on, it must
        # stand down on the way narrow and come back on the way wide — without
        # a reload, so the live tier watcher is what's under test.
        b.on_new_document(auth(False, True))
        b.cmd("Emulation.setDeviceMetricsOverride",
              {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
        b.goto("%s/pages/%s?v=%d" % (BASE, args.page, int(time.time() * 1000)),
               ready="!!document.querySelector('#menu-panel .menu-nav-item')",
               settle=2.0, timeout=30)
        for label, w, h in [("start-desktop", 1440, 900), ("to-tablet", 820, 1180),
                            ("to-phone", 390, 844), ("back-to-desktop", 1440, 900)]:
            b.cmd("Emulation.setDeviceMetricsOverride",
                  {"width": w, "height": h, "deviceScaleFactor": 1, "mobile": w <= 768})
            time.sleep(1.0)
            results["resize__" + label] = b.js(MEASURE)
            b.shot("nav-resp__resize__%s" % label)
    finally:
        b.close()

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
