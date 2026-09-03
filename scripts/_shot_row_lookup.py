"""Verify the owl on a parsed ingredient row: smaller bug, and a click that
opens the lookup in the chat AND expands the row's own match options.

Shoots View Product in light and dark, cropped to the Ingredients Analyzer.
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _cdp import Browser  # noqa: E402

BASE = "http://127.0.0.1:8765/pages/view-product.html"
OUT = "/tmp/wise-shots"

AUTH = """
try {
  localStorage.setItem('wise-auth', '1');
  localStorage.setItem('wise-signed-in', '1');
  localStorage.setItem('wise-user', JSON.stringify({name: 'Aey Kay', email: 'a@wisecode.ai'}));
} catch (e) {}
"""

THEME = {
    "light": "try{localStorage.setItem('wise-theme','light');localStorage.setItem('chat-theme','light');}catch(e){}"
             "document.addEventListener('DOMContentLoaded',function(){document.documentElement.classList.remove('dark');});",
    "dark": "try{localStorage.setItem('wise-theme','dark');localStorage.setItem('chat-theme','dark');}catch(e){}"
            "document.addEventListener('DOMContentLoaded',function(){document.documentElement.classList.add('dark');});",
}


def crop(b, selector, name, pad=8):
    """Screenshot clipped to an element (full-page metrics, device pixel 2)."""
    box = b.js(
        "(function(){var n=document.querySelector(%s);if(!n)return null;"
        "var r=n.getBoundingClientRect();"
        "return {x:r.left+window.scrollX,y:r.top+window.scrollY,w:r.width,h:r.height}})()"
        % json.dumps(selector))
    if not box:
        print("  !! no element for", selector)
        return None
    r = b.cmd("Page.captureScreenshot", {
        "format": "png",
        "captureBeyondViewport": True,
        "clip": {
            "x": max(0, box["x"] - pad), "y": max(0, box["y"] - pad),
            "width": box["w"] + pad * 2, "height": box["h"] + pad * 2, "scale": 2,
        },
    })
    import base64
    path = os.path.join(OUT, name + ".png")
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(r["result"]["data"]))
    print("  ->", path)
    return path


def run(theme):
    b = Browser(port=9351, width=1600, height=1100, out=OUT)
    try:
        b.on_new_document(AUTH + THEME[theme])
        b.goto(BASE, ready="!!document.querySelector('#ia-panel')", settle=3.0)

        # Run the analysis so the parsed rows (and their owls) exist.
        print(theme, "analyze:", b.click_sel('#nfp-ia-analyze-btn'))
        time.sleep(6.0)
        b.js("(function(){var s=document.querySelector('[data-ia-sec=\"parsed\"] .nfp-ia-head');"
             "if(s&&s.closest('.nfp-ia-sec').classList.contains('is-collapsed'))s.click();})()")
        time.sleep(1.2)

        owls = b.count('.nfp-ia-owl')
        owl_h = b.js("(function(){var n=document.querySelector('.nfp-ia-owl svg');"
                     "return n?Math.round(n.getBoundingClientRect().height*10)/10:null})()")
        print("  owls:", owls, "svg height:", owl_h)

        # Click the owl on the 3rd leaf row.
        ok = b.js("(function(){var o=document.querySelectorAll('.nfp-ia-owl');"
                  "if(o.length<3)return false;o[2].click();return true})()")
        print("  owl click:", ok)
        time.sleep(1.0)
        print("  panel cards:", b.count('.nfp-ia-lookup .sc-il-card'),
              "| more btn:", b.count('.nfp-ia-lookup-more'))
        crop(b, '.nfp-ia-lookup', 'rowlookup-%s-1-open' % theme, pad=10)
        crop(b, '#ia-panel', 'rowlookup-%s-2-panel' % theme)

        # Show more results from the row itself.
        print("  show more:", b.click_sel('.nfp-ia-lookup-more'))
        time.sleep(1.0)
        print("  panel cards after more:", b.count('.nfp-ia-lookup .sc-il-card'))

        # Wait for the chat trace to land its own copy, then compare.
        for _ in range(30):
            if b.count('.sc-line-body .sc-il-card'):
                break
            time.sleep(1.0)
        print("  chat cards:", b.count('.sc-line-body .sc-il-card'),
              "| track height:", b.js(
                  "(function(){var n=document.querySelector('.sc-line-body .dash-ws-health-track');"
                  "return n?Math.round(n.getBoundingClientRect().height*10)/10:null})()"))
        crop(b, '.nfp-ia-lookup', 'rowlookup-%s-3-more' % theme, pad=10)
        # The chat's own copy of the same options, so both bars can be compared.
        b.js("(function(){var l=document.querySelectorAll('.sc-line-wiseai');"
             "var t=l[l.length-1];if(t)t.scrollIntoView({block:'start'});})()")
        time.sleep(0.6)
        crop(b, '.sc-line-body:has(.sc-il-card)', 'rowlookup-%s-3c-chat' % theme, pad=10)
        # Same row, seen inside the scroller, so the owl's size reads in context.
        b.js("(function(){var r=document.querySelectorAll('.nfp-ia-parsed-row')[2];"
             "if(r)r.scrollIntoView({block:'start'});})()")
        time.sleep(0.6)
        crop(b, '#ia-panel', 'rowlookup-%s-3b-inpanel' % theme)

        # Pick a mapping on the ROW and confirm both surfaces settle.
        pick = b.js("(function(){var c=document.querySelectorAll('.nfp-ia-lookup .sc-il-card');"
                    "if(c.length<2)return false;c[1].click();return true})()")
        print("  row pick:", pick)
        time.sleep(2.0)
        print("  picked on row:", b.count('.nfp-ia-lookup .sc-il-card.is-picked'),
              "| dimmed:", b.count('.nfp-ia-lookup .sc-il-card.is-dim'),
              "| chat echo:", b.js(
                  "(function(){var y=document.querySelectorAll('.sc-line-you .sc-line-body');"
                  "return y.length?y[y.length-1].textContent.trim():null})()"))
        crop(b, '.nfp-ia-lookup', 'rowlookup-%s-4-picked' % theme, pad=10)

        # Owl again on the same row tucks the options away.
        b.js("(function(){var o=document.querySelectorAll('.nfp-ia-owl');if(o[2])o[2].click();})()")
        time.sleep(0.8)
        print("  after re-click, panel cards:", b.count('.nfp-ia-lookup .sc-il-card'))

        errs = b.js("window.__wiseErrs ? window.__wiseErrs.length : 0")
        print("  console errors tracked:", errs)
    finally:
        b.close()


if __name__ == '__main__':
    for t in (sys.argv[1:] or ['light', 'dark']):
        run(t)
