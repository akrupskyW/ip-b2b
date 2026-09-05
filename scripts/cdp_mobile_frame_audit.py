"""Mobile-frame responsiveness audit for pages/analytics-types.html.

Frames the report to the palette's Mobile preset, then walks every section in
the shared analytics catalog and reports, per card:

  * how far any descendant spills past the card's content box
  * pairs of sibling labels whose boxes actually overlap (the funnel failure)
  * whether the card's own scroller is overflowing

Then shoots each named card so the geometry numbers can be read against a
picture. Light and dark.

Usage:  python3 scripts/cdp_mobile_frame_audit.py [light|dark] [size] [card-substring ...]

`size` is a palette preset id: s (Mobile), m (Laptop), l (Desktop).
With no card arguments it audits every catalog section and shoots the ones
that report a problem.
"""
import json, socket, base64, struct, os, subprocess, time, urllib.request, sys

PORT = 9341
args = [a for a in sys.argv[1:]]
THEME = args.pop(0).lower() if args and args[0].lower() in ("light", "dark") else "light"
SIZE = args.pop(0).lower() if args and args[0].lower() in ("s", "m", "l") else "s"
WANT = args
URL = "http://localhost:8765/pages/analytics-types.html"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT = "/tmp/mfa_%s_%s" % (THEME, SIZE)

