"""What is still wider than the output module once the module is narrowed.

Drives a turn on wiseai.html, opens the output module, pins it to a phone /
tablet / laptop width the way a drag does, walks every slide and reports
anything laid out wider than the module itself.

Overflow that a scroll container is holding (a heat matrix inside .atl-scroll,
a wide table inside its own scroll box) is NOT a finding — that is the
instrument's own minimum and the member can scroll it. A finding is content
that runs past the module with nothing to scroll it back, or a width floor
larger than the whole module.

  python3 scripts/_pane_narrow_probe.py [widths] [light|dark] [intents]

  python3 scripts/_pane_narrow_probe.py 380,700 light atlas,sweeteners
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
WIDTHS = [int(w) for w in (sys.argv[1].split(",") if len(sys.argv) > 1
                           else ["380", "700", "1000"])]
THEME = sys.argv[2] if len(sys.argv) > 2 else "light"

# Each turn that surfaces an output module: the chip to click, and how long the
# turn needs before its first output card lands.
INTENTS = {
    "atlas": "Intervention Atlas",
    "sweeteners": "Artificial sweeteners by PL",
    "topbrands": "Top 3 brands",
    "myfoods": "Super Ultra-Processed",
    "energy": "Energy drinks",
    "proteinbars": "protein-bar SKUs",
    "compare": "Compare",
}
WANT = (sys.argv[3].split(",") if len(sys.argv) > 3
        else ["atlas", "sweeteners", "topbrands", "myfoods", "energy", "proteinbars"])

PIN = """(function(w){
  var p = document.querySelector('.wa-pane.is-open');
  if (!p) return null;
  p.style.setProperty('flex', '0 0 ' + w + 'px', 'important');
  p.style.setProperty('width', w + 'px', 'important');
  p.style.setProperty('max-width', 'none', 'important');
  p.style.setProperty('min-width', '0', 'important');
  return p.id;
})(%d)"""

OVERFLOW = r"""
(function(){
  var body = document.querySelector('.wa-pane.is-open .wa-pane-body');
  if (!body) return null;
  var br = body.getBoundingClientRect();
  var slide = body.querySelector('.wa-block.is-active') || body;

  /* A scroll box between the element and the module means the module is not
     the thing being overflowed — the scroll box is, and that is its job. */
  function scrolled(el) {
    for (var n = el.parentElement; n && n !== body; n = n.parentElement) {
      var ox = getComputedStyle(n).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
    }
    return false;
  }

  var bad = [];
  Array.prototype.forEach.call(slide.querySelectorAll('*'), function (el) {
    var r = el.getBoundingClientRect();
    if (!r.width) return;
    var over = Math.round(r.right - br.right);
    var minw = Math.round(parseFloat(getComputedStyle(el).minWidth) || 0);
    var held = scrolled(el);
    var runs = over > 2 && !held;
    /* A floor bigger than the module is only a fault when nothing is holding
       it. Inside a scroll box it is the instrument's own legible minimum. */
    var floor = minw > br.width + 1 && !held;
    if (!runs && !floor) return;
    bad.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className || '').toString().slice(0, 46),
      w: Math.round(r.width), over: over, min: minw,
      why: runs ? (floor ? 'runs past, unheld floor' : 'runs past the module')
                : 'floor larger than the module, unheld'
    });
  });
  var title = slide.querySelector('.atl-panel-title, .wa-report-title, h3');
  return { bodyW: Math.round(br.width), scrollW: body.scrollWidth,
           title: title ? title.textContent.slice(0, 34) : '',
           bad: bad.slice(0, 10), total: bad.length };
})()
"""

NEXT = """(function(){
  var b = document.querySelector('.wa-pane.is-open [data-nav="next"]');
  if (!b) return false; b.click(); return true;
})()"""

SLIDES = "document.querySelectorAll('.wa-pane.is-open .wa-pane-body > .wa-block').length"


def main():
    findings = 0
    b = Browser(port=9391, width=1700, height=1050, out="/tmp/wise-narrow")
    b.cmd("Runtime.disable")
    try:
        b.on_new_document(
            "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
            "localStorage.setItem('wise-authed','1');"
            "localStorage.setItem('wise-theme','%s');"
            "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME))
        for key in WANT:
            key = key.strip()
            pattern = INTENTS.get(key)
            if not pattern:
                print("unknown intent " + key)
                continue
            print("\n### %s (%s) ###" % (key, THEME))
            b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)
            b.js("(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip'))"
                 ".find(function(c){return /%s/i.test(c.textContent)});if(n)n.click()})()"
                 % pattern)
            for _ in range(60):
                time.sleep(1.0)
                if b.js("!!document.querySelector('.sc-surface-card[data-surface]')"):
                    break
            time.sleep(9.0)
            b.js("(function(){var c=document.querySelector('.sc-surface-card[data-surface]');"
                 "if(c)c.click();})()")
            time.sleep(3.0)
            for w in WIDTHS:
                if not b.js(PIN % w):
                    print("  no open module")
                    break
                time.sleep(1.5)
                n = int(b.js(SLIDES) or 1)
                for i in range(n):
                    time.sleep(0.7)
                    r = b.js(OVERFLOW)
                    if not r:
                        break
                    head = "  %4dpx slide %-2d %-34s" % (w, i + 1, r["title"])
                    if not r["bad"]:
                        print(head + " ok")
                    else:
                        findings += r["total"]
                        print(head + " %d finding(s)" % r["total"])
                        for o in r["bad"]:
                            print("      %-6s %-46s w=%-5s over=%-5s min=%-5s %s"
                                  % (o["tag"], o["cls"], o["w"], o["over"], o["min"],
                                     o["why"]))
                    if not b.js(NEXT):
                        break
    finally:
        b.close()
    print("\n== %d finding(s) ==" % findings)
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
