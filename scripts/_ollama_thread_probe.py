#!/usr/bin/env python3
"""Ollama thread probe — does a scripted answer read the conversation it lands in?

Taps real intent chips (so every turn takes the scripted-transcript path, not the
web-lookup one) and prints, for each turn: the written copy the app ships, what
actually painted, and the conversation memory the model was handed. A second
answer that re-introduces what the first one just covered is the failure this is
looking for.

  python3 scripts/_ollama_thread_probe.py [page] [turns]
"""

import re
import sys
import time

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8765"
PAGE = sys.argv[1] if len(sys.argv) > 1 else "pages/wiseai.html"
TURNS = int(sys.argv[2]) if len(sys.argv) > 2 else 3

# Same forced sign-in the repo's screenshot driver uses (screenshots/_shoot.py) —
# without it every page bounces straight to login.html.
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

LINES_JS = """() => Array.from(document.querySelectorAll(
    '.sc-line-you, .sc-line-wiseai:not(.sc-line-typing):not(.sc-line-trace)'))
  .map(n => {
    const b = n.querySelector('.sc-line-body') || n;
    const c = b.cloneNode(true);
    c.querySelectorAll('.sc-line-meta, .sc-fb, .sc-inline-chips').forEach(m => m.remove());
    const t = (c.textContent || '').replace(/\\s+/g, ' ').trim();
    return { who: n.classList.contains('sc-line-you') ? 'Member' : 'WISEcodeAI', text: t };
  })
  .filter(x => x.text)"""

MEM_JS = """() => {
  const o = window.WiseOllama;
  if (!o || !o.chatMemoryText) return '(no WiseOllama)';
  for (const k of ['sc1','sc2','sc3','sc4','product-portfolio','product-comparison',
                   'add-product','add-catalog','report-guiding-stars','default']) {
    const t = o.chatMemoryText(k);
    if (t) return '[' + k + ']\\n' + t;
  }
  return '(memory empty)';
}"""


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1600, "height": 1000})
        ctx.add_init_script(INIT)
        page = ctx.new_page()
        page.goto(BASE + "/" + PAGE, wait_until="load")
        time.sleep(3)

        print("model:", page.evaluate(
            """async () => JSON.stringify(await window.WiseOllama.probeOllama(true))"""))

        for turn in range(1, TURNS + 1):
            before = len(page.evaluate(LINES_JS))
            # Click through the DOM: later turns leave earlier chip rows sitting
            # under the transcript, so real hit-testing picks the wrong one.
            label = page.evaluate(
                """() => {
                     const rows = Array.from(document.querySelectorAll(
                       '.sc-reply-chips, .sc-inline-chips, .ws-chips, .gs-chips'))
                       .filter(r => r.offsetParent && r.querySelector('button'));
                     const row = rows[rows.length - 1];
                     if (!row) return '';
                     const chip = Array.from(row.querySelectorAll('button')).find(b => {
                       const t = (b.textContent || '').trim().toLowerCase();
                       // Skip chips that hand off to the OS instead of replying
                       // (file pickers, downloads) — nothing lands in the thread.
                       if (!t || t.includes('what can i ask')) return false;
                       return !/upload|download|choose a file|browse/.test(t);
                     });
                     if (!chip) return '';
                     const label = (chip.textContent || '').trim();
                     chip.click();
                     return label;
                   }"""
            )
            if not label:
                print("\n=== turn %d === no chip available, stopping" % turn)
                break
            print("\n=== turn %d === tapped chip: %s" % (turn, label))
            deadline = time.time() + 50
            while time.time() < deadline:
                if len(page.evaluate(LINES_JS)) > before + 1:
                    break
                time.sleep(0.25)
            time.sleep(4)  # let paragraphs + chips settle
            lines = page.evaluate(LINES_JS)
            for ln in lines[before:]:
                print("  %-11s %s" % (ln["who"] + ":", ln["text"][:420]))

        print("\n=== conversation memory handed to the model ===")
        print(page.evaluate(MEM_JS))
        browser.close()


main()
