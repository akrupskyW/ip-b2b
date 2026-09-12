"""Verify the Product Details "Close the pane" menu item + chat reopen chip."""
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

PAGE = sys.argv[1] if len(sys.argv) > 1 else "view-product"
THEME = sys.argv[2] if len(sys.argv) > 2 else "light"
URL = "http://127.0.0.1:8099/pages/%s.html" % PAGE

b = Browser(port=9391 if THEME == "dark" else 9390,
            width=1500, height=1000, out="screenshots/_diag")
try:
    b.on_new_document(
        "try{localStorage.clear();"
        "localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,name:'Demo User',"
        "email:'demo@wisealliance.com',initials:'DU',at:new Date().toISOString()}));"
        "localStorage.setItem('wise-theme','%s');"
        "localStorage.setItem('chat-theme','%s');"
        "localStorage.setItem('wise-walkthrough',JSON.stringify({v:1,completed:true,"
        "dismissed:true,doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));"
        "}catch(e){}" % (THEME, THEME)
    )
    b.goto(URL, ready="!!document.querySelector('#nfp-body')", settle=2.4)
    if PAGE == "add-product":
        b.click_sel('[data-action="sample"]')
        time.sleep(2.0)

    # Open the Product Details menu and confirm the item exists.
    b.click_sel('#nfp-menu-btn')
    time.sleep(0.6)
    has_item = b.js("!!document.querySelector('#nfp-close-pane-item')")
    b.shot("close-pane__%s__menu__%s" % (PAGE, THEME))
    print("  menu has 'Close the pane' =", has_item)

    # Click it — pane should hide, chat should widen.
    b.click_sel('#nfp-close-pane-item')
    time.sleep(1.6)
    closed = b.js("document.querySelector('#modules-row').classList.contains('nfp-pane-closed')")
    nfp_hidden = b.js("getComputedStyle(document.querySelector('#nfp-panel')).display === 'none'")
    chat_w = b.js("Math.round(document.querySelector('.ap-chat').getBoundingClientRect().width)")
    has_chip = b.js("!!document.querySelector('[data-action=\\'reopenPane\\']')")
    print("  closed=%s nfp_hidden=%s chat_w=%s reopenChip=%s" % (closed, nfp_hidden, chat_w, has_chip))
    b.shot("close-pane__%s__closed__%s" % (PAGE, THEME))

    # Tap the reopen chip — pane should come back.
    b.click_sel("[data-action='reopenPane']")
    time.sleep(1.6)
    reopened = b.js("!document.querySelector('#modules-row').classList.contains('nfp-pane-closed')")
    nfp_shown = b.js("getComputedStyle(document.querySelector('#nfp-panel')).display !== 'none'")
    print("  reopened=%s nfp_shown=%s" % (reopened, nfp_shown))
    b.shot("close-pane__%s__reopened__%s" % (PAGE, THEME))
finally:
    b.close()
