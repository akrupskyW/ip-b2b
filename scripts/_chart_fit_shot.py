"""Clipped screenshots of a chart, for eyeballing what the fit probe measured.

  python3 scripts/_chart_fit_shot.py wiseai [light|dark] [mode] "[ask]"
      Plays one turn, opens the output, switches the chart to `mode`
      (columns / bars / stacked / radar / parallel, or "-" to leave it), and
      captures the chart card.

  python3 scripts/_chart_fit_shot.py atx [light|dark] [s|t|m|l] [card-substring]
      Frames analytics-types.html to a chart-size preset and captures the first
      card whose id or heading matches.

Writes to screenshots/_diag/.
"""
import base64
import json
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

WHICH = sys.argv[1] if len(sys.argv) > 1 else "wiseai"
THEME = sys.argv[2] if len(sys.argv) > 2 else "light"
ARG3 = sys.argv[3] if len(sys.argv) > 3 else "radar"
ARG4 = sys.argv[4] if len(sys.argv) > 4 else "Break those brands down by WISEcode UPF label"
HOST = "http://127.0.0.1:8099"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"

AUTH = ("try{localStorage.clear();"
        "localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,"
        "name:'Arthur Krupsky',email:'akrupsky@wisecode.ai',"
        "title:'Product Intelligence Lead',org:'WISE Foods',initials:'AK',"
        "at:new Date().toISOString()}));"
        "localStorage.setItem('wise-authed','1');"
        "localStorage.setItem('wise-theme','%s');"
        "localStorage.setItem('chat-theme','%s');"
        "localStorage.setItem('az-palette-open','0');"
        "localStorage.removeItem('az-palette-pos');"
        "localStorage.setItem('wise-walkthrough',JSON.stringify({v:1,completed:true,"
        "dismissed:true,doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},"
        "cursor:''}));}catch(e){}" % (THEME, THEME))


def clip(b, sel, name, pad=12):
    # A pane can hold several slides with only one of them painted, so take the
    # biggest match rather than the first.
    box = b.js("""(function(){
      var els=Array.from(document.querySelectorAll(%s));
      if(!els.length)return '';
      var el=els.sort(function(a,b){
        var ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
        return (rb.width*rb.height)-(ra.width*ra.height);
      })[0];
      var r=el.getBoundingClientRect();
      return JSON.stringify({x:Math.max(0,r.left-%d),y:Math.max(0,r.top-%d),
                             w:Math.min(r.width+%d, innerWidth),h:r.height+%d});})()"""
               % (json.dumps(sel), pad, pad, pad * 2, pad * 2))
    if not box:
        print("no element for", sel)
        return None
    box = json.loads(box)
    print("clip %s -> %dx%d" % (sel, box["w"], box["h"]))
    r = b.cmd("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True,
                                         "clip": {"x": box["x"], "y": box["y"],
                                                  "width": box["w"], "height": box["h"],
                                                  "scale": 1}})
    if "data" not in r.get("result", {}):
        print("shot failed for", sel)
        return None
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ".png")
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(r["result"]["data"]))
    print("wrote " + path)
    return path


