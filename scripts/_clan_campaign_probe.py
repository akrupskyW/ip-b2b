"""Drive the Protect Ya Plate campaign on wiseai.html.

Shoots the 7th overview card, plays the small intent chip, checks that the
three outputs land with the pane shut, then opens roster / documentary /
lookbook in the given theme.
"""
import os
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

URL = "http://127.0.0.1:8099/pages/wiseai.html"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"
THEME = sys.argv[1] if len(sys.argv) > 1 else "light"
WAIT_S = float(sys.argv[2]) if len(sys.argv) > 2 else 150.0

STATE = r"""
(function(){
  var host = document.querySelector('[id$="-messages"]');
  var cards = host ? Array.from(host.querySelectorAll('.sc-surface-card[data-surface]')) : [];
  var titles = cards.map(function(c){
    var t = c.querySelector('.sc-surface-title');
    return t ? t.textContent.replace(/\s+/g, ' ').trim() : '';
  });
  var open = ['wa-results','wa-visuals','wa-unified','wa-report'].filter(function(id){
    var el = document.getElementById(id);
    return el && el.classList.contains('is-open');
  });
  var you = host ? host.querySelector('.sc-line-you:not(.sc-line-event)') : null;
  return {
    cards: cards.length,
    titles: titles,
    open: open,
    chips: host ? host.querySelectorAll('.sc-inline-chips .chip, .sc-reply-chips .chip').length : 0,
    poster: host ? host.querySelectorAll('.wcl-inline-poster').length : 0,
    strip: host ? host.querySelectorAll('.wcl-strip-item').length : 0,
    members: host ? (you ? you.textContent.replace(/\s+/g,' ').trim().slice(0,80) : '') : '',
    errs: (window.__errs || []).join(' || ')
  };
})()
"""

fails = 0


def ok(cond, msg):
    global fails
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails += 1


