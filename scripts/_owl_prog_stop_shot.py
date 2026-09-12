import base64, os, sys, time
sys.path.insert(0, "scripts")
from _cdp import Browser

BASE = "http://127.0.0.1:8099"
OUT = "screenshots/_diag"
AUTH = """
try {
  localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Demo User',email:'demo@wisealliance.com',initials:'DU'}));
  localStorage.setItem('wise-theme', '%s');
  localStorage.setItem('chat-theme', '%s');
  if ('%s' === 'dark') { document.documentElement.classList.add('dark'); }
} catch (e) {}
"""

INJECT = r"""
(function(){
  var area = document.querySelector('.chat-messages-area, #chat-messages');
  if (!area || !window.WiseOwlProgression) return 'no-area';
  var line = document.createElement('div');
  line.className = 'sc-line sc-line-wise';
  var dark = document.documentElement.classList.contains('dark');
  line.style.cssText = 'position:fixed;left:0;right:0;top:80px;z-index:99999;padding:24px 40px;'
    + 'background:' + (dark ? '#0d1524' : '#ffffff') + ';box-shadow:0 20px 60px rgba(0,0,0,.35);';
  var body = document.createElement('div');
  body.className = 'sc-line-body';
  body.innerHTML = window.WiseOwlProgression.html();
  line.appendChild(body);
  area.appendChild(line);
  window.WiseOwlProgression.mount(document);
  var vp = line.querySelector('[data-owl-viewport]');
  if (vp) vp.scrollLeft = 0;
  return JSON.stringify(window.WiseOwlProgression.slides().map(function(s){return s.label;}));
})()
"""

RECT = r"""
(function(){
  var s = document.querySelector('.sc-owl-prog');
  if (!s) return null;
  var r = s.getBoundingClientRect();
  return {x:r.x, y:r.y, w:r.width, h:r.height};
})()
"""

b = Browser(port=9423, width=1440, height=1000, out=OUT)
try:
    for theme in ("light", "dark"):
        b.on_new_document(AUTH % (theme, theme, theme))
        b.goto("%s/pages/wiseai.html?v=%d" % (BASE, int(time.time()*1000)),
               ready="!!document.querySelector('.chat-messages-area, #chat-messages')",
               settle=2.5)
        print(theme, b.js(INJECT))
        time.sleep(2.5)
        rect = b.js(RECT)
        print(theme, "rect", rect)
        if rect:
            clip = {"x": max(rect["x"], 0), "y": max(rect["y"], 0),
                    "width": rect["w"], "height": rect["h"] + 20, "scale": 2}
            r = b.cmd("Page.captureScreenshot", {"format": "png", "clip": clip})
            p = os.path.join(OUT, "owl-prog-stop__%s.png" % theme)
            open(p, "wb").write(base64.b64decode(r["result"]["data"]))
            print("shot", p)
finally:
    b.close()
