"""Same row-lookup check on Add Product, which starts with no ingredient list:
load the sample, analyze, then click a row's owl.
"""
import base64
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _cdp import Browser  # noqa: E402

BASE = "http://127.0.0.1:8765/pages/add-product.html"
OUT = "/tmp/wise-shots"

AUTH = """
try {
  localStorage.setItem('wise-auth', '1');
  localStorage.setItem('wise-signed-in', '1');
  localStorage.setItem('wise-user', JSON.stringify({name: 'Aey Kay', email: 'a@wisecode.ai'}));
} catch (e) {}
"""

THEME = {
    "light": "try{localStorage.setItem('wise-theme','light');localStorage.setItem('chat-theme','light');}catch(e){}",
    "dark": "try{localStorage.setItem('wise-theme','dark');localStorage.setItem('chat-theme','dark');}catch(e){}"
            "document.addEventListener('DOMContentLoaded',function(){document.documentElement.classList.add('dark');});",
}


def crop(b, selector, name, pad=8):
    box = b.js(
        "(function(){var n=document.querySelector(%s);if(!n)return null;"
        "var r=n.getBoundingClientRect();"
        "return {x:r.left+window.scrollX,y:r.top+window.scrollY,w:r.width,h:r.height}})()"
        % json.dumps(selector))
    if not box:
        print("  !! no element for", selector)
        return None
    r = b.cmd("Page.captureScreenshot", {
        "format": "png", "captureBeyondViewport": True,
        "clip": {"x": max(0, box["x"] - pad), "y": max(0, box["y"] - pad),
                 "width": box["w"] + pad * 2, "height": box["h"] + pad * 2, "scale": 2},
    })
    path = os.path.join(OUT, name + ".png")
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(r["result"]["data"]))
    print("  ->", path)
    return path


def run(theme):
    b = Browser(port=9352, width=1600, height=1100, out=OUT)
    try:
        b.on_new_document(AUTH + THEME[theme])
        b.goto(BASE, ready="!!document.querySelector('.sc-composer, #ia-panel')", settle=3.0)

        # "Load a sample product" from the welcome chips fills the ingredient list.
        loaded = b.js("(function(){var c=document.querySelectorAll('[data-action=\"sample\"]');"
                      "if(!c.length)return false;c[0].click();return true})()")
        print(theme, "sample:", loaded)
        time.sleep(8.0)
        print("  analyze btn:", b.click_sel('#nfp-ia-analyze-btn'))
        time.sleep(7.0)
        b.js("(function(){var s=document.querySelector('[data-ia-sec=\"parsed\"] .nfp-ia-head');"
             "if(s&&s.closest('.nfp-ia-sec').classList.contains('is-collapsed'))s.click();})()")
        time.sleep(1.2)

        print("  owls:", b.count('.nfp-ia-owl'),
              "svg height:", b.js("(function(){var n=document.querySelector('.nfp-ia-owl svg');"
                                  "return n?Math.round(n.getBoundingClientRect().height*10)/10:null})()"))
        ok = b.js("(function(){var o=document.querySelectorAll('.nfp-ia-owl');"
                  "if(o.length<2)return false;o[1].click();return true})()")
        print("  owl click:", ok)
        time.sleep(1.4)
        print("  panel cards:", b.count('.nfp-ia-lookup .sc-il-card'),
              "| row marked:", b.count('.nfp-ia-parsed-row.is-lookup'))
        b.js("(function(){var r=document.querySelector('.nfp-ia-parsed-row.is-lookup');"
             "if(r)r.scrollIntoView({block:'start'});})()")
        time.sleep(0.6)
        crop(b, '#ia-panel', 'rowlookup-add-%s-panel' % theme)
        for _ in range(30):
            if b.count('.sc-line-body .sc-il-card'):
                break
            time.sleep(1.0)
        print("  chat cards:", b.count('.sc-line-body .sc-il-card'))
    finally:
        b.close()


if __name__ == '__main__':
    for t in (sys.argv[1:] or ['light', 'dark']):
        run(t)
