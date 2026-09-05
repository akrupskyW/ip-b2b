"""Outputs wait to be opened.

Drives one real turn on wiseai.html and checks two things the wiring cannot
prove on its own: that the turn's outputs land with every pane still shut and
the chat still the width it started at, and that tapping the transcript's
output card is what opens the module.

  python3 scripts/_output_open_probe.py [intent] [light|dark]
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
INTENT = sys.argv[1] if len(sys.argv) > 1 else "atlas"
THEME = sys.argv[2] if len(sys.argv) > 2 else "light"
TURN_S = float(sys.argv[3]) if len(sys.argv) > 3 else 28.0

STATE = """(function(){
  var open = ['wa-results','wa-visuals','wa-unified','wa-report'].filter(function(id){
    var el = document.getElementById(id);
    return el && el.classList.contains('is-open');
  });
  var chat = document.getElementById('wa-chat');
  var host = document.querySelector('[id$="-messages"]');
  return JSON.stringify({
    open: open,
    chatW: chat ? Math.round(chat.getBoundingClientRect().width) : 0,
    cards: host ? host.querySelectorAll('.sc-surface-card[data-surface]').length : 0,
    chips: host ? host.querySelectorAll('.sc-inline-chips .chip, .sc-reply-chips .chip').length : 0,
    blocks: document.querySelectorAll('.wa-pane-body .wa-block').length
  });
})()"""

fails = 0


def ok(cond, msg):
    global fails
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails += 1


b = Browser(port=9346 if THEME == "dark" else 9345,
            width=1600, height=1000, out="/tmp/wise-output-open")
# A turn is chatty, and this probe watches it for half a minute. Console events
# pile onto the devtools socket the whole time and Chrome eventually drops it.
# Nothing here reads events, only evaluate results, so stand the reporting down.
# Page stays enabled: on_new_document is a Page command, and disabling it seeds
# no theme and no auth — which is the other way a "dark" run shoots light.
b.cmd("Runtime.disable")
try:
    # Theme is set through the stored keys alone. At document-start there is no
    # documentElement yet, so adding the `dark` class here throws and takes the
    # rest of the script with it — which is how a "dark" run quietly shot light.
    b.on_new_document(
        "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
        "localStorage.setItem('wise-authed','1');"
        "localStorage.setItem('wise-theme','%s');"
        "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME)
    )
    b.goto(URL, ready="!!document.querySelector('.ws-intent-chip, .sc-composer')", settle=3.0)

    dark = b.js("document.documentElement.classList.contains('dark')")
    ok(bool(dark) == (THEME == "dark"), "the page loaded in %s mode" % THEME)
    before = json.loads(b.js(STATE))
    print("before the turn: %s" % before)

    clicked = b.js(
        "(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip'))"
        ".find(function(c){return /%s/i.test(c.textContent)});"
        "if(!n)return false;n.click();return true})()" % INTENT
    )
    if not clicked:
        raise SystemExit("no intent chip matched %r" % INTENT)

    # The whole turn in real wall-clock time: prompt, trace, answer, outputs,
    # chips. Polled every second — both to keep the devtools socket alive and so
    # a pane that opens mid-turn and closes again cannot slip past the check.
    deadline = time.time() + TURN_S
    peeked = set()
    after = before
    while time.time() < deadline:
        time.sleep(1.0)
        after = json.loads(b.js(STATE))
        print("  %4.0fs  open=%-12s chat=%-5s cards=%-3s blocks=%-3s chips=%s"
              % (TURN_S - (deadline - time.time()), after["open"] or "-",
                 after["chatW"], after["cards"], after["blocks"], after["chips"]))
        for k in after["open"]:
            peeked.add(k)
    print("after the turn:  %s\n" % after)
    print("The turn's outputs")
    ok(after["cards"] > 0, "the turn posted output cards (%d)" % after["cards"])
    ok(after["blocks"] > 0, "and wrote its blocks into the pane (%d)" % after["blocks"])
    ok(not peeked, "with every pane shut for the whole turn (opened: %s)"
       % (sorted(peeked) or "none"))
    ok(after["chatW"] == before["chatW"],
       "and the chat still %dpx wide, unresized (was %d)" % (after["chatW"], before["chatW"]))
    ok(after["chips"] > 0, "the turn closed on its intent chips (%d)" % after["chips"])
    shut = b.shot("output-shut__%s__%s" % (INTENT.split()[0].lower(), THEME))
    print("  shot " + shut)

    print("\nTapping the output card")
    b.js("(function(){var c=document.querySelector('.sc-surface-card[data-surface]');"
         "if(c)c.click();})()")
    time.sleep(2.5)
    opened = json.loads(b.js(STATE))
    print("after the tap:   %s" % opened)
    ok(opened["open"] != [], "opens the output module (%s)" % (opened["open"] or "none"))
    ok(opened["chatW"] < after["chatW"],
       "and only now does the chat dock to %dpx" % opened["chatW"])
    ok(b.js("!!document.querySelector('.wa-pane.is-open .wa-block canvas,"
            " .wa-pane.is-open .wa-block svg, .wa-pane.is-open .wa-block .wa-tbl')"),
       "with the output's charts and tables booted")
    print("  shot " + b.shot("output-open__%s__%s" % (INTENT.split()[0].lower(), THEME)))

    print("\n%d check(s) failed\n" % fails if fails else "\nall output-open checks passed\n")
finally:
    b.close()
sys.exit(1 if fails else 0)
