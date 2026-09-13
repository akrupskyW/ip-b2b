#!/usr/bin/env python3
"""Clip the member's own campaign boards where they now ship.

Two frames: the painted work as it sits in the opening gallery, and the
painted-work follow-up on its own.

The turn is started from the welcome scorecard, the same door the probe uses.
Clicking a welcome intent chip instead does not play this campaign.

Usage: python3 scripts/_thinkwise_murals_shot.py [light|dark]
"""

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _cdp import Browser  # noqa: E402

THEME = (sys.argv[1] if len(sys.argv) > 1 else "light").lower()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "file://" + os.path.join(ROOT, "pages", "wiseai.html")
OUT = os.path.join(ROOT, "screenshots", "_diag")

BOARDS_ON_GRID = (
    "(function(){var h=document.querySelector('[id$=\"-messages\"]');"
    "if(!h)return 0;return Array.from(h.querySelectorAll('.sc-mgrid-item img'))"
    ".filter(function(i){return /\\/board-/.test(i.currentSrc||i.src||'')"
    " && i.naturalWidth>0}).length})()"
)


def wait(b, expr, want, secs):
    t0 = time.time()
    got = None
    while time.time() - t0 < secs:
        got = b.js(expr)
        if (got or 0) >= want:
            return got
        time.sleep(2.0)
    return got


def main():
    os.makedirs(OUT, exist_ok=True)
    b = Browser(width=1512, height=980, out=OUT)
    b.cmd("Runtime.disable")
    try:
        b.on_new_document(
            "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
            "localStorage.setItem('wise-authed','1');"
            "localStorage.setItem('wise-theme','%s');"
            "localStorage.setItem('chat-theme','%s');"
            "localStorage.setItem('wise:chat-ollama-on','0');}catch(e){}"
            % (THEME, THEME)
        )
        b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)
        # The welcome rail is built after first paint, and on a loaded machine
        # that takes a good deal longer than the settle. Wait for the card
        # rather than assuming a fixed delay was enough — an absent card meant
        # the tap hit nothing and the whole turn silently never played.
        CARD = ("(function(){"
                "var cards=Array.from(document.querySelectorAll("
                "'.sc-welcome .ws-scorecard'));"
                "var c=cards.find(function(x){"
                "return /leave the screen/i.test(x.getAttribute('aria-label')||'')});"
                "if(!c)return false;"
                "c.scrollIntoView({inline:'center',block:'nearest'});return true})()")
        t0 = time.time()
        found = False
        while time.time() - t0 < 180:
            found = b.js(CARD)
            if found:
                break
            time.sleep(2.0)
        print("  welcome card found:", found, "after %.0fs" % (time.time() - t0))
        time.sleep(0.8)
        b.js("(function(){"
             "var cards=Array.from(document.querySelectorAll('.sc-welcome .ws-scorecard'));"
             "var c=cards.find(function(x){"
             "return /leave the screen/i.test(x.getAttribute('aria-label')||'')});"
             "if(c)c.click();})()")

        got = wait(b, BOARDS_ON_GRID, 5, 240)
        print("  boards decoded on the gallery:", got)
        b.js("(function(){var h=document.querySelector('[id$=\"-messages\"]');"
             "var i=Array.from(h.querySelectorAll('.sc-mgrid-item img'))"
             ".find(function(x){return /\\/board-/.test(x.currentSrc||x.src||'')});"
             "if(i)i.closest('.sc-mgrid-item').scrollIntoView({block:'center'})})()")
        time.sleep(1.2)
        print("  shot", b.shot("thinkwise__boards-on-gallery__%s" % THEME))

        CHIPS = ("(function(){var h=document.querySelector('[id$=\"-messages\"]');"
                 "if(!h)return [];return Array.from(h.querySelectorAll("
                 "'.sc-inline-chips .chip')).map(function(x){"
                 "return (x.textContent||'').trim()})})()")
        t0 = time.time()
        labels = []
        while time.time() - t0 < 180:
            labels = b.js(CHIPS) or []
            if labels:
                break
            time.sleep(2.0)
        print("  closing chips:", labels)

        tapped = b.js("(function(){var h=document.querySelector('[id$=\"-messages\"]');"
                      "var c=Array.from(h.querySelectorAll('.sc-inline-chips .chip'))"
                      ".find(function(x){return /painted/i.test(x.textContent||'')});"
                      "if(c){c.scrollIntoView({block:'center'});c.click();return true}"
                      "return false})()")
        print("  tapped the painted-work chip:", tapped)
        if tapped:
            n = wait(b, "(function(){var g=document.getElementById('think-wise-murals');"
                        "if(!g)return 0;return Array.from(g.querySelectorAll('img'))"
                        ".filter(function(i){return i.naturalWidth>0}).length})()",
                     5, 240)
            print("  boards decoded on the follow-up:", n)
            b.js("(function(){var g=document.getElementById('think-wise-murals');"
                 "if(g)g.scrollIntoView({block:'center'})})()")
            time.sleep(1.2)
            print("  shot", b.shot("thinkwise__murals__%s" % THEME))
    finally:
        b.close()


if __name__ == "__main__":
    main()
