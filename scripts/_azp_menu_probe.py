"""Probe the Analytics Types report module's ⋯ menu.

Checks that the menu holds this page's own controls (and none of the overview
actions that used to re-render the dashboard straight over the gallery), that
closing the palette can be undone from the menu, and that the two switches stay
in step with the palette's own controls. Shoots the open menu for both themes.

Real pointer clicks throughout — a scripted `.click()` on a display:none row
would pass whether or not the menu actually stayed open.

Usage:  python3 scripts/_azp_menu_probe.py [light|dark]
"""
import sys, time
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from _cdp import Browser

THEME = (sys.argv[1] if len(sys.argv) > 1 else 'light').lower()
URL = 'http://localhost:8765/pages/analytics-types.html'
OUT = '/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag'

b = Browser(port=9351, width=1600, height=1100, out=OUT)
b.on_new_document("""
window.__errs=[];
addEventListener('error',function(e){__errs.push(e.message)});
try {
  localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Arthur Krupsky',
    email:'akrupsky@wisecode.ai',title:'Product Intelligence Lead',org:'WISE Foods',
    initials:'AK',at:new Date().toISOString()}));
  localStorage.setItem('wise-theme', %r);
  localStorage.setItem('chat-theme', %r);
  localStorage.setItem('wise-walkthrough', JSON.stringify({v:1,completed:true,dismissed:true,
    doneSteps:['*'],skippedGroups:[],screensSeen:{'*':true},cursor:''}));
  localStorage.removeItem('az-palette-open');
  localStorage.removeItem('az-palette-pos');
  localStorage.setItem('az-skinny-bars','0');
} catch (e) {}
""" % (THEME, THEME))
b.goto(URL, ready="!!document.getElementById('az-palette')", settle=6.0)

rows = ("Array.from(document.querySelectorAll('#agent-main-more-pop .topbar-menu-item'))"
        ".map(function(n){return n.textContent.replace(/\\s+/g,' ').trim()"
        "+'='+n.getAttribute('aria-checked')}).join(' | ')")
gallery = "document.querySelectorAll('#agent-main-scroll .atx-card, #agent-main-scroll .atx-stage').length"
shown = "!document.getElementById('agent-main-more-pop').classList.contains('hidden')"


def click(sel):
    xy = b.js("(function(){var n=document.querySelector(%r);if(!n)return null;"
              "var r=n.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()" % sel)
    if not xy:
        print('  !! no rect for', sel)
        return
    b.click(xy[0], xy[1])
    time.sleep(0.6)


print('theme dark:', b.js("document.documentElement.classList.contains('dark')"))
print('chart cards:', b.js(gallery))
print('menu rows:', b.js(rows))

# Close the palette from its own header, then bring it back from the menu.
click('.azp-close')
print('closed -> palette hidden:', b.js("document.getElementById('az-palette').hidden"),
      '| menu rows:', b.js(rows))
click('#agent-main-more-btn')
print('menu open:', b.js(shown))
b.shot('azp-menu__palette-off__' + THEME)
click('#azp-menu-open')
print('reopened from menu -> palette visible:',
      b.js("!document.getElementById('az-palette').hidden"),
      '| launcher hidden:', b.js("document.getElementById('az-palette-launch').hidden"),
      '| menu stayed open:', b.js(shown))

# Skinny bars from the menu must land on the card's own switch, and back.
click('#azp-menu-skinny')
print('skinny from menu -> body class:', b.js("document.body.classList.contains('az-skinny-bars')"),
      '| card switch:', b.js("document.querySelector('.azp-switch').getAttribute('aria-checked')"),
      '| menu stayed open:', b.js(shown))
b.shot('azp-menu__open__' + THEME)
click('.azp-switch')
print('skinny off from card -> menu row:',
      b.js("document.getElementById('azp-menu-skinny').getAttribute('aria-checked')"))

print('chart cards still there:', b.js(gallery))
print('errors:', b.js("(window.__errs||[]).join(' || ')") or '(none)')
b.close()
