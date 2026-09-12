"""Shoot Add / View Product after a Nutrition Facts click, both themes."""
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

PAGE = sys.argv[1] if len(sys.argv) > 1 else "view-product"
THEME = sys.argv[2] if len(sys.argv) > 2 else "light"
URL = "http://127.0.0.1:8099/pages/%s.html" % PAGE

b = Browser(port=9384 if THEME == "dark" else 9383,
            width=1500, height=1050, out="screenshots/_diag")
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
    b.goto(URL, ready="!!document.querySelector('#nfp-body')", settle=2.2)
    if PAGE == "add-product":
        b.click_sel('[data-action="sample"]')
        time.sleep(2.0)
    b.click_sel('[data-nfp="pick-pack"][data-arg="0"]')
    time.sleep(1.2)
    b.click_sel('[data-nfp="nf-inspect"][data-arg="sodium"]')
    time.sleep(1.8)
    if THEME == "dark":
        b.js("document.documentElement.classList.add('dark');"
             "try{localStorage.setItem('wise-theme','dark');localStorage.setItem('chat-theme','dark');}catch(e){}")
    else:
        b.js("document.documentElement.classList.remove('dark');")
    b.js("""(function(){
      var row = document.querySelector('[data-nfp="nf-inspect"][data-arg="sodium"]');
      if (row) row.scrollIntoView({block:'center'});
      var hit = document.querySelector('.nfp-ia-parsed-row.is-nf-hit');
      if (hit) hit.scrollIntoView({block:'nearest'});
      var chat = document.querySelector('#chat-messages');
      if (chat) chat.scrollTop = chat.scrollHeight;
    })()""")
    time.sleep(0.6)
    dark = b.js("document.documentElement.classList.contains('dark')")
    hits = b.js("document.querySelectorAll('.nfp-ia-parsed-row.is-nf-hit').length")
    sel = b.js('!!document.querySelector("[data-nfp=\\"nf-inspect\\"][data-arg=\\"sodium\\"].is-nf-sel")')
    print("  theme_dark=%s sel=%s hits=%s" % (dark, sel, hits))
    path = b.shot("nfp-chat-sodium__%s__%s" % (PAGE, THEME))
    print("  shot " + path)
finally:
    b.close()
