#!/usr/bin/env python3
"""16:10 Page Gallery thumbs — one light and one dark PNG per unique screen.

The gallery cards are a 1440×900 iframe (16:10). This script captures that
same crop, then writes 720×450 PNGs to screenshots/gallery-thumbs/ so the
placeholder under each live preview matches the current UI.

Page list is read from js/module-directory-data.js so a newly catalogued
screen is captured on the next run. page-gallery.html and the pitch deck
stay out (same omitted set as the gallery itself).

  python3 screenshots/_gallery_thumbs.py
  WISE_THEME=dark python3 screenshots/_gallery_thumbs.py
  python3 screenshots/_gallery_thumbs.py teams helix support
"""
import os
import re
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = "http://127.0.0.1:8099"
OUT = ROOT / "screenshots" / "gallery-thumbs"
CATALOG = ROOT / "js" / "module-directory-data.js"

THEME = os.environ.get("WISE_THEME", "light").lower()
DARK = THEME == "dark"

W, H = 1440, 900
THUMB = (720, 450)

OMITTED = {"page-gallery.html", "app-vision-deck.html"}

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
  localStorage.setItem('wise-walkthrough', JSON.stringify({
    v: 1, completed: true, dismissed: true, doneSteps: ['*'],
    skippedGroups: [], screensSeen: {'*': true}, cursor: ''
  }));
} catch (e) {}
""" % {"theme": THEME}

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

KILL_TRANSITIONS = """() => {
  const s = document.createElement('style');
  s.textContent = '*,*::before,*::after{transition:none!important;scroll-behavior:auto!important}';
  document.documentElement.appendChild(s);
}"""

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
      setTimeout(res, 6000);
    });
  }));
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
}"""

