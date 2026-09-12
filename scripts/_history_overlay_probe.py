"""Drive the History module open at phone, tablet and desktop widths.

Prints, for each width and theme, the measured geometry of the docked History
sidebar next to the nav rail and the chat, plus the computed chrome that says
whether it is a complete card or the half-card that tucks under the chat: its
position, right margin, right border, corner radii and shadow.

On a phone History must pop OVER the page as a whole module — out of flow, its
right/top/bottom frame and border restored, the chat still full width beneath
it. On a tablet and up it stays the tucked flex sibling it has always been.

Usage:  python3 scripts/_history_overlay_probe.py [--page wiseai.html]
"""
import argparse
import json
import sys
import time

sys.path.insert(0, "scripts")
from _cdp import Browser  # noqa: E402

BASE = "http://127.0.0.1:8765"
WIDTHS = [("phone", 390, 844), ("phablet", 560, 900),
          ("tablet", 820, 1180), ("desktop", 1440, 900)]

MEASURE = r"""
(function () {
  function box(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y),
             w: Math.round(r.width), h: Math.round(r.height),
             right: Math.round(r.right), bottom: Math.round(r.bottom) };
  }
  var hist = document.querySelector('#modules-row .wch-sidebar.wch-docked:not(.wch-right)')
          || document.querySelector('.wch-sidebar:not(.wch-right)');
  var rail = document.getElementById('menu-panel');
  var chat = document.querySelector('#modules-row > .wa-chat')
          || document.querySelector('#modules-row > #chat-shell')
          || document.querySelector('#modules-row > #agent-main');
  var row = document.getElementById('modules-row');
  var cs = hist ? getComputedStyle(hist) : null;
  return {
    viewport: window.innerWidth,
    history: box(hist),
    historyClasses: hist ? hist.className : null,
    /* Not offsetParent: that is null for a `position: fixed` element, which
       is exactly what the phone overlay makes History. Measure the box. */
    historyShown: !!(hist && getComputedStyle(hist).display !== 'none'
                     && hist.getBoundingClientRect().width > 4),
    chrome: cs ? {
      position: cs.position,
      zIndex: cs.zIndex,
      marginRight: cs.marginRight,
      paddingRight: cs.paddingRight,
      borderRightWidth: cs.borderRightWidth,
      radii: [cs.borderTopLeftRadius, cs.borderTopRightRadius,
              cs.borderBottomRightRadius, cs.borderBottomLeftRadius].join(' '),
      shadow: cs.boxShadow === 'none' ? 'none' : 'set',
      alignSelf: cs.alignSelf
    } : null,
    rail: box(rail),
    chat: box(chat),
    row: box(row),
    rowScrollW: row ? Math.round(row.scrollWidth) : null,
    docScrollW: Math.round(document.documentElement.scrollWidth),
    htmlClasses: document.documentElement.className
  };
})()
"""

# The nav's History icon when the four-icon chrome is on, else History's own
# rail button. Whichever this surface shows is the member's way in.
OPEN_HISTORY = r"""
(function () {
  var el = document.getElementById('topbar-menu-toggle')
        || document.querySelector('#modules-row .wch-sidebar .wch-rail-btn');
  if (!el) return null;
  el.click();
  return el.id || el.className;
})()
"""


def auth(dark):
    """Init script for one case. Clears storage so a width tested earlier
    cannot leave History concealed (or expanded) for the next one."""
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
} catch (e) {}
document.documentElement.classList.%s("dark");
""" % (theme, theme, "add" if dark else "remove")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--page", default="wiseai.html")
    ap.add_argument("--out", default="screenshots/_diag")
    args = ap.parse_args()

    b = Browser(port=9379, width=1440, height=900, out=args.out)
    results = {}
    try:
        for theme_dark in (False, True):
            theme = "dark" if theme_dark else "light"
            b.on_new_document(auth(theme_dark))
            for name, w, h in WIDTHS:
                b.cmd("Emulation.setDeviceMetricsOverride",
                      {"width": w, "height": h, "deviceScaleFactor": 1,
                       "mobile": w <= 768})
                b.goto("%s/pages/%s?v=%d" % (BASE, args.page, int(time.time() * 1000)),
                       ready="!!document.querySelector('#menu-panel .menu-nav-item')",
                       settle=2.0, timeout=30)
                key = "%s__%s" % (name, theme)
                results[key + "__rest"] = b.js(MEASURE)
                clicked = b.js(OPEN_HISTORY)
                time.sleep(1.2)
                results[key + "__open"] = b.js(MEASURE)
                results[key + "__open"]["clicked"] = clicked
                b.shot("hist-overlay__%s__%s" % (name, theme))
    finally:
        b.close()

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
