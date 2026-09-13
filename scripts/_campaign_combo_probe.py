"""Drive the campaign in the thread and check separate combos + ear-marks.

Each campaign output that introduces itself should land as its own WISEcodeAI
chat, and the activity strip should give that chat its own gold ear-mark —
not one counted mark for the whole ask.
"""
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"

STATE = r"""
(function(){
  var host = document.querySelector('[id$="-messages"]');
  if (!host) return {};
  function shown(sel){
    return Array.from(host.querySelectorAll(sel)).filter(function(el){
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }
  var says = shown('p.sc-out--inline');
  var stamps = shown('.sc-out--inline[data-activity="output"]');
  var lines = stamps.map(function(el){ return el.closest('.sc-line-wiseai'); });
  var uniq = [];
  lines.forEach(function(l){ if (l && uniq.indexOf(l) < 0) uniq.push(l); });
  var ticks = Array.from(document.querySelectorAll('.wa-activity-tick--output'));
  return {
    mode: document.documentElement.getAttribute('data-output-mode'),
    says: says.map(function(p){ return p.textContent.replace(/\s+/g,' ').trim().slice(0, 72); }),
    sayCount: says.length,
    stamps: stamps.length,
    comboLines: uniq.length,
    ticks: ticks.length,
    counted: ticks.filter(function(t){ return t.classList.contains('wa-activity-tick--count'); }).length,
    tickTitles: ticks.map(function(t){ return (t.getAttribute('title') || '').trim(); }),
    films: shown('.sc-out--inline .sc-inline-film-media').length,
    galleries: shown('.sc-out--inline .sc-mgrid').length,
    open: ['wa-results','wa-visuals','wa-unified'].filter(function(id){
      var el = document.getElementById(id);
      return el && el.classList.contains('is-open');
    })
  };
})()
"""


fails = 0


def ok(cond, msg):
    global fails
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails += 1


def main():
    os.makedirs(OUT, exist_ok=True)
    b = Browser(width=1512, height=980, out=OUT)
    try:
        b.on_new_document(
            "window.__errs=[];addEventListener('error',function(e){"
            "__errs.push((e.message||'')+' @ '+(e.filename||'')+':'+(e.lineno||''))});"
            "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
            "localStorage.setItem('wise-authed','1');"
            "localStorage.setItem('wise-theme','%s');"
            "localStorage.setItem('chat-theme','%s');}catch(e){}"
            "document.documentElement.classList.toggle('dark', %s);"
            "try{Object.defineProperty(window,'matchMedia',{writable:true,value:function(q){"
            "var red=/prefers-reduced-motion:\\s*reduce/.test(q);"
            "return {matches:red,media:q,addListener:function(){},removeListener:function(){},"
            "addEventListener:function(){},removeEventListener:function(){},"
            "dispatchEvent:function(){return false;}};}});}catch(e){}"
            % (THEME, THEME, 'true' if THEME == 'dark' else 'false')
        )
        b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=2.0)
        ok(b.js("document.documentElement.getAttribute('data-output-mode')") == "inline",
           "a fresh load draws outputs in the thread")

        ok(b.js(
            "(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip'))"
            ".find(function(c){return /marketing campaign/i.test(c.textContent)});"
            "if(!n)return false;n.scrollIntoView({block:'center'});n.click();return true})()"
        ), "clicked Generate a marketing campaign")

        st = {}
        deadline = time.time() + 90.0
        while time.time() < deadline:
            time.sleep(1.0)
            st = b.js(STATE) or st
            print("  %4.0fs  says=%s stamps=%s lines=%s ticks=%s"
                  % (90.0 - (deadline - time.time()), st.get("sayCount"),
                     st.get("stamps"), st.get("comboLines"), st.get("ticks")))
            if (st.get("stamps") or 0) >= 4 and (st.get("films") or 0) >= 2:
                break

        print("  state", st)
        ok(st.get("sayCount") == 4, "WISEcodeAI introduces each output (got %s)" % st.get("sayCount"))
        ok(st.get("stamps") == 4, "each output is stamped (got %s)" % st.get("stamps"))
        ok(st.get("comboLines") == 4,
           "those intros sit in four separate chats (got %s)" % st.get("comboLines"))
        ok(st.get("ticks") == 4, "the strip draws four output ear-marks (got %s)" % st.get("ticks"))
        ok(st.get("counted") == 0,
           "none of them is a collapsed count (got %s)" % st.get("counted"))
        ok(st.get("galleries") == 2 and st.get("films") == 2,
           "both galleries and both spots are in the thread")
        ok(not st.get("open"), "nothing docked (%s)" % (st.get("open") or "none"))
        print("  says", st.get("says"))
        print("  ticks", st.get("tickTitles"))

        b.js(
            "(function(){var p=Array.from(document.querySelectorAll('p.sc-out--inline'))"
            ".find(function(n){return /collector set/i.test(n.textContent)});"
            "if(p)p.scrollIntoView({block:'center'});})()"
        )
        time.sleep(0.6)
        print("  shot", b.shot("campaign__combo-cards__%s" % THEME))

        b.js(
            "(function(){var p=Array.from(document.querySelectorAll('p.sc-out--inline'))"
            ".find(function(n){return /cut the set|spots/i.test(n.textContent)});"
            "if(p)p.scrollIntoView({block:'center'});})()"
        )
        time.sleep(0.5)
        print("  shot", b.shot("campaign__combo-films__%s" % THEME))

    finally:
        b.close()

    if fails:
        print("FAILED %s checks" % fails)
        sys.exit(1)
    print("ok")


if __name__ == "__main__":
    main()
