/* =====================================================================
   WISE marketing — the shared APP SHELL.

   One shell for every marketing page. It owns the two things the product
   asks to be shared across the whole marketing surface:

     1) The primary navigation — defined ONCE here (NAV_HTML) and injected
        into every page, so there is a single source of truth for the nav.

     2) The WISEai chat — mounted ONCE into a docked rail and NEVER torn
        down. Moving between marketing pages is a soft, client-side route
        swap (only #mkt-body-module is replaced), so the conversation keeps
        going regardless of which page you're on. The only thing that changes
        per page is the set of intent chips, swapped live via chat.setIntents().

   The shell also carries the WISE Web Scanner rail (opened by the "scan"
   intent) and mirrors the chat transcript to localStorage, so even a hard
   reload or a direct deep-link lands you back in the same conversation.

   Loaded as a module AFTER js/marketing.js (which exposes window.WiseMarketing
   and, seeing window.__WISE_MKT_SHELL__, defers its own boot to us).
===================================================================== */
import { mountWISEaiChat, OWL_BUG, OWL_MARK } from './wiseai-chat.js';

/* App-store glyphs reused inside the "Get the app" reply. */
const APPLE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.365 1.43c0 1.14-.42 2.2-1.13 3-.79.9-2.1 1.6-3.19 1.51-.14-1.1.42-2.27 1.09-3 .77-.85 2.14-1.5 3.23-1.51zM20.5 17.02c-.55 1.27-.82 1.84-1.53 2.96-.99 1.57-2.39 3.52-4.12 3.53-1.54.02-1.94-1-4.03-.99-2.09.01-2.53 1.01-4.07.99-1.73-.01-3.06-1.78-4.05-3.35-2.77-4.4-3.06-9.56-1.35-12.3 1.21-1.95 3.13-3.09 4.93-3.09 1.84 0 2.99 1.01 4.51 1.01 1.47 0 2.37-1.01 4.5-1.01 1.61 0 3.31.88 4.52 2.4-3.97 2.18-3.32 7.85.22 9.84z"/></svg>';
const PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#34d399" d="M3.6 2.1 13.3 12 3.6 21.9c-.4-.2-.6-.6-.6-1.1V3.2c0-.5.2-.9.6-1.1z"/><path fill="#60a5fa" d="M17.3 8.1 14 11.4 3.9 1.9c.2-.1.5-.1.8.1l12.6 6.1z"/><path fill="#f87171" d="M17.3 15.9 4.7 22c-.3.2-.6.2-.8.1L14 12.6l3.3 3.3z"/><path fill="#fbbf24" d="m17.3 8.1 3.4 1.7c.7.4.7 1.4 0 1.8l-3.4 1.7L13.7 12l3.6-3.9z"/></svg>';

/* ---------------------------------------------------------------------
   Shared primary navigation — ONE definition for every marketing page.
   Product links carry data-route so the shell can flag the active one; all
   internal anchors are routed by the client-side router below regardless.
--------------------------------------------------------------------- */
const NAV_HTML = `
  <nav class="mkt-nav" data-mkt-nav aria-label="Primary">
    <button class="mkt-nav-icon mkt-nav-toggle" type="button" data-mkt-nav-toggle aria-controls="mkt-nav-links" aria-expanded="false" aria-label="Toggle menu">
      <span class="material-symbols-outlined">menu</span>
    </button>
    <a class="mkt-nav-brand" href="index.html" data-mkt-logo data-route="home" aria-label="WISE home"></a>
    <span class="mkt-nav-divider" aria-hidden="true"></span>
    <div class="mkt-nav-links" id="mkt-nav-links">
      <a class="mkt-nav-link" href="marketing-app.html" data-route="app">WISEcode UPF Detector<sup class="mkt-tm">™</sup></a>
      <a class="mkt-nav-link" href="marketing-coach.html" data-route="coach">WISEcoach<sup class="mkt-tm">™</sup></a>
      <a class="mkt-nav-link" href="marketing-enterprise.html" data-route="enterprise">WISEip<sup class="mkt-tm">™</sup></a>
      <a class="mkt-nav-link" href="marketing-wiseai.html" data-route="wiseai">WISEai<sup class="mkt-tm">™</sup></a>
      <a class="mkt-nav-link" href="marketing-alliance.html" data-route="alliance">WISEalliance<sup class="mkt-tm">™</sup></a>
      <a class="mkt-nav-link" href="marketing-pricing.html" data-route="pricing">Pricing</a>
      <div class="mkt-authgroup mkt-nav-cta-drawer">
        <div class="mkt-authseg">
          <a class="mkt-authseg-btn" href="pages/login.html">Brand login</a>
          <a class="mkt-authseg-btn" href="pages/create-account.html">Create brand account</a>
        </div>
      </div>
    </div>
    <div class="mkt-nav-actions">
      <div class="mkt-authgroup mkt-nav-cta-desktop" title="Brand &amp; retailer accounts — the WISEcode app is free for everyone">
        <div class="mkt-authseg">
          <a class="mkt-authseg-btn" href="pages/login.html">Brand login</a>
          <a class="mkt-authseg-btn" href="pages/create-account.html">Create brand account</a>
        </div>
      </div>
      <a class="mkt-btn mkt-btn-primary mkt-btn-sm mkt-cta-app" href="index.html#cta" aria-label="Get the Cool Owl app"><span class="mkt-cta-label">Get the&nbsp;<span class="mkt-cta-typed" data-cta-typed aria-hidden="true"></span>&nbsp;app</span></a>
    </div>
    <button class="mkt-nav-icon mkt-nav-theme" type="button" data-mkt-theme title="Toggle theme" aria-label="Toggle color theme">
      <span class="material-symbols-outlined">dark_mode</span>
    </button>
  </nav>`;

