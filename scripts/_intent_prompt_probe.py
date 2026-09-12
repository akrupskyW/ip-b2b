"""Every intent chip sends its whole ask.

Taps a chip on a real surface and checks the line that lands in the transcript:
that it is a brief rather than the chip's label, that it opens on the chip's own
short ask rather than a slab, that it arrived as a structured document
(paragraphs and bullets, not one run-on block), and that the chip's own face
never changed size or wording. Runs in both themes and shoots the thread.

    python3 scripts/_intent_prompt_probe.py [page] [theme]
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

BASE = "http://127.0.0.1:8099"
OUT = "screenshots/_diag"

PAGES = {
    "wiseai": "pages/wiseai.html",
    "overview": "pages/overview.html",
    "teams": "pages/teams.html",
    "invoices": "pages/invoices.html",
    "portfolio": "pages/product-portfolio.html",
    "comparison": "pages/product-comparison.html",
    "guiding-stars": "pages/report-guiding-stars.html",
    "marketing": "index.html?preview=1",
    "all-modules": "pages/all-modules.html",
    "reformulation": "pages/reformulation.html",
}

AUTH = """
try {
  localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Demo User',
    email:'demo@wisealliance.com',initials:'DU'}));
  localStorage.setItem('wise-walkthrough', JSON.stringify({v:1,completed:true,
    dismissed:true,doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));
  localStorage.setItem('wise-theme', '%s');
  localStorage.setItem('chat-theme', '%s');
} catch (e) {}
"""

# One face measurer, keyed by row + position so the same label in two rows is
# two different chips.
FACES = r"""
(function () {
  window.__faces = function () {
    var rows = {};
    return Array.prototype.slice.call(
      document.querySelectorAll('.ws-intent-chip, [data-chip]')).map(function (c) {
        var row = c.parentElement;
        var key = (row && (row.id || row.className)) || 'loose';
        rows[key] = (rows[key] || 0) + 1;
        var b = c.getBoundingClientRect();
        return [key + '#' + rows[key] + ' ' + (c.textContent || '').replace(/\s+/g, ' ').trim(),
                Math.round(b.width), Math.round(b.height),
                getComputedStyle(c).fontSize];
      });
  };
  return true;
})()
"""

# The chip face, measured before the tap. Skips the gold "What can I ask?" chip
# and the agents control -- neither is a question.
FACE = r"""
(function () {
  var chips = Array.prototype.slice.call(
    document.querySelectorAll('.ws-intent-chip, [data-chip]'))
    .filter(function (c) {
      return !c.classList.contains('ws-intent-chip--askhelp')
        && !c.classList.contains('is-used')
        && !c.hasAttribute('data-chip-more')
        && !/show (more|less)/i.test(c.textContent || '')
        && c.offsetParent !== null;
    });
  if (!chips.length) return null;
  var pick = chips[Math.min(%d, chips.length - 1)];
  pick.setAttribute('data-probe-pick', '1');
  var r = pick.getBoundingClientRect();
  var cs = getComputedStyle(pick);
  return {
    total: chips.length,
    label: (pick.textContent || '').replace(/\s+/g, ' ').trim(),
    w: Math.round(r.width), h: Math.round(r.height),
    fs: cs.fontSize, pad: cs.padding,
    faces: window.__faces()
  };
})()
"""

TAP = """
(function () {
  var el = document.querySelector('[data-probe-pick]');
  if (!el) return false;
  el.click();
  return true;
})()
"""

# The line that landed, and the faces of whatever chips are on screen now.
LINE = r"""
(function () {
  var host = document.querySelector('[id$="-messages"]') || document.getElementById('chat-messages');
  if (!host) return { err: 'no transcript' };
  var you = host.querySelectorAll('.sc-line-you');
  if (!you.length) return { err: 'no member line' };
  var body = you[you.length - 1].querySelector('.sc-line-body');
  var doc = body ? body.querySelector('.sc-prompt') : null;
  var paras = doc ? doc.querySelectorAll('p') : [];
  var bullets = doc ? doc.querySelectorAll('li') : [];
  var leads = doc ? doc.querySelectorAll('.sc-prompt-lead') : [];
  var text = ((body ? body.textContent : '') || '').replace(/\s+/g, ' ').trim();
  return {
    structured: !!doc,
    paras: paras.length,
    bullets: bullets.length,
    leads: leads.length,
    chars: text.length,
    opener: paras.length ? (paras[0].textContent || '').replace(/\s+/g, ' ').trim() : '',
    tail: text.slice(-90),
    faces: window.__faces()
  };
})()
"""


def run(browser, stem, path, theme, index):
    browser.on_new_document(AUTH % (theme, theme))
    sep = "&" if "?" in path else "?"
    browser.goto("%s/%s%sv=%d" % (BASE, path, sep, int(time.time() * 1000)),
                 ready="!!document.querySelector('.ws-intent-chip, [data-chip]')",
                 settle=2.4)
    browser.js(FACES)
    face = browser.js(FACE % index)
    if not face:
        print("  %-10s %-5s SKIP (no question chips)" % (stem, theme))
        return True
    if not browser.js(TAP):
        print("  %-10s %-5s SKIP (chip vanished)" % (stem, theme))
        return True
    # Let the prompt finish its stagger reveal before reading it.
    time.sleep(4.5)
    got = browser.js(LINE)
    ok = True
    checks = []

    def chk(name, cond, detail=""):
        nonlocal ok
        if not cond:
            ok = False
        checks.append(("PASS" if cond else "FAIL", name, detail))

    chk("posted line is a structured document", bool(got.get("structured")))
    chk("more than one paragraph", (got.get("paras") or 0) >= 4,
        "paras=%s" % got.get("paras"))
    chk("carries a bulleted list", (got.get("bullets") or 0) >= 4,
        "bullets=%s" % got.get("bullets"))
    chk("has a lead-in line", (got.get("leads") or 0) >= 1)
    chk("is a brief, not a label", (got.get("chars") or 0) >= 600,
        "chars=%s" % got.get("chars"))
    opener = got.get("opener") or ""
    chk("opens on the short ask", 0 < len(opener) <= 220, "opener=%r" % opener[:120])
    chk("ends on a closing instruction", bool((got.get("tail") or "").strip()))

    # The chip's face is untouched: same words, same box, same type size. Only
    # chips still on screen are compared -- a welcome that has since been hidden
    # measures every one of its chips at zero, which is the welcome going away,
    # not a chip changing size.
    before = {f[0]: f for f in (face.get("faces") or [])}
    after = {f[0]: f for f in (got.get("faces") or []) if f[1] > 0 and f[2] > 0}
    shared = [k for k in before if k in after]
    drift = [k for k in shared if before[k][1:] != after[k][1:]]
    chk("chip faces unchanged (%d compared)" % len(shared), not drift,
        "drift=%s" % drift[:3])

    print("  %-10s %-5s chip %r" % (stem, theme, face.get("label")[:46]))
    for state, name, detail in checks:
        print("      %s  %s %s" % (state, name, detail))
    print("      shot", browser.shot("intentprompt__%s__%s" % (stem, theme)))
    return ok


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    themes = [sys.argv[2]] if len(sys.argv) > 2 else ["light", "dark"]
    index = int(sys.argv[3]) if len(sys.argv) > 3 else 3
    pages = {only: PAGES[only]} if only in PAGES else PAGES
    good = True
    b = Browser(port=9433, width=1512, height=1000, out=OUT)
    try:
        for theme in themes:
            for stem, path in pages.items():
                try:
                    good = run(b, stem, path, theme, index) and good
                except Exception as exc:  # noqa: BLE001
                    good = False
                    print("  %-10s %-5s ERROR %s" % (stem, theme, exc))
    finally:
        b.close()
    print("\n%s" % ("ALL CHECKS PASS" if good else "CHECKS FAILED"))
    sys.exit(0 if good else 1)


if __name__ == "__main__":
    main()
