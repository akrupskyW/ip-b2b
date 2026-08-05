#!/usr/bin/env python3
"""Full-content screenshots of the actual logged-in WISE experience.

Approach: instead of hacking the DOM (which broke flex layouts like the chat
composer), we grow the browser viewport until no pane needs to scroll. Every
flex/grid layout stays intact — the chat composer stays docked at the bottom
and the full transcript is visible — so each capture matches the real page.

Pages are the real navigable flows (js/agent-menu.js WISE_APP_NAV /
WISE_ACCOUNT_NAV + the portfolio/verification/reformulation flows). Standalone
and dev-only pages are intentionally excluded.
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8099"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots"

W = 1440
H0 = 1000
MAX_H = 32000

# The real logged-in experience — nav destinations + the flows reached from them.
PAGES = [
    # Core
    "pages/overview.html",
    # Portfolio flow
    "pages/product-portfolio.html",
    "pages/add-product.html",
    "pages/product-comparison.html",
    "pages/marketing-assets.html",
    # Studio flow
    "pages/wiseai.html",
    "pages/ai-chat.html",
    "pages/reports.html",
    "pages/reformulation.html",
    "pages/report-guiding-stars.html",
    # Verification flows
    "pages/verification.html",
    "pages/gras-verification.html",
    # Admin
    "pages/non-upf-dashboard.html",
    "pages/audit-queue.html",
    "pages/organizations.html",
    "pages/quick-invite.html",
    "pages/user-management.html",
    "pages/admin-utils.html",
    "pages/studio-ai.html",
    # Account / support
    "pages/profile.html",
    "pages/invoices.html",
    "pages/preferences.html",
    "pages/api-keys.html",
    "pages/agents.html",
    "pages/alerts.html",
    "pages/help.html",
    "pages/docs.html",
]

AUTH_INIT = """
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
  localStorage.setItem('wise-theme', 'light');
  localStorage.setItem('chat-theme', 'light');
} catch (e) {}
"""

# Trigger lazy / IntersectionObserver content by scrolling every scroll pane.
TRIGGER = """async () => {
  const panes = [...document.querySelectorAll('*')].filter(el => {
    const cs = getComputedStyle(el);
    return /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 4;
  });
  panes.push(document.scrollingElement);
  for (const p of panes) {
    if (!p) continue;
    const h = p.scrollHeight, step = Math.max(200, p.clientHeight * 0.8);
    for (let y = 0; y <= h; y += step) { p.scrollTop = y; await new Promise(r => setTimeout(r, 40)); }
    p.scrollTop = 0;
  }
}"""

KILL_TRANSITIONS = """() => {
  const s = document.createElement('style');
  s.textContent = '*,*::before,*::after{transition:none!important;scroll-behavior:auto!important}';
  document.documentElement.appendChild(s);
}"""

FORCE_LIGHT = """() => {
  try { localStorage.setItem('wise-theme','light'); localStorage.setItem('chat-theme','light'); } catch (e) {}
  document.documentElement.classList.remove('dark');
}"""

FORCE_REVEAL = """() => {
  document.querySelectorAll('[class*="reveal"],[data-reveal]').forEach(el => {
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('transform', 'none', 'important');
  });
}"""

# Largest vertical overflow across any scroll pane (and the document). This is
# how much taller the viewport must get so nothing needs to scroll vertically.
MAX_DELTA = """() => {
  let max = 0;
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    if (/(auto|scroll)/.test(cs.overflowY)) {
      const d = el.scrollHeight - el.clientHeight;
      if (d > max) max = d;
    }
  });
  const de = document.scrollingElement || document.documentElement;
  const dd = de.scrollHeight - de.clientHeight;
  if (dd > max) max = dd;
  return Math.round(max);
}"""

def shoot(page, rel):
    name = rel.replace("/", "__").rsplit(".", 1)[0] + ".png"
    page.set_viewport_size({"width": W, "height": H0})
    page.goto(f"{BASE}/{rel}", wait_until="load", timeout=60000)
    try:
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        pass
    page.wait_for_timeout(1200)
    try:
        page.evaluate("() => document.fonts && document.fonts.ready")
    except Exception:
        pass
    page.evaluate(FORCE_LIGHT)
    page.wait_for_timeout(200)

    # Present all content (trigger observers), then let animations settle.
    page.evaluate(TRIGGER)
    page.wait_for_timeout(1800)
    page.evaluate(FORCE_REVEAL)
    page.evaluate(KILL_TRANSITIONS)

    # Grow the viewport until no pane overflows — layout stays intact.
    h = H0
    last_delta = None
    for _ in range(9):
        delta = page.evaluate(MAX_DELTA)
        if delta <= 4:
            break
        if last_delta is not None and delta >= last_delta - 4:
            # Not shrinking (a fixed-height pane) — one targeted expand, then stop.
            page.evaluate("""() => {
              document.querySelectorAll('*').forEach(el => {
                const cs = getComputedStyle(el);
                if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 4) {
                  el.style.setProperty('max-height','none','important');
                  el.style.setProperty('height','auto','important');
                  el.style.setProperty('overflow-y','visible','important');
                }
              });
            }""")
            page.wait_for_timeout(300)
            break
        last_delta = delta
        h = min(MAX_H, h + delta + 60)
        page.set_viewport_size({"width": W, "height": int(h)})
        page.wait_for_timeout(500)
        # re-trigger observers for content newly brought into a taller viewport
        page.evaluate(FORCE_REVEAL)

    page.wait_for_timeout(400)
    dims = page.evaluate("() => ({w: innerWidth, h: innerHeight, dh: document.documentElement.scrollHeight})")
    page.screenshot(path=f"{OUT}/{name}", full_page=True)
    print(f"OK  {rel:40s} -> {name}  (vp {dims['w']}x{dims['h']}, doc {dims['dh']})", flush=True)

def main():
    only = sys.argv[1:]
    targets = [p for p in PAGES if not only or any(o in p for o in only)]
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True)
        ctx = browser.new_context(viewport={"width": W, "height": H0},
                                  device_scale_factor=2)
        ctx.add_init_script(AUTH_INIT)
        page = ctx.new_page()
        for rel in targets:
            try:
                shoot(page, rel)
            except Exception as e:
                print(f"ERR {rel}: {e}", flush=True)
        browser.close()

if __name__ == "__main__":
    main()
