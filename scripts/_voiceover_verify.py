#!/usr/bin/env python3
"""Verify the playful-story voiceover picker on wiseai.html."""
import json, os, sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8765"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots/_diag"
os.makedirs(OUT, exist_ok=True)

AUTH = """
try {
  localStorage.setItem('wise-auth', JSON.stringify({
    loggedIn: true, name: 'Demo User', email: 'demo@wisealliance.com',
    title: 'Product Intelligence Lead', org: 'WISE Foods',
    initials: 'DU', at: new Date().toISOString()
  }));
  localStorage.setItem('wise-walkthrough', JSON.stringify({
    v: 1, completed: true, dismissed: true, doneSteps: ['*'],
    skippedGroups: [], screensSeen: {'*': true}, cursor: ''
  }));
  localStorage.setItem('wise-admin-ui', '0');
} catch (e) {}
"""

def force_theme(theme):
    return """() => {
      try {
        localStorage.setItem('wise-theme', %s);
        localStorage.setItem('chat-theme', %s);
      } catch (e) {}
      document.documentElement.classList.toggle('dark', %s);
    }""" % (json.dumps(theme), json.dumps(theme), 'true' if theme == 'dark' else 'false')

def run(page, theme):
    page.add_init_script(AUTH)
    page.add_init_script("() => { %s }" % AUTH.replace('\n', ' '))
    page.goto(BASE + "/pages/wiseai.html", wait_until="domcontentloaded")
    page.evaluate(force_theme(theme))
    page.wait_for_timeout(1800)

    more = page.locator(".wa-chat .panel-more-btn, #wiseai-chat .panel-more-btn, .sc-card .panel-more-btn").first
    more.wait_for(state="visible", timeout=8000)
    more.click()
    page.wait_for_timeout(400)

    voice = page.locator('[data-sc="voiceover"]').first
    voice.wait_for(state="visible", timeout=4000)
    labels = page.evaluate("""() => {
      const item = document.querySelector('[data-sc="voiceover"]');
      return item ? {
        text: (item.innerText || '').replace(/\\s+/g, ' ').trim(),
        inConversation: !!(item.closest('.sc-menu-group--conversation'))
      } : null;
    }""")
    print("menu_item", theme, labels)

    page.screenshot(path=os.path.join(OUT, "voiceover-menu__%s.png" % theme), full_page=False)
    voice.click()
    page.wait_for_timeout(400)

    picker = page.locator(".sc-voice-pop.open")
    picker.wait_for(state="visible", timeout=4000)
    info = page.evaluate("""() => {
      const pop = document.querySelector('.sc-voice-pop.open');
      if (!pop) return { open: false };
      const names = Array.from(pop.querySelectorAll('.fl-db-name')).map(e => e.textContent.trim());
      const groups = Array.from(pop.querySelectorAll('.fl-db-grouptitle')).map(e => e.textContent.trim());
      const chips = Array.from(pop.querySelectorAll('[data-voice-chip]')).map(e => e.textContent.trim());
      return { open: true, names, groups, chips, play: (pop.querySelector('[data-voice-play]') || {}).innerText };
    }""")
    print("picker", theme, json.dumps(info, indent=2))
    page.screenshot(path=os.path.join(OUT, "voiceover-picker__%s.png" % theme), full_page=False)

    # Transcript path: the playful story still prints the same parody.
    page.evaluate("""() => {
      const pop = document.querySelector('.sc-voice-pop.open');
      if (pop) pop.classList.remove('open');
    }""")
    typed = page.evaluate("""() => {
      const input = document.querySelector('.wa-chat textarea.fl-input, .sc-card textarea.fl-input');
      const send = document.querySelector('.wa-chat .sc-send, .sc-card .sc-send');
      if (!input || !send) return 'no-composer';
      input.value = 'Tell me a playful story.';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      send.click();
      return 'sent';
    }""")
    print("send", theme, typed)
    page.wait_for_timeout(12000)
    has = page.evaluate("""() => {
      const t = document.body.innerText || '';
      return {
        unwise: /UNWISEcode/i.test(t),
        sdumpf: /SDUMPF|Super-Duper-Ultra-Mega-Processed/i.test(t),
        tagged: !!document.querySelector('[data-voiceover="playful"]')
      };
    }""")
    print("story", theme, has)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for theme in ("light", "dark"):
        ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
        page = ctx.new_page()
        run(page, theme)
        ctx.close()
    browser.close()
print("done")
