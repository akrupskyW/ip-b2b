/* WISEowl walkthrough — first-login / first-screen product tour.
 *
 * Lives in the existing docked-module shell (same .wch-sidebar.wch-docked
 * card as History / "What can I ask?") and walks the real designed pages.
 * No separate missions layout — Next takes you to product-portfolio,
 * add-product, comparison, etc. Progress is in localStorage (`wise-walkthrough`).
 *
 * Loaded once from js/agent-menu.js on every logged-in app page (self-guards).
 * Replay from Help or Preferences via window.WiseWalkthrough.open({ force: true }).
 *
 * Auto-open:
 *   • After sign-in / sign-up (session flag `wise-walkthrough-fresh`)
 *   • First visit to any app screen whose group isn't done yet
 *   • ?walkthrough=1 forces it open (for visual QA); ?walkthrough=0 suppresses
 */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  if (window.__wiseOwlWalkthroughReady) return;
  window.__wiseOwlWalkthroughReady = true;

  var STORE = 'wise-walkthrough';
  var VER = 1;
  var FRESH_KEY = 'wise-walkthrough-fresh';
  var SNOOZE_KEY = 'wise-walkthrough-snooze';
  var RESUME_KEY = 'wise-walkthrough-resume';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── Groups & steps — each step opens the real page ─────────────────────── */

  var GROUPS = [
    {
      id: 'hello',
      label: 'Meet WISEowl',
      icon: 'auto_awesome',
      pages: [],
      steps: [
        {
          id: 'hello-hi',
          title: 'Hey. I\u2019m the owl.',
          body: 'WISEcode is where brands keep the truth about their products \u2014 ingredients, Nutrition Facts, verification, reports \u2014 and where you ask me anything about food. This walkthrough is the map. Skip a chapter, go one by one, or bounce and come back. I\u2019ll remember.',
          bullets: [
            'Skip a group any time \u2014 progress still counts',
            'Jump around with the chips below',
            'Replay later from Help or Preferences'
          ]
        },
        {
          id: 'hello-room',
          title: 'This is the room.',
          body: 'Every screen in WISE is the same shell: a primary nav of Portfolio, Studio, and Admin, then one or more modules. The chat is not a sidebar toy \u2014 it\u2019s how the product thinks out loud. When you change something in a panel, I narrate it. When you ask me, the panel updates.',
          bullets: [
            'Primary nav \u2014 Overview, Portfolio, Studio, Admin',
            'Modules \u2014 cards you can widen, move, or stick',
            'WISEcodeAI \u2014 the owl chat, on every screen'
          ]
        },
        {
          id: 'hello-job',
          title: 'Here\u2019s what you actually need to know.',
          body: 'Each chip below is a chapter. Walk it, skip it, or jump in when you land on that screen for the first time \u2014 I\u2019ll open this module and cover just that chapter. Next takes you to the real page, not a mockup.',
          bullets: [
            'The workspace behind me is the product',
            'Next moves you onto the page we\u2019re talking about',
            'Progress only moves when you\u2019ve seen or skipped a step'
          ]
        }
      ]
    },
    {
      id: 'chat',
      label: 'Talk to me',
      icon: 'forum',
      pages: ['wiseai.html', 'conversation-library.html'],
      navIds: ['wiseai', 'wiseai-chat', 'library'],
      steps: [
        {
          id: 'chat-home',
          page: 'wiseai.html',
          title: 'Chat is home base.',
          body: 'WISEcodeAI is the product\u2019s front door. Ask about a food, a SKU, a shield, a report. I stream answers word by word. The helix behind me is on by default at a whisper (20% opacity) so the room still feels alive.',
          bullets: [
            'Type in the composer, or tap an intent chip',
            'Answers stream in \u2014 you can keep working while I talk',
            'The lock by the input is privacy, not a dead end \u2014 hover it'
          ]
        },
        {
          id: 'chat-ask',
          page: 'wiseai.html',
          title: 'I already know what people ask.',
          body: '\u201cWhat can I ask?\u201d is not decoration. Open it. Break it out. Steal the prompts. Intent chips under the welcome are real conversations. The three-dot menu is how you open sticky History.',
          bullets: [
            '\u201cWhat can I ask?\u201d opens inside chat and can break out',
            'Intent chips launch a real transcript',
            'Three-dot menu \u2192 History, and the rest of the chat options'
          ]
        },
        {
          id: 'chat-follow',
          page: 'conversation-library.html',
          title: 'I follow you around.',
          body: 'Add a product, flip a preference, run a comparison \u2014 I say it in the transcript as if I did it. The Conversation Library keeps past threads. You don\u2019t need to re-explain the workspace every time you change pages.',
          bullets: [
            'Docked chat on almost every workspace screen',
            'On-page actions echo into the conversation',
            'Library holds the archive when a thread outgrows the dock'
          ]
        }
      ]
    },
    {
      id: 'portfolio',
      label: 'Your products',
      icon: 'inventory_2',
      pages: ['product-portfolio.html', 'add-product.html', 'view-product.html', 'add-catalog.html'],
      navIds: ['product-portfolio'],
      steps: [
        {
          id: 'pf-hq',
          page: 'product-portfolio.html',
          title: 'Portfolio is headquarters.',
          body: 'Product Portfolio is where SKUs live: claimed, discovered, needs-info, ineligible, ready to verify. Filters and scorecards tell you what needs you. If you only bookmark one page besides chat, bookmark this.',
          bullets: [
            'Claimed / discovered / needs-info / ineligible \u2014 those statuses are the to-do list',
            'Open a product to see the full Nutrition Facts + ingredients',
            'Add Catalog when you\u2019re bringing in a set, not a single SKU'
          ]
        },
        {
          id: 'pf-add',
          page: 'add-product.html',
          title: 'Adding a product is a conversation.',
          body: 'Add Product is three modules that move as one: chat on the left, a live Nutrition Facts panel in the middle, progress on the right. Photos, serving size, nutrients, ingredients \u2014 edit the panel or answer me, it\u2019s the same draft. Nothing is saved until you hit Save to Portfolio.',
          bullets: [
            'Chat collects the fields; the NFP card is the source of truth you can edit',
            'Pack sizes can diverge from the base product',
            'Save to Portfolio is the commit \u2014 until then it\u2019s a draft'
          ]
        },
        {
          id: 'pf-next',
          page: 'product-portfolio.html',
          title: 'Statuses are marching orders.',
          body: 'Needs-info means the label isn\u2019t complete. Discovered means we found it and you haven\u2019t claimed it. Ineligible means it can\u2019t take a Shield (yet). Claimed and complete is when verification becomes the next honest step \u2014 not before.',
          bullets: [
            'Complete the data before you try to verify',
            'Claim what\u2019s yours so it stops living in limbo',
            'Ineligible is information, not a scolding'
          ]
        }
      ]
    },
    {
      id: 'compare',
      label: 'Compare',
      icon: 'compare',
      pages: ['product-comparison.html'],
      navIds: ['comparison'],
      steps: [
        {
          id: 'cmp-why',
          page: 'product-comparison.html',
          title: 'Put them next to each other.',
          body: 'Product Comparison is the side-by-side board: formats, nutrients, processing, the stuff that disappears when you look at SKUs one at a time. Use it when a buyer, a formulator, or you-at-11pm needs to see why one SKU wins.',
          bullets: [
            'Open Comparison from Portfolio or the nav',
            'Scorecards animate in \u2014 give them a second, they count up on purpose',
            'The board is the artifact you can talk through, not a screenshot of a table'
          ]
        },
        {
          id: 'cmp-read',
          page: 'product-comparison.html',
          title: 'Read the scorecards, not the noise.',
          body: 'Scorecards here don\u2019t wear decorative labels. The number, the comparison, the action. Click a chart later in Analytics and it will re-run the animation \u2014 including the count-up \u2014 so you can show the story twice.',
          bullets: [
            'Numbers count up on load. Let them land.',
            'No fake urgency eyebrows \u2014 if it\u2019s important, the card says so',
            'Take the \u201cquick tour\u201d chip on the page if you want the board walked in situ'
          ]
        }
      ]
    },
    {
      id: 'verify',
      label: 'Earn the Shield',
      icon: 'verified',
      pages: ['verification.html', 'gras-verification.html'],
      navIds: ['verification', 'non-upf-dashboard'],
      steps: [
        {
          id: 'vf-upf',
          page: 'verification.html',
          title: 'Non-UPF is a finished-product call.',
          body: 'Non-UPF verification looks at the finished SKU against the NOVA-style rules we use here. Pre-qualify, attest that the data matches the pack, pay per SKU, unlock the Shield for packaging and marketing. Hover any Shield chip in the app \u2014 I\u2019ll tell you what that exact status means.',
          bullets: [
            'Pre-qualified \u2192 attest \u2192 pay \u2192 Shield',
            'The mark is licensed for pack and marketing once it\u2019s minted',
            'Chip tooltips are the glossary \u2014 you don\u2019t have to memorize states'
          ]
        },
        {
          id: 'vf-gras',
          page: 'gras-verification.html',
          title: 'GRAS is the ingredient story.',
          body: 'GRAS verification lives at the ingredient layer \u2014 Generally Recognized As Safe, with evidence, not a shrug. You\u2019ll see GRAS chips in the Ingredient Browser, on products, and in the GRAS flow. Same hover-to-explain behavior as Shields.',
          bullets: [
            'Ingredient-level, not SKU-level',
            'Status chips explain themselves on hover',
            'Use it when a buyer or regulator asks \u201cwhat about the additive?\u201d'
          ]
        },
        {
          id: 'vf-attest',
          page: 'verification.html',
          title: 'Attestation is you, on the record.',
          body: 'You attest that the ingredient data matches what\u2019s on pack. Then payment. Then the asset unlocks \u2014 Shield artwork, claims language, the things marketing actually needs. Renewal is annual.',
          bullets: [
            'Attest only when the label data is actually true',
            'Payment is per SKU, not a mystery bundle',
            'Unlocked assets show up under Marketing Assets and Invoices'
          ]
        }
      ]
    },
    {
      id: 'studio',
      label: 'Studio tools',
      icon: 'science',
      pages: ['ingredient-browser.html', 'reports.html', 'analytics-types.html', 'reformulation.html', 'marketing-assets.html', 'report-guiding-stars.html'],
      navIds: ['ingredients', 'reports', 'reformulation', 'marketing-assets'],
      steps: [
        {
          id: 'st-ing',
          page: 'ingredient-browser.html',
          title: 'Ingredients have their own room.',
          body: 'The Ingredient Browser is the index of what\u2019s in the foods \u2014 names, GRAS, processing flags \u2014 so you can hunt a problematic additive across the lineup instead of opening SKUs one by one.',
          bullets: [
            'Search and filter the ingredient corpus',
            'GRAS chips here mean the same thing they mean everywhere',
            'Use it before you reformulate, not after you\u2019re already stuck'
          ]
        },
        {
          id: 'st-rep',
          page: 'analytics-types.html',
          title: 'Reports are how you show the work.',
          body: 'Reports and Analytics Types cover portfolio scores, distributions, exports. Charts re-animate when you click them \u2014 including count-ups \u2014 so a live walkthrough in a meeting isn\u2019t a frozen PNG. Guiding Stars and the other named reports live in the same neighborhood.',
          bullets: [
            'Reports in the Studio nav; Analytics Types for the chart catalog',
            'Click a chart to replay its animation',
            'Exports and PDFs also land under Invoices & Downloads'
          ]
        },
        {
          id: 'st-ref',
          page: 'reformulation.html',
          title: 'Reformulation is the \u201cwhat if\u201d bench.',
          body: 'Reformulation (Studio) is the workshop for swapping ingredients and watching NFP + processing implications move. Marketing Assets is where verified artwork and claims live once you\u2019ve earned them. Some Studio doors are still locked \u2014 that\u2019s an upgrade, not a bug.',
          bullets: [
            'Reformulate when verification says \u201cnot yet\u201d',
            'Marketing Assets = the unlocked pack/mark kit',
            'Studio & AI in the nav is the upgrade card if a door is locked'
          ]
        }
      ]
    },
    {
      id: 'dashboards',
      label: 'The big picture',
      icon: 'space_dashboard',
      pages: ['overview.html', 'ai-dashboard.html', 'non-upf-dashboard.html'],
      navIds: ['overview', 'ai-dashboard', 'non-upf-dashboard'],
      steps: [
        {
          id: 'dash-ov',
          page: 'overview.html',
          title: 'Overview is the front porch.',
          body: 'Overview is portfolio health, flags, and the things that need a human. It\u2019s the page you open when you don\u2019t yet know which module you need. Numbers count up. Dark mode is a first-class citizen \u2014 same story, different lights.',
          bullets: [
            'Start here when you don\u2019t have a specific task yet',
            'Hero numbers are supposed to move \u2014 that\u2019s the count-up',
            'Theme is global: one switch, every page'
          ]
        },
        {
          id: 'dash-spec',
          page: 'non-upf-dashboard.html',
          title: 'Then pick a specialist.',
          body: 'The AI Dashboard is the agent/operations view. The NON-UPF Dashboard is the processing scoreboard for the portfolio. Don\u2019t use one as a substitute for the other \u2014 they\u2019re zoomed into different jobs.',
          bullets: [
            'NON-UPF Dashboard \u2192 Shield progress and processing mix',
            'AI Dashboard \u2192 assistant activity and coverage',
            'Both sit under Portfolio in the nav, on purpose'
          ]
        }
      ]
    },
    {
      id: 'account',
      label: 'You & the org',
      icon: 'manage_accounts',
      pages: ['profile.html', 'preferences.html', 'invoices.html', 'api-keys.html', 'alerts.html', 'agents.html', 'help.html', 'docs.html', 'organizations.html', 'quick-invite.html', 'user-management.html', 'audit-queue.html', 'admin-utils.html', 'studio-ai.html'],
      navIds: ['profile', 'invoices', 'preferences', 'api-keys', 'help', 'docs', 'organizations', 'quick-invite', 'user-management', 'audit-queue', 'admin-utils', 'studio-ai', 'wisecode-admin'],
      steps: [
        {
          id: 'ac-you',
          page: 'preferences.html',
          title: 'Your name, your lights, your invoices.',
          body: 'My profile is identity and security. Preferences is theme, text size, notifications, dock side. Appearance in the primary nav is the fast version of the same idea. Invoices & Downloads is where receipts and unlocked files go. API keys, if you build.',
          bullets: [
            'Theme + text size persist everywhere (wise-theme / wise-text-size)',
            'Invoices & Downloads = money and files, together',
            'Admin (orgs, invites, users, audit) is for people who run the workspace'
          ]
        },
        {
          id: 'ac-again',
          page: 'help.html',
          title: 'You can always take this again.',
          body: 'First time on a screen you haven\u2019t finished, I\u2019ll open this module on just that group. After you\u2019ve seen everything \u2014 or skipped it on purpose \u2014 I stay quiet until you ask.',
          bullets: [
            'Help center \u2192 Replay the WISEowl walkthrough',
            'Preferences \u2192 Workspace \u2192 Replay tour',
            'Or add ?walkthrough=1 to any app URL when you want this module now'
          ]
        }
      ]
    }
  ];

  var ALL_STEPS = [];
  GROUPS.forEach(function (g) {
    g.steps.forEach(function (s, i) {
      ALL_STEPS.push({
        gid: g.id,
        group: g,
        step: s,
        index: ALL_STEPS.length,
        groupIndex: i
      });
    });
  });

  function stepById(id) {
    for (var i = 0; i < ALL_STEPS.length; i++) if (ALL_STEPS[i].step.id === id) return ALL_STEPS[i];
    return null;
  }

  function groupById(id) {
    for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].id === id) return GROUPS[i];
    return null;
  }

  function stepPage(cur) {
    if (!cur) return '';
    if (cur.step.page) return cur.step.page;
    return (cur.group.pages && cur.group.pages[0]) || '';
  }

  /* ── Persistence ────────────────────────────────────────────────────────── */

  function blankState() {
    return {
      v: VER,
      completed: false,
      dismissed: false,
      doneSteps: [],
      skippedGroups: [],
      screensSeen: {},
      cursor: ALL_STEPS[0] ? ALL_STEPS[0].step.id : ''
    };
  }

  function readState() {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return blankState();
      var s = JSON.parse(raw);
      if (!s || s.v !== VER) return blankState();
      return {
        v: VER,
        completed: !!s.completed,
        dismissed: !!s.dismissed,
        doneSteps: Array.isArray(s.doneSteps) ? s.doneSteps : [],
        skippedGroups: Array.isArray(s.skippedGroups) ? s.skippedGroups : [],
        screensSeen: s.screensSeen && typeof s.screensSeen === 'object' ? s.screensSeen : {},
        cursor: s.cursor || (ALL_STEPS[0] && ALL_STEPS[0].step.id) || ''
      };
    } catch (e) {
      return blankState();
    }
  }

  function writeState(st) {
    try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) {}
  }

  function isDone(st, id) { return st.doneSteps.indexOf(id) !== -1; }
  function isSkippedGroup(st, gid) { return st.skippedGroups.indexOf(gid) !== -1; }

  function markDone(st, id) {
    if (st.doneSteps.indexOf(id) === -1) st.doneSteps.push(id);
    st.cursor = id;
    var all = ALL_STEPS.every(function (x) {
      return st.doneSteps.indexOf(x.step.id) !== -1 || isSkippedGroup(st, x.gid);
    });
    if (all) st.completed = true;
    writeState(st);
  }

  function groupStats(st, g) {
    var total = g.steps.length;
    var done = 0;
    g.steps.forEach(function (s) { if (isDone(st, s.id)) done++; });
    var skipped = isSkippedGroup(st, g.id);
    var complete = skipped || done === total;
    return { total: total, done: done, skipped: skipped, complete: complete };
  }

  function overall(st) {
    var total = ALL_STEPS.length;
    var done = 0;
    ALL_STEPS.forEach(function (x) {
      if (isDone(st, x.step.id) || isSkippedGroup(st, x.gid)) done++;
    });
    var groupsDone = 0;
    GROUPS.forEach(function (g) { if (groupStats(st, g).complete) groupsDone++; });
    return { total: total, done: done, groupsDone: groupsDone, groups: GROUPS.length, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  /* ── Page \u2192 group ──────────────────────────────────────────────────────── */

  function currentPage() {
    return (location.pathname.split('/').pop() || '').toLowerCase();
  }
  function currentNavId() {
    return (document.body && (document.body.getAttribute('data-nav-id') || document.body.getAttribute('data-product-id'))) || '';
  }
  function groupForPage(page, navId) {
    var i, g;
    for (i = 0; i < GROUPS.length; i++) {
      g = GROUPS[i];
      if (g.pages && g.pages.indexOf(page) !== -1) return g.id;
      if (navId && g.navIds && g.navIds.indexOf(navId) !== -1) return g.id;
    }
    return null;
  }

  function queryFlag() {
    try {
      var q = new URLSearchParams(location.search);
      if (q.get('walkthrough') === '0' || q.get('tour') === '0') return 'off';
      if (q.get('walkthrough') === '1' || q.get('tour') === '1') return 'on';
    } catch (e) {}
    return '';
  }

  function queryStep() {
    try {
      var id = new URLSearchParams(location.search).get('owt');
      return id && stepById(id) ? id : '';
    } catch (e) { return ''; }
  }

  /* ── DOM \u2014 existing docked-module shell ─────────────────────────────────── */

  var els = null;
  var cursorId = '';
  var screenIntro = false;
  var lastFocus = null;
  var widthTier = 0;
  var WIDTH_ICONS = ['width_normal', 'width_wide', 'width_full', 'width_full'];
  var WIDTH_TITLES = [
    'Width (single) — tap to widen',
    'Width (double) — tap to widen',
    'Width (triple) — tap to widen',
    'Width (fill) — tap to reset'
  ];

  function hostRow() {
    return document.getElementById('modules-row');
  }

  function applyWidth() {
    var aside = els && els.root;
    if (!aside) return;
    var base = 360;
    var tiers = [base, Math.round(base * 1.5), base * 2];
    try {
      window.WisePaneResize && window.WisePaneResize.release && window.WisePaneResize.release([aside]);
    } catch (e) {}
    if (window.WPaneWidth) {
      window.WPaneWidth.applyClasses(aside, widthTier, 'panel');
      window.WPaneWidth.syncButton(els.widthBtn, widthTier);
    }
    if (widthTier >= 3) {
      aside.style.setProperty('flex', '1000 1 auto', 'important');
      aside.style.setProperty('width', 'auto', 'important');
      aside.style.setProperty('max-width', 'none', 'important');
    } else {
      var w = tiers[widthTier] || base;
      aside.style.setProperty('flex', '0 0 ' + w + 'px', 'important');
      aside.style.setProperty('width', w + 'px', 'important');
      aside.style.setProperty('max-width', 'none', 'important');
    }
    var btn = els.widthBtn;
    if (btn && !window.WPaneWidth) {
      btn.classList.toggle('is-on', widthTier >= 1);
      btn.setAttribute('aria-pressed', widthTier >= 1 ? 'true' : 'false');
      btn.title = WIDTH_TITLES[widthTier];
      var ic = btn.querySelector('.material-symbols-outlined');
      if (ic) ic.textContent = WIDTH_ICONS[widthTier];
    }
  }

  function closeMore() {
    if (!els || !els.morePop || !els.moreBtn) return;
    els.morePop.classList.add('hidden');
    els.moreBtn.classList.remove('is-open');
    els.moreBtn.setAttribute('aria-expanded', 'false');
  }

  function placeMorePop() {
    var pop = els.morePop;
    var btn = els.moreBtn;
    if (!pop || !btn) return;
    if (pop.parentElement !== document.body) document.body.appendChild(pop);
    pop.style.position = 'fixed';
    pop.style.zIndex = '3000';
    var w = pop.offsetWidth || 240;
    var h = pop.offsetHeight || 80;
    var r = btn.getBoundingClientRect();
    var top = r.top - h - 6;
    if (top < 6) top = r.top;
    pop.style.top = Math.max(6, top) + 'px';
    pop.style.left = Math.max(6, Math.min(r.right - w, window.innerWidth - w - 6)) + 'px';
    pop.style.right = 'auto';
  }

  function ensure() {
    if (els && els.root && els.root.isConnected) return els;
    var aside = document.createElement('aside');
    aside.className = 'wch-sidebar wch-docked wch-right wch-ask-panel wch-unsticky owt-mod';
    aside.setAttribute('role', 'dialog');
    aside.setAttribute('aria-labelledby', 'owt-title');
    aside.innerHTML =
      '<div class="wch-head">' +
        '<div class="owt-mast">' +
          '<span class="wch-head-title" id="owt-title">WISEowl walkthrough</span>' +
          '<p class="owt-kicker" id="owt-kicker"></p>' +
        '</div>' +
        '<div class="wch-controls">' +
          '<div class="panel-more-wrap owt-more-wrap">' +
            '<button type="button" class="panel-more-btn owt-more-btn" title="More options" aria-haspopup="menu" aria-expanded="false" aria-label="More options">' +
              '<span class="material-symbols-outlined">more_vert</span>' +
            '</button>' +
            '<div class="topbar-popover hidden owt-more-pop" role="menu">' +
              '<button type="button" class="topbar-menu-item topbar-menu-item--danger" data-owt="snooze">' +
                '<span class="material-symbols-outlined topbar-menu-icon">close</span>' +
                '<span>Close pane</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="panel-width-toggle-btn owt-width-btn" aria-pressed="false" title="Width (single) — tap to widen" aria-label="Walkthrough module width">' +
            '<span class="material-symbols-outlined">width_normal</span>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<nav class="owt-nav" aria-label="Walkthrough steps">' +
        '<div class="owt-nav-skips">' +
          '<button type="button" class="owt-nav-link" data-owt="skip-group">Skip this group</button>' +
          '<span class="owt-nav-sep" aria-hidden="true">\u00b7</span>' +
          '<button type="button" class="owt-nav-link" data-owt="skip-rest">Skip remaining</button>' +
        '</div>' +
        '<div class="owt-nav-move">' +
          '<button type="button" class="owt-nav-link" data-owt="back">Back</button>' +
          '<button type="button" class="owt-nav-link owt-nav-link--next" data-owt="next">Next</button>' +
        '</div>' +
      '</nav>' +
      '<div class="owt-body" data-owt="body"></div>';
    var row = hostRow();
    if (row) row.appendChild(aside);
    else document.body.appendChild(aside);
    els = {
      root: aside,
      title: aside.querySelector('#owt-title'),
      kicker: aside.querySelector('#owt-kicker'),
      body: aside.querySelector('[data-owt="body"]'),
      back: aside.querySelector('[data-owt="back"]'),
      next: aside.querySelector('[data-owt="next"]'),
      skipGroup: aside.querySelector('[data-owt="skip-group"]'),
      moreWrap: aside.querySelector('.owt-more-wrap'),
      moreBtn: aside.querySelector('.owt-more-btn'),
      morePop: aside.querySelector('.owt-more-pop'),
      widthBtn: aside.querySelector('.owt-width-btn')
    };
    aside.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    if (els.widthBtn) {
      els.widthBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        widthTier = (widthTier + 1) % 4;
        applyWidth();
      });
    }
    if (els.moreBtn && els.morePop) {
      els.moreBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var willOpen = els.morePop.classList.contains('hidden');
        els.morePop.classList.toggle('hidden', !willOpen);
        els.moreBtn.classList.toggle('is-open', willOpen);
        els.moreBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        if (willOpen) placeMorePop();
      });
      els.morePop.addEventListener('click', onClick);
      document.addEventListener('click', function (e) {
        if (!els || !els.morePop || els.morePop.classList.contains('hidden')) return;
        if (els.moreWrap.contains(e.target) || els.morePop.contains(e.target)) return;
        closeMore();
      });
    }
    applyWidth();
    return els;
  }

  function onClick(e) {
    var t = e.target.closest('[data-owt]');
    if (!t) return;
    var act = t.getAttribute('data-owt');
    if (act === 'snooze') { snooze(false); return; }
    if (act === 'skip-rest') { snooze(true); return; }
    if (act === 'skip-group') { skipGroup(); return; }
    if (act === 'back') { go(-1); return; }
    if (act === 'next') { go(1); return; }
    if (act === 'goto') { jumpTo(t.getAttribute('data-gid'), null); return; }
  }

  function onKey(e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); snooze(false); }
  }

  function paint() {
    var e = ensure();
    var st = readState();
    var cur = stepById(cursorId) || ALL_STEPS[0];
    if (!cur) return;
    var ov = overall(st);
    var gs = groupStats(st, cur.group);
    var s = cur.step;
    var isLast = cur.index === ALL_STEPS.length - 1;
    var isFirst = cur.index === 0;

    e.title.textContent = s.title;
    e.kicker.textContent =
      (screenIntro ? 'First time here \u00b7 ' : '') +
      cur.group.label +
      ' \u00b7 step ' + (cur.groupIndex + 1) + ' of ' + cur.group.steps.length +
      ' \u00b7 ' + ov.done + ' of ' + ov.total;

    var chips = GROUPS.map(function (g) {
      var gs2 = groupStats(st, g);
      var on = g.id === cur.gid;
      var state = gs2.skipped ? 'skip' : (gs2.complete ? 'done' : 'todo');
      return (
        '<button type="button" class="chip ws-intent-chip" data-owt="goto" data-gid="' + g.id + '"' +
          (on ? ' aria-current="true"' : '') + '>' +
          '<span class="material-symbols-outlined" aria-hidden="true">' +
            (state === 'done' ? 'check_circle' : g.icon) +
          '</span>' +
          esc(g.label) +
        '</button>'
      );
    }).join('');

    var bullets = (s.bullets || []).map(function (b) {
      return '<li>' + b + '</li>';
    }).join('');

    e.body.innerHTML =
      (s.body ? '<p class="owt-copy">' + s.body + '</p>' : '') +
      (bullets ? '<ul class="owt-bullets">' + bullets + '</ul>' : '') +
      '<div class="owt-chips ws-chips" role="navigation" aria-label="Walkthrough groups">' + chips + '</div>';

    e.back.disabled = isFirst;
    e.next.textContent = isLast ? 'Finish' : 'Next';
    e.skipGroup.textContent = gs.skipped ? 'Group skipped' : 'Skip this group';
    e.skipGroup.disabled = gs.skipped;
  }

  function goToPage(id) {
    var cur = stepById(id);
    var page = stepPage(cur);
    if (!page || currentPage() === page) return false;
    try { sessionStorage.setItem(RESUME_KEY, id); } catch (e) {}
    location.href = page;
    return true;
  }

  function jumpTo(gid, sid) {
    var g = groupById(gid);
    if (!g) return;
    var id = sid || (g.steps[0] && g.steps[0].id);
    if (!stepById(id)) return;
    cursorId = id;
    var st = readState();
    st.cursor = id;
    writeState(st);
    if (goToPage(id)) return;
    paint();
  }

  function go(dir) {
    var cur = stepById(cursorId) || ALL_STEPS[0];
    if (!cur) return;
    var st = readState();
    if (dir > 0) markDone(st, cur.step.id);
    if (dir > 0 && cur.index === ALL_STEPS.length - 1) {
      st.completed = true;
      writeState(st);
      close(true);
      return;
    }
    var next = ALL_STEPS[cur.index + dir];
    if (!next) return;
    cursorId = next.step.id;
    st.cursor = cursorId;
    writeState(st);
    if (goToPage(cursorId)) return;
    paint();
  }

  function skipGroup() {
    var cur = stepById(cursorId);
    if (!cur) return;
    var st = readState();
    if (st.skippedGroups.indexOf(cur.gid) === -1) st.skippedGroups.push(cur.gid);
    cur.group.steps.forEach(function (s) { markDone(st, s.id); });
    var nextG = GROUPS[GROUPS.indexOf(cur.group) + 1];
    if (!nextG) {
      st.completed = true;
      writeState(st);
      close(true);
      return;
    }
    cursorId = nextG.steps[0].id;
    st.cursor = cursorId;
    writeState(st);
    if (goToPage(cursorId)) return;
    paint();
  }

  function snooze(all) {
    try {
      sessionStorage.setItem(SNOOZE_KEY, all ? 'all' : 'full');
    } catch (e) {}
    var st = readState();
    st.cursor = cursorId;
    if (all) st.dismissed = true;
    writeState(st);
    close(false);
  }

  function markScreenSeen() {
    var st = readState();
    st.screensSeen[currentPage() || '_'] = true;
    writeState(st);
  }

  function open(opts) {
    opts = opts || {};
    var st = readState();
    screenIntro = !!opts.screenIntro;
    if (opts.group) {
      var g = groupById(opts.group);
      var here = currentPage();
      var pageMatch = g && g.steps.filter(function (s) { return s.page === here; })[0];
      var unread = g && g.steps.filter(function (s) { return !isDone(st, s.id); })[0];
      cursorId = (pageMatch && pageMatch.id) || (unread && unread.id) || (g && g.steps[0] && g.steps[0].id) || st.cursor || ALL_STEPS[0].step.id;
    } else if (opts.step) {
      cursorId = opts.step;
    } else if (st.cursor && stepById(st.cursor)) {
      cursorId = st.cursor;
    } else {
      cursorId = ALL_STEPS[0].step.id;
    }
    if (opts.reset) {
      st = blankState();
      writeState(st);
      cursorId = ALL_STEPS[0].step.id;
    }
    lastFocus = document.activeElement;
    ensure();
    paint();
    els.root.hidden = false;
    els.root.classList.remove('wch-docked-hidden');
    markScreenSeen();
  }

  function close(finished) {
    if (!els || !els.root) return;
    closeMore();
    if (els.morePop && els.morePop.parentNode === document.body) els.morePop.remove();
    els.root.hidden = true;
    els.root.classList.add('wch-docked-hidden');
    if (els.root.parentNode) els.root.parentNode.removeChild(els.root);
    els = null;
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch (e) {}
    }
    if (finished) {
      var st = readState();
      st.completed = true;
      writeState(st);
    }
  }

  function isOpen() {
    return !!(els && els.root && els.root.isConnected && !els.root.hidden);
  }

  function reset() {
    writeState(blankState());
    try {
      sessionStorage.removeItem(SNOOZE_KEY);
      sessionStorage.removeItem(FRESH_KEY);
      sessionStorage.removeItem(RESUME_KEY);
    } catch (e) {}
  }

  /* ── Auto-open policy ───────────────────────────────────────────────────── */

  function shouldOpen() {
    var flag = queryFlag();
    if (flag === 'off') return null;
    if (flag === 'on') {
      var qStep = queryStep();
      if (qStep) return { force: true, step: qStep };
      var mapped = groupForPage(currentPage(), currentNavId());
      if (mapped) return { force: true, group: mapped, screenIntro: true };
      return { force: true };
    }

    var resume = '';
    try { resume = sessionStorage.getItem(RESUME_KEY) || ''; } catch (e) {}
    if (resume && stepById(resume)) {
      try { sessionStorage.removeItem(RESUME_KEY); } catch (e) {}
      return { force: true, step: resume };
    }

    // Off by default: the walkthrough never auto-opens on sign-in or on the
    // first visit to a screen. It only appears when the user turns the
    // "Walkthrough" toggle on in the Appearance popover (or replays it from
    // Help / Preferences) — plus the ?walkthrough=1 QA override and the
    // cross-page resume, both handled above.
    return null;
  }

  function boot() {
    if (!document.body) return;
    if (!document.getElementById('menu-panel') && !document.getElementById('modules-row')) return;

    window.WiseWalkthrough = {
      open: function (opts) {
        opts = opts || {};
        open({
          force: true,
          reset: !!opts.reset,
          group: opts.group,
          step: opts.step,
          screenIntro: !!opts.screenIntro
        });
      },
      close: function () { snooze(false); },
      reset: reset,
      isOpen: isOpen,
      groups: GROUPS
    };
    try { document.dispatchEvent(new CustomEvent('wise:walkthrough-ready')); } catch (e) {}

    var plan = shouldOpen();
    if (!plan) return;
    setTimeout(function () {
      if (isOpen()) return;
      open(plan);
    }, 480);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
