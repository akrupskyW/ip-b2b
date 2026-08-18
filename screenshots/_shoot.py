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
import os
import sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8099"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots"

# Theme is driven by the WISE_THEME env var ("light" default, or "dark"). Dark
# captures are suffixed with "__dark" so they sit beside the light ones.
THEME = os.environ.get("WISE_THEME", "light").lower()
DARK = THEME == "dark"

W = 1440
H0 = 1000
MAX_H = 32000

# The real logged-in experience — nav destinations + the flows reached from them.
# Each entry is a URL path (query string allowed) or (path, output_stem) when the
# filename should differ from the default pages__foo conversion.
PAGES = [
    # Core
    "pages/overview.html",
    # Portfolio flow
    "pages/product-portfolio.html",
    "pages/add-product.html",
    ("pages/view-product.html", "pages__view-product"),
    ("pages/view-product.html?compare=1", "pages__view-product-compare"),
    "pages/product-comparison.html",
    "pages/marketing-assets.html",
    "pages/add-catalog.html",
    "pages/ai-dashboard.html",
    # Studio flow
    "pages/wiseai.html",
    "pages/conversation-library.html",
    "pages/ingredient-browser.html",
    "pages/reports.html",
    "pages/analytics-types.html",
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
    "pages/all-modules.html",
    "pages/progress-log.html",
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
  localStorage.setItem('wise-theme', %(theme)r);
  localStorage.setItem('chat-theme', %(theme)r);
} catch (e) {}
""" % {"theme": THEME}

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

FORCE_DARK = """() => {
  try { localStorage.setItem('wise-theme','dark'); localStorage.setItem('chat-theme','dark'); } catch (e) {}
  document.documentElement.classList.add('dark');
}"""

FORCE_THEME = FORCE_DARK if DARK else FORCE_LIGHT

FORCE_REVEAL = """() => {
  document.querySelectorAll('[class*="reveal"],[data-reveal]').forEach(el => {
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('transform', 'none', 'important');
  });
}"""

# Chat hosts — same set as js/sticky-modules.js CHAT_SEL. After the page has
# loaded at the initial viewport, pin the left chat to that height so growing
# the viewport (to reveal the full right-hand module) does not stretch it.
CHAT_HOST = "#wa-chat,#rf-chat,#sa-chat,#aid-chat,#pl-chat,.ap-chat,#gs-chat,#chat-shell,#wiseai-dock-panel,.sticky-chat"

PIN_CHAT = f"""() => {{
  document.querySelectorAll({CHAT_HOST!r}).forEach(el => {{
    const h = Math.round(el.getBoundingClientRect().height);
    if (h < 80) return;
    el.style.setProperty('height', h + 'px', 'important');
    el.style.setProperty('max-height', h + 'px', 'important');
    el.style.setProperty('min-height', h + 'px', 'important');
    el.style.setProperty('align-self', 'flex-start', 'important');
    el.style.setProperty('flex-shrink', '0', 'important');
  }});
}}"""

# Largest vertical overflow across any non-chat scroll pane (and the document).
# The left chat is pinned; the right-hand module drives viewport growth.
MAX_DELTA = f"""() => {{
  const chatHost = el => el.closest && el.closest({CHAT_HOST!r});
  let max = 0;
  document.querySelectorAll('*').forEach(el => {{
    if (chatHost(el)) return;
    const cs = getComputedStyle(el);
    if (/(auto|scroll)/.test(cs.overflowY)) {{
      const d = el.scrollHeight - el.clientHeight;
      if (d > max) max = d;
    }}
  }});
  const de = document.scrollingElement || document.documentElement;
  const dd = de.scrollHeight - de.clientHeight;
  if (dd > max) max = dd;
  return Math.round(max);
}}"""

# Per-page hooks run after the first load settle, before scroll/reveal.
PAGE_AFTER_LOAD = {
    "pages/all-modules.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('#mi-components');
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 20000);
      });
      await new Promise(r => setTimeout(r, 1200));
    }""",
    "pages/view-product.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('.nfp-sp-strip, .nfp-cmp-grid');
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 15000);
      });
      await new Promise(r => setTimeout(r, 800));
    }""",
    "pages/ai-dashboard.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('#aid-kpis') && document.querySelector('#aid-kpis').children.length;
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 20000);
      });
      await new Promise(r => setTimeout(r, 1500));
    }""",
    "pages/conversation-library.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('.lib-card');
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 15000);
      });
      await new Promise(r => setTimeout(r, 800));
    }""",
    "pages/ingredient-browser.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('#ib-rows') && document.querySelector('#ib-rows').children.length;
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 20000);
      });
      await new Promise(r => setTimeout(r, 800));
    }""",
    "pages/analytics-types.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('#upf-table-wrap, .dash-section-title, .dash-hero-title');
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 20000);
      });
      await new Promise(r => setTimeout(r, 2500));
    }""",
    "pages/add-catalog.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('#cat-body') && document.querySelector('#cat-body').children.length;
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 15000);
      });
      await new Promise(r => setTimeout(r, 800));
    }""",
}

