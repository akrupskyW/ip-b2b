#!/usr/bin/env python3
"""Full-content screenshots of every logged-in WISE app page.

Auths via localStorage (beating js/auth-guard.js), then expands any inner
scroll containers so the full-page capture shows all module content even when
it would normally scroll inside a fixed-height pane.
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8099"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots"

# Logged-in app pages (excludes marketing/auth/seed scaffolding).
PAGES = [
    "pages/overview.html",
    "pages/product-portfolio.html",
    "pages/product-comparison.html",
    "pages/add-product.html",
    "pages/non-upf-dashboard.html",
    "pages/verification.html",
    "pages/gras-verification.html",
    "pages/report-guiding-stars.html",
    "pages/reformulation.html",
    "pages/analytics-types.html",
    "pages/reports.html",
    "pages/audit-queue.html",
    "pages/alerts.html",
    "pages/agents.html",
    "pages/ai-chat.html",
    "pages/ai-chat-2.html",
    "pages/wiseai.html",
    "pages/studio-ai.html",
    "pages/marketing-assets.html",
    "pages/organizations.html",
    "pages/user-management.html",
    "pages/quick-invite.html",
    "pages/invoices.html",
    "pages/api-keys.html",
    "pages/admin-utils.html",
    "pages/preferences.html",
    "pages/profile.html",
    "pages/accessibility-review.html",
    "pages/app-vision-deck.html",
    "pages/docs.html",
    "pages/help.html",
    "wise_ip3.html",
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
  // Light is the app's real default (js/app.js: wise-theme || 'light'); seed it
  // so the inline FOUC guards don't fall back to their dark default.
  localStorage.setItem('wise-theme', 'light');
  localStorage.setItem('chat-theme', 'light');
} catch (e) {}
"""

KILL_ANIM = """() => {
  // Only disable transitions + smooth scroll. Do NOT zero animation-duration:
  // fill-mode:none ring/entrance animations would snap back to their empty
  // pre-animation state. We instead wait for animations to finish naturally.
  const s = document.createElement('style');
  s.textContent = '*,*::before,*::after{transition:none!important;scroll-behavior:auto!important}';
  document.documentElement.appendChild(s);
  const de = document.documentElement, b = document.body;
  [de, b].forEach(el => {
    el.style.setProperty('height', 'auto', 'important');
    el.style.setProperty('min-height', '0', 'important');
    el.style.setProperty('max-height', 'none', 'important');
    el.style.setProperty('overflow', 'visible', 'important');
  });
  // reveal-on-scroll elements: force visible
  document.querySelectorAll('[class*="reveal"],[data-reveal]').forEach(el => {
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('transform', 'none', 'important');
  });
}"""

# Expand every element that clips its content. overflow auto/scroll always;
# overflow hidden only for sizeable layout containers so small clipped
# decorative bits (avatars, chips, progress bars) are left alone.
EXPAND = """() => {
  let changed = 0;
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    const oy = cs.overflowY, ox = cs.overflowX;
    const scrollable = /(auto|scroll)/.test(oy) || /(auto|scroll)/.test(ox);
    const hiddenBox = (cs.overflow === 'hidden' || oy === 'hidden' || ox === 'hidden');
    const overflowsY = el.scrollHeight > el.clientHeight + 4;
    const overflowsX = el.scrollWidth > el.clientWidth + 4;
    if (scrollable && (overflowsY || overflowsX)) {
      el.style.setProperty('height', 'auto', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('flex', 'none', 'important');
      changed++;
    } else if (hiddenBox && overflowsY && el.clientHeight >= 160) {
      el.style.setProperty('height', 'auto', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('overflow-y', 'visible', 'important');
      el.style.setProperty('flex', 'none', 'important');
      changed++;
    }
  });
  return changed;
}"""

def shoot(page, rel):
    name = rel.replace("/", "__").rsplit(".", 1)[0] + ".png"
    page.goto(f"{BASE}/{rel}", wait_until="load", timeout=60000)
    try:
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        pass
    page.wait_for_timeout(1500)
    try:
        page.evaluate("() => document.fonts && document.fonts.ready")
    except Exception:
        pass

    # Enforce light theme in case a page hardcodes class="dark" without a guard.
    page.evaluate("""() => {
      try { localStorage.setItem('wise-theme','light'); localStorage.setItem('chat-theme','light'); } catch (e) {}
      document.documentElement.classList.remove('dark');
    }""")
    page.wait_for_timeout(200)

    # Trigger lazy / intersection-observer content by scrolling any scroll panes.
    page.evaluate("""async () => {
      const panes = [...document.querySelectorAll('*')].filter(el => {
        const cs = getComputedStyle(el);
        return /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 4;
      });
      panes.push(document.scrollingElement);
      for (const p of panes) {
        const h = p.scrollHeight, step = Math.max(200, p.clientHeight * 0.8);
        for (let y = 0; y <= h; y += step) { p.scrollTop = y; await new Promise(r => setTimeout(r, 40)); }
        p.scrollTop = 0;
      }
    }""")
    # let entrance / ring / count-up animations finish before freezing
    page.wait_for_timeout(1800)

    page.evaluate(KILL_ANIM)
    for _ in range(10):
        changed = page.evaluate(EXPAND)
        page.wait_for_timeout(120)
        if not changed:
            break
    # After expansion the whole document is tall — scroll the window through it
    # so window-based IntersectionObservers (ring fills, count-ups, reveals) fire.
    page.evaluate("""async () => {
      const h = document.documentElement.scrollHeight;
      const step = Math.max(400, window.innerHeight * 0.85);
      for (let y = 0; y <= h; y += step) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    }""")
    page.wait_for_timeout(1200)
    # final root relax after expansion
    page.evaluate(KILL_ANIM)
    page.wait_for_timeout(250)

    dims = page.evaluate("""() => ({
      w: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      h: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
    })""")
    page.screenshot(path=f"{OUT}/{name}", full_page=True)
    print(f"OK  {rel:42s} -> {name}  ({dims['w']}x{dims['h']})", flush=True)

def main():
    only = sys.argv[1:]
    targets = [p for p in PAGES if not only or any(o in p for o in only)]
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 1000},
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
