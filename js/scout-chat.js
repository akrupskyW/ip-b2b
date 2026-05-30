/**
 * Scout Chat Module — the ONE shared chat surface for WISE.
 *
 * A framework-free, mountable extraction of the chat module in
 * pages/ai-chat.html so the exact same component (WISE-owl welcome screen,
 * intent chips, plain message lines, floating-label input rail) can be
 * dropped into any page instead of bespoke one-off chats.
 *
 *   import { mountScoutChat } from './scout-chat.js';
 *   mountScoutChat(document.getElementById('host'), { ... });
 *
 * Requires the design tokens from agent-page.css and the styles in
 * scout-chat.css to be loaded on the host page.
 */

/* WISE-owl "bug" used in the topbar (inherits currentColor). */
const OWL_BUG = `<svg viewBox="0 0 193 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z"/><path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z"/><path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z"/></svg>`;

/* WISE-owl mark used inside the welcome circle (white on primary). */
const OWL_MARK = `<svg viewBox="0 0 193 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z" fill="white"/><path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z" fill="white"/><path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z" fill="white"/></svg>`;

const DEFAULT_INTENTS = [
  { intent: 'customer_profile', label: 'Start New Verification', icon: 'add_circle' },
  { intent: 'resume_prompt', label: 'Continue Existing', icon: 'play_circle' },
  { intent: 'faq_intro', label: 'Ask a Question', icon: 'help_outline' },
  { intent: 'choose_agents', label: 'Choose Agents', icon: 'smart_toy' },
  { intent: 'registry_home', label: 'WISE Foods', icon: 'restaurant_menu' },
  { intent: 'add_food_intro', label: 'Add a New Food', icon: 'add_circle_outline' },
  { intent: 'edit_food_select', label: 'Edit an Existing Food', icon: 'edit_note' },
];

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function defaultReply(text) {
  const q = String(text).toLowerCase();
  if (/(verif|shield|non-upf|clean label|attest)/.test(q))
    return 'I can run the verification flow — <strong>Confirm → Attest → Activate</strong>. Want me to start with your eligible UPCs?';
  if (/(food|registry|sku|product|search)/.test(q))
    return 'Searching the WISE Foods registry now. I’ll match SKUs and pull nutritional metadata for you.';
  if (/(add|new food|ingest|upload|parse)/.test(q))
    return 'Let’s add it. Paste a label, spec sheet, or URL and I’ll parse it toward the Brand Verified standard.';
  if (/(edit|update|change)/.test(q))
    return 'Pick the product and I’ll open it for editing — NFP+, ingredients, images, and visibility.';
  if (/(agent|choose)/.test(q))
    return 'You can enable specialist agents — TIER, SHIELD, LENS, VAULT, PULSE — and I’ll orchestrate them automatically.';
  return 'On it. The full conversational flow lives in the reference app; this surface mirrors the real Scout layout and controls.';
}

let _seq = 0;

/**
 * Mount the shared Scout chat into `rootEl`.
 * @param {HTMLElement} rootEl
 * @param {object} [opts]
 *   title        {string}  topbar title (default 'Scout')
 *   agentCount   {number}  "N agents running" pill (default 1)
 *   heading      {string}  welcome heading (default 'What can Scout help with?')
 *   sub          {string}  welcome subheading
 *   hint         {string}  welcome hint line
 *   intents      {Array}   welcome intent chips [{intent,label,icon}]
 *   placeholder  {string}  input placeholder
 *   flLabel      {string}  floating label text
 *   onIntent     {fn}      (intent,label) => boolean — return true to suppress default reply
 *   onToggleWidth{fn}      (isWide) => void — fired when the width toggle flips
 *   reply        {fn}      (text) => html string for Scout's response
 * @returns {{ addUser, addScout, reset, root }}
 */