/* ---------------------------------------------------------------------
   Shared footer — ONE definition for every marketing page, mirroring the nav.
   Injected once as a persistent sibling AFTER #mkt-body-module, so the router
   never tears it down and every page shows the exact same footer. All internal
   links are route-qualified (index.html#…, marketing-*.html) so the client-side
   router resolves them from whichever page you're on.
--------------------------------------------------------------------- */
const FOOTER_HTML = `
  <footer class="mkt-footer" data-mkt-footer>
    <div class="mkt-shell">
      <div class="mkt-footer-grid">
        <div class="mkt-footer-brand">
          <span data-mkt-logo aria-label="WISE"></span>
          <p style="color:var(--text-muted);max-width:32ch;margin:0">AI solutions for decisions about food and health. Find Your Food Truth.™</p>
        </div>
        <div class="mkt-footer-col">
          <h4>For Consumers</h4>
          <a href="marketing-app.html">WISEcode UPF Detector™</a>
          <a href="marketing-coach.html">WISEcoach™</a>
        </div>
        <div class="mkt-footer-col">
          <h4>For Brands</h4>
          <a href="marketing-enterprise.html">WISEip™</a>
          <a href="marketing-nonupf.html">Non-UPF Verified™</a>
          <a href="marketing-gras.html">GRAS Reviewed</a>
          <a href="marketing-pricing.html">Pricing</a>
        </div>
        <div class="mkt-footer-col">
          <h4>Company</h4>
          <a href="marketing-wiseai.html">WISEai™</a>
          <a href="marketing-alliance.html">WISEalliance™</a>
          <a href="pages/login.html">Sign in</a>
          <a href="pages/create-account.html">Create account</a>
        </div>
      </div>
    </div>
    <div class="mkt-footer-bottom">
      <span>Copyright © 2026 WISEcode, Inc. All rights reserved.</span>
      <span>Find Your Food Truth.™</span>
    </div>
  </footer>`;

/* The docked chat rail + scanner rail + mobile launcher. Injected once and
   never replaced by the router. */
const SHELL_HTML = `
  <aside id="mkt-chat-rail" aria-label="WISEai assistant"><div id="mkt-wiseai"></div></aside>
  <div id="mkt-chat-scrim" hidden></div>
  <button type="button" id="mkt-chat-fab" aria-label="Open WISEai"></button>
  <aside id="mkt-scanner-panel" aria-label="WISE Web Scanner">
    <div class="mkt-scanner-card">
      <button type="button" class="mkt-scanner-close" data-scanner-close title="Close scanner" aria-label="Close scanner"><span class="material-symbols-outlined">close</span></button>
      <div class="mkt-scanner-body">
        <iframe class="mkt-scanner-frame" title="WISE Web Scanner" data-scanner-frame loading="lazy"></iframe>
      </div>
    </div>
  </aside>`;

