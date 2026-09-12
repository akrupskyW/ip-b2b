"""Drives a real ask through the Ask pre-flight buffer.

Types an ask that cannot be run as written, then checks the whole sequence: the
drafting card lands after the prompt (not on top of it), the questions replace
it, changing an answer re-prices the ask, Approve releases the turn into a
normal answer, and nothing opened a pane or resized the chat on the way.

Also checks the pink admin toggle: off, the same ask runs straight through.

Usage:  python3 scripts/_preflight_probe.py [light|dark]
"""
import base64
import json
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
OUT = "screenshots/_diag"

ASK = ("Compare every product in my portfolio against the competition and "
       "write me a full report with sources")

STATE = r"""
(function(){
  var host = document.querySelector('[id$="-messages"]');
  var card = host && host.querySelector('.sc-preflight');
  var chat = document.querySelector('.wa-chat, .sc-card');
  var num = function(k){
    var el = card && card.querySelector('[data-pf-est="' + k + '"]');
    return el ? el.textContent.trim() : null;
  };
  var on = function(q){
    var els = card ? card.querySelectorAll('[data-pf-q="' + q + '"].is-on') : [];
    return Array.prototype.map.call(els, function(e){ return e.dataset.pfO; });
  };
  return {
    card: !!card,
    drafting: !!(card && card.classList.contains('is-drafting')),
    asking: !!(card && !card.classList.contains('is-drafting')
               && !card.classList.contains('is-resolved')),
    approved: !!(card && card.classList.contains('is-approved')),
    stoodDown: !!(card && card.classList.contains('is-stood-down')),
    title: card ? (card.querySelector('.sc-pf-title') || {}).textContent : null,
    tokens: num('tokens'), cost: num('cost'), secs: num('secs'),
    scope: on('scope'), knowledge: on('knowledge'), depth: on('depth'),
    opts: card ? card.querySelectorAll('.sc-pf-opt').length : 0,
    /* Real answer lines — the pre-flight card is itself a WISEcodeAI line, so it
       does not count as the turn having been answered. */
    answers: host ? Array.prototype.filter.call(
      host.querySelectorAll('.sc-line-wiseai:not(.sc-line-typing)'),
      function (l) { return !l.querySelector('.sc-preflight'); }).length : 0,
    youLines: host ? host.querySelectorAll('.sc-line-you').length : 0,
    chips: host ? host.querySelectorAll('.sc-inline-chips .chip').length : 0,
    chipsLast: !!(host && host.lastElementChild
                  && host.lastElementChild.classList.contains('sc-inline-chips')),
    panesOpen: document.querySelectorAll('.wa-pane.is-open').length,
    chatW: chat ? Math.round(chat.getBoundingClientRect().width) : null,
    composer: (document.querySelector('textarea.fl-input') || {}).value || '',
    toggleOn: !!document.documentElement.classList.contains('chat-preflight'),
    menuRow: !!document.querySelector('[data-sc="preflight"] .sc-switch--pink'),
  };
})()
"""

SEND = r"""
(function(t){
  var el = document.querySelector('textarea.fl-input');
  if (!el) return false;
  el.focus();
  el.value = t;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  var btn = document.querySelector('.sc-send');
  if (!btn) return false;
  btn.click();
  return true;
})(%s)
"""

TAP = r"""
(function(sel){
  var host = document.querySelector('[id$="-messages"]');
  var el = host && host.querySelector(sel);
  if (!el) return false;
  el.click();
  return true;
})(%s)
"""


def clip(b, name, sel):
    """Shot of just one element, so the card reads at full size."""
    box = b.js(
        "(function(){var e=document.querySelector(%s);if(!e)return null;"
        "var r=e.getBoundingClientRect();return {x:r.left-14,y:r.top-14,"
        "w:r.width+28,h:r.height+28}})()" % json.dumps(sel))
    if not box:
        return b.shot(name)
    r = b.cmd("Page.captureScreenshot",
              {"format": "png", "captureBeyondViewport": True,
               "clip": {"x": max(0, box["x"]), "y": max(0, box["y"]),
                        "width": box["w"], "height": box["h"], "scale": 2}})
    path = os.path.join(OUT, name + ".png")
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(r["result"]["data"]))
    return path


def show(tag, st):
    print("%-14s %s" % (tag, json.dumps(st, sort_keys=True)))


