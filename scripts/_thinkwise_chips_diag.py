#!/usr/bin/env python3
"""Print the closing chip row of the Wise Walk turn, then tap the painted-work
chip and report what came back. Diagnostic only."""

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _cdp import Browser  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "file://" + os.path.join(ROOT, "pages", "wiseai.html")


def main():
    b = Browser(width=1512, height=980, out="/tmp/wise-shots")
    b.cmd("Runtime.disable")
    try:
        b.on_new_document(
            "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
            "localStorage.setItem('wise-authed','1');"
            "localStorage.setItem('wise-theme','light');"
            "localStorage.setItem('chat-theme','light');"
            "localStorage.setItem('wise:chat-ollama-on','0');}catch(e){}"
        )
        b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)
        print("REPLIES has thinkwise_murals:",
              b.js("!!(window.__wiseRepliesHas && window.__wiseRepliesHas('thinkwise_murals'))"))
        print("module exports muralsReply:",
              b.js("typeof (window.WiseThinkWise||{}).muralsReply"))
        print("murals cut length:",
              b.js("(function(){var m=(window.WiseThinkWise||{}).media||[];"
                   "return m.filter(function(x){return /^board-/.test(x.file)}).length})()"))

        b.js("(function(){var c=Array.from(document.querySelectorAll('.ws-intent-chip'))"
             ".find(function(x){return /wise walk campaign/i.test(x.textContent||'')});"
             "if(c)c.click();})()")

        LABELS = ("(function(){var h=document.querySelector('[id$=\"-messages\"]');"
                  "if(!h)return [];return Array.from(h.querySelectorAll("
                  "'.sc-inline-chips .chip,.sc-reply-chips .chip'))"
                  ".map(function(x){return (x.textContent||'').trim()})})()")
        for _ in range(120):
            labels = b.js(LABELS) or []
            if labels:
                break
            time.sleep(2.0)
        print("closing chips:", labels)

        hit = b.js("(function(){var h=document.querySelector('[id$=\"-messages\"]');"
                   "var c=Array.from(h.querySelectorAll('.sc-inline-chips .chip,"
                   ".sc-reply-chips .chip'))"
                   ".find(function(x){return /painted/i.test(x.textContent||'')});"
                   "if(c){c.scrollIntoView({block:'center'});c.click();return true}"
                   "return false})()")
        print("tapped painted chip:", hit)
        for _ in range(60):
            n = b.js("(function(){var g=document.getElementById('think-wise-murals');"
                     "return g?g.querySelectorAll('img').length:0})()")
            if (n or 0) > 0:
                break
            time.sleep(2.0)
        print("murals grid images:", n)
        print("page errors:", b.js("(window.__errs||[]).slice(0,5)"))
    finally:
        b.close()


if __name__ == "__main__":
    main()