export function mountScoutChat(rootEl, opts = {}) {
  if (!rootEl) return null;
  const id = `sc${++_seq}`;
  const title = opts.title || 'Scout';
  const agentCount = opts.agentCount != null ? opts.agentCount : 1;
  const heading = opts.heading || 'What can Scout help with?';
  const sub = opts.sub || 'Your AI Verification assistant — NON-UPF & beyond';
  const hint = opts.hint || 'or type a message below';
  const intents = opts.intents || DEFAULT_INTENTS;
  const placeholder = opts.placeholder || 'Type a message…';
  const reply = typeof opts.reply === 'function' ? opts.reply : defaultReply;

  const chipsHtml = intents.map((c, i) =>
    `<button type="button" class="chip ws-intent-chip" data-intent="${i}"><span class="material-icons">${esc(c.icon || 'bolt')}</span>${esc(c.label)}</button>`
  ).join('');

  rootEl.classList.add('sc-card');
  rootEl.innerHTML = `
    <div class="chat-topbar">
      <div class="sc-topbar-lead">
        <div class="sc-bug">${OWL_BUG}</div>
        <div class="sc-topbar-titles">
          <span class="topbar-title">${esc(title)}</span>
          <button type="button" class="topbar-agents-btn" data-sc="agents" title="Choose agents">
            <span class="material-icons">smart_toy</span>
            <span class="agents-count-pill" id="${id}-count">${esc(agentCount)}</span>
            <span>agents running</span>
          </button>
        </div>
      </div>
      <div class="sc-topbar-controls">
        <div class="panel-more-wrap">
        <button type="button" class="panel-more-btn" id="${id}-more" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}-more-pop" title="More options"><span class="material-icons">more_vert</span></button>
        <div class="topbar-popover hidden" id="${id}-more-pop" role="menu">
          <button type="button" class="topbar-menu-item" data-sc="new"><span class="material-icons topbar-menu-icon">add_circle_outline</span><span>Start new conversation</span></button>
          <button type="button" class="topbar-menu-item" data-sc="export"><span class="material-icons topbar-menu-icon">download</span><span>Export conversation</span></button>
          <button type="button" class="topbar-menu-item" data-sc="share"><span class="material-icons topbar-menu-icon">share</span><span>Share</span></button>
          <div class="topbar-menu-divider"></div>
          <button type="button" class="topbar-menu-item topbar-menu-item--danger" data-sc="close"><span class="material-icons topbar-menu-icon">close</span><span>Close conversation</span></button>
        </div>
        </div>
        <button type="button" class="panel-width-toggle-btn" id="${id}-width" aria-pressed="false" title="Normal width — tap to double" aria-label="Double Scout module width"><span class="material-symbols-outlined">transition_slide</span></button>
      </div>
    </div>

    <div class="sc-body">
      <div class="chat-messages-area" id="${id}-messages"></div>
      <div class="sc-welcome" id="${id}-welcome">
        <div class="ws-logo-wrap">
          <span class="ws-pulse-ring" aria-hidden="true"></span>
          <span class="ws-pulse-ring" aria-hidden="true"></span>
          <span class="ws-pulse-ring" aria-hidden="true"></span>
          <div class="ws-logo">${OWL_MARK}</div>
        </div>
        <h1 class="ws-heading">${esc(heading)}</h1>
        <p class="ws-sub">${esc(sub)}</p>
        <div class="ws-chips">${chipsHtml}</div>
        <p class="ws-hint">${esc(hint)}</p>
      </div>
    </div>

    <div class="chat-input-rail">
      <div class="sc-input-row">
        <div class="fl-input-wrap">
          <input type="text" class="fl-input" id="${id}-input" placeholder="${esc(placeholder)}" autocomplete="off" />
          <div class="fl-more-wrap">
            <button type="button" class="fl-icon-btn fl-more-btn" id="${id}-fl-more" title="More options"><span class="material-icons">more_horiz</span></button>
            <div class="fl-more-popover" id="${id}-fl-pop" role="menu">
              <button type="button" class="fl-more-item" data-sc="attach"><span class="material-icons">attach_file</span><span>Attach</span></button>
              <button type="button" class="fl-more-item" data-sc="camera"><span class="material-icons">photo_camera</span><span>Camera</span></button>
              <button type="button" class="fl-more-item" data-sc="voice"><span class="material-icons">mic</span><span>Voice</span></button>
            </div>
          </div>
        </div>
        <button type="button" class="sc-send" id="${id}-send" title="Send"><span class="material-icons">send</span></button>
      </div>
    </div>`;

  const messages = rootEl.querySelector(`#${id}-messages`);
  const welcome = rootEl.querySelector(`#${id}-welcome`);
  const input = rootEl.querySelector(`#${id}-input`);

  const scrollDown = () => { if (messages) messages.scrollTop = messages.scrollHeight; };

  function addUser(text) {
    if (!messages) return;
    messages.insertAdjacentHTML('beforeend', `<div class="sc-line"><span class="sc-line-who sc-who-you">You · </span>${esc(text)}</div>`);
    scrollDown();
  }
  function addScout(html) {
    if (!messages) return;
    messages.insertAdjacentHTML('beforeend', `<div class="sc-line sc-line-scout"><span class="sc-line-who sc-who-scout">${esc(title)} · </span>${html}</div>`);
    scrollDown();
  }
  function showTyping() {
    if (!messages) return null;
    const el = document.createElement('div');
    el.className = 'sc-line sc-line-scout';
    el.innerHTML = `<span class="sc-line-who sc-who-scout">${esc(title)} · </span><span class="sc-typing"><span></span><span></span><span></span></span>`;
    messages.appendChild(el);
    scrollDown();
    return el;
  }
  function scoutRespond(text) {
    const typing = showTyping();
    setTimeout(() => { typing?.remove(); addScout(reply(text)); }, 600);
  }
  function hideWelcome() { welcome?.classList.add('sc-hidden'); }
  function reset() {
    if (messages) messages.innerHTML = '';
    welcome?.classList.remove('sc-hidden');
  }
  function submit() {
    if (!input) return;
    const v = input.value.trim();
    if (!v) return;
    input.value = '';
    hideWelcome();
    addUser(v);
    scoutRespond(v);
  }

  /* Intent chips */
  welcome?.addEventListener('click', (e) => {
    const chip = e.target.closest('.ws-intent-chip[data-intent]');
    if (!chip) return;
    const def = intents[Number(chip.dataset.intent)];
    if (!def) return;
    const handled = opts.onIntent ? opts.onIntent(def.intent, def.label) : false;
    hideWelcome();
    addUser(def.label);
    if (!handled) scoutRespond(def.label);
  });

  /* Send */
  rootEl.querySelector(`#${id}-send`)?.addEventListener('click', submit);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  /* Topbar more popover (.hidden toggle + .is-open on the trigger — matches
     the shared .topbar-popover / .panel-more-btn behavior in the app). */
  const moreBtn = rootEl.querySelector(`#${id}-more`);
  const morePop = rootEl.querySelector(`#${id}-more-pop`);
  function closeMore() {
    morePop?.classList.add('hidden');
    moreBtn?.classList.remove('is-open');
    moreBtn?.setAttribute('aria-expanded', 'false');
  }
  moreBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = morePop.classList.contains('hidden');
    morePop.classList.toggle('hidden', !open);
    moreBtn.classList.toggle('is-open', open);
    moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* Module width toggle (mirrors the .panel-width-toggle-btn on the other
     modules — doubles the module column when active). */
  const widthBtn = rootEl.querySelector(`#${id}-width`);
  widthBtn?.addEventListener('click', () => {
    const wide = !rootEl.classList.contains('panel-wide');
    rootEl.classList.toggle('panel-wide', wide);
    widthBtn.classList.toggle('is-on', wide);
    widthBtn.setAttribute('aria-pressed', wide ? 'true' : 'false');
    widthBtn.title = wide ? 'Double width — tap for normal width' : 'Normal width — tap to double';
    if (typeof opts.onToggleWidth === 'function') opts.onToggleWidth(wide);
  });

  /* Input more popover */
  const flMoreBtn = rootEl.querySelector(`#${id}-fl-more`);
  const flPop = rootEl.querySelector(`#${id}-fl-pop`);
  flMoreBtn?.addEventListener('click', (e) => { e.stopPropagation(); flPop.classList.toggle('open'); });

  /* Menu + chip actions */
  rootEl.addEventListener('click', (e) => {
    const item = e.target.closest('[data-sc]');
    if (!item) return;
    const action = item.dataset.sc;
    if (action === 'new') { reset(); closeMore(); }
    else if (action === 'agents') {
      closeMore();
      if (opts.onIntent) opts.onIntent('choose_agents', 'Choose Agents');
    } else if (action === 'export') {
      closeMore();
      const blob = new Blob(['Scout export placeholder\n'], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'scout-chat.txt';
      a.click();
    } else if (action === 'share') {
      closeMore();
      const url = window.location.href;
      if (navigator.share) navigator.share({ title: esc(title), url }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    } else if (action === 'close') {
      closeMore();
      if (typeof opts.onClose === 'function') opts.onClose();
      else window.history.back();
    } else if (action === 'attach' || action === 'camera' || action === 'voice') {
      flPop?.classList.remove('open');
    }
  });

  /* Close popovers on outside click */
  document.addEventListener('click', (e) => {
    if (morePop && !morePop.classList.contains('hidden') && !morePop.contains(e.target) && e.target !== moreBtn && !moreBtn?.contains(e.target)) {
      closeMore();
    }
    if (flPop?.classList.contains('open') && !flPop.contains(e.target) && !flMoreBtn?.contains(e.target)) {
      flPop.classList.remove('open');
    }
  });

  return { addUser, addScout, reset, root: rootEl };
}