b = Browser(port=9418, width=1512, height=1000, out=OUT)
fails = []
try:
    b.on_new_document(
        "try{localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,"
        "name:'Demo User',email:'demo@wisealliance.com',initials:'DU'}));"
        "localStorage.setItem('wise-walkthrough',JSON.stringify({v:1,completed:true,"
        "dismissed:true,doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));"
        "localStorage.setItem('wise-theme','%s');localStorage.setItem('chat-theme','%s');"
        "%s}catch(e){}"
        % (THEME, THEME, "document.documentElement.classList.add('dark');"
           if THEME == "dark" else ""))

    b.goto(URL, ready="!!document.querySelector('textarea.fl-input')", settle=2.6)
    rest = b.js(STATE)
    show("rest", rest)
    if not rest["toggleOn"]:
        fails.append("the pink Ask pre-flight toggle is not on by default")
    if not rest["menuRow"]:
        fails.append("no pink switch on the Ask pre-flight menu row")
    rest_w = rest["chatW"]

    print("send:", b.js(SEND % json.dumps(ASK)))
    # The drafting beat is short, so catch it while it is still on screen.
    time.sleep(0.45)
    draft = b.js(STATE)
    show("drafting", draft)
    if not draft["drafting"]:
        fails.append("never saw the drafting beat (card=%s)" % draft["card"])
    else:
        print(" shot", clip(b, "preflight__drafting__%s" % THEME, ".sc-preflight"))

    time.sleep(2.6)
    ask = b.js(STATE)
    show("asking", ask)
    if not ask["asking"]:
        fails.append("the questions never replaced the drafting card")
    if ask["opts"] != 9:
        fails.append("expected 9 options, got %s" % ask["opts"])
    if ask["scope"] != ["portfolio"]:
        fails.append("an explicit portfolio ask should preselect Whole portfolio, got %s"
                     % ask["scope"])
    if ask["depth"] != ["report"]:
        fails.append("a 'full report' ask should preselect Written report, got %s"
                     % ask["depth"])
    if len(ask["knowledge"] or []) != 3:
        fails.append("a 'with sources' ask should preselect all three sources, got %s"
                     % ask["knowledge"])
    if ask["answers"]:
        fails.append("an answer landed before Approve (%s lines)" % ask["answers"])
    if ask["panesOpen"]:
        fails.append("a pane opened during pre-flight")
    if ask["chatW"] != rest_w:
        fails.append("the chat resized during pre-flight (%s -> %s)" % (rest_w, ask["chatW"]))
    print(" shot", clip(b, "preflight__asking__%s" % THEME, ".sc-preflight"))

    before = (ask["tokens"], ask["cost"], ask["secs"])
    b.js(TAP % json.dumps('.sc-pf-opt[data-pf-q="scope"][data-pf-o="product"]'))
    time.sleep(1.9)
    cheap = b.js(STATE)
    show("scoped down", cheap)
    if cheap["scope"] != ["product"]:
        fails.append("tapping This product did not select it, got %s" % cheap["scope"])
    if (cheap["tokens"], cheap["cost"], cheap["secs"]) == before:
        fails.append("re-scoping the ask did not re-price it (%s)" % (before,))
    print(" shot", clip(b, "preflight__repriced__%s" % THEME, ".sc-preflight"))

    b.js(TAP % json.dumps('.sc-pf-go'))
    time.sleep(0.7)
    ok = b.js(STATE)
    show("approved", ok)
    if not ok["approved"]:
        fails.append("Approve did not stamp the card approved")
    print(" shot", clip(b, "preflight__approved__%s" % THEME, ".sc-preflight"))

    done = ok
    for _ in range(40):
        time.sleep(1.0)
        done = b.js(STATE)
        if done["answers"] >= 1 and done["chips"]:
            break
    show("answered", done)
    if done["answers"] < 1:
        fails.append("no answer landed after Approve")
    if not done["chips"] or not done["chipsLast"]:
        fails.append("the turn did not end on intent chips")
    if done["panesOpen"]:
        fails.append("an output pane opened on its own")
    if done["chatW"] != rest_w:
        fails.append("the chat resized on its own (%s -> %s)" % (rest_w, done["chatW"]))
    print(" shot", b.shot("preflight__answered__%s" % THEME))

    b.goto(URL, ready="!!document.querySelector('textarea.fl-input')", settle=2.4)
    b.js(SEND % json.dumps(ASK))
    time.sleep(2.8)
    b.js(TAP % json.dumps('.sc-pf-edit'))
    time.sleep(0.9)
    ed = b.js(STATE)
    show("edited", ed)
    if not ed["stoodDown"]:
        fails.append("Edit did not stand the card down")
    if ed["composer"] != ASK:
        fails.append("Edit did not put the ask back in the composer (%r)" % ed["composer"])
    if ed["answers"]:
        fails.append("Edit ran the ask anyway (%s answers)" % ed["answers"])
    if not ed["chipsLast"]:
        fails.append("Edit left the thread without chips to move on with")
    if ed["chips"] > 8:
        fails.append("Edit parked the whole welcome rail (%s chips) instead of a "
                     "scored follow-up row" % ed["chips"])
    print(" shot", clip(b, "preflight__edited__%s" % THEME, ".sc-preflight"))

    b.js("localStorage.setItem('wise:chat-preflight','0')")
    b.goto(URL, ready="!!document.querySelector('textarea.fl-input')", settle=2.4)
    off = b.js(STATE)
    if off["toggleOn"]:
        fails.append("a stored '0' did not turn the buffer off")
    b.js(SEND % json.dumps(ASK))
    time.sleep(3.4)
    ran = b.js(STATE)
    show("toggle off", ran)
    if ran["card"]:
        fails.append("the buffer still fired with the toggle off")
finally:
    b.close()

print()
if fails:
    print("FAIL (%d)" % len(fails))
    for f in fails:
        print("  \u00d7 " + f)
    sys.exit(1)
print("all Ask pre-flight checks passed (%s)" % THEME)
