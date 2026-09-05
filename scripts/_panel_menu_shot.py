"""Shoot the dashboard overview's main-panel ⋯ menu so the admin toggle rows can
be checked after a change to the shared menu-switch styling.

Usage:  python3 scripts/_panel_menu_shot.py [light|dark]
"""
import sys, time
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from _cdp import Browser

THEME = (sys.argv[1] if len(sys.argv) > 1 else 'light').lower()
URL = 'http://localhost:8765/pages/overview.html'
OUT = '/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag'

b = Browser(port=9354, width=1600, height=1100, out=OUT)
b.on_new_document("""
try {
  localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Arthur Krupsky',
    email:'akrupsky@wisecode.ai',initials:'AK',at:new Date().toISOString()}));
  localStorage.setItem('wise-theme', %r);
  localStorage.setItem('chat-theme', %r);
  localStorage.setItem('wise-admin-ui','1');
  localStorage.setItem('wise-walkthrough', JSON.stringify({v:1,completed:true,dismissed:true,
    doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));
} catch (e) {}
""" % (THEME, THEME))
b.goto(URL, ready="!!document.getElementById('agent-main-more-btn')", settle=5.0)


def click(sel):
    xy = b.js("(function(){var n=document.querySelector(%r);if(!n)return null;"
              "var r=n.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()" % sel)
    if not xy:
        print('  !! no rect for', sel)
        return
    b.click(xy[0], xy[1])
    time.sleep(0.6)


rows = ("Array.from(document.querySelectorAll('#agent-main-more-pop .topbar-menu-item'))"
        ".map(function(n){return n.textContent.replace(/\\s+/g,' ').trim()}).join(' | ')")
print('menu rows:', b.js(rows))
click('#agent-main-more-btn')
print('menu open:', b.js("!document.getElementById('agent-main-more-pop').classList.contains('hidden')"))
b.shot('panel-menu__overview__' + THEME)
click('[data-action="toggle-stars"]')
print('after admin toggle -> menu open:',
      b.js("!document.getElementById('agent-main-more-pop').classList.contains('hidden')"),
      '| checked:', b.js("document.querySelector('[data-action=\\'toggle-stars\\']').getAttribute('aria-checked')"))
b.shot('panel-menu__overview-on__' + THEME)
b.close()