/* ---------------------------------------------------------------------
   Intent → reply map (superset across every marketing page). A clicked chip
   always continues the conversation on its own feature.
--------------------------------------------------------------------- */
const INTENT_REPLIES = {
  scan: `I've opened the <strong>WISE Web Scanner</strong> right beside this chat — search any product or paste a barcode and it instantly tells you whether it's ultra-processed, then breaks down every ingredient in plain language.<br><br>Want this in your pocket? <a href="marketing-app.html">Get the WISEcode app →</a>`,
  howscan: `<p>Scanning takes three taps:</p>
    <ul>
      <li><strong>Point &amp; capture</strong> — aim your camera at any barcode, or search the product by name.</li>
      <li><strong>WISEcode reads the label</strong> against the NFP+™ standard and flags ultra-processed markers instantly.</li>
      <li><strong>You get plain language</strong> — an ingredient-by-ingredient breakdown, not chemistry jargon.</li>
    </ul>
    <p>Try it now in the scanner beside this chat, or <a href="marketing-app.html">get the app →</a>.</p>`,
  ingredients: `Paste or search any ingredient and I'll tell you what it actually is, why it's in the product, and whether it signals ultra-processing — in plain language. The <strong>WISE Web Scanner</strong> beside this chat does whole-product breakdowns too.`,
  nonupf: `<p><strong>Non-UPF Verified™</strong> is WISE's independent, science-backed certification that a product is <em>not</em> ultra-processed — the food truth, proven.</p>
    <p>Here's what earning the Shield actually means:</p>
    <ul>
      <li><strong>Every ingredient is evaluated</strong> against the NFP+™ standard and screened for GRAS (Generally Recognized as Safe) safety.</li>
      <li><strong>Processing is judged, not just contents</strong> — how far a food has been industrially transformed from its whole-food origin, not only what's on the label.</li>
      <li><strong>Passing products earn the Shield</strong>, so shoppers who want honest food can spot it at a glance instead of decoding jargon.</li>
    </ul>
    <p>The fastest way to check anything on your shelf is to scan it. <a href="marketing-app.html">Get the WISEcode app →</a></p>`,
  coach: `<p><strong>WISEcoach™</strong> is your AI nutrition coach, tuned to you.</p>
    <p>Here's how it works:</p>
    <ul>
      <li><strong>Tell it your goals</strong> — more energy, better sleep, fewer ultra-processed foods, or a specific way of eating.</li>
      <li><strong>It analyzes thousands of attributes</strong> per food against those goals, grounded in real product data — not guesswork.</li>
      <li><strong>You get plain-language guidance</strong>: what to eat, what to swap, and <em>why</em> — right when you're deciding.</li>
      <li><strong>It learns as you go</strong>, adapting to your tastes and habits over time.</li>
    </ul>
    <p>Explore it in depth on the <a href="marketing-coach.html">WISEcoach page →</a>, or <a href="marketing-app.html">get the app →</a> to start with your own goals.</p>`,
  goals: `Tell me the goal — more energy, better sleep, fewer ultra-processed foods, a specific way of eating — and <strong>WISEcoach™</strong> weighs thousands of food attributes against it to tell you exactly what to eat and what to swap. Which goal should we start with?`,
  energy: `Steadier energy and better sleep start with what you eat. <strong>WISEcoach™</strong> spots the sneaky ultra-processed sugar and additive spikes behind afternoon crashes and restless nights, then points you to cleaner swaps grounded in real product data. Want to set that as your goal?`,
  getapp: `Get WISEcode free — <strong>scan the code</strong> with your phone camera to open it, or tap a store link:
    <div class="mkt-chat-getapp">
      <img class="mkt-chat-qr" src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&amp;margin=0&amp;data=https%3A%2F%2Fwisecode.ai%2Fget-app" alt="Scan to download the WISEcode app" width="132" height="132" loading="lazy" />
      <div class="mkt-chat-getapp-links">
        <a class="mkt-store-badge" href="marketing-app.html" aria-label="Download on the App Store">${APPLE_SVG}<span><small>Download on the</small><strong>App Store</strong></span></a>
        <a class="mkt-store-badge" href="marketing-app.html" aria-label="Get it on Google Play">${PLAY_SVG}<span><small>Get it on</small><strong>Google Play</strong></span></a>
      </div>
    </div>`,
  brand: `Wonderful — let's get your brand set up. I'm opening your guided <strong>account creation</strong> now, where I'll walk you through it step by step, the same conversational way we're chatting here…`,
  verify: `<p>Verification runs <strong>Submit → Verify → Display</strong>:</p>
    <ul>
      <li><strong>Submit</strong> your products and ingredient decks through the WISEcode portal.</li>
      <li><strong>Verify</strong> — every ingredient is evaluated against NFP+™, GRAS safety and the UPF standard.</li>
      <li><strong>Display</strong> the Non-UPF Verified™ Shield so shoppers looking for honest food can find you.</li>
    </ul>
    <p>Ready to begin? <a href="pages/create-account.html">Create your brand account →</a></p>`,
  engine: `The WISEcode <strong>answer engine</strong> draws from a database of over one million products, giving brands, retailers and researchers instant, plain-language answers to any food question — backed by the NFP+ Food Information™ platform. Want to see it on the <a href="marketing-enterprise.html">WISEip page</a>?`,
  gras: `<p><strong>GRAS verification</strong> screens every ingredient for <em>Generally Recognized as Safe</em> status — the safety layer beneath the UPF standard.</p>
    <ul>
      <li><strong>AI evaluates each ingredient</strong> against GRAS criteria and the supporting evidence.</li>
      <li><strong>Flags anything that needs review</strong> so nothing ships without a clear safety basis.</li>
      <li><strong>Feeds straight into Non-UPF verification</strong> and your board-ready reports.</li>
    </ul>
    <p>Ready to run it? <a href="pages/create-account.html">Create your brand account →</a></p>`,
  reformulate: `<p><strong>Reformulation</strong> turns a UPF verdict into a plan.</p>
    <ul>
      <li><strong>AI pinpoints the ingredients</strong> driving an ultra-processed classification.</li>
      <li><strong>Suggests cleaner swaps</strong> that keep taste, texture and cost in check.</li>
      <li><strong>Re-scores as you go</strong> so you can watch a product move toward Non-UPF Verified™.</li>
    </ul>
    <p>Want to try it on a product? <a href="pages/create-account.html">Create your brand account →</a></p>`,
  alliance: `<p><strong>WISEalliance™</strong> is our community of independent scientists, researchers and clinicians who stand behind WISE's food truth.</p>
    <ul>
      <li><strong>Independent experts review the science</strong> — nutrition scientists, toxicologists, food technologists and physicians who validate how we classify and score food.</li>
      <li><strong>Every verdict is grounded in evidence</strong> — the alliance pressure-tests the NFP+™ standard so a WISE result reflects real research, not opinion.</li>
      <li><strong>The methods stay current</strong> — as the science evolves, the alliance keeps our standards honest and up to date.</li>
    </ul>
    <p>Meet the community on the <a href="marketing-alliance.html">WISEalliance page →</a>.</p>`,
};

/* ---------------------------------------------------------------------
   Natural first-person "user line" for each intent. When a body-content CTA is
   mirrored into the chat (see the body→chat bridge in boot), this is the message
   that gets posted as if the visitor had typed it — so the transcript reads like
   a real conversation, not a raw intent id. Keyed by the same intent ids as
   INTENT_REPLIES, so every mirrored button continues on its own feature.
--------------------------------------------------------------------- */
const INTENT_ASKS = {
  scan: 'Is my food ultra-processed?',
  howscan: 'How does scanning work?',
  ingredients: 'Break down an ingredient',
  nonupf: 'What is Non-UPF Verified™?',
  coach: 'How does WISEcoach™ work?',
  goals: 'Coach me toward a goal',
  energy: 'Eat for energy & sleep',
  getapp: 'Get the app',
  brand: "I'm a brand or retailer",
  verify: 'Start my verification',
  engine: 'Tell me about the food answer engine',
  gras: 'Start GRAS verification',
  reformulate: 'Help me reformulate my food',
  alliance: 'What is WISEalliance™?',
};

/* ---------------------------------------------------------------------
   Large "start here" intent tiles for the full-page WISEai focus surface.
   These render through the shared chat's scorecard rail (a clicked tile drives
   a chat turn on its own intent, exactly like an intent chip). They're mounted
   once with the persistent chat and only shown on the focus route (CSS hides
   the rail on the docked marketing pages). Kept intentionally to the three most
   important journeys; the smaller pill chips carry the secondary actions.
--------------------------------------------------------------------- */
const WISEAI_SCORECARDS = {
  label: 'Start here',
  cards: [
    { variant: 'wiseai', icon: 'search', title: 'Is my food ultra-processed?', desc: 'Scan any product for an instant UPF verdict and a plain-language ingredient breakdown.', action: 'Open the scanner', intent: 'scan', ask: 'Is my food ultra-processed?' },
    { variant: 'wiseai', icon: 'verified', title: 'What is Non-UPF Verified™?', desc: 'The independent, science-backed proof that a product isn’t ultra-processed.', action: 'Learn the standard', intent: 'nonupf', ask: 'What is Non-UPF Verified™?' },
    { variant: 'wiseai', icon: 'restaurant_menu', title: 'How does WISEcoach™ work?', desc: 'Your AI nutrition coach weighs thousands of food attributes against your goals.', action: 'Meet WISEcoach', intent: 'coach', ask: 'How does WISEcoach work?' },
  ],
};

