"""The room can hold more than two.

Drives the whole third-voice flow on a real chat module: the composer's "+"
offers Add people, the invite chip opens the picker, picked teammates join on
their own lines and speak in their own voice, WISEcodeAI answers alongside them,
typing "@" offers the room, and an @-addressed ask is answered by the teammate
first and by WISEcodeAI after.

  python3 scripts/_team_room_probe.py [page] [light|dark]
"""
import json
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _cdp import Browser  # noqa: E402

PAGE = sys.argv[1] if len(sys.argv) > 1 else "wiseai"
THEME = sys.argv[2] if len(sys.argv) > 2 else "light"
URL = "http://127.0.0.1:8099/pages/%s.html" % PAGE

# The transcript, line by line, in thread order — enough to prove the ordering
# as well as the contents.
LINES = """(function(){
  var t = document.querySelector('.chat-messages-area, #chat-messages');
  if (!t) return JSON.stringify([]);
  return JSON.stringify([].slice.call(t.children).filter(function(n){
    return n.classList && n.classList.contains('sc-line');
  }).map(function(n){
    var kind = n.classList.contains('sc-line-join') ? 'join'
      : n.classList.contains('sc-line-mate-typing') ? 'mate-typing'
      : n.classList.contains('sc-line-mate') ? 'mate'
      : n.classList.contains('sc-line-typing') ? 'typing'
      : n.classList.contains('sc-line-trace') ? 'trace'
      : n.classList.contains('sc-line-you') ? 'you'
      : n.classList.contains('sc-line-wiseai') ? 'wiseai' : 'other';
    var name = n.querySelector('.sc-line-name');
    var body = n.querySelector('.sc-line-body');
    var clone = body ? body.cloneNode(true) : null;
    if (clone) [].slice.call(clone.querySelectorAll('.sc-line-meta, .sc-fb-wrap'))
      .forEach(function(m){ m.remove(); });
    return {
      kind: kind,
      who: name ? name.textContent.replace(/\\s+/g,' ').trim() : '',
      mentions: [].slice.call(n.querySelectorAll('.sc-mention')).map(function(m){
        return m.textContent.trim();
      }),
      text: clone ? clone.textContent.replace(/\\s+/g,' ').trim().slice(0, 110) : ''
    };
  }));
})()"""

CHIPS = """(function(){
  var row = document.querySelector('.sc-inline-chips')
    || document.querySelector('.ws-chips');
  if (!row) return JSON.stringify([]);
  return JSON.stringify([].slice.call(row.querySelectorAll('.chip')).map(function(c){
    return c.textContent.replace(/\\s+/g,' ').trim();
  }));
})()"""

fails = 0


def ok(cond, msg):
    global fails
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails += 1


def dump(label):
    rows = json.loads(b.js(LINES))
    print("\n  %s" % label)
    for r in rows:
        who = (" [%s]" % r["who"]) if r["who"] else ""
        men = (" @%s" % ",".join(r["mentions"])) if r["mentions"] else ""
        print("    %-12s%s%s %s" % (r["kind"], who, men, r["text"]))
    return rows


b = Browser(port=9482 if THEME == "dark" else 9481,
            width=1500, height=1050, out="screenshots/_diag")
