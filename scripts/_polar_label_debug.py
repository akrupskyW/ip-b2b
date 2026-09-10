"""What the polar chart's axis labels are actually doing.

Prints each label's angle, how far it was pushed out of the label ring, and its
measured box, plus any pair that still shares pixels.

  python3 scripts/_polar_label_debug.py [light|dark]
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
AUTH = ("try{localStorage.clear();"
        "localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,"
        "name:'Arthur Krupsky',email:'akrupsky@wisecode.ai',initials:'AK',"
        "at:new Date().toISOString()}));"
        "localStorage.setItem('wise-authed','1');"
        "localStorage.setItem('wise-theme','%s');"
        "localStorage.setItem('chat-theme','%s');"
        "localStorage.setItem('az-palette-open','0');}catch(e){}" % (THEME, THEME))

b = Browser(port=9451, width=1500, height=1100, out="/tmp/wise-shots")
b.cmd("Runtime.disable")
try:
    b.on_new_document(AUTH)
    b.goto("http://127.0.0.1:8099/pages/analytics-types.html",
           ready="!!document.querySelector('.dash-radar')", settle=6.0)
    b.js("(function(){var r=document.querySelector('.dash-radar');"
         "r.scrollIntoView({block:'center'});})()")
    time.sleep(3.0)
    print(json.dumps(json.loads(b.js(r"""(function(){
      var svg = document.querySelector('.dash-radar .pa-svg');
      if (!svg) return JSON.stringify({err:'no pa-svg', polar:
        (document.querySelector('.dash-radar')||{}).dataset});
      var out = [];
      svg.querySelectorAll('.pa-axis-label').forEach(function(t){
        var b = t.getBBox();
        out.push({ t: t.textContent.replace(/\s+/g,' ').trim().slice(0,26),
                   ang: t.dataset.paAng, out: t.dataset.paOut,
                   lines: t.childElementCount,
                   x: Math.round(b.x), y: Math.round(b.y),
                   w: Math.round(b.width), h: Math.round(b.height) });
      });
      return JSON.stringify({ viewBox: svg.getAttribute('viewBox'), labels: out });
    })()""")), indent=1))
finally:
    b.close()
