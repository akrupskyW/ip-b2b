#!/usr/bin/env python3
from playwright.sync_api import sync_playwright
BASE = "http://127.0.0.1:8099"
AUTH = "try{localStorage.setItem('wise-auth',JSON.stringify({loggedIn:true,name:'D',email:'d@w.com',initials:'D',at:new Date().toISOString()}));localStorage.setItem('wc_registration',JSON.stringify({name:'D',email:'d@w.com',orgname:'W'}));}catch(e){}"
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome", headless=True)
    ctx = b.new_context(viewport={"width":1600,"height":1100})
    page = ctx.new_page()
    errs=[]
    page.on("pageerror", lambda e: errs.append("PAGEERR: "+str(e)))
    page.on("console", lambda m: errs.append("CON["+m.type+"]: "+m.text) if m.type in ("error","warning") else None)
    page.add_init_script(AUTH)
    page.goto(f"{BASE}/pages/add-product.html", wait_until="load", timeout=60000)
    try: page.wait_for_load_state("networkidle", timeout=15000)
    except Exception: pass
    page.wait_for_timeout(1500)
    info = page.evaluate("""()=>{
      const pop=document.getElementById('ap-chat-menu');
      return {
        exists: !!pop,
        grouped: pop && pop.dataset.scGrouped,
        cls: pop && pop.className,
        stdWired: !!(pop && pop.__wiseStdMenuWired),
        hasGroupifyFn: typeof window.groupifyChatMenu,
        nItems: pop ? pop.querySelectorAll('.topbar-menu-item').length : -1,
        nGroups: pop ? pop.querySelectorAll('.sc-menu-group').length : -1,
        hasStyle: pop ? !!pop.querySelector('.sc-bganim-style') : false,
        stdMenuGlobal: typeof window.__wiseStdMenu,
      };
    }""")
    print("INFO", info)
    for e in errs[:30]: print(e)
    b.close()