/* Keyword fallback for free-text questions. */
function marketingReply(text) {
  const t = String(text || '').toLowerCase();
  if (/ultra|processed|scan|ingredient/.test(t)) return INTENT_REPLIES.scan;
  if (/non-?upf|verif|shield|gras|certif/.test(t)) return INTENT_REPLIES.nonupf;
  if (/coach|nutrition|goal|sleep|energy|eat/.test(t)) return INTENT_REPLIES.coach;
  if (/app|download|install|iphone|android|get/.test(t)) return INTENT_REPLIES.getapp;
  if (/brand|retail|enterprise|business|api|database/.test(t))
    return `For brands, retailers and researchers, WISEcode answers any food question across 1M+ products, plus Non-UPF verification. Ready to set up? <a href="pages/create-account.html">Create your account →</a>`;
  if (/price|cost|free|how much/.test(t)) return "The WISEcode app is free to download and scan. Verification and enterprise plans are tailored — reach out from the <a href=\"marketing-enterprise.html\">WISEip</a> page.";
  if (/hi|hello|hey|help/.test(t)) return "Hi! I'm WISEai. Ask me about any food, the Non-UPF standard, WISEcoach, or getting the app.";
  return "Great question. WISE turns the complexity of food into clear answers — I can help with ultra-processed checks, the Non-UPF standard, WISEcoach, or getting the app. Which would you like?";
}

/* ---------------------------------------------------------------------
   Per-route config: the file it lives at, its <title>, the intent chips the
   chat should surface there, and whether the chat takes over the page ("Just
   WISEai" focus mode). The chips are the ONLY thing that changes per page —
   the conversation itself is continuous.
--------------------------------------------------------------------- */
const ROUTES = {
  home: {
    file: 'index.html',
    title: 'WISE · Find Your Food Truth™',
    /* Shown by the persistent chat when you arrive here mid-conversation — it
       acknowledges the page switch, then surfaces this page's fresh chips. */
    announce: `You're back on the <strong>WISE overview</strong>. Same conversation, new starting points — here's what I can help with from here:`,
    intents: [
      { intent: 'scan', label: 'Is my food ultra-processed?', icon: 'search' },
      { intent: 'nonupf', label: 'What is Non-UPF Verified™?', icon: 'verified' },
      { intent: 'coach', label: 'How does WISEcoach work?', icon: 'restaurant_menu' },
      { intent: 'getapp', label: 'Get the app', icon: 'get_app' },
      { intent: 'brand', label: "I'm a brand or retailer", icon: 'storefront' },
    ],
  },
  app: {
    file: 'marketing-app.html',
    title: 'WISEcode App · WISE',
    announce: `You're now on the <strong>WISEcode UPF Detector</strong> — scan any product to see whether it's ultra-processed. Want to pick up here?`,
    intents: [
      { intent: 'scan', label: 'Is my food ultra-processed?', icon: 'search' },
      { intent: 'howscan', label: 'How does scanning work?', icon: 'qr_code_scanner' },
      { intent: 'ingredients', label: 'Break down an ingredient', icon: 'science' },
      { intent: 'getapp', label: 'Get the app', icon: 'get_app' },
    ],
  },
  coach: {
    file: 'marketing-coach.html',
    title: 'WISEcoach™ · WISE',
    announce: `Now on <strong>WISEcoach™</strong>, your AI nutrition coach. We can keep talking — or jump into one of these:`,
    intents: [
      { intent: 'coach', label: 'How does WISEcoach work?', icon: 'restaurant_menu' },
      { intent: 'goals', label: 'Coach me toward a goal', icon: 'flag' },
      { intent: 'energy', label: 'Eat for energy & sleep', icon: 'bolt' },
      { intent: 'getapp', label: 'Get the app', icon: 'get_app' },
    ],
  },
  enterprise: {
    file: 'marketing-enterprise.html',
    title: 'WISEip · WISE',
    announce: `You've moved to <strong>WISEip</strong> — Non-UPF verification and the food answer engine for brands &amp; retailers. Here's where I can take you next:`,
    intents: [
      { intent: 'nonupf', label: 'What is Non-UPF Verified™?', icon: 'verified' },
      { intent: 'verify', label: 'Start my verification', icon: 'shield' },
      { intent: 'engine', label: 'The food answer engine', icon: 'dataset' },
      { intent: 'brand', label: "I'm a brand or retailer", icon: 'storefront' },
    ],
  },
  /* Two dedicated deep-dives branching off WISEip. They keep the "WISEip" nav
     item highlighted (nav: 'enterprise') since they live under that pillar. */
  nonupf: {
    file: 'marketing-nonupf.html',
    title: 'Non-UPF Verified™ · WISE',
    nav: 'enterprise',
    announce: `This is <strong>Non-UPF Verified™</strong> — WISE's independent, science-backed certification. Here's what I can walk you through:`,
    intents: [
      { intent: 'nonupf', label: 'What is Non-UPF Verified™?', icon: 'verified' },
      { intent: 'verify', label: 'Start my verification', icon: 'shield' },
      { intent: 'gras', label: 'How does GRAS review work?', icon: 'health_and_safety' },
      { intent: 'brand', label: "I'm a brand or retailer", icon: 'storefront' },
    ],
  },
  gras: {
    file: 'marketing-gras.html',
    title: 'GRAS Reviewed · WISE',
    nav: 'enterprise',
    announce: `This is <strong>GRAS Reviewed</strong> — the ingredient-by-ingredient safety layer beneath the Non-UPF standard. Here's where I can take you:`,
    intents: [
      { intent: 'gras', label: 'How does GRAS review work?', icon: 'health_and_safety' },
      { intent: 'nonupf', label: 'What is Non-UPF Verified™?', icon: 'verified' },
      { intent: 'verify', label: 'Start my verification', icon: 'shield' },
      { intent: 'brand', label: "I'm a brand or retailer", icon: 'storefront' },
    ],
  },
  wiseai: {
    file: 'marketing-wiseai.html',
    title: 'WISEai™ · WISE',
    focus: true,
    announce: `This is <strong>WISEai™</strong> — ask me anything about your food. Right where we left off, plus a few ways to start:`,
    /* The three flagship journeys live in the large tiles (WISEAI_SCORECARDS);
       these smaller pill chips carry the secondary, more practical follow-ups. */
    intents: [
      { intent: 'getapp', label: 'Get the app', icon: 'get_app' },
      { intent: 'howscan', label: 'How does scanning work?', icon: 'qr_code_scanner' },
      { intent: 'ingredients', label: 'Break down an ingredient', icon: 'science' },
      { intent: 'brand', label: "I'm a brand or retailer", icon: 'storefront' },
    ],
  },
  alliance: {
    file: 'marketing-alliance.html',
    title: 'WISEalliance™ · WISE',
    announce: `This is <strong>WISEalliance™</strong> — the community of scientists and researchers who validate WISE's food truth. Here's what I can walk you through:`,
    intents: [
      { intent: 'alliance', label: 'What is WISEalliance™?', icon: 'groups' },
      { intent: 'nonupf', label: 'What is Non-UPF Verified™?', icon: 'verified' },
      { intent: 'gras', label: 'How does GRAS review work?', icon: 'health_and_safety' },
      { intent: 'scan', label: 'Is my food ultra-processed?', icon: 'search' },
    ],
  },
  pricing: {
    file: 'marketing-pricing.html',
    title: 'Pricing · WISE',
    announce: `You're on <strong>Pricing</strong> — every WISE plan in one place, from the free apps to WISEip for brands. Here's where I can take you:`,
    intents: [
      { intent: 'getapp', label: 'Get the app', icon: 'get_app' },
      { intent: 'coach', label: 'How does WISEcoach work?', icon: 'restaurant_menu' },
      { intent: 'verify', label: 'Start my verification', icon: 'shield' },
      { intent: 'alliance', label: 'What is WISEalliance™?', icon: 'groups' },
    ],
  },
};