if WHICH == "wiseai":
    MODE, ASK = ARG3, ARG4
    b = Browser(port=9441 if THEME == "light" else 9442, width=1600, height=1050,
                out="/tmp/wise-shots")
    b.cmd("Runtime.disable")
    try:
        b.on_new_document(AUTH)
        b.goto(HOST + "/pages/wiseai.html",
               ready="!!document.querySelector('.ws-intent-chip, .fl-input')", settle=3.0)
        b.js("(function(){var t=document.querySelector('.fl-input');t.focus();t.value=%s;"
             "t.dispatchEvent(new Event('input',{bubbles:true}));})()" % json.dumps(ASK))
        time.sleep(0.4)
        b.js("(function(){var s=document.querySelector('.sc-send');if(s)s.click();})()")
        for _ in range(30):
            time.sleep(1.0)
            if b.js("document.querySelectorAll('.sc-surface-card[data-surface]').length"):
                break
        b.js("(function(){var c=document.querySelector('.sc-surface-card[data-surface]');"
             "if(c)c.click();})()")
        for _ in range(15):
            time.sleep(1.0)
            if b.js("document.querySelectorAll('.wa-pane.is-open').length"):
                break
        time.sleep(2.5)
        print("panes open:", b.js(
            "JSON.stringify(Array.from(document.querySelectorAll('.wa-pane.is-open'))"
            ".map(function(p){return p.id}))"),
            "· chart cards:", b.js(
                "document.querySelectorAll('.wa-pane.is-open .wa-chart-card').length"),
            "· radars:", b.js(
                "document.querySelectorAll('.wa-pane.is-open .wa-radar-svg,"
                " .wa-pane.is-open .cmp-radar-svg').length"))
        # A turn can put several outputs in one pane, only one of them painted.
        # Step the pane's own next control until the chart is the one on screen.
        for _ in range(6):
            if b.js("(function(){var e=Array.from(document.querySelectorAll("
                    "'.wa-pane.is-open .wa-chart-card'));return e.some(function(c){"
                    "var r=c.getBoundingClientRect();return r.width>80&&r.height>80;})})()"):
                break
            stepped = b.js("(function(){var a=Array.from(document.querySelectorAll("
                           "'.wa-pane.is-open .wa-pane-nav-arrow')).filter(function(x){"
                           "return !x.disabled});var n=a[a.length-1];"
                           "if(!n)return false;n.click();return true})()")
            if not stepped:
                break
            time.sleep(2.0)
        if MODE and MODE != "-":
            b.js("(function(){var n=document.querySelector("
                 "'.wa-pane [data-wa-chart-type=\"%s\"]');if(n)n.click();})()" % MODE)
            time.sleep(3.0)
        clip(b, ".wa-pane.is-open .wa-chart-card",
             "chartfit__wiseai-%s__%s" % (MODE if MODE != "-" else "native", THEME))
    finally:
        b.close()

else:
    SIZE, WANT = ARG3, (sys.argv[4] if len(sys.argv) > 4 else "dash-radar")
    b = Browser(port=9443 if THEME == "light" else 9444, width=1900, height=1250,
                out="/tmp/wise-shots")
    b.cmd("Runtime.disable")
    try:
        b.on_new_document(AUTH)
        b.goto(HOST + "/pages/analytics-types.html",
               ready="document.querySelectorAll('.att-card, .attb-card').length > 4",
               settle=6.0)
        for _ in range(10):
            b.js("(function(){var n=document.getElementById('az-palette-launch');"
                 "if(n&&!n.hidden)n.click();})()")
            time.sleep(0.5)
            b.js("(function(){var n=document.querySelector"
                 "('.azp-size[data-azp-size=\"%s\"]');if(n)n.click();})()" % SIZE)
            time.sleep(1.5)
            if b.js("document.body.getAttribute('data-az-chart-size')") == SIZE:
                break
        b.js("(function(){var n=document.querySelector('.azp-close');if(n)n.click();})()")
        time.sleep(1.5)
        found = b.js("""(function(){
          var want=%s.toLowerCase();
          var cards=Array.from(document.querySelectorAll('.att-card,.dash-card,.attb-card'));
          var hit=cards.find(function(c){
            var h=c.querySelector('h1,h2,h3,h4');
            return (c.id+' '+(c.className||'')+' '+(h?h.textContent:'')).toLowerCase().indexOf(want)>=0
              || !!c.querySelector(want.indexOf('.')===0?want:'.'+want);
          });
          if(!hit) return '';
          hit.setAttribute('data-shot-target','1');
          var sc=document.getElementById('agent-main-scroll');
          var top=hit.getBoundingClientRect().top - sc.getBoundingClientRect().top
                  + sc.scrollTop - 40;
          sc.scrollTo({top:Math.max(0,top),behavior:'auto'});
          return hit.id || hit.className;
        })()""" % json.dumps(WANT))
        print("target:", found or "(none)")
        time.sleep(3.5)
        clip(b, "[data-shot-target]",
             "chartfit__atx-%s-%s__%s" % (WANT.replace('.', ''), SIZE, THEME))
    finally:
        b.close()
