"""Composer gutter probe — is the composer the width of the transcript?

For every chat surface in the app this prints, per module, the left/right
inset of the transcript (.chat-messages-area) and of the composer rail
(.chat-input-rail), plus the content width each one ends up with. The two
insets must match; the two widths must match.

    python3 scripts/_composer_gutter_probe.py            # default 1440 viewport
    python3 scripts/_composer_gutter_probe.py 1024       # narrower
    python3 scripts/_composer_gutter_probe.py 1440 roomy # Compact spacing OFF

Needs a static server on 8765 (python3 dev_server.py).
"""
import json
import sys
import time

sys.path.insert(0, "scripts")
from _cdp import Browser  # noqa: E402

BASE = "http://127.0.0.1:8765"

PAGES = [
    ("wiseai", "pages/wiseai.html"),
    ("all-modules", "pages/all-modules.html"),
    ("add-product", "pages/add-product.html"),
    ("view-product", "pages/view-product.html"),
    ("add-catalog", "pages/add-catalog.html"),
    ("report-guiding-stars", "pages/report-guiding-stars.html"),
    ("product-comparison", "pages/product-comparison.html"),
    ("product-portfolio", "pages/product-portfolio.html"),
    ("reformulation", "pages/reformulation.html"),
    ("studio-ai", "pages/studio-ai.html"),
    ("ai-dashboard", "pages/ai-dashboard.html"),
    ("accessibility-review", "pages/accessibility-review.html"),
    ("progress-log", "pages/progress-log.html"),
    ("helix", "pages/helix.html"),
]

AUTH = """
try {
  localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Demo User',
    email:'demo@wisealliance.com',initials:'DU',at:new Date().toISOString()}));
  localStorage.setItem('wise-walkthrough', JSON.stringify({v:1,completed:true,
    dismissed:true,doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));
  localStorage.setItem('wise-theme','light');
  localStorage.setItem('chat-theme','light');
} catch (e) {}
"""

ROOMY = "try { localStorage.setItem('wise:chat-compact','0'); } catch (e) {}"

PROBE = r"""
(function () {
  function inset(el) {
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    return {
      l: Math.round(parseFloat(cs.paddingLeft)),
      r: Math.round(parseFloat(cs.paddingRight)),
      box: Math.round(r.width),
      inner: Math.round(r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)),
      x0: Math.round(r.left + parseFloat(cs.paddingLeft)),
      x1: Math.round(r.right - parseFloat(cs.paddingRight))
    };
  }
  var out = [];
  document.querySelectorAll('.chat-input-rail').forEach(function (rail, i) {
    if (!rail.offsetParent && getComputedStyle(rail).display === 'none') return;
    // The transcript that belongs to this rail: nearest common chat container.
    var host = rail.closest('.sc-card, .ap-chat, .rf-chat, .gs-chat, .wa-chat, .sa-chat, ' +
                            '.aid-chat, #chat-shell, .mi-tarch-chat, .wiseai-dock, .mkt-chat') || rail.parentElement;
    var msgs = host && host.querySelector('.chat-messages-area');
    if (!msgs) return;
    var a = inset(msgs), b = inset(rail);
    out.push({
      host: (host.id || host.className || '').toString().split(/\s+/).slice(0, 2).join('.'),
      transcript: a, composer: b,
      matchPad: a.l === b.l && a.r === b.r,
      matchEdges: a.x0 === b.x0 && a.x1 === b.x1
    });
  });
  return JSON.stringify(out);
})()
"""


def main():
    width = int(sys.argv[1]) if len(sys.argv) > 1 else 1440
    roomy = "roomy" in sys.argv[1:]
    print("viewport %d, Compact spacing %s\n" % (width, "OFF" if roomy else "ON"))
    b = Browser(port=9377, width=width, height=1000, out="/tmp/wise-gutter")
    bad = 0
    try:
        b.on_new_document(AUTH + (ROOMY if roomy else ""))
        for name, path in PAGES:
            try:
                b.goto("%s/%s?v=%d" % (BASE, path, int(time.time())),
                       ready="!!document.querySelector('.chat-input-rail')",
                       settle=1.4, timeout=25)
                rows = json.loads(b.js(PROBE) or "[]")
            except Exception as exc:  # noqa: BLE001
                print("%-22s ERROR %s" % (name, exc))
                continue
            if not rows:
                print("%-22s (no chat rail found)" % name)
                continue
            for row in rows:
                t, c = row["transcript"], row["composer"]
                ok = "OK  " if row["matchPad"] and row["matchEdges"] else "DRIFT"
                if ok == "DRIFT":
                    bad += 1
                print("%-22s %-18s %s  transcript %4d/%-4d w=%-5d   composer %4d/%-4d w=%-5d"
                      % (name, row["host"][:18], ok, t["l"], t["r"], t["inner"],
                         c["l"], c["r"], c["inner"]))
    finally:
        b.close()
    print("\n%d drifting composer(s)" % bad)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
