"""Check who is who in a comment thread, and that closing one really closes it.

Three things this guards:

  * A note nobody categorised reads as a **Comment**, not a Question.
  * The owner answers as the owner. The reply box cannot inherit the name the
    browser last posted under, and the server stamps the identity, so a reply
    can never be mistaken for one from the person who raised the thread.
  * Only the owner can close a thread, and closing takes the pin off the page
    for everyone. The owner can still find it and reopen it.

Run a static server on 8099 and the API on 8770 (with WISE_FEEDBACK_OWNER set),
then:

    python3 scripts/verify_feedback_roles.py
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
OWNER = os.environ.get("WISE_FEEDBACK_OWNER", "AeyKay")
PAGE = STATIC + "/pages/wiseai.html"
OUT = "/tmp/wise-feedback-shots"

fails = []


def check(label, got, want):
    ok = got == want
    print("    %s %s: %r%s" % ("PASS" if ok else "FAIL", label, got,
                               "" if ok else " (expected %r)" % (want,)))
    if not ok:
        fails.append(label)


def api_enable():
    """Commenting is off until the owner switches it on, so open the gate
    before expecting any of the widget to exist."""
    req = urllib.request.Request(API + "/api/feedback/settings",
                                 data=json.dumps({"enabled": 1}).encode(),
                                 headers={"Content-Type": "application/json",
                                          "X-Feedback-Key": KEY})
    urllib.request.urlopen(req)


def api_wipe():
    api_enable()
    req = urllib.request.Request(API + "/api/feedback/comments/all",
                                 headers={"X-Feedback-Key": KEY})
    for row in json.load(urllib.request.urlopen(req)):
        drop = urllib.request.Request(API + "/api/feedback/comments/" + row["id"],
                                      headers={"X-Feedback-Key": KEY}, method="DELETE")
        try:
            urllib.request.urlopen(drop)
        except Exception:
            pass


READY = "!!(window.WiseFeedback && document.querySelector('.wnote-fab'))"


def run(theme):
    print("\n=== %s ===" % theme)
    api_wipe()
    b = Browser(port=9341, out=OUT)
    try:
        base = ("window.WISE_FEEDBACK_REMOTE=%s;"
                "try{localStorage.setItem('wise-theme',%s);localStorage.setItem('chat-theme',%s);"
                "localStorage.removeItem('wise-feedback-queue');"
                "localStorage.removeItem('wise-feedback-data');}catch(e){}"
                % (json.dumps(API), json.dumps(theme), json.dumps(theme)))
        if theme == "dark":
            base += ("document.addEventListener('DOMContentLoaded',function(){"
                     "document.documentElement.classList.add('dark')});")

        # ── As a reviewer, with no key ────────────────────────────────────
        print("  reviewer leaves a note without picking a category")
        b.on_new_document(base + "try{localStorage.removeItem('wise-feedback-key')}catch(e){}")
        b.goto(PAGE, ready=READY)
        check("not admin", b.js("WiseFeedback.isAdmin()"), False)

        b.key("c", "KeyC", 67)
        time.sleep(0.4)
        b.click(700, 300)
        time.sleep(0.7)
        check("first chip is Comment", b.text(".wnote-chips .wnote-chip"), "Comment")
        check("Comment is preselected",
              b.js("document.querySelector('.wnote-chip').getAttribute('aria-pressed')"), "true")
        check("reviewer gets a name field", b.count(".wnote-pop .wnote-in"), 1)
        b.fill(".wnote-pop .wnote-ta", "this is bogus!")
        b.fill(".wnote-pop .wnote-in", "Arthur")
        time.sleep(0.2)
        b.shot("roles-01-composer-" + theme)
        b.click_sel(".wnote-post")
        time.sleep(1.6)
        check("pin placed", b.count(".wnote-pin"), 1)

        b.js("(function(){var p=document.querySelectorAll('.wnote-pin');p[0].click()})()")
        time.sleep(0.8)
        check("headline reads Comment", b.text(".wnote-pop .wnote-title"), "Comment")
        check("no owner badge on the reviewer's note", b.count(".wnote-pop .wnote-badge"), 0)
        check("reviewer sees no Close", b.count(".wnote-resolve"), 0)
        check("reviewer sees no Delete", b.count(".wnote-del"), 0)
        b.shot("roles-02-reviewer-thread-" + theme)

        # ── As the owner ──────────────────────────────────────────────────
        print("  owner opens the same thread and answers")
        b.on_new_document(base)
        b.goto(PAGE + "?feedback=admin&key=" + KEY, ready=READY)
        check("admin", b.js("WiseFeedback.isAdmin()"), True)
        b.js("(function(){var p=document.querySelectorAll('.wnote-pin');p[0].click()})()")
        time.sleep(0.8)
        check("no name field for the owner", b.count(".wnote-pop .wnote-rname"), 0)
        # The badge sits in its own element with a flex gap, so textContent
        # runs the two together — assert on the parts, not the concatenation.
        check("owner told who they are", b.text(".wnote-pop .wnote-as strong"), OWNER)
        check("and badged as the owner", b.text(".wnote-pop .wnote-as .wnote-badge"), "Owner")
        check("owner sees Close thread", b.text(".wnote-resolve"), "Close thread")
        b.fill(".wnote-rta", "Fair — the number scale is wrong there. Fixing it today.")
        time.sleep(0.3)
        b.shot("roles-03-owner-replying-" + theme)
        b.click_sel(".wnote-send")
        time.sleep(1.6)
        check("reply posted", b.count(".wnote-reply"), 1)
        check("reply is signed by the owner, not Arthur",
              b.text(".wnote-reply .wnote-who"), OWNER)
        check("reply is badged Owner", b.count(".wnote-reply .wnote-badge"), 1)
        b.shot("roles-04-owner-replied-" + theme)

        # ── Closing ───────────────────────────────────────────────────────
        print("  owner closes the thread")
        b.click_sel(".wnote-resolve")
        time.sleep(1.5)
        check("pin gone from the page", b.count(".wnote-pin"), 0)
        check("launcher count hidden",
              b.js("getComputedStyle(document.querySelector('.wnote-count')).display"), "none")
        b.click_sel(".wnote-fab")
        time.sleep(0.8)
        check("owner still sees it, under Closed", b.text(".wnote-section"), "Closed · 1")
        check("nothing left open", b.count(".wnote-item:not(.is-resolved)"), 0)
        b.shot("roles-05-closed-panel-" + theme)

        print("  reviewer reloads")
        b.on_new_document(base + "try{localStorage.removeItem('wise-feedback-key')}catch(e){}")
        b.goto(PAGE, ready=READY)
        check("closed thread is invisible to the reviewer", b.count(".wnote-pin"), 0)
        b.click_sel(".wnote-fab")
        time.sleep(0.8)
        check("and absent from their panel too", b.count(".wnote-item"), 0)
        check("no Closed section for the reviewer", b.count(".wnote-section"), 0)
        b.shot("roles-06-reviewer-after-close-" + theme)

        print("  owner reopens it")
        b.on_new_document(base)
        b.goto(PAGE + "?feedback=admin&key=" + KEY, ready=READY)
        b.click_sel(".wnote-fab")
        time.sleep(0.6)
        b.click_sel(".wnote-item")
        time.sleep(0.8)
        check("closed thread has no reply box", b.count(".wnote-rta"), 0)
        check("offers Reopen", b.text(".wnote-resolve"), "Reopen")
        b.click_sel(".wnote-resolve")
        time.sleep(1.5)
        check("pin is back", b.count(".wnote-pin"), 1)

        print("  js errors:", b.js("(window.__errs||[]).join(' || ') || 'none'"))
    finally:
        b.close()


for theme in ("light", "dark"):
    run(theme)

print("\n" + ("ALL CHECKS PASSED" if not fails else "FAILED: " + ", ".join(sorted(set(fails)))))
sys.exit(1 if fails else 0)
