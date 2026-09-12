"""NFP clicks must land in chat and keep the ingredient list congruent.

  python3 scripts/_nfp_chat_congruence_probe.py [page] [light|dark]
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

PAGE = sys.argv[1] if len(sys.argv) > 1 else "view-product"
THEME = sys.argv[2] if len(sys.argv) > 2 else "light"
URL = "http://127.0.0.1:8099/pages/%s.html" % PAGE
OUT = "screenshots/_diag"

fails = 0


def ok(cond, msg):
    global fails
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails += 1


SNAP = """(function(){
  var t = document.querySelector('#chat-messages, .chat-messages-area');
  var you = t ? [].slice.call(t.querySelectorAll('.sc-line-you .sc-line-body')).map(function(n){
    return (n.innerText || '').replace(/\\s+/g, ' ').trim();
  }) : [];
  var ai = t ? [].slice.call(t.querySelectorAll('.sc-line-wiseai:not(.sc-line-typing) .sc-line-body')).map(function(n){
    return (n.innerText || '').replace(/\\s+/g, ' ').trim();
  }) : [];
  var ia = document.getElementById('ia-panel');
  var iaOpen = !!(ia && !ia.hidden && ia.style.display !== 'none');
  return JSON.stringify({
    you: you,
    ai: ai,
    sel: document.querySelectorAll('.nfp-nf-row.is-nf-sel, .nfp-nf-cal-band.is-nf-sel').length,
    hits: document.querySelectorAll('.nfp-ia-parsed-row.is-nf-hit, .nfp-ia-nut-row.is-nf-hit').length,
    iaOpen: iaOpen,
    servings: (document.querySelector('[data-field$="servingsPer"]') || {}).textContent || '',
    err: window.__nfpProbeErr || ''
  });
})()"""


def snap(b):
    raw = b.js(SNAP)
    return json.loads(raw) if raw else {}


b = Browser(port=9381 if THEME == "dark" else 9380,
            width=1500, height=1050, out=OUT)
try:
    dark_js = "document.documentElement.classList.add('dark');" if THEME == "dark" else ""
    b.on_new_document(
        dark_js
        + "window.addEventListener('error',function(e){window.__nfpProbeErr=(e&&e.message)||'err'});"
        "try{localStorage.clear();"
        "localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,name:'Demo User',"
        "email:'demo@wisealliance.com',initials:'DU',at:new Date().toISOString()}));"
        "localStorage.setItem('wise-theme','" + THEME + "');"
        "localStorage.setItem('chat-theme','" + THEME + "');"
        "localStorage.setItem('wise-walkthrough',JSON.stringify({v:1,completed:true,"
        "dismissed:true,doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));"
        "}catch(e){}"
    )
    b.goto(URL, ready="!!document.querySelector('#nfp-body')", settle=2.4)
    ok(not b.js("window.__nfpProbeErr || ''"), "page loaded without a script error")

    if PAGE == "add-product":
        sample = b.click_sel('[data-action="sample"]')
        ok(sample, "tapped Show me an example")
        time.sleep(2.2)

    s0 = snap(b)
    you0 = len(s0.get("you") or [])

    pack = b.click_sel('[data-nfp="pick-pack"][data-arg="0"]')
    ok(pack, "clicked the first extra size")
    time.sleep(1.6)
    s1 = snap(b)
    you1 = " ".join(s1.get("you") or [])
    ai1 = " ".join(s1.get("ai") or [])
    ok(len(s1.get("you") or []) > you0, "size click posted a user line in chat")
    ok("3-Pack" in you1 or "3-pack" in you1 or "Show the" in you1,
       "user line names the size (%r)" % (s1.get("you") or [])[-1:])
    ok("3-Pack" in ai1 or "serving" in ai1.lower(),
       "assistant named the size or its servings")
    ok("3" in (s1.get("servings") or ""),
       "Nutrition Facts servings updated for the size (%r)" % s1.get("servings"))

    sodium = b.click_sel('[data-nfp="nf-inspect"][data-arg="sodium"]')
    ok(sodium, "clicked Sodium")
    time.sleep(1.8)
    s2 = snap(b)
    you2 = " ".join(s2.get("you") or [])
    ai2 = " ".join(s2.get("ai") or [])
    ok("Sodium" in you2 or "sodium" in you2, "chat picked up Sodium instantly")
    ok(s2.get("sel", 0) >= 1, "Sodium row is selected on the panel")
    ok(s2.get("iaOpen"), "ingredient list opened for the nutrient")
    ok(s2.get("hits", 0) >= 1, "ingredient / nutrient rows marked for Sodium (%s hits)" % s2.get("hits"))
    ok("Salt" in ai2 or "salt" in ai2.lower() or "Sodium" in ai2,
       "assistant tied Sodium to the list")

    wheat = b.click_sel('[data-nfp="inspect-allergen"][data-arg="Wheat"]')
    ok(wheat, "clicked the Wheat allergen")
    time.sleep(1.6)
    s3 = snap(b)
    you3 = " ".join(s3.get("you") or [])
    ok("Wheat" in you3, "chat picked up the Wheat allergen")

    name = "nfp-chat__%s__%s" % (PAGE, THEME)
    path = b.shot(name)
    print("  shot  " + path)
    print("  last you: %s" % (s3.get("you") or [""])[-1])
    print("  last ai:  %s" % ((s3.get("ai") or [""])[-1])[:180])

finally:
    b.close()

print("")
sys.exit(1 if fails else 0)
