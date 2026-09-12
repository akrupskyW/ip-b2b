"""Check the chat's mobile-view load defaults against a wider window.

In mobile view a fresh chat must open with the large overview cards collapsed
and the Helix dim and still. Wider than that, nothing changes: the cards open
where the host asked for them and the Helix runs the published Scene pose.

For each width and theme this prints the overview-cards state (root class, the
three-dot switch, whether the block is actually on screen), the opacity the
field resolved, and whether the strand MOVED — two canvas captures a beat
apart, identical only if the animation is genuinely frozen.

Also re-loads the phone with a stored Play and a stored opacity to confirm the
member's own choice still beats the tier.

Usage:  python3 scripts/_mobile_chat_defaults_probe.py
"""
import argparse
import json
import sys
import time

sys.path.insert(0, "scripts")
from _cdp import Browser  # noqa: E402

BASE = "http://127.0.0.1:8765"
WIDTHS = [("phone", 390, 844), ("tablet", 820, 1180), ("desktop", 1440, 900)]

STATE = r"""
(function () {
  var chat = document.querySelector('.wa-chat') || document.querySelector('#chat-shell');
  var root = document.querySelector('.sc-bganim-live') || chat;
  var cards = document.querySelector('.ws-scorecards-section');
  var sw = document.querySelector('[data-sc="toggle-cards"]');
  var range = document.querySelector('.sc-bganim-opacity');
  var val = document.querySelector('.sc-bganim-opacity-val');
  var pp = document.querySelector('.sc-bganim-pp');
  var canvas = document.querySelector('.sc-bganim-canvas');
  var shown = null;
  if (cards) {
    var r = cards.getBoundingClientRect();
    shown = !!(cards.offsetParent !== null && r.height > 4);
  }
  return {
    viewport: window.innerWidth,
    cardsHiddenClass: !!(chat && chat.classList.contains('sc-cards-hidden')),
    cardsSwitchOn: sw ? sw.classList.contains('is-on') : null,
    cardsAriaChecked: sw ? sw.getAttribute('aria-checked') : null,
    cardsOnScreen: shown,
    helixLive: !!(root && root.classList.contains('sc-bganim-live')),
    opacityValue: range ? range.value : null,
    opacityReadout: val ? val.textContent : null,
    ppPaused: pp ? pp.classList.contains('is-paused') : null,
    ppAria: pp ? pp.getAttribute('aria-pressed') : null,
    hasCanvas: !!canvas
  };
})()
"""

# Two frames a beat apart. A frozen field blits the same pixels every time, so
# identical captures mean the strand is genuinely still, not merely slow.
FRAME = r"""
(function () {
  var c = document.querySelector('.sc-bganim-canvas');
  if (!c || !c.width) return null;
  try { return c.toDataURL('image/png').length + ':' + c.toDataURL('image/png').slice(-160); }
  catch (e) { return 'err:' + e.message; }
})()
"""


def auth(dark, extra=""):
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
  %s
} catch (e) {}
document.documentElement.classList.%s("dark");
""" % (theme, theme, extra, "add" if dark else "remove")


def sample(b, key, results, shot=None):
    results[key] = b.js(STATE)
    a = b.js(FRAME)
    time.sleep(0.9)
    c = b.js(FRAME)
    results[key]["moved"] = (a != c) if (a and c and not str(a).startswith("err")) else None
    if shot:
        b.shot(shot)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--page", default="wiseai.html")
    ap.add_argument("--out", default="screenshots/_diag")
    args = ap.parse_args()

    b = Browser(port=9381, width=1440, height=900, out=args.out)
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
                       settle=3.0, timeout=30)
                sample(b, "%s__%s" % (name, theme), results,
                       shot="mobile-defaults__%s__%s" % (name, theme))

        # The member's own choices must still beat the tier, on a phone.
        b.on_new_document(auth(False, """
  localStorage.setItem("wise:chat-bg-anim-paused","0");
  localStorage.setItem("wise:chat-bg-anim-opacity","80");
  localStorage.setItem("wise-chat-history:wiseai-cards-hidden","0");
"""))
        b.cmd("Emulation.setDeviceMetricsOverride",
              {"width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": True})
        b.goto("%s/pages/%s?v=%d" % (BASE, args.page, int(time.time() * 1000)),
               ready="!!document.querySelector('#menu-panel .menu-nav-item')",
               settle=3.0, timeout=30)
        sample(b, "phone__member-overrides", results,
               shot="mobile-defaults__phone__member-overrides")
    finally:
        b.close()

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