# Same ready-checks as _shoot.py, plus pages the gallery cards but _shoot.py
# did not specially wait for. Timeouts stay under 12s — thumbs only need
# the first screen.
PAGE_AFTER_LOAD = {
    "pages/all-modules.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('#mi-components, .mi-module-head, .mi-dir-card');
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 12000);
      });
      await new Promise(r => setTimeout(r, 600));
    }""",
    "pages/view-product.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('.nfp-sp-strip, .nfp-cmp-grid, .nfp-ia, .dash-score-card');
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 12000);
      });
      await new Promise(r => setTimeout(r, 600));
    }""",
    "pages/add-product.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('.nfp-ia, .nfp-sp-strip, .nfp-fi-lead-photo');
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 12000);
      });
      await new Promise(r => setTimeout(r, 600));
    }""",
    "pages/ai-dashboard.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('#aid-kpis') && document.querySelector('#aid-kpis').children.length;
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 12000);
      });
      await new Promise(r => setTimeout(r, 800));
    }""",
    "pages/conversation-library.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('.lib-card');
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 12000);
      });
      await new Promise(r => setTimeout(r, 500));
    }""",
    "pages/ingredient-browser.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('#ib-rows') && document.querySelector('#ib-rows').children.length;
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 12000);
      });
      await new Promise(r => setTimeout(r, 500));
    }""",
    "pages/analytics-types.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('#upf-table-wrap, .dash-section-title, .dash-hero-title, [data-az-thumb]');
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 12000);
      });
      await new Promise(r => setTimeout(r, 800));
    }""",
    "pages/add-catalog.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('#cat-body') && document.querySelector('#cat-body').children.length;
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 12000);
      });
      await new Promise(r => setTimeout(r, 500));
    }""",
    "pages/progress-log.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('.pl-day, #pl-cat-stats .pl-stat, .pl-pcard');
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 12000);
      });
      await new Promise(r => setTimeout(r, 400));
    }""",
    "pages/teams.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('[data-tm-board], .adm-trow, .adm-title');
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 12000);
      });
      await new Promise(r => setTimeout(r, 500));
    }""",
    "pages/helix.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('#wa-chat, canvas, [data-helix-studio]');
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 12000);
      });
      await new Promise(r => setTimeout(r, 1800));
    }""",
    "pages/wiseai.html": """async () => {
      await new Promise(r => {
        const ok = () => document.querySelector('#wa-chat, .ws-intent-chip, canvas');
        if (ok()) return r();
        const obs = new MutationObserver(() => { if (ok()) { obs.disconnect(); r(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); r(); }, 12000);
      });
      await new Promise(r => setTimeout(r, 1600));
    }""",
}


def catalog_pages():
    """Unique HTML files from MODULE_SECTIONS. First occurrence wins."""
    text = CATALOG.read_text()
    hrefs = re.findall(r"href:\s*'([^']+\.html)(?:#[^']*)?'", text)
    out = []
    seen = set()
    for href in hrefs:
        path = href.split("#")[0].split("?")[0]
        name = path.split("/")[-1]
        if name in OMITTED:
            continue
        if path.startswith("../"):
            rel = path[3:]
            stem = rel.replace(".html", "")
        else:
            rel = "pages/" + name
            stem = "pages__" + name.replace(".html", "")
        if stem in seen:
            continue
        seen.add(stem)
        out.append((rel, stem))
    return out


def preview_url(rel):
    sep = "&" if "?" in rel else "?"
    return f"{BASE}/{rel}{sep}preview=1"


def shoot(page, rel, stem):
    page.set_viewport_size({"width": W, "height": H})
    page.goto(preview_url(rel), wait_until="load", timeout=60000)
    try:
        page.wait_for_load_state("networkidle", timeout=12000)
    except Exception:
        pass
    try:
        page.evaluate(WAIT_FULL_LOAD)
    except Exception:
        pass
    page.wait_for_timeout(900)
    page.evaluate(FORCE_THEME)
    page.wait_for_timeout(200)

    hook = PAGE_AFTER_LOAD.get(rel.split("?", 1)[0])
    if hook:
        try:
            page.evaluate(hook)
        except Exception:
            pass

    try:
        page.evaluate(FORCE_REVEAL)
        page.evaluate(KILL_TRANSITIONS)
    except Exception:
        pass
    page.wait_for_timeout(350)

    suffix = "__dark" if DARK else ""
    out_name = f"{stem}{suffix}.png"
    dest = OUT / out_name
    tmp = dest.with_suffix(".full.png")
    page.screenshot(path=str(tmp), full_page=False, clip={"x": 0, "y": 0, "width": W, "height": H})
    im = Image.open(tmp)
    im = im.convert("RGB").resize(THUMB, Image.Resampling.LANCZOS)
    im.save(dest, "PNG", optimize=True)
    tmp.unlink(missing_ok=True)

    # support.html used to be help.html — keep the old stem so leftover
    # cards and fallbacks still resolve.
    if stem == "pages__support":
        alias = OUT / f"pages__help{suffix}.png"
        im.save(alias, "PNG", optimize=True)

    print(f"OK  {rel:42s} -> {out_name}  ({im.size[0]}x{im.size[1]})", flush=True)
    return dest


def main():
    only = sys.argv[1:]
    pages = catalog_pages()
    if not pages:
        print("ERR no catalog pages found", file=sys.stderr)
        sys.exit(1)
    targets = [(rel, stem) for rel, stem in pages if not only or any(o in rel or o in stem for o in only)]
    OUT.mkdir(parents=True, exist_ok=True)
    print(f"Theme {THEME} · {len(targets)} page(s)", flush=True)
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True)
        ctx = browser.new_context(
            viewport={"width": W, "height": H},
            device_scale_factor=2,
        )
        ctx.add_init_script(AUTH_INIT)
        page = ctx.new_page()
        for rel, stem in targets:
            try:
                shoot(page, rel, stem)
            except Exception as e:
                errors.append((rel, str(e)))
                print(f"ERR {rel}: {e}", flush=True)
        browser.close()
    if errors:
        print(f"Done with {len(errors)} error(s)", flush=True)
        sys.exit(1)
    print("Done.", flush=True)


if __name__ == "__main__":
    main()
