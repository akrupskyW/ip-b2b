"""Clicking a food photo must open the product-photo modal."""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
URL = "http://127.0.0.1:8099/pages/view-product.html"
fails = 0


def ok(cond, msg):
    global fails
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails += 1


b = Browser(port=9386, width=1500, height=1050, out="screenshots/_diag")
try:
    dark_js = "document.documentElement.classList.add('dark');" if THEME == "dark" else ""
    b.on_new_document(
        dark_js
        + "try{localStorage.clear();"
        "localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,name:'Demo User',"
        "email:'demo@wisealliance.com',initials:'DU',at:new Date().toISOString()}));"
        "localStorage.setItem('wise-theme','" + THEME + "');"
        "localStorage.setItem('chat-theme','" + THEME + "');"
        "localStorage.setItem('wise-walkthrough',JSON.stringify({v:1,completed:true,"
        "dismissed:true,doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));"
        "}catch(e){}"
    )
    b.goto(URL, ready="!!document.querySelector('.nfp-fi-thumb-img')", settle=2.2)
    if THEME == "dark":
        b.js("document.documentElement.classList.add('dark')")

    clicked = b.js("""(function(){
      var img = document.querySelector('.nfp-fi-thumb--primary .nfp-fi-thumb-img, .nfp-fi-thumb.active .nfp-fi-thumb-img, .nfp-fi-thumb-img');
      if (!img) return 'no image';
      img.click();
      return 'clicked';
    })()""")
    ok(clicked == "clicked", "clicked the food image (%s)" % clicked)
    time.sleep(0.8)
    state = json.loads(b.js("""(function(){
      var m = document.getElementById('ap-photo-modal');
      return JSON.stringify({
        modal: !!(m && m.classList.contains('is-open')),
        title: m ? ((m.querySelector('#ap-photo-title') || {}).textContent || '') : '',
        you: (function(){var n=document.querySelectorAll('#chat-messages .sc-line-you .sc-line-body');return n.length?(n[n.length-1].innerText||'').replace(/\\s+/g,' ').trim():''})()
      });
    })()"""))
    ok(state.get("modal"), "photo update panel opened")
    ok("photo" in (state.get("title") or "").lower() or "Replace" in (state.get("title") or ""),
       "panel title is the photo editor (%r)" % state.get("title"))
    ok("photo" in (state.get("you") or "").lower(),
       "chat picked up the photo click (%r)" % state.get("you"))
    if THEME == "dark":
        b.js("document.documentElement.classList.add('dark')")
    path = b.shot("nfp-photo-click__view-product__%s" % THEME)
    print("  shot " + path)
    print("  state", state)
finally:
    b.close()

sys.exit(1 if fails else 0)
