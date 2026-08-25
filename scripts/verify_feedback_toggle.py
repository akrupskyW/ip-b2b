"""Check that on-page comments are gated by the locked Appearance row.

What this guards:

  * Switched off, the widget contributes nothing to the page — no launcher,
    no stylesheet, no pins, and C does not arm anything.
  * The Appearance ▸ Admin ▸ Comments row is locked shut for a visitor, shows
    a lock, and refuses to flip when clicked.
  * The owner (holding the feedback admin key) can flip it, and the widget
    appears and disappears immediately, without a reload.
  * The gate is site-wide: once the owner switches it on, an ordinary visitor
    in a different browser gets commenting too.

Run a static server on 8099 and the API on 8770, then:

    python3 scripts/verify_feedback_toggle.py
"""
import json
import os
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _cdp import Browser  # noqa: E402

STATIC = os.environ.get("WISE_STATIC", "http://localhost:8099")
API = os.environ.get("WISE_API", "http://127.0.0.1:8770")
KEY = os.environ.get("WISE_FEEDBACK_KEY", "devsecret")
PAGE = STATIC + "/pages/wiseai.html"
OUT = "/tmp/wise-feedback-shots"
ROW = "[data-comments]"

fails = []


def check(label, got, want):
    ok = got == want
    print("    %s %s: %r%s" % ("PASS" if ok else "FAIL", label, got,
                               "" if ok else " (expected %r)" % (want,)))
    if not ok:
        fails.append(label)


def set_enabled(on):
    """Set the gate straight through the API, as the owner."""
    req = urllib.request.Request(
        API + "/api/feedback/settings",
        data=json.dumps({"enabled": 1 if on else 0}).encode(),
        headers={"Content-Type": "application/json", "X-Feedback-Key": KEY})
    return json.load(urllib.request.urlopen(req))["enabled"]


def server_enabled():
    return json.load(urllib.request.urlopen(API + "/api/feedback/health"))["enabled"]


READY = "!!document.getElementById('topbar-appearance-btn')"


def run(theme):
    print("\n=== %s ===" % theme)
    set_enabled(False)
    b = Browser(port=9343, out=OUT)
    try:
        base = ("window.WISE_FEEDBACK_REMOTE=%s;"
                "try{localStorage.setItem('wise-theme',%s);localStorage.setItem('chat-theme',%s);"
                "localStorage.removeItem('wise-feedback-queue');"
                "localStorage.removeItem('wise-feedback-data');}catch(e){}"
                % (json.dumps(API), json.dumps(theme), json.dumps(theme)))
        if theme == "dark":
            base += ("document.addEventListener('DOMContentLoaded',function(){"
                     "document.documentElement.classList.add('dark')});")
        visitor = base + "try{localStorage.removeItem('wise-feedback-key')}catch(e){}"

        def open_popover():
            b.click_sel("#topbar-appearance-btn")
            time.sleep(0.8)

        def row(prop):
            return b.js("(function(){var n=document.querySelector('%s');if(!n)return null;"
                        "return %s})()" % (ROW, prop))

        # ── A visitor, comments off ───────────────────────────────────────
        print("  a visitor, with comments switched off")
        b.on_new_document(visitor)
        b.goto(PAGE, ready=READY, settle=3.0)
        check("no launcher", b.count(".wnote-fab"), 0)
        check("no stylesheet", b.count("#wnote-css"), 0)
        check("no pins", b.count(".wnote-pin"), 0)
        b.key("c", "KeyC", 67)
        time.sleep(0.5)
        check("C does not arm anything",
              b.js("document.documentElement.classList.contains('wnote-armed')"), False)

        open_popover()
        check("row is there", row("1"), 1)
        check("row reads off", row("n.getAttribute('aria-checked')"), "false")
        check("row is locked", row("n.classList.contains('is-locked')"), True)
        check("row shows a lock", row("!!n.querySelector('.wise-popover-lock')"), True)
        b.shot("toggle-01-visitor-locked-" + theme)

        b.click_sel(ROW)
        time.sleep(1.2)
        check("clicking it does nothing", server_enabled(), False)
        check("still no launcher", b.count(".wnote-fab"), 0)

        # ── The owner ─────────────────────────────────────────────────────
        print("  the owner, holding the feedback key")
        b.on_new_document(base)
        b.goto(PAGE + "?feedback=admin&key=" + KEY, ready=READY, settle=3.0)
        open_popover()
        check("row is unlocked", row("n.classList.contains('is-locked')"), False)
        check("no lock glyph for the owner", row("!!n.querySelector('.wise-popover-lock')"), False)
        b.shot("toggle-02-owner-unlocked-" + theme)

        print("  owner switches comments on")
        b.click_sel(ROW)
        time.sleep(2.5)
        check("server switched on", server_enabled(), True)
        check("row now reads on", row("n.getAttribute('aria-checked')"), "true")
        check("launcher appeared without a reload", b.count(".wnote-fab"), 1)
        check("stylesheet injected", b.count("#wnote-css"), 1)
        b.shot("toggle-03-owner-on-" + theme)

        b.click_sel("#topbar-appearance-btn")   # close the popover
        time.sleep(0.5)
        b.key("c", "KeyC", 67)
        time.sleep(0.5)
        check("C arms now",
              b.js("document.documentElement.classList.contains('wnote-armed')"), True)
        b.key("Escape", "Escape", 27)
        time.sleep(0.3)

        # ── A different visitor, now that it is on ────────────────────────
        print("  a visitor returns, now that it is on site-wide")
        b.on_new_document(visitor)
        b.goto(PAGE, ready=READY, settle=3.0)
        check("visitor gets the launcher", b.count(".wnote-fab"), 1)
        b.key("c", "KeyC", 67)
        time.sleep(0.5)
        check("and C works for them",
              b.js("document.documentElement.classList.contains('wnote-armed')"), True)
        b.key("Escape", "Escape", 27)
        time.sleep(0.3)
        open_popover()
        check("but their row is still locked", row("n.classList.contains('is-locked')"), True)
        check("showing on", row("n.getAttribute('aria-checked')"), "true")
        b.shot("toggle-04-visitor-on-locked-" + theme)

        # ── Owner switches it back off ────────────────────────────────────
        print("  owner switches it back off")
        b.on_new_document(base)
        b.goto(PAGE + "?feedback=admin&key=" + KEY, ready=READY, settle=3.0)
        check("launcher present before", b.count(".wnote-fab"), 1)
        open_popover()
        b.click_sel(ROW)
        time.sleep(2.5)
        check("server switched off", server_enabled(), False)
        check("launcher torn down without a reload", b.count(".wnote-fab"), 0)
        check("stylesheet removed", b.count("#wnote-css"), 0)
        check("row reads off", row("n.getAttribute('aria-checked')"), "false")
        b.shot("toggle-05-owner-off-" + theme)

        print("  js errors:", b.js("(window.__errs||[]).join(' || ') || 'none'"))
    finally:
        b.close()


for theme in ("light", "dark"):
    run(theme)

print("\n" + ("ALL CHECKS PASSED" if not fails else "FAILED: " + ", ".join(sorted(set(fails)))))
sys.exit(1 if fails else 0)
