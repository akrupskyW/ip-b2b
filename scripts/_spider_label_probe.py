"""Where the spider chart's axis labels actually land.

Drives the brands-by-UPF-label turn on wiseai.html, opens the chart output,
switches it to the spider view, and reports for every axis label: its text, its
painted box, and how far past the chart card's content box it spills. Also
dumps the label markup so a doubled render shows up as markup rather than a
guess about it.

  python3 scripts/_spider_label_probe.py [light|dark] [chatWidthPx]
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
ASK = "Break those brands down by WISEcode UPF label"

REPORT = r"""
(function(){
  var out = [];
  document.querySelectorAll('.wa-pane .cmp-radar-svg, .wa-pane .wa-radar-svg').forEach(function(svg){
    var card = svg.closest('.wa-chart-card') || svg.parentElement;
    var cs = getComputedStyle(card);
    var cr = card.getBoundingClientRect();
    var box = { left: cr.left + (parseFloat(cs.paddingLeft)||0),
                right: cr.right - (parseFloat(cs.paddingRight)||0) };
    var sr = svg.getBoundingClientRect();
    var labels = [];
    svg.querySelectorAll('.cmp-radar-label').forEach(function(t){
      var r = t.getBoundingClientRect();
      labels.push({
        text: t.textContent.replace(/\s+/g,' ').trim(),
        chars: t.getNumberOfChars ? t.getNumberOfChars() : -1,
        kids: t.children.length,
        html: t.outerHTML.slice(0, 220),
        w: Math.round(r.width), h: Math.round(r.height),
        outCard: Math.round(Math.max(r.right - box.right, box.left - r.left)),
        outSvg: Math.round(Math.max(r.right - sr.right, sr.left - r.left)),
        fs: getComputedStyle(t).fontSize
      });
    });
    out.push({ cardW: Math.round(cr.width), svgW: Math.round(sr.width),
               svgH: Math.round(sr.height), viewBox: svg.getAttribute('viewBox'),
               labels: labels });
  });
  return JSON.stringify(out);
})()
"""

b = Browser(port=9421 if THEME == "light" else 9422, width=1600, height=1050,
            out="/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag")
b.cmd("Runtime.disable")
try:
    b.on_new_document(
        "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
        "localStorage.setItem('wise-authed','1');"
        "localStorage.setItem('wise-theme','%s');"
        "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME)
    )
    b.goto(URL, ready="!!document.querySelector('.ws-intent-chip, .fl-input')", settle=3.0)
    print("dark:", b.js("document.documentElement.classList.contains('dark')"))

    b.js("(function(){var t=document.querySelector('.fl-input');t.focus();"
         "t.value=%s;t.dispatchEvent(new Event('input',{bubbles:true}));})()" % json.dumps(ASK))
    time.sleep(0.4)
    b.js("(function(){var s=document.querySelector('.sc-send');if(s)s.click();})()")

    # Let the whole turn play: prompt, trace, answer, outputs, chips.
    for _ in range(26):
        time.sleep(1.0)
        if b.js("document.querySelectorAll('.wa-pane-body .wa-block').length") >= 1:
            break
    time.sleep(6.0)
    print("blocks:", b.js("document.querySelectorAll('.wa-pane-body .wa-block').length"))

    # The member's tap is the only thing that opens an output, so wait for the
    # chip to land before tapping it — a tap into thin air proves nothing.
    for _ in range(30):
        if b.js("document.querySelectorAll('.sc-surface-card[data-surface]').length"):
            break
        time.sleep(1.0)
    b.js("(function(){var c=document.querySelector('.sc-surface-card[data-surface]');"
         "if(c)c.click();})()")
    for _ in range(15):
        time.sleep(1.0)
        if b.js("document.querySelectorAll('.wa-pane.is-open').length"):
            break
    time.sleep(2.5)
    print("panes open:", b.js(
        "JSON.stringify(Array.from(document.querySelectorAll('.wa-pane.is-open'))"
        ".map(function(p){return p.id}))"))
    print("chart types offered:", b.js(
        "JSON.stringify(Array.from(document.querySelectorAll('.wa-pane [data-wa-chart-type]'))"
        ".map(function(x){return x.getAttribute('data-wa-chart-type')}))"))

    hit = b.js("(function(){var n=document.querySelector("
               "'.wa-pane [data-wa-chart-type=\"radar\"]');if(!n)return false;"
               "n.click();return true})()")
    print("switched to spider:", hit)
    time.sleep(3.0)

    for card in json.loads(b.js(REPORT)):
        print("\ncard %spx · svg %sx%s · viewBox %s"
              % (card["cardW"], card["svgW"], card["svgH"], card["viewBox"]))
        for L in card["labels"]:
            print("  %-46s chars=%-3s kids=%s w=%-4s fs=%-5s outSvg=%-5s outCard=%s"
                  % (L["text"][:46], L["chars"], L["kids"], L["w"], L["fs"],
                     L["outSvg"], L["outCard"]))
            print("      " + L["html"])

    print("\n  shot " + b.shot("spider-labels__before__%s" % THEME))
finally:
    b.close()
