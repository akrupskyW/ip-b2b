"""Verify the Reports step is a regular sixth dot with one download button
per product report — on view-product and add-product, both themes.
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from _cdp import Browser  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), "..", "screenshots", "_diag")
BASE = "http://127.0.0.1:8099/pages"

INSPECT = """(function(){
  var banner = document.querySelector('.nfp-ins-next');
  if (!banner) return JSON.stringify({ok:false, err:'no banner'});
  var dots = [].slice.call(banner.querySelectorAll('.nfp-ins-dot'));
  var icons = dots.filter(function(d){ return d.querySelector('.material-symbols-outlined'); });
  var special = banner.querySelectorAll('.nfp-ins-dot--reports').length;
  var btns = [].slice.call(banner.querySelectorAll('.nfp-ins-next-btn, .nfp-ins-next-actions .nfp-ins-next-btn'));
  return JSON.stringify({
    ok: true,
    eyebrow: (banner.querySelector('.nfp-ins-next-eyebrow')||{}).textContent || '',
    title: (banner.querySelector('.nfp-ins-next-title')||{}).textContent || '',
    dots: dots.length,
    dotsWithIcons: icons.length,
    specialReportsDots: special,
    labels: dots.map(function(d){ return d.getAttribute('aria-label'); }),
    buttons: btns.map(function(b){
      return {
        label: b.textContent.replace(/\\s+/g,' ').trim(),
        action: b.getAttribute('data-nfp'),
        arg: b.getAttribute('data-arg') || '',
        icon: ((b.querySelector('.material-symbols-outlined')||{}).textContent || '').trim()
      };
    })
  });
})()"""

CLIP = """(function(){
  var banner = document.querySelector('.nfp-ins-next');
  if (!banner) return 'null';
  var r = banner.getBoundingClientRect();
  return JSON.stringify({x:Math.max(0,r.left-8), y:Math.max(0,r.top-8),
    w:r.width+16, h:r.height+16});
})()"""


def auth(theme):
    return (
        "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
        "localStorage.setItem('wise-authed','1');"
        "localStorage.setItem('wise-theme','%s');"
        "localStorage.setItem('chat-theme','%s');"
        "localStorage.setItem('wise-walkthrough', JSON.stringify({v:1,completed:true,dismissed:true}));"
        "}catch(e){}" % (theme, theme)
    )


def clip_shot(b, name):
    box = json.loads(b.js(CLIP))
    if not box:
        print("  no clip for", name)
        return None
    r = b.cmd("Page.captureScreenshot", {"format": "png", "clip": {
        "x": box["x"], "y": box["y"], "width": box["w"], "height": box["h"],
        "scale": 2}})
    path = os.path.join(OUT, name + ".png")
    import base64
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(r["result"]["data"]))
    print("  shot", path)
    return path


def run_page(page, theme, port):
    url = BASE + "/" + page
    dl = os.path.join(OUT, "_dl")
    os.makedirs(dl, exist_ok=True)
    b = Browser(port=port, width=1500, height=1100, out=OUT)
    try:
        b.on_new_document(auth(theme))
        try:
            b.cmd("Page.setDownloadBehavior", {
                "behavior": "allow", "downloadPath": os.path.abspath(dl)})
        except Exception as e:
            print("  download behavior:", e)
        b.goto(url, ready="!!document.querySelector('.nfp-ins-next')", settle=2.2)
        rest = json.loads(b.js(INSPECT))
        print(page, theme, "rest", rest)
        clip_shot(b, "reports-dot__%s__%s__rest" % (page.replace(".html", ""), theme))
        clicked = b.click_sel('.nfp-ins-dot[data-arg="5"]')
        print("  click last dot", clicked)
        time.sleep(0.6)
        reports = json.loads(b.js(INSPECT))
        print(page, theme, "reports", reports)
        clip_shot(b, "reports-dot__%s__%s__reports" % (page.replace(".html", ""), theme))
        before = set(os.listdir(dl))
        b.click_sel('[data-nfp="nfp-download-report"][data-arg="details"]')
        time.sleep(0.8)
        after = set(os.listdir(dl))
        new_files = sorted(after - before)
        print("  downloads", new_files)
        return rest, reports, new_files
    finally:
        b.close()


def main():
    os.makedirs(OUT, exist_ok=True)
    fails = []
    port = 9411
    for page in ("view-product.html", "add-product.html"):
        for theme in ("light", "dark"):
            rest, reports, files = run_page(page, theme, port)
            port += 1
            if rest.get("dots") != 6:
                fails.append("%s %s rest dots=%s" % (page, theme, rest.get("dots")))
            if rest.get("dotsWithIcons") != 0 or rest.get("specialReportsDots") != 0:
                fails.append("%s %s rest still has a special reports glyph" % (page, theme))
            if reports.get("dots") != 6 or reports.get("dotsWithIcons") != 0:
                fails.append("%s %s reports dots not regular" % (page, theme))
            btns = reports.get("buttons") or []
            ids = [x.get("arg") for x in btns]
            labels = [x.get("label") for x in btns]
            icons = [x.get("icon") for x in btns]
            if ids != ["details", "upf", "gras", "insights"]:
                fails.append("%s %s buttons %s" % (page, theme, ids))
            if any(i != "download" for i in icons):
                fails.append("%s %s icons %s" % (page, theme, icons))
            if "Download reports" not in (reports.get("title") or ""):
                fails.append("%s %s title %s" % (page, theme, reports.get("title")))
            if theme == "light" and page == "view-product.html" and not files:
                fails.append("no file downloaded from Product Details Report")
            print("  labels", labels)
    if fails:
        print("FAIL")
        for f in fails:
            print(" -", f)
        sys.exit(1)
    print("OK")


if __name__ == "__main__":
    main()
