from playwright.sync_api import sync_playwright
from pathlib import Path

OUT = Path("/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots")
URL = "http://127.0.0.1:8099/pages/wiseai.html"

AUTH = """
try {
  localStorage.setItem('wise-auth', JSON.stringify({
    loggedIn: true, name: 'Demo User', email: 'demo@wisealliance.com',
    title: 'Lead', org: 'WISE', initials: 'DU', at: new Date().toISOString()
  }));
  localStorage.setItem('wc_registration', JSON.stringify({
    name: 'Demo User', email: 'demo@wisealliance.com', title: 'Lead', orgname: 'WISE'
  }));
} catch (e) {}
"""

REVEAL = """() => {
  const sb = document.querySelector('.wch-sidebar:not(.wch-right)');
  if (sb) {
    sb.classList.remove('wch-docked-hidden', 'wch-dock-conceal', 'wch-rail', 'wch-anim');
    sb.style.setProperty('display', 'flex', 'important');
    sb.style.setProperty('flex', '0 0 320px', 'important');
    sb.style.setProperty('width', '320px', 'important');
    sb.style.setProperty('min-width', '320px', 'important');
  }
}"""

def shoot(theme):
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel="chrome", headless=True)
        ctx = b.new_context(viewport={"width": 1440, "height": 950}, device_scale_factor=2)
        ctx.add_init_script(AUTH + f"""
try {{
  localStorage.setItem('wise-theme','{theme}');
  localStorage.setItem('chat-theme','{theme}');
}} catch(e){{}}
document.documentElement.classList.toggle('dark', '{theme}' === 'dark');
""")
        p = ctx.new_page()
        p.goto(URL, wait_until="load", timeout=60000)
        try: p.wait_for_load_state("networkidle", timeout=15000)
        except Exception: pass
        p.wait_for_selector('.wch-sidebar', state='attached', timeout=30000)
        p.evaluate(REVEAL)
        p.wait_for_timeout(1800)  # let the live row stream a line

        info = p.evaluate("""() => {
          const items = [...document.querySelectorAll('.wch-item[data-wch-id]')];
          const live = document.querySelector('.wch-item-live .wch-stream-text');
          return { count: items.length,
                   liveText: live ? live.textContent : null,
                   metas: document.querySelectorAll('.wch-item-meta').length };
        }""")
        print(theme, info, flush=True)

        # Plain capture: the sidebar region with the streaming row.
        box = p.evaluate("""() => {
          const sb = document.querySelector('.wch-sidebar:not(.wch-right)');
          const r = sb.getBoundingClientRect();
          return { x: Math.max(0, r.left), y: Math.max(0, r.top),
                   width: Math.ceil(r.width), height: Math.ceil(r.height) };
        }""")
        p.screenshot(path=str(OUT / f"wiseai__history-stream-{theme}.png"), clip=box)

        # Hover a non-live item to show the info popover, then capture the region.
        rows = p.locator('.wch-sidebar:not(.wch-right) .wch-item[data-wch-id]')
        target = rows.nth(3) if rows.count() > 3 else rows.last
        target.hover(force=True)
        p.wait_for_timeout(700)
        p.screenshot(path=str(OUT / f"wiseai__history-popover-{theme}.png"),
                     clip={"x": 0, "y": 40, "width": 820, "height": 900})
        b.close()

for t in ("light", "dark"):
    shoot(t)
print("done")