/* file name → route key (the router only intercepts these). */
const FILE_TO_ROUTE = Object.keys(ROUTES).reduce((m, key) => {
  m[ROUTES[key].file] = key;
  return m;
}, {});

const LIVE_KEY = 'wise-mkt-chat-live';
const fileOf = (path) => (path || '').split('/').pop() || 'index.html';

/* =====================================================================
   Boot
===================================================================== */
function boot() {
  const body = document.body;
  body.classList.add('mkt', 'mkt-appshell');

  /* Inject the shared shell scaffolding + nav once, as siblings of (and before)
     #mkt-body-module so the router can swap the body without touching them. */
  const bodyModule = document.getElementById('mkt-body-module');
  const frag = document.createElement('div');
  frag.innerHTML = SHELL_HTML + NAV_HTML;
  const shellNodes = Array.prototype.slice.call(frag.childNodes);
  shellNodes.forEach((node) => {
    if (bodyModule) body.insertBefore(node, bodyModule);
    else body.appendChild(node);
  });

  /* The shared footer is the mirror image of the nav: injected ONCE as a
     persistent sibling AFTER #mkt-body-module so soft route swaps never touch
     it and every marketing page shows the identical footer. */
  if (!document.querySelector('[data-mkt-footer]')) {
    const footerFrag = document.createElement('div');
    footerFrag.innerHTML = FOOTER_HTML;
    Array.prototype.slice.call(footerFrag.childNodes).forEach((node) => {
      if (bodyModule && bodyModule.nextSibling) body.insertBefore(node, bodyModule.nextSibling);
      else body.appendChild(node);
    });
  }

  /* ---- Scanner rail (opened by the "scan" intent) ---- */
  const scannerPanel = document.getElementById('mkt-scanner-panel');
  const scannerFrame = scannerPanel ? scannerPanel.querySelector('[data-scanner-frame]') : null;
  /* Pull ONLY the camera-capture frames into the rail (?view=scan-embed strips
     the gallery masthead, theme toggle, jump-nav and every scanned-result
     screen — leaving just the two intro camera frames sewn together). */
  const SCANNER_SRC = '_WISEdesigns/wise-web-scanner.html?view=scan-embed';
  function openScanner() {
    if (!scannerPanel) return;
    if (scannerFrame && !scannerFrame.getAttribute('src')) scannerFrame.setAttribute('src', SCANNER_SRC);
    body.classList.add('mkt-scanner-open');
  }
  function closeScanner() { body.classList.remove('mkt-scanner-open'); }
  scannerPanel?.addEventListener('click', (e) => {
    if (e.target.closest('[data-scanner-close]')) closeScanner();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeScanner(); });

  /* ---- Drop the WISE owl into the voices-galaxy core (matches the chat mark) ---- */
  const setGalaxyOwl = () => {
    const galaxyOwl = document.querySelector('[data-galaxy-owl]');
    if (galaxyOwl && !galaxyOwl.querySelector('svg')) galaxyOwl.innerHTML = OWL_MARK;
  };

  /* ---- Mount the persistent WISEai chat ONCE ---- */
  const initialRoute = resolveRoute(location.pathname, body.dataset.mktRoute);
  /* The route the persistent chat currently reflects. Tracked so a page switch
     only prompts a fresh acknowledgement + chips when the route truly changes
     (not on same-page hash jumps or re-entrant navigations). */
  let currentRoute = initialRoute;
  const host = document.getElementById('mkt-wiseai');
  let chat = null;
  if (host) {
    chat = mountWISEaiChat(host, {
      title: 'WISEai™',
      /* Marketing rail wants a bare topbar — no owl, no title, no "agents
         running" pill. Just the three-dot menu and the width toggle. */
      hideBranding: true,
      heading: 'What can WISEai™ help with?',
      sub: 'Your food-truth assistant — scan, learn, decide',
      placeholder: 'Ask about any food…',
      intents: ROUTES[initialRoute].intents,
      intentReplies: INTENT_REPLIES,
      /* Large "start here" tiles for the full-page focus surface. Mounted once
         with the persistent chat; CSS hides them on the docked marketing rail. */
      scorecards: WISEAI_SCORECARDS,
      chipsFlow: 'wrap',
      inlineChips: true,
      reply: marketingReply,
      historyKey: 'wise-mkt-chat-history',
      /* Primary navigation, INSIDE the chat — the site's main destinations live
         in the three-dot "Go to" menu so every core function of the nav is
         reachable without leaving the conversation. Product routes go through
         the client-side router (navigate) so the body + chat stay in sync;
         auth/app links leave the shell like the real nav. */
      menuLinksLabel: 'Go to',
      menuLinks: [
        { key: 'home', label: 'Home', icon: 'home' },
        { key: 'app', label: 'WISEcode UPF Detector', icon: 'search' },
        { key: 'coach', label: 'WISEcoach™', icon: 'restaurant_menu' },
        { key: 'enterprise', label: 'WISEip', icon: 'dataset' },
        { key: 'wiseai', label: 'WISEai™', icon: 'forum' },
        { key: 'alliance', label: 'WISEalliance™', icon: 'groups' },
        { key: 'pricing', label: 'Pricing', icon: 'sell' },
        { key: 'getapp', label: 'Get the app', icon: 'get_app' },
        { key: 'login', label: 'Brand login', icon: 'login' },
        { key: 'create', label: 'Create brand account', icon: 'person_add' },
      ],
      onMenuLink: (key) => {
        if (ROUTES[key]) {
          navigate(ROUTES[key].file);
          // On mobile the chat is a full overlay — drop it so the page shows.
          if (window.matchMedia('(max-width: 900px)').matches) setChatOpen(false);
          return;
        }
        if (key === 'getapp') { chat && chat.sendIntent('getapp', INTENT_ASKS.getapp); return; }
        if (key === 'login') { window.location.href = 'pages/login.html'; return; }
        if (key === 'create') { window.location.href = 'pages/create-account.html'; return; }
      },
      /* Width toggle (single → double → triple) — the shared chat flips its own
         panel-wide/panel-triple classes for its inner layout; here we translate
         the tier into the docked rail's width by overriding --mkt-chat-w on the
         body, so the whole shell (rail, body module, footer and floating nav)
         reflows in step — exactly like the product's module width control. */
      onToggleWidth: (tier) => {
        body.classList.toggle('mkt-chat-wide', tier >= 1);
        body.classList.toggle('mkt-chat-triple', tier >= 2);
      },
      /* Every chat-driven intent (a chip, a scorecard, an inline suggestion, or
         a mirrored body CTA) reflects back onto the page: scroll the matching
         section into view and flash it, so the chat and the body always move
         together. Side-effects (scanner, brand redirect) run first. */
      onIntent: (intent) => {
        if (intent === 'scan' || intent === 'howscan' || intent === 'ingredients') openScanner();
        else if (intent === 'brand') {
          setTimeout(() => { window.location.href = 'pages/create-account.html'; }, 1900);
        }
        flashSection(intent);
        return false;
      },
    });
    restoreLiveTranscript(host);
    watchLiveTranscript(host);
  }

  /* ---- Mobile: the rail slides in from a floating owl launcher ---- */
  const fab = document.getElementById('mkt-chat-fab');
  const scrim = document.getElementById('mkt-chat-scrim');
  const setChatOpen = (open) => {
    body.classList.toggle('mkt-chat-open', open);
    if (scrim) scrim.hidden = !open;
  };
  if (fab) {
    fab.innerHTML = OWL_BUG;
    fab.addEventListener('click', () => setChatOpen(true));
    scrim?.addEventListener('click', () => setChatOpen(false));
  }

  /* ---- First paint: wire the shared nav/theme + the current page content ---- */
  const WM = window.WiseMarketing || {};
  WM.injectLogos && WM.injectLogos();
  WM.initNav && WM.initNav();
  WM.initTheme && WM.initTheme();
  WM.initContent && WM.initContent();
  setGalaxyOwl();
  applyRouteChrome(initialRoute, setChatOpen);
  typeGetAppCta();

  /* ===================================================================
     Client-side router — swap only #mkt-body-module so the chat + nav stay
     mounted and the conversation never resets.
  =================================================================== */
  let routing = false;

  async function navigate(url, { push = true } = {}) {
    const target = new URL(url, location.href);
    const routeKey = FILE_TO_ROUTE[fileOf(target.pathname)];
    if (!routeKey) { window.location.href = target.href; return; }

    const samePage = fileOf(target.pathname) === fileOf(location.pathname);
    if (!samePage) {
      const container = document.getElementById('mkt-body-module');
      if (!container) { window.location.href = target.href; return; }
      routing = true;
      body.classList.add('mkt-routing');
      try {
        const res = await fetch(target.pathname, { headers: { 'X-Requested-With': 'fetch' } });
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const fresh = doc.getElementById('mkt-body-module');
        container.innerHTML = fresh ? fresh.innerHTML : (doc.querySelector('main')?.outerHTML || '');
        if (doc.title) document.title = doc.title;
        // Point the shell scaffolding at the new route's mount hooks + refresh.
        const WMx = window.WiseMarketing || {};
        WMx.injectLogos && WMx.injectLogos();
        WMx.initContent && WMx.initContent();
        setGalaxyOwl();
      } catch (err) {
        window.location.href = target.href; return;
      } finally {
        routing = false;
        body.classList.remove('mkt-routing');
      }
    }

    if (push) history.pushState({ mkt: true }, '', target.href);
    applyRouteChrome(routeKey, setChatOpen);
    /* Keep the SAME conversation mounted, but let the chat acknowledge the new
       page and offer that page's brand-new intent chips. Only when the route
       actually changed — a same-page hash jump shouldn't re-announce. */
    if (chat) {
      const routeChanged = routeKey !== currentRoute;
      if (routeChanged) chat.announceRoute(ROUTES[routeKey].announce, ROUTES[routeKey].intents, INTENT_REPLIES);
      else chat.setIntents(ROUTES[routeKey].intents, INTENT_REPLIES);
    }
    currentRoute = routeKey;
    scrollToHash(target.hash, !samePage);
  }

  /* Intercept clicks on any internal anchor that resolves to a marketing route. */
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      // Absolute URLs to another origin (or protocols) → let the browser handle.
      const abs = new URL(href, location.href);
      if (abs.origin !== location.origin) return;
    }
    const url = new URL(href, location.href);
    const routeKey = FILE_TO_ROUTE[fileOf(url.pathname)];
    if (!routeKey) return; // not a marketing route (e.g. pages/login.html) — normal nav
    e.preventDefault();
    // A client-side route swap never reloads, so a mouse-clicked nav link would
    // otherwise keep :focus and leave a stuck focus ring on the now-active pill.
    // Drop focus so only the clean .is-active highlight remains.
    if (typeof a.blur === 'function') a.blur();
    // Close the mobile nav drawer on navigation.
    document.querySelector('[data-mkt-nav]')?.classList.remove('is-open');
    navigate(url.href);
  });

  window.addEventListener('popstate', () => {
    navigate(location.href, { push: false }).catch(() => {});
  });

  /* ===================================================================
     Body ⇄ chat bridge — keep the two modules working together.

     Clicking in the body module drives the persistent chat so the conversation
     always reflects what you touch on the page:

       1) An element explicitly tagged with data-chat-intent mirrors that exact
          intent (with an optional data-chat-say user line).
       2) ANY other meaningful control (button, card, in-page link) that lives
          inside a section tagged data-chat-section="<intent>" falls back to
          that section's intent — so untagged CTAs across every page still land
          the visitor on the right thread instead of doing nothing.

     Either way it drives a real chat turn (user line + routed WISEai reply) and
     the same side-effects a matching chip would (open the scanner, flash the
     section, etc.). Links that navigate to ANOTHER marketing route are left to
     the client-side router, which already announces the page switch in the chat
     via announceRoute() — so we don't double up on those.
  =================================================================== */
  /* CTA-like controls only. Bare <button>s are deliberately excluded so media
     and utility controls (video play/sound/CC, gallery arrows) inside a tagged
     section don't fire a stray chat turn — only real calls-to-action do. */
  const BODY_SYNC_INTERACTIVE = 'a[href], .mkt-btn, .mkt-do-card, .mkt-pillar, .mkt-choice, .mkt-plan, .mkt-badge, [data-chat]';
  document.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!chat) return;
    const bodyModule = document.getElementById('mkt-body-module');
    if (!bodyModule) return;

    // 1) Explicit tag wins.
    let el = e.target.closest('[data-chat-intent]');
    let intent = null;
    let say = null;
    if (el && bodyModule.contains(el)) {
      intent = el.getAttribute('data-chat-intent');
      say = el.getAttribute('data-chat-say');
    } else {
      // 2) Fallback: a meaningful control inside a chat-tagged section.
      el = e.target.closest(BODY_SYNC_INTERACTIVE);
      if (!el || !bodyModule.contains(el)) return;
      // Leave cross-route navigation to the router (it announces the switch).
      if (el.tagName === 'A') {
        const href = el.getAttribute('href') || '';
        if (href && !href.startsWith('#') && href !== '#') {
          const url = new URL(href, location.href);
          const rk = FILE_TO_ROUTE[fileOf(url.pathname)];
          const goesElsewhere = rk && fileOf(url.pathname) !== fileOf(location.pathname);
          if (goesElsewhere) return;
        }
      }
      const section = el.closest('[data-chat-section]');
      if (!section) return;
      intent = section.getAttribute('data-chat-section');
    }

    if (!intent) return;
    chat.sendIntent(intent, say != null ? say : INTENT_ASKS[intent]);
    // On mobile the chat is a slide-in panel — surface it so the reply is seen.
    if (window.matchMedia('(max-width: 900px)').matches) setChatOpen(true);
    // Bare/placeholder anchors (#, empty) have nowhere to go — don't let the
    // browser jump the page; the chat turn is the whole action. Real in-page
    // hashes still scroll (handled by the router interceptor above).
    const href = el.getAttribute('href');
    if (el.tagName === 'A' && (!href || href === '#')) e.preventDefault();
  });

  /* ---- Chat → body: scroll the matching section into view and flash it ---- */
  function flashSection(intent) {
    if (!intent) return;
    const bodyModule = document.getElementById('mkt-body-module');
    if (!bodyModule) return;
    let sel;
    try { sel = `[data-chat-section="${(window.CSS && CSS.escape) ? CSS.escape(intent) : intent}"]`; }
    catch (_) { sel = `[data-chat-section="${intent}"]`; }
    const section = bodyModule.querySelector(sel);
    // Focus mode hides the body; nothing to reflect onto there.
    if (!section || body.classList.contains('mkt-chat-focus')) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Only scroll when the section isn't already comfortably in view, so a chip
    // for what you're already reading doesn't yank the page around.
    const rect = section.getBoundingClientRect();
    const inView = rect.top >= 0 && rect.top < window.innerHeight * 0.5;
    if (!inView) section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    section.classList.remove('is-chat-focus');
    void section.offsetWidth; /* restart the animation on repeat clicks */
    section.classList.add('is-chat-focus');
    section.addEventListener('animationend', () => section.classList.remove('is-chat-focus'), { once: true });
  }
}