def main():
    os.makedirs(OUT, exist_ok=True)
    b = Browser(width=1512, height=980, out=OUT)
    b.cmd("Runtime.disable")
    try:
        b.on_new_document(
            "window.__errs=[];addEventListener('error',function(e){"
            "__errs.push((e.message||'')+' @ '+(e.filename||'')+':'+(e.lineno||''))});"
            "try{localStorage.clear();localStorage.setItem('wise-auth','1');"
            "localStorage.setItem('wise-authed','1');"
            "localStorage.setItem('wise-theme','%s');"
            "localStorage.setItem('chat-theme','%s');}catch(e){}" % (THEME, THEME)
        )
        b.goto(URL, ready="!!document.querySelector('.ws-intent-chip')", settle=3.0)
        dark = b.js("document.documentElement.classList.contains('dark')")
        ok(bool(dark) == (THEME == "dark"), "loaded in %s mode" % THEME)

        n_cards = b.js("document.querySelectorAll('.sc-welcome .ws-scorecard').length")
        seventh = b.js(
            "(function(){"
            "var cards=Array.from(document.querySelectorAll('.sc-welcome .ws-scorecard'));"
            "var labels=cards.map(function(c){return (c.getAttribute('aria-label')||'').trim()});"
            "var i=labels.findIndex(function(l){return /marketing campaign/i.test(l)});"
            "if(i>=0)cards[i].scrollIntoView({inline:'center',block:'nearest'});"
            "return {n:cards.length,i:i,label:i>=0?labels[i]:''};"
            "})()"
        ) or {}
        ok(n_cards and n_cards >= 7, "overview rail has 7+ cards (got %s)" % n_cards)
        ok(seventh.get("i") == 6, "campaign is card 7 (index %s)" % seventh.get("i"))
        ok("marketing campaign" in (seventh.get("label") or "").lower(),
           "card 7 is the campaign (%r)" % seventh.get("label"))
        time.sleep(0.4)
        print("  shot", b.shot("clan-campaign__welcome-card7__%s" % THEME))

        chip = b.js(
            "(function(){var n=Array.from(document.querySelectorAll('.ws-intent-chip'))"
            ".find(function(c){return /marketing campaign/i.test(c.textContent)});"
            "if(!n)return false;n.scrollIntoView({block:'center'});n.click();return true})()"
        )
        ok(chip, "clicked Generate a marketing campaign")

        after = {}
        deadline = time.time() + WAIT_S
        while time.time() < deadline:
            time.sleep(1.2)
            after = b.js(STATE) or after
            print("  %4.0fs  cards=%s  poster=%s  strip=%s  chips=%s  open=%s"
                  % (WAIT_S - (deadline - time.time()), after.get("cards"),
                     after.get("poster"), after.get("strip"),
                     after.get("chips"), after.get("open") or "-"))
            if after.get("cards", 0) >= 3 and after.get("chips", 0) > 0 and after.get("poster"):
                break

        print("titles:", after.get("titles"))
        ok(after.get("poster") == 1, "campaign still landed in the answer")
        ok(after.get("strip") == 9, "nine clan headshots in the answer (got %s)" % after.get("strip"))
        ok(after.get("cards") == 3, "three output chips (got %s)" % after.get("cards"))
        ok(not after.get("open"), "every pane stayed shut (%s)" % (after.get("open") or "none"))
        ok(after.get("chips", 0) > 0, "turn closed on intent chips")
        ok(not after.get("errs"), "no page errors (%s)" % (after.get("errs") or "none"))
        titles = " | ".join(after.get("titles") or [])
        ok("Clan" in titles, "roster chip present")
        ok("Four Chambers" in titles or "Chambers" in titles, "documentary chip present")
        ok("Chamber Collection" in titles or "Collection" in titles, "lookbook chip present")

        b.js("(function(){var p=document.querySelector('.wcl-inline-poster');"
             "if(p)p.scrollIntoView({block:'center'});})()")
        time.sleep(0.4)
        print("  shot", b.shot("clan-campaign__poster__%s" % THEME))
        b.js("(function(){var h=document.querySelector('[id$=\"-messages\"]');"
             "if(h)h.scrollTop=h.scrollHeight})()")
        time.sleep(0.4)
        print("  shot", b.shot("clan-campaign__thread__%s" % THEME))

        names = ["roster", "doc", "look"]
        for i, name in enumerate(names):
            b.js("(function(){var c=document.querySelectorAll('.sc-surface-card[data-surface]');"
                 "if(c[%d])c[%d].click();})()" % (i, i))
            time.sleep(3.2)
            if i == 0:
                opened = b.js(STATE) or {}
                ok(bool(opened.get("open")),
                   "tapping a chip opens a pane (%s)" % (opened.get("open") or "none"))
            if name == "roster":
                info = b.js(
                    "(function(){"
                    "var pane=document.querySelector('.wa-pane.is-open');"
                    "var faces=pane?pane.querySelectorAll('[data-wcl-toggle]'):[];"
                    "var face=faces[0];"
                    "if(face)face.click();"
                    "var open=pane&&pane.querySelector('.wcl-card.is-open');"
                    "if(open)open.scrollIntoView({block:'nearest'});"
                    "return {mounted:!!window.WiseClanCampaign,styled:!!document.getElementById('wise-clan-campaign-styles'),faces:faces.length,open:!!open};"
                    "})()"
                ) or {}
                print("  roster toggle", info)
                ok(info.get("mounted") and info.get("styled"), "campaign module mounted")
                ok(info.get("open"), "tapping a headshot opens the bio")
                time.sleep(0.5)
            if name == "doc":
                b.js("(function(){var t=document.querySelector('.wa-pane.is-open .wcl-tabs');"
                     "if(t)t.scrollIntoView({block:'center'});})()")
                time.sleep(0.4)
            if name == "look":
                b.js("(function(){var d=document.querySelector('.wa-pane.is-open .wcl-drops');"
                     "if(d)d.scrollIntoView({block:'nearest'});})()")
                time.sleep(0.4)
            print("  shot", b.shot("clan-campaign__%s__%s" % (name, THEME)))

    finally:
        b.close()

    if fails:
        print("FAILED %s checks" % fails)
        sys.exit(1)
    print("ok")


if __name__ == "__main__":
    main()
