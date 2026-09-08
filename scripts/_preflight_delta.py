"""Which computed styles does Tailwind's preflight actually change on a page?

Loads the page twice — once with the CDN's preflight reset on, once off — and
reports only the properties that really differ. Lets the compensating CSS be
written from measurement instead of from a list of what preflight is rumoured
to do.

  python3 scripts/_preflight_delta.py <page>
"""
import json
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

PAGE = sys.argv[1] if len(sys.argv) > 1 else "product-comparison"
URL = "http://127.0.0.1:8765/pages/%s.html" % PAGE

AUTH = """
try {
  Object.defineProperty(window.screen, 'width', { get: function(){ return 1920; } });
} catch (e) {}
try {
  localStorage.setItem('wise-auth', JSON.stringify({
    loggedIn: true, name: 'Demo', email: 'd@x.com', initials: 'DU',
    at: new Date().toISOString()
  }));
  localStorage.setItem('wise-authed', '1');
  localStorage.setItem('wise-walkthrough', JSON.stringify({
    v: 1, completed: true, dismissed: true, doneSteps: ['*'],
    skippedGroups: [], screensSeen: { '*': true }, cursor: ''
  }));
  localStorage.setItem('wise-theme', 'light');
  localStorage.setItem('chat-theme', 'light');
} catch (e) {}
"""

# Sample one live element per tag preflight touches, and report the properties
# preflight is capable of changing.
PROPS = ["margin-top", "margin-bottom", "margin-left", "margin-right",
         "font-size", "font-weight", "line-height", "list-style-type",
         "border-top-width", "border-style", "box-sizing", "display",
         "vertical-align", "background-color", "text-decoration-line",
         "color", "border-collapse", "max-width", "height", "padding-left",
         "font-family", "cursor"]

DUMP = """(function(){
  var tags = ['body','h1','h2','h3','h4','p','ul','ol','li','blockquote','figure',
              'hr','pre','img','svg','video','canvas','button','input','select',
              'textarea','table','th','td','a','label','fieldset','legend','dl','dd'];
  var props = %s;
  var out = {};
  tags.forEach(function(t){
    var nodes = document.querySelectorAll(t);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var r = el.getBoundingClientRect();
      if (t !== 'body' && !(r.width > 0 || r.height > 0)) continue;   // visible only
      var cs = getComputedStyle(el);
      var rec = { _n: document.querySelectorAll(t).length };
      props.forEach(function(p){ rec[p] = cs.getPropertyValue(p); });
      out[t] = rec;
      break;
    }
  });
  return JSON.stringify(out);
})()""" % json.dumps(PROPS)

def snapshot(port):
    b = Browser(port=port, width=1600, height=1000, out="/tmp/wise-preflight")
    try:
        b.on_new_document(AUTH)
        b.goto(URL, ready="document.readyState==='complete'", timeout=45, settle=4.0)
        return json.loads(b.js(DUMP))
    finally:
        b.close()


def flip(on):
    """Toggle corePlugins.preflight in the page source."""
    p = "pages/%s.html" % PAGE
    s = open(p, encoding="utf-8").read()
    line = "      corePlugins: { preflight: false },\n"
    if on:
        s = s.replace(line, "")
    elif line not in s:
        s = s.replace("      darkMode: 'class',\n",
                      "      darkMode: 'class',\n" + line, 1)
    open(p, "w", encoding="utf-8").write(s)


flip(True)
on = snapshot(9411)
flip(False)
off = snapshot(9412)

print("preflight delta on %s.html  (ON -> OFF)" % PAGE)
any_diff = False
for tag in sorted(set(on) | set(off)):
    a, b_ = on.get(tag, {}), off.get(tag, {})
    diffs = [(p, a.get(p), b_.get(p)) for p in PROPS
             if p in a and p in b_ and a.get(p) != b_.get(p)]
    if not diffs:
        continue
    any_diff = True
    print("  <%s>  x%s" % (tag, a.get("_n")))
    for p, x, y in diffs:
        print("      %-22s %-26s -> %s" % (p, x, y))
if not any_diff:
    print("  no computed-style differences on any sampled element")