proc = subprocess.Popen(
    [CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
     "--window-size=1600,1150", "--remote-debugging-port=%d" % PORT, "about:blank"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def ws_connect(url):
    hostport, path = url[5:].split("/", 1)
    host, port = hostport.split(":")
    s = socket.create_connection((host, int(port)))
    key = base64.b64encode(os.urandom(16)).decode()
    s.sendall(("GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\n"
               "Connection: Upgrade\r\nSec-WebSocket-Key: %s\r\n"
               "Sec-WebSocket-Version: 13\r\n\r\n" % (path, hostport, key)).encode())
    resp = b""
    while b"\r\n\r\n" not in resp:
        resp += s.recv(4096)
    return s


def ws_send(s, data):
    payload = data.encode()
    hdr = bytearray([0x81])
    n = len(payload)
    mask = os.urandom(4)
    if n < 126:
        hdr.append(0x80 | n)
    elif n < 65536:
        hdr.append(0x80 | 126); hdr += struct.pack(">H", n)
    else:
        hdr.append(0x80 | 127); hdr += struct.pack(">Q", n)
    hdr += mask
    s.sendall(bytes(hdr) + bytes(b ^ mask[i % 4] for i, b in enumerate(payload)))


def ws_recv(s):
    def rd(n):
        b = b""
        while len(b) < n:
            c = s.recv(n - len(b))
            if not c:
                raise IOError("closed")
            b += c
        return b
    _b0, b1 = rd(2)
    ln = b1 & 0x7f
    if ln == 126:
        ln = struct.unpack(">H", rd(2))[0]
    elif ln == 127:
        ln = struct.unpack(">Q", rd(8))[0]
    return rd(ln).decode("utf-8", "replace")


target = None
for _ in range(60):
    try:
        data = json.load(urllib.request.urlopen("http://127.0.0.1:%d/json" % PORT))
        pages = [t for t in data if t.get("type") == "page"]
        if pages:
            target = pages[0]; break
    except Exception:
        pass
    time.sleep(0.2)
if not target:
    print("no target"); proc.terminate(); sys.exit(1)

ws = ws_connect(target["webSocketDebuggerUrl"])
_id = [0]


def cmd(method, params=None):
    _id[0] += 1
    mid = _id[0]
    ws_send(ws, json.dumps({"id": mid, "method": method, "params": params or {}}))
    while True:
        msg = json.loads(ws_recv(ws))
        if msg.get("id") == mid:
            return msg


def js(expr):
    r = cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
    res = r.get("result", {})
    if "exceptionDetails" in res:
        return "JS-ERROR: " + json.dumps(res["exceptionDetails"])[:500]
    return res.get("result", {}).get("value")


def shot(name):
    r = cmd("Page.captureScreenshot", {"format": "png"})
    path = "%s_%s.png" % (OUT, name)
    open(path, "wb").write(base64.b64decode(r["result"]["data"]))
    return path


cmd("Page.enable")
cmd("Runtime.enable")
cmd("Page.addScriptToEvaluateOnNewDocument", {"source": """
window.__errs=[];
addEventListener('error',e=>{__errs.push((e.message||'')+' @ '+(e.filename||'').split('/').pop()+':'+(e.lineno||''))});
addEventListener('unhandledrejection',e=>{__errs.push('promise: '+(e.reason&&e.reason.message||e.reason))});
try {
  localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Arthur Krupsky',
    email:'akrupsky@wisecode.ai',title:'Product Intelligence Lead',org:'WISE Foods',
    initials:'AK',at:new Date().toISOString()}));
  localStorage.setItem('wise-theme', %r);
  localStorage.setItem('chat-theme', %r);
  localStorage.setItem('wise-walkthrough', JSON.stringify({v:1,completed:true,dismissed:true,
    doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));
  localStorage.removeItem('az-palette-pos');
  localStorage.removeItem('az-chart-orient');
  localStorage.removeItem('az-funnel-orient');
  localStorage.removeItem('az-funnel-orient-claim');
  localStorage.removeItem('az-funnel-orient-cf');
  ['upf-view-cards','gras-view-cards','proc-view-cards','gras-prod-view-cards']
    .forEach(k=>localStorage.removeItem(k));
  localStorage.setItem('az-palette-open','0');
  localStorage.setItem('az-skinny-bars','0');
} catch (e) {}
""" % (THEME, THEME)})

cmd("Page.navigate", {"url": URL})
time.sleep(7.0)

js("document.querySelector('.azp-size[data-azp-size=\"%s\"]')"
   "&&document.getElementById('az-palette-launch').click()" % SIZE)
time.sleep(0.4)
js("document.querySelector('.azp-size[data-azp-size=\"%s\"]').click()" % SIZE)
time.sleep(2.5)
js("document.querySelector('.azp-close').click()")
time.sleep(0.6)

print("theme_dark:", js("document.documentElement.classList.contains('dark')"))
print("frame:", js("(function(){var d=document.querySelector('#agent-main-scroll .dash');"
                   "return d?Math.round(d.getBoundingClientRect().width):-1;})()"))
print("errors:", js("(window.__errs||[]).join(' || ')") or "(none)")

# The audit runs in the page: for each catalog section, find the widest spill
# past the card box and any two overlapping absolutely-placed labels.
AUDIT = r"""
(function(){
  const dash = document.querySelector('#agent-main-scroll .dash');
  if (!dash) return 'no-dash';
  const out = [];
  let seq = 0;
  document.querySelectorAll('#agent-main-scroll .att-card, #agent-main-scroll .dash-card, '
    + '#agent-main-scroll .dash-section, #agent-main-scroll .dash-donut-card').forEach((card) => {
    card.dataset.mfa = String(seq++);
    const cs = getComputedStyle(card);
    const r = card.getBoundingClientRect();
    const padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
    const box = { left: r.left + padL, right: r.right - padR };
    let spill = 0, who = '';
    card.querySelectorAll('*').forEach((el) => {
      if (el.offsetWidth === 0 && el.offsetHeight === 0) return;
      const es = getComputedStyle(el);
      // Hover popovers and pre-entrance frames are not on screen at rest.
      if (es.position === 'fixed') return;
      if (es.visibility === 'hidden' || es.opacity === '0' || es.display === 'none') return;
      if (el.closest('[style*="overflow"], .att-scroll, .atx-tbl-wrap, .upf-table-wrap')) return;
      const q = el.getBoundingClientRect();
      if (!q.width) return;
      const over = Math.max(q.right - box.right, box.left - q.left);
      if (over > spill) { spill = over; who = (el.className && el.className.toString
        ? el.className.toString().split(' ')[0] : el.tagName); }
    });
    // Overlapping labels: any two of these that actually intersect.
    const labs = Array.from(card.querySelectorAll(
      '.inf-label, .cf-label, .cf-drop, .pmx-xlabel span, .dash-seg-leg-info, .atx-white-lbl'));
    const hits = [];
    for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) {
      const a = labs[i].getBoundingClientRect(), b = labs[j].getBoundingClientRect();
      if (!a.width || !b.width) continue;
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 2 && oy > 2) hits.push((labs[i].textContent||'').trim().slice(0,18)
        + ' / ' + (labs[j].textContent||'').trim().slice(0,18));
    }
    const scrollers = [];
    card.querySelectorAll('.att-scroll, .atx-tbl-wrap, .upf-table-wrap').forEach((s) => {
      if (s.scrollWidth > s.clientWidth + 2) scrollers.push(Math.round(s.scrollWidth - s.clientWidth));
    });
    if (spill > 2 || hits.length || scrollers.length) {
      out.push({
        mfa: card.dataset.mfa,
        id: card.id || (card.className||'').toString().split(' ')[0],
        title: ((card.querySelector('.att-title, .dash-card-title, .dash-section-title')||{}).textContent||'').trim().slice(0,42),
        spill: Math.round(spill), who: who,
        overlaps: hits.length, sample: hits.slice(0,4),
        scrollBy: scrollers,
      });
    }
  });
  return JSON.stringify(out);
})()
"""

raw = js(AUDIT)
try:
    rows = json.loads(raw)
except Exception:
    print("audit failed:", raw); proc.terminate(); sys.exit(1)

if WANT:
    # Named cards are shot whether or not they report, so a clean result can be
    # eyeballed too; unnamed runs shoot only what the audit flagged.
    named = json.loads(js("""JSON.stringify(Array.from(
      document.querySelectorAll('#agent-main-scroll [data-mfa]')).map((c) => ({
        mfa: c.dataset.mfa,
        id: c.id || (c.className||'').toString().split(' ')[0],
        title: ((c.querySelector('.att-title, .dash-card-title, .dash-section-title')||{})
          .textContent||'').trim().slice(0,42),
      })))"""))
    by_mfa = {r["mfa"]: r for r in rows}
    rows = [dict(by_mfa.get(n["mfa"], {"spill": 0, "who": "", "overlaps": 0,
                                       "sample": [], "scrollBy": []}), **n)
            for n in named
            if any(w.lower() in (n["id"] + n["title"]).lower() for w in WANT)]

print("\n%-26s %-40s %6s %-22s %5s %s" % ("CARD", "TITLE", "SPILL", "WORST", "OVLP", "SCROLL"))
for r in rows:
    print("%-26s %-40s %6d %-22s %5d %s" % (
        r["id"][:26], r["title"][:40], r["spill"], r["who"][:22], r["overlaps"], r["scrollBy"]))
    for s in r["sample"]:
        print("      overlap: %s" % s)
print("\n%d card(s) reporting" % len(rows))

# Shoot each reporting card.
for i, r in enumerate(rows[:14]):
    ok = js("""(function(){
      var el = document.querySelector('[data-mfa="%s"]');
      if (!el) return false;
      var sc = document.getElementById('agent-main-scroll');
      var top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 12;
      sc.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
      return true;
    })()""" % r["mfa"])
    if ok is not True:
        continue
    time.sleep(2.8)   # entrance sweep replays on scroll-in, then the count-ups
    faded = js("""(function(){
      var el = document.querySelector('[data-mfa="%s"]');
      var out = [];
      el.querySelectorAll('.inf-label, .cf-label').forEach(function(l){
        var s = getComputedStyle(l), q = l.getBoundingClientRect();
        out.push('"' + (l.textContent||'').trim().slice(0,22) + '"'
          + ' op=' + s.opacity + ' col=' + s.color
          + ' pos=' + s.position
          + ' box=' + Math.round(q.width) + 'x' + Math.round(q.height));
      });
      return out.join('\\n      ');
    })()""" % r["mfa"])
    if faded:
        print("      " + faded)
    print("wrote", shot("%02d_%s" % (i, r["id"][:24].replace('#', ''))))

print("final_errors:", js("(window.__errs||[]).join(' || ')") or "(none)")
proc.terminate()
print("done")