b.cmd("Runtime.disable")
try:
    b.on_new_document(
        "try{localStorage.clear();"
        "localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,name:'Demo User',"
        "email:'demo@wisealliance.com',initials:'DU',at:new Date().toISOString()}));"
        "localStorage.setItem('wise-theme','%s');"
        "localStorage.setItem('chat-theme','%s');"
        "localStorage.setItem('wise-walkthrough',JSON.stringify({v:1,completed:true,"
        "dismissed:true,doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));"
        "}catch(e){}" % (THEME, THEME)
    )
    b.goto(URL, ready="!!document.querySelector('.sc-people-pop')", settle=3.0)

    # ── 1. the affordances exist ────────────────────────────────────────────
    ok(b.js("!!document.querySelector('.fl-more-item[data-sc=\"add-people\"]')"),
       "the composer's + offers Add people")
    ok(b.js("!!document.querySelector('.topbar-menu-item[data-sc=\"add-member\"]')"),
       "the module's three-dot offers Add people to this conversation")
    ok(b.js("!!document.querySelector('.sc-people-pop')"),
       "the people picker is mounted")
    ok(b.js("!!document.querySelector('.sc-mention-pop')"),
       "the @ picker is mounted")
    chips = json.loads(b.js(CHIPS))
    ok(any("Invite a team member" in c for c in chips),
       "the welcome offers the Invite a team member chip  (%d chips)" % len(chips))

    # ── 2. the invite chip opens the picker ─────────────────────────────────
    print("\n  tapping the invite chip…")
    b.js("""(function(){
      var c = [].slice.call(document.querySelectorAll('.ws-intent-chip'))
        .filter(function(x){ return /Invite a team member/i.test(x.textContent); })[0];
      if (c) c.click();
    })()""")
    time.sleep(16)
    dump("after the invite chip")
    ok(b.js("!!document.querySelector('.sc-people-pop.open')"),
       "tapping the chip opened the picker")
    ok(b.js("document.querySelectorAll('.sc-people-pop .sc-person-row').length") >= 3,
       "the picker lists the team")

    # ── 3. pick two people and add them ────────────────────────────────────
    print("\n  picking Maya and Priya…")
    b.js("""(function(){
      var pop = document.querySelector('.sc-people-pop');
      ['maya','priya'].forEach(function(id){
        var r = pop.querySelector('.sc-person-row[data-person="'+id+'"]');
        if (r) r.click();
      });
    })()""")
    time.sleep(0.6)
    ok(b.js("document.querySelectorAll('.sc-people-pop .sc-person-token').length") == 2,
       "both picks read back as tokens")
    ok(not b.js("document.querySelector('.sc-people-add').disabled"),
       "Add is live once someone is picked")
    print("  add label: %s"
          % b.js("document.querySelector('.sc-people-add-label').textContent"))
    b.js("document.querySelector('.sc-people-add').click()")
    time.sleep(26)
    rows = dump("after adding two people")
    ok(not b.js("!!document.querySelector('.sc-people-pop.open')"),
       "the picker closed itself")
    joins = [r for r in rows if r["kind"] == "join"]
    mates = [r for r in rows if r["kind"] == "mate"]
    ok(len(joins) == 2, "both people joined on their own line (%d)" % len(joins))
    ok(len(mates) >= 2, "both people spoke in their own voice (%d lines)" % len(mates))
    ok(len({r["who"] for r in mates}) >= 2, "the lines carry each person's name")
    ok(rows.index(joins[0]) < rows.index(mates[0]),
       "nobody speaks before they have joined")
    last_mate = max(i for i, r in enumerate(rows) if r["kind"] == "mate")
    ai_after = [i for i, r in enumerate(rows) if r["kind"] == "wiseai" and i > last_mate]
    ok(bool(ai_after), "WISEcodeAI closed the exchange after the teammates")
    ok(b.js("document.querySelectorAll('.sc-roster .sc-avatar').length") == 2,
       "the module header shows who is in the room")
    ok(b.js("document.documentElement.contains(document.querySelector('.sc-roster'))")
       and not b.js("document.querySelector('.sc-roster').hidden"),
       "the face pile is visible now the room has more than two in it")
    chips = json.loads(b.js(CHIPS))
    print("  chips now: %s" % chips)
    ok(any("Maya" in c or "Priya" in c for c in chips),
       "the thread ends on chips that speak to the room")

    # ── 4. "@" offers the room ─────────────────────────────────────────────
    print("\n  typing '@' in the composer…")
    b.js("""(function(){
      var i = document.querySelector('.fl-input');
      i.focus(); i.value = '@';
      i.setSelectionRange(1,1);
      i.dispatchEvent(new Event('input', {bubbles:true}));
    })()""")
    time.sleep(0.8)
    men = json.loads(b.js("""(function(){
      var p = document.querySelector('.sc-mention-pop');
      if (!p || p.hidden) return JSON.stringify([]);
      return JSON.stringify([].slice.call(p.querySelectorAll('.sc-mention-item'))
        .map(function(x){ return x.textContent.replace(/\\s+/g,' ').trim(); }));
    })()"""))
    print("  @ list: %s" % json.dumps(men, indent=None))
    ok(len(men) >= 3, "the @ list offers the room (%d)" % len(men))
    ok(any("WISEcodeAI" in m for m in men),
       "WISEcodeAI is in the @ list — it is a participant, not the surface")
    ok(any("In this chat" in m for m in men) and any("Invite" in m for m in men),
       "the list says who is already here and who would be invited")
    box = json.loads(b.js("""(function(){
      var p = document.querySelector('.sc-mention-pop');
      var r = p.getBoundingClientRect();
      return JSON.stringify({h: Math.round(r.height), scroll: p.scrollHeight,
        clipped: p.scrollHeight > p.clientHeight + 1,
        top: Math.round(r.top), bottom: Math.round(r.bottom)});
    })()"""))
    print("  @ pop box: %s" % box)
    ok(not box["clipped"],
       "the @ list shows the whole room without a cut-off row")
    b.js("document.querySelector('.sc-mention-pop .sc-mention-item').dispatchEvent("
         "new MouseEvent('mousedown', {bubbles:true}))")
    time.sleep(0.5)
    print("  composer after pick: %r" % b.js("document.querySelector('.fl-input').value"))

    # ── 5. an @-addressed ask ─────────────────────────────────────────────
    print("\n  sending an @-addressed ask…")
    b.js("""(function(){
      var i = document.querySelector('.fl-input');
      i.focus();
      i.value = '@Maya can you check the allergen flags on this one?';
      i.dispatchEvent(new Event('input', {bubbles:true}));
      document.querySelector('.sc-send').click();
    })()""")
    time.sleep(30)
    rows = dump("after the @-addressed ask")
    yous = [i for i, r in enumerate(rows) if r["kind"] == "you"]
    ok(bool(yous) and any(rows[i]["mentions"] for i in yous),
       "the sent ask carries the mention as a pill")
    tail = rows[yous[-1]:]
    kinds = [r["kind"] for r in tail]
    ok("mate" in kinds, "the teammate answered")
    ok("wiseai" in kinds, "WISEcodeAI answered too — it is still in the room")
    ok(kinds.index("mate") < kinds.index("wiseai"),
       "the teammate spoke before WISEcodeAI, one stage at a time")
    print("  last answer box: %s" % b.js("""(function(){
      var ls = document.querySelectorAll('.sc-line-wiseai .sc-line-body');
      var l = ls[ls.length-1];
      var kids = [].slice.call(l.childNodes).map(function(n){
        return n.nodeType === 1 ? (n.tagName + '.' + n.className)
          : ('#text:' + JSON.stringify(String(n.textContent).slice(0,14)));
      });
      return JSON.stringify({kids: kids.slice(0,6),
        bodyLeft: Math.round(l.getBoundingClientRect().left),
        firstLeft: l.firstElementChild
          ? Math.round(l.firstElementChild.getBoundingClientRect().left) : null,
        indent: getComputedStyle(l).textIndent});
    })()"""))
    ok(b.js("!!document.querySelector('.sc-people-pop.open')") is False,
       "no pane or picker opened on its own")

    b.js("var t=document.querySelector('.chat-messages-area, #chat-messages');"
         "if(t)t.scrollTop=t.scrollHeight")
    time.sleep(0.8)
    print("\n  shot: %s" % b.shot("team-room__%s__%s" % (PAGE, THEME)))
    b.js("""(function(){
      var i = document.querySelector('.fl-input');
      i.focus(); i.value = '@';
      i.setSelectionRange(1,1);
      i.dispatchEvent(new Event('input', {bubbles:true}));
    })()""")
    time.sleep(0.7)
    print("  shot: %s" % b.shot("team-mention__%s__%s" % (PAGE, THEME)))
    b.js("""(function(){
      var i = document.querySelector('.fl-input');
      i.value = ''; i.dispatchEvent(new Event('input', {bubbles:true}));
      var btn = document.querySelector('.fl-more-item[data-sc="add-people"]');
      if (btn) btn.click();
    })()""")
    time.sleep(1.0)
    print("  shot: %s" % b.shot("team-picker__%s__%s" % (PAGE, THEME)))
finally:
    b.close()

print("\n%s" % ("PASS" if not fails else "%d FAILED" % fails))
sys.exit(1 if fails else 0)
