"""Shoot a page and diff it against a saved baseline.

Used to prove whether adding the Tailwind Play CDN (which ships preflight, a
global CSS reset) changes pages that were built without it.

  python3 scripts/_tw_pilot.py base <page> [light|dark]   # save baseline
  python3 scripts/_tw_pilot.py after <page> [light|dark]  # shoot + diff
"""
import os
import sys

from PIL import Image, ImageChops

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

MODE = sys.argv[1]
PAGE = sys.argv[2]
THEME = sys.argv[3] if len(sys.argv) > 3 else "light"
OUT = "screenshots/_diag/tw"
os.makedirs(OUT, exist_ok=True)

AUTH = """
try {
  Object.defineProperty(window.screen, 'width', { get: function(){ return 1920; } });
} catch (e) {}
try {
  localStorage.setItem('wise-auth', JSON.stringify({
    loggedIn: true, name: 'Demo', email: 'd@x.com', initials: 'DU',
    at: new Date().toISOString()
  }));
  localStorage.setItem('wise-authed', '1');
  localStorage.setItem('wise-walkthrough', JSON.stringify({
    v: 1, completed: true, dismissed: true, doneSteps: ['*'],
    skippedGroups: [], screensSeen: { '*': true }, cursor: ''
  }));
  localStorage.setItem('wise-theme', '%s');
  localStorage.setItem('chat-theme', '%s');
} catch (e) {}
""" % (THEME, THEME)

stem = "%s__%s" % (PAGE, THEME)
path = os.path.join(OUT, "%s__%s" % (stem, MODE))

b = Browser(port=9401, width=1600, height=1000, out=OUT)
try:
    b.on_new_document(AUTH)
    b.goto("http://127.0.0.1:8765/pages/%s.html" % PAGE,
           ready="document.readyState==='complete'", timeout=45, settle=4.0)
    shot = b.shot("%s__%s" % (stem, MODE))
    errs = b.js("JSON.stringify((window.__errs||[]).slice(0,4))")
    print("%s -> %s" % (MODE, shot))
    if errs and errs != "[]":
        print("  page errors: %s" % errs)
finally:
    b.close()

if MODE == "after":
    a = os.path.join(OUT, "%s__base.png" % stem)
    if not os.path.exists(a):
        print("  no baseline to diff")
        sys.exit(0)
    im1 = Image.open(a).convert("RGB")
    im2 = Image.open(os.path.join(OUT, "%s__after.png" % stem)).convert("RGB")
    if im1.size != im2.size:
        print("  size changed %s -> %s  (LAYOUT MOVED)" % (im1.size, im2.size))
        im2 = im2.resize(im1.size)
    diff = ImageChops.difference(im1, im2).convert("L")
    hist = diff.histogram()
    total = sum(hist)
    changed = sum(hist[9:])
    pct = 100.0 * changed / total
    print("  changed pixels: %d / %d  = %.2f%%" % (changed, total, pct))
    diff.point(lambda v: 255 if v > 8 else 0).save(
        os.path.join(OUT, "%s__diff.png" % stem))
    print("  diff mask: %s" % os.path.join(OUT, "%s__diff.png" % stem))
