"""The two texts in the middle of the concentric-rings well.

Prints the measured box of the big number and the caption under it, and how
much of each other they hold.

  python3 scripts/_rings_label_debug.py [light|dark]
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

b = Browser(port=9452, width=1500, height=1100, out="/tmp/wise-shots")
b.cmd("Runtime.disable")
try:
    b.on_new_document(AUTH)
    b.goto("http://127.0.0.1:8099/pages/analytics-types.html",
           ready="!!document.querySelector('#atx-rings-card')", settle=6.0)
    b.js("(function(){document.querySelector('#atx-rings-card')"
         ".scrollIntoView({block:'center'});})()")
    time.sleep(3.0)
    print(json.dumps(json.loads(b.js(r"""(function(){
      var card = document.querySelector('#atx-rings-card');
      var svg = card && card.querySelector('.atx-rings-wrap svg');
      if (!svg) return JSON.stringify({err:'no svg'});
      var out = [];
      svg.querySelectorAll('text').forEach(function(t){
        var b = t.getBBox();
        var cs = getComputedStyle(t);
        out.push({ t: (t.textContent||'').trim(), cls: t.getAttribute('class'),
                   fs: cs.fontSize, y: t.getAttribute('y'),
                   box: [+b.x.toFixed(1), +b.y.toFixed(1),
                         +b.width.toFixed(1), +b.height.toFixed(1)] });
      });
      var ov = null;
      if (out.length > 1) {
        var a = out[0].box, c = out[1].box;
        ov = { w: +(Math.min(a[0]+a[2], c[0]+c[2]) - Math.max(a[0], c[0])).toFixed(1),
               h: +(Math.min(a[1]+a[3], c[1]+c[3]) - Math.max(a[1], c[1])).toFixed(1) };
      }
      return JSON.stringify({ texts: out, overlap: ov });
    })()""")), indent=1))
finally:
    b.close()
