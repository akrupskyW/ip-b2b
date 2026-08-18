#!/usr/bin/env python3
"""Open the chat three-dot menu and screenshot the popover (light + dark)."""
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8099"
OUT = "/Users/aeykay/Desktop/_WISE/WISE_ip3/screenshots"

AUTH = """
try {
  localStorage.setItem('wise-auth', JSON.stringify({loggedIn:true,name:'Demo User',email:'demo@wisealliance.com',title:'Lead',org:'WISE',initials:'DU',at:new Date().toISOString()}));
  localStorage.setItem('wc_registration', JSON.stringify({name:'Demo User',email:'demo@wisealliance.com',title:'Lead',orgname:'WISE'}));
} catch(e){}
"""

TARGETS = [
    ("pages/wiseai.html", "#wa-chat .panel-more-btn", "menu__wiseai"),
    ("pages/add-product.html", "#ap-chat-menu-btn", "menu__add-product"),
]

def set_theme(page, dark):
    page.add_init_script(AUTH + (
        "try{localStorage.setItem('wise-theme','%s');localStorage.setItem('chat-theme','%s');}catch(e){}" % (
            ('dark','dark') if dark else ('light','light'))))

def shoot(page, rel, btn_sel, out, dark):
    page.goto(f"{BASE}/{rel}", wait_until="load", timeout=60000)
    try: page.wait_for_load_state("networkidle", timeout=15000)
    except Exception: pass
    page.evaluate("(d)=>{document.documentElement.classList.toggle('dark',d);}", dark)
    page.wait_for_timeout(1400)
    btn = page.query_selector(btn_sel)
    if not btn:
        print("NO BTN", rel, btn_sel); return
    btn.click()
    page.wait_for_timeout(700)
    pop = page.query_selector(".topbar-popover:not(.hidden), .topbar-popover.sc-menu-grouped:not(.hidden)")
    if not pop:
        pop = page.query_selector(".topbar-popover.sc-menu-grouped")
    if not pop:
        print("NO POP", rel); page.screenshot(path=f"{OUT}/{out}__{'dark' if dark else 'light'}_FAIL.png"); return
    box = pop.bounding_box()
    pad = 12
    clip = {"x":max(0,box["x"]-pad),"y":max(0,box["y"]-pad),"width":box["width"]+pad*2,"height":box["height"]+pad*2}
    name = f"{OUT}/{out}__{'dark' if dark else 'light'}.png"
    page.screenshot(path=name, clip=clip)
    grouped = page.evaluate("(el)=>el.classList.contains('sc-menu-grouped')", pop)
    ncols = page.evaluate("(el)=>getComputedStyle(el).columnWidth", pop)
    print(f"OK {rel} -> {name} grouped={grouped} colw={ncols} w={round(box['width'])}")

def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True)
        for dark in (False, True):
            ctx = browser.new_context(viewport={"width":1600,"height":1100}, device_scale_factor=2)
            page = ctx.new_page()
            set_theme(page, dark)
            for rel, sel, out in TARGETS:
                try: shoot(page, rel, sel, out, dark)
                except Exception as e: print("ERR", rel, e)
            ctx.close()
        browser.close()

if __name__ == "__main__":
    main()
