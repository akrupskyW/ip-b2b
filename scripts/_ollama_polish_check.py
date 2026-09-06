#!/usr/bin/env python3
"""Ollama polish check — is a scripted reply actually being rewritten, and does
threading the conversation into it change the opening?

Runs the same written reply three ways: cold (no conversation), threaded onto a
conversation that has already covered it, and threaded onto a different subject.
Prints all three so the difference is readable, and flags any number that moved.

  python3 scripts/_ollama_polish_check.py
"""

import json
import re
import time

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8765"

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

CANNED = (
    "<p><strong>Vegan Blueberry Mini Muffins</strong> is the weakest of your five "
    "claimed cookies and cakes — a <strong>WISEscore of 31</strong>, held down by "
    "<strong>18 g of added sugar</strong> per serving and a palm-oil debit.</p>"
    "<p>Two moves would clear it: cut added sugar to <strong>11 g</strong> to pass the "
    "40%-of-calories cap, and swap the palm oil. That lifts it to an estimated "
    "<strong>58</strong> and earns its first star.</p>"
)

PRIOR = [
    ("you", "Which of my claimed products score worst?"),
    ("wisecodeai", "Vegan Blueberry Mini Muffins sits at the bottom of your five claimed "
                   "products with a WISEscore of 31. Added sugar is the main drag."),
]

OTHER = [
    ("you", "How many organizations are on my account?"),
    ("wisecodeai", "You have 4 organizations, and 12 teammates across them."),
]


def nums(s):
    return re.findall(r"\d+(?:\.\d+)?", re.sub(r"<[^>]+>", " ", s or ""))


def run(page, prior, question):
    return page.evaluate(
        """async ([prior, question, canned]) => {
             const o = window.WiseOllama;
             o.forgetChatTurns('check');
             prior.forEach(([role, text]) => o.rememberChatTurn(role, text, 'check'));
             const ctx = (prior.length || question)
               ? { threadKey: 'check', question: question || '' }
               : undefined;
             const t0 = Date.now();
             const out = await o.refineReply(canned, ctx);
             return { out, ms: Date.now() - t0 };
           }""",
        [prior, question, CANNED],
    )


def show(title, res):
    out = res["out"]
    same = out.strip() == CANNED.strip()
    moved = sorted(set(nums(CANNED)) ^ set(nums(out)))
    print("\n--- %s  (%d ms) ---" % (title, res["ms"]))
    # Unchanged is not the same as rejected. With nothing to connect to, the
    # model usually hands the written copy straight back, which is the correct
    # outcome — there was nothing to say differently.
    print("changed: %s" % ("no — came back as written" if same else "yes"))
    if moved:
        print("!! numbers differ from the written copy: %s" % moved)
    print(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", out)).strip())


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context()
        ctx.add_init_script(INIT)
        page = ctx.new_page()
        page.goto(BASE + "/pages/wiseai.html", wait_until="load")
        time.sleep(2)
        print("model:", page.evaluate(
            """async () => JSON.stringify(await window.WiseOllama.probeOllama(true))"""))
        print("\n=== the written copy the app ships ===")
        print(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", CANNED)).strip())

        show("cold — no conversation", run(page, [], ""))
        show("threaded — the thread already covered this",
             run(page, PRIOR, "And what would it take to fix it?"))
        show("threaded — a different subject entirely",
             run(page, OTHER, "What about my worst product?"))
        browser.close()


main()