WAIT_FULL_LOAD = """async () => {
  if (document.readyState !== 'complete') {
    await new Promise(r => window.addEventListener('load', r, { once: true }));
  }
  const imgs = [...document.images];
  await Promise.all(imgs.map(img => {
    if (img.complete && img.naturalWidth) return;
    return new Promise(res => {
      img.addEventListener('load', res, { once: true });
      img.addEventListener('error', res, { once: true });
      setTimeout(res, 10000);
    });
  }));
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
}"""

def _norm_page(entry):
    suffix = "__dark" if DARK else ""
    if isinstance(entry, tuple):
        return entry[0], entry[1] + suffix + ".png"
    rel = entry
    stem = rel.split("?", 1)[0].replace("/", "__").rsplit(".", 1)[0]
    return rel, stem + suffix + ".png"


def shoot(page, rel, out_name):
    page.set_viewport_size({"width": W, "height": H0})
    page.goto(f"{BASE}/{rel}", wait_until="load", timeout=60000)
    try:
        page.wait_for_load_state("networkidle", timeout=20000)
    except Exception:
        pass
    try:
        page.evaluate(WAIT_FULL_LOAD)
    except Exception:
        pass
    page.wait_for_timeout(1800)
    page.evaluate(FORCE_THEME)
    page.wait_for_timeout(300)

    path_key = rel.split("?", 1)[0]
    hook = PAGE_AFTER_LOAD.get(path_key)
    if hook:
        try:
            page.evaluate(hook)
        except Exception:
            pass

    # Present all content (trigger observers), then let animations settle.
    page.evaluate(TRIGGER)
    page.wait_for_timeout(1800)
    page.evaluate(FORCE_REVEAL)
    page.evaluate(KILL_TRANSITIONS)

    # Pin the left chat at the loaded viewport height so it does not stretch
    # when the viewport grows to reveal the full right-hand module.
    page.evaluate(PIN_CHAT)

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
              const chatHost = el => el.closest && el.closest('#wa-chat,#rf-chat,#sa-chat,#aid-chat,.ap-chat,#gs-chat,#chat-shell,#wiseai-dock-panel,.sticky-chat');
              document.querySelectorAll('*').forEach(el => {
                if (chatHost(el)) return;
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
    page.screenshot(path=f"{OUT}/{out_name}", full_page=True)
    print(f"OK  {rel:40s} -> {out_name}  (vp {dims['w']}x{dims['h']}, doc {dims['dh']})", flush=True)

def main():
    only = sys.argv[1:]
    targets = []
    for entry in PAGES:
        rel, out_name = _norm_page(entry)
        if not only or any(o in rel for o in only):
            targets.append((rel, out_name))
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True)
        ctx = browser.new_context(viewport={"width": W, "height": H0},
                                  device_scale_factor=2)
        ctx.add_init_script(AUTH_INIT)
        page = ctx.new_page()
        for rel, out_name in targets:
            try:
                shoot(page, rel, out_name)
            except Exception as e:
                print(f"ERR {rel}: {e}", flush=True)
        browser.close()

if __name__ == "__main__":
    main()