/* Resolve a route key from a pathname, with an explicit hint (body[data-mkt-route])
   winning, then the filename, then home. */
function resolveRoute(pathname, hint) {
  if (hint && ROUTES[hint]) return hint;
  return FILE_TO_ROUTE[fileOf(pathname)] || 'home';
}

/* Per-route chrome: <title>, active nav link, and the "Just WISEai" focus mode
   that lets the persistent chat take over the page. */
function applyRouteChrome(routeKey, setChatOpen) {
  const route = ROUTES[routeKey];
  if (!route) return;
  document.title = route.title;
  document.body.dataset.mktRoute = routeKey;

  // Sub-pages (e.g. the Non-UPF / GRAS deep-dives) can point their highlight at
  // a parent nav item via route.nav, so the pillar they branch off stays active.
  const activeNav = route.nav || routeKey;
  document.querySelectorAll('.mkt-nav-link[data-route]').forEach((link) => {
    const on = link.dataset.route === activeNav;
    link.classList.toggle('is-active', on);
    if (on) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  const focus = !!route.focus;
  document.body.classList.toggle('mkt-chat-focus', focus);
  // On the focused "Just WISEai" route, make sure the chat is visible on mobile.
  if (focus && window.matchMedia('(max-width: 900px)').matches) setChatOpen && setChatOpen(true);
  else if (!focus && window.matchMedia('(max-width: 900px)').matches) setChatOpen && setChatOpen(false);
}

/* Type "Cool Owl" into the middle of the "Get the ___ app" CTA and give the
   button a quick shake once the word lands — then erase it and do the whole
   thing again, so the word is typed in TWICE. Runs once at boot (the nav is
   injected a single time and never re-rendered by the router). Respects the
   user's reduced-motion preference by dropping straight to the final state. */
function typeGetAppCta() {
  const typed = document.querySelector('[data-cta-typed]');
  if (!typed || typed.dataset.done) return;
  typed.dataset.done = '1';
  const word = 'Cool Owl';
  const passes = 2; /* how many times "Cool Owl" is typed in */
  const btn = typed.closest('.mkt-btn');

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) { typed.textContent = word; return; }

  const shake = () => {
    if (!btn) return;
    btn.classList.remove('mkt-cta-shake');
    // reflow so the animation can retrigger on the second pass
    void btn.offsetWidth;
    btn.classList.add('mkt-cta-shake');
    btn.addEventListener('animationend', () => btn.classList.remove('mkt-cta-shake'), { once: true });
  };

  let pass = 0;
  function typePass() {
    let i = 0;
    const tick = () => {
      typed.textContent = word.slice(0, i);
      if (i < word.length) {
        i += 1;
        /* Slight jitter per keystroke so it reads like real typing, with a
           beat before the space in "Cool Owl". */
        const pause = word[i - 1] === ' ' ? 260 : 95 + Math.random() * 90;
        setTimeout(tick, pause);
      } else {
        shake();
        pass += 1;
        if (pass < passes) setTimeout(erasePass, 620);
        else typed.classList.remove('is-typing');
      }
    };
    tick();
  }
  function erasePass() {
    let i = word.length;
    const tick = () => {
      typed.textContent = word.slice(0, i);
      if (i > 0) { i -= 1; setTimeout(tick, 42); }
      else setTimeout(typePass, 260);
    };
    tick();
  }

  /* Let the nav settle in before the cursor starts. */
  setTimeout(() => { typed.classList.add('is-typing'); typePass(); }, 650);
}

function scrollToHash(hash, cameFromSwap) {
  if (!hash) { if (cameFromSwap) window.scrollTo({ top: 0 }); return; }
  const target = document.getElementById(hash.slice(1));
  if (!target) return;
  // Let the freshly-swapped DOM settle before scrolling.
  requestAnimationFrame(() => target.scrollIntoView({ behavior: cameFromSwap ? 'auto' : 'smooth', block: 'start' }));
}

/* ---------------------------------------------------------------------
   Live transcript persistence — mirror the messages area to localStorage so a
   hard reload or a direct deep-link resumes the same conversation. (Soft route
   swaps never touch the chat, so this only matters for full loads.)
--------------------------------------------------------------------- */
function cleanTranscript(messagesEl) {
  const clone = messagesEl.cloneNode(true);
  clone.querySelectorAll('.sc-line-typing, .sc-inline-chips').forEach((n) => n.remove());
  return clone.innerHTML.trim();
}

function restoreLiveTranscript(host) {
  let saved = '';
  try { saved = localStorage.getItem(LIVE_KEY) || ''; } catch (_) {}
  if (!saved.trim()) return;
  const messages = host.querySelector('.chat-messages-area');
  const welcome = host.querySelector('.sc-welcome');
  if (!messages) return;
  messages.innerHTML = saved;
  if (welcome) { welcome.classList.add('sc-hidden'); welcome.style.display = ''; }
  messages.scrollTop = messages.scrollHeight;
}

function watchLiveTranscript(host) {
  const messages = host.querySelector('.chat-messages-area');
  if (!messages || typeof MutationObserver === 'undefined') return;
  let t = null;
  const save = () => {
    const html = cleanTranscript(messages);
    try {
      if (html) localStorage.setItem(LIVE_KEY, html);
      else localStorage.removeItem(LIVE_KEY);
    } catch (_) {}
  };
  const observer = new MutationObserver(() => {
    clearTimeout(t);
    t = setTimeout(save, 300);
  });
  observer.observe(messages, { childList: true, subtree: true, characterData: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
