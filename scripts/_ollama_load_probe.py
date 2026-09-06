#!/usr/bin/env python3
"""Ollama load probe — shows what the local model costs a cold page load.

Loads a page and prints every request that reaches Ollama (proxy or direct)
with the millisecond it fired, plus how long after navigation the first
WISEcodeAI answer text actually painted.

  python3 scripts/_ollama_load_probe.py [--slow|--down] [page ...]

--slow holds every Ollama request open for 6s, standing in for a machine where
the model server is wedged or paging a model in. Load must not care.

--down answers the proxy with the 502 it returns when Ollama is not running at
all. That answer settles it, so there must be exactly one request: the direct
cross-origin hop would only be worth its timeout if the proxy were missing.
"""

import sys
import time

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8765"
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
SLOW = "--slow" in sys.argv[1:]
DOWN = "--down" in sys.argv[1:]
PAGES = ARGS or ["pages/wiseai.html"]

INIT = """
try {
  localStorage.setItem('wise-auth', JSON.stringify({
    loggedIn: true, name: 'Demo User', email: 'demo@wisealliance.com',
    title: 'Product Intelligence Lead', org: 'WISE Foods',
    initials: 'DU', at: new Date().toISOString()
  }));
  localStorage.setItem('wc_registration', JSON.stringify({
    name: 'Demo User', email: 'demo@wisealliance.com',
    title: 'Product Intelligence Lead', orgname: 'WISE Foods'
  }));
  localStorage.setItem('wise-walkthrough', JSON.stringify({
    v: 1, completed: true, dismissed: true, doneSteps: ['*'],
    skippedGroups: [], screensSeen: {'*': true}, cursor: ''
  }));
  localStorage.setItem('wise-theme', 'light');
  localStorage.setItem('chat-theme', 'light');
  localStorage.setItem('wise:chat-ollama-on', '1');
} catch (e) {}
"""

# Every milestone is stamped inside the page. Asking Playwright to poll for them
# would fold the driver's own latency into the result — and a route handler that
# stalls a request blocks that driver, which is exactly the case being measured.
STAMP = """
window.__wiseMarks = {};
(function () {
  function ready() {
    return !!document.querySelector('.sc-send, #chat-send')
        && !!document.querySelector('.ws-intent-chip, .sc-inline-chips .chip, .gs-chip');
  }
  function stamp() {
    if (window.__wiseMarks.ready || !ready()) return false;
    window.__wiseMarks.ready = Math.round(performance.now());
    return true;
  }
  if (!stamp()) {
    var mo = new MutationObserver(function () { if (stamp()) mo.disconnect(); });
    document.addEventListener('DOMContentLoaded', function () {
      mo.observe(document.documentElement, { childList: true, subtree: true });
    });
  }
})();
"""


def probe(page_path):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        ctx.add_init_script(INIT)
        ctx.add_init_script(STAMP)
        page = ctx.new_page()
        hits = []
        t0 = [0.0]

        if SLOW:
            def stall(route):
                time.sleep(6)
                route.continue_()
            ctx.route("**/__wise/ollama/**", stall)
            ctx.route("**://127.0.0.1:11434/**", stall)
        elif DOWN:
            ctx.route("**/__wise/ollama/**", lambda r: r.fulfill(
                status=502, content_type="application/json",
                body='{"ok":false,"error":"ollama unavailable"}'))

        def on_request(req):
            url = req.url
            if "ollama" in url or "11434" in url or "/__wise/web" in url:
                hits.append((round((time.time() - t0[0]) * 1000), "req", url))

        def on_response(res):
            url = res.url
            if "ollama" in url or "11434" in url or "/__wise/web" in url:
                hits.append((round((time.time() - t0[0]) * 1000), "res %s" % res.status, url))

        page.on("request", on_request)
        page.on("response", on_response)

        t0[0] = time.time()
        page.goto(BASE + "/" + page_path, wait_until="domcontentloaded")
        page.wait_for_load_state("load")
        time.sleep(10)

        marks = page.evaluate(
            """() => {
                 const n = performance.getEntriesByType('navigation')[0] || {};
                 // Resource timing, not the driver's own event stream: while this
                 // script sleeps, Playwright cannot dispatch request events, so
                 // its timestamps all pile up at the end of the sleep.
                 const ollama = performance.getEntriesByType('resource')
                   .filter(r => /ollama|11434/.test(r.name))
                   .map(r => ({ at: Math.round(r.startTime),
                                took: Math.round(r.duration),
                                url: r.name }));
                 return {
                   dcl: Math.round(n.domContentLoadedEventEnd || 0),
                   load: Math.round(n.loadEventEnd || 0),
                   ready: window.__wiseMarks.ready || null,
                   ollama,
                 };
               }"""
        )

        print("=== %s ===" % page_path)
        print("  DOMContentLoaded  %5d ms" % marks["dcl"])
        print("  load              %5d ms" % marks["load"])
        print("  composer + chips  %s"
              % ("%5d ms" % marks["ready"] if marks["ready"] else "not seen"))
        print("  ollama requests (page's own timing):")
        for r in marks["ollama"]:
            print("    %6d ms  (+%d ms)  %s" % (r["at"], r["took"], r["url"][:96]))
        browser.close()


for pg in PAGES:
    probe(pg)
