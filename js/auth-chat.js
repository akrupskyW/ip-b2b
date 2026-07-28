/* =============================================================
   WISE — auth-as-chat controller

   Renders sign in / create account / password recovery as a
   conversation inside the shared Scout chat surface (scout-chat.css
   classes), and drives a right-hand "Account setup" progress pane
   during account creation (verification-sidebar stepper pattern).

   Depends on: window.WiseAuth (js/auth.js) + scout-chat.css + auth-chat.css.
   Usage (module):  initAuthChat({ mode: 'signin' | 'signup' | 'forgot' })
============================================================= */

/* WISE-owl bug — same mark used in the app topbar/avatars. */
const OWL_BUG = '<svg viewBox="0 0 193 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z"/><path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z"/><path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z"/></svg>';

/* "You" avatar is the member's initials in a ring — exactly like ai-chat-3's
   .sc-avatar-you (SCOUT_USER_AVATAR = 'MC'), not a person glyph. */
function initialsFrom(str) {
  const s = String(str == null ? '' : str).trim();
  if (!s) return '';
  if (s.indexOf('@') !== -1) {
    const local = s.split('@')[0].replace(/[^a-z]/gi, '');
    return (local.slice(0, 2) || s[0]).toUpperCase();
  }
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

/* Left-nav links — the only routes that make sense while signed out. */
const NAV_ITEMS = [
  { mode: 'signin', label: 'Sign In', icon: 'login' },
  { mode: 'signup', label: 'Create Account', icon: 'person_add' },
  { mode: 'forgot', label: 'Forgot Password', icon: 'lock_reset' },
];

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function nowLabel() {
  try { return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  catch (_) { return ''; }
}
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
const digits = (v) => String(v).replace(/\D/g, '');

function maskPhone(v) {
  const d = digits(v).slice(0, 10);
  if (d.length > 6) return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  if (d.length > 3) return '(' + d.slice(0, 3) + ') ' + d.slice(3);
  if (d.length > 0) return '(' + d;
  return v;
}
function maskEin(v) { const d = digits(v).slice(0, 9); return d.length > 2 ? d.slice(0, 2) + '-' + d.slice(2) : d; }

/* ── Flow definitions ─────────────────────────────────────── */

const TITLE_OPTIONS = ['CEO', 'Brand Manager', 'Product Manager', 'Owner / Founder', 'Regulatory Affairs Manager', 'Other'];
const ENTITY_OPTIONS = ['Independent Brand', 'CPG / Manufacturer', 'Retailer', 'Foodservice', 'Distributor', 'R&D / Lab', 'Regulatory / Compliance'];

/* Sign-in: two quick turns. */
const SIGNIN_QUESTIONS = [
  { key: 'email', label: 'Email', prompt: 'Welcome back. What email do you use for WISE?', placeholder: 'you@company.com', type: 'email',
    validate: (v) => validEmail(v) ? null : "That doesn't look like a valid email — mind trying again?" },
  { key: 'password', label: 'Password', prompt: 'And your password?', placeholder: 'Your password', type: 'password',
    validate: (v) => v ? null : 'Please enter your password.' },
];

/* Forgot password: single turn. */
const FORGOT_QUESTIONS = [
  { key: 'email', label: 'Email', prompt: "No problem — I'll send reset instructions. What's the email on your account?", placeholder: 'you@company.com', type: 'email',
    validate: (v) => validEmail(v) ? null : "That doesn't look like a valid email — mind trying again?" },
];

/* Create account: the WISE_ip2 Flow A fields, grouped into 3 macro steps. */
const SIGNUP_QUESTIONS = [
  // Macro 0 — Your Info
  { step: 0, key: 'brand', label: 'Brand(s)', prompt: 'Which brand(s) do you represent? <span style="opacity:.7">(separate multiple with commas)</span>', placeholder: 'e.g. Nature Valley, Clif Bar' },
  { step: 0, key: 'name', label: 'Full name', prompt: 'Great. What is your full name?', placeholder: 'Jane Doe' },
  { step: 0, key: 'title', label: 'Title', prompt: 'What is your professional title?', placeholder: 'Type or pick a title', type: 'choice', options: TITLE_OPTIONS },
  { step: 0, key: 'email', label: 'Business email', prompt: 'What is your business email?', placeholder: 'jane@company.com', type: 'email',
    validate: (v) => validEmail(v) ? null : "That doesn't look like a valid email — mind trying again?" },
  { step: 0, key: 'phone', label: 'Phone', prompt: 'Best phone number to reach you?', placeholder: '(555) 123-4567', type: 'phone',
    validate: (v) => digits(v).length >= 10 ? null : 'I need a 10-digit phone number.', transform: maskPhone },
  { step: 0, key: 'attest', label: 'Attestation', prompt: 'Do you certify that the information is accurate and that you are authorized to represent this organization on the WISEcode platform?', type: 'consent',
    options: [{ label: 'I Agree', value: 'Agreed', icon: 'verified', primary: true }],
    validate: (v) => /^(y|yes|agree|i agree|ok|okay|confirm|agreed)/i.test(String(v).trim()) ? null : 'Please confirm to continue (or tap “I Agree”).',
    transform: () => 'Agreed' },
  { step: 0, key: 'sig', label: 'Signature', prompt: 'Please type your full name to sign this attestation.', placeholder: 'Type your full name',
    validate: (v) => v && v.trim() ? null : 'Please type your full name to sign.' },
  // Macro 1 — Organization
  { step: 1, key: 'orgname', label: 'Organization', prompt: "Now your organization. What's its legal name?", placeholder: 'Acme Foods, Inc.' },
  { step: 1, key: 'website', label: 'Website', prompt: 'Your primary website URL?', placeholder: 'https://acmefoods.com',
    validate: (v) => v && v.trim().length > 2 ? null : 'Please enter your website URL.' },
  { step: 1, key: 'addr1', label: 'Street', prompt: "What's your headquarters street address?", placeholder: '123 Market Street' },
  { step: 1, key: 'city', label: 'City', prompt: 'City?', placeholder: 'San Francisco' },
  { step: 1, key: 'state', label: 'State', prompt: 'State?', placeholder: 'California' },
  { step: 1, key: 'zip', label: 'ZIP', prompt: 'ZIP code?', placeholder: '94103', type: 'zip',
    validate: (v) => /^\d{5}$/.test(digits(v).slice(0, 5)) && digits(v).length === 5 ? null : 'ZIP should be 5 digits.',
    transform: (v) => digits(v).slice(0, 5) },
  { step: 1, key: 'entitytype', label: 'Entity type', prompt: 'What type of entity is this?', type: 'choice', options: ENTITY_OPTIONS },
  { step: 1, key: 'sid', label: 'Secondary ID', prompt: 'Provide a secondary business identifier — your D-U-N-S number (or a W-9 / TIN).', placeholder: '9-digit D-U-N-S or TIN',
    validate: (v) => v && v.trim() ? null : 'Please provide a D-U-N-S number or W-9 / TIN.' },
  { step: 1, key: 'ein', label: 'EIN', prompt: 'Finally, your EIN <span style="opacity:.7">(format XX-XXXXXXX)</span>?', placeholder: '12-3456789', type: 'ein',
    validate: (v) => /^\d{2}-?\d{7}$/.test(String(v).replace(/\s/g, '')) ? null : 'EIN should look like 12-3456789.', transform: maskEin },
  // Macro 2 — Verify
  { step: 2, key: 'otp', label: 'Verification', prompt: (a) => `I've sent a 6-digit code to <strong>${esc(a.phone || 'your phone')}</strong>. What is it?`, placeholder: '6-digit code', type: 'otp',
    options: [{ label: 'Resend code', value: '__resend', icon: 'refresh', action: 'resend' }],
    validate: (v) => /^\d{6}$/.test(digits(v)) ? null : 'The verification code is 6 digits.', transform: (v) => digits(v).slice(0, 6) },
];

const MACROS = [
  { title: 'Your Info', keys: ['brand', 'name', 'title', 'email', 'phone', 'attest', 'sig'] },
  { title: 'Organization', keys: ['orgname', 'website', 'addr1', 'city', 'state', 'zip', 'entitytype', 'sid', 'ein'] },
  { title: 'Verify', keys: ['otp'] },
];

/* Transition lines shown when a new macro step begins. */
const STEP_INTROS = {
  0: '',
  1: "Perfect — that's your info saved. Let's set up your organization so we can verify it. ",
  2: "Almost done. One last step to secure your account. ",
};

/* ── Controller ───────────────────────────────────────────── */

export function initAuthChat(opts = {}) {
  const mode = opts.mode || 'menu';
  const auth = window.WiseAuth;

  if (auth && auth.isAuthed()) { location.replace(auth.landingUrl()); return; }

  const root = document.getElementById('ac-chat');
  const shell = document.querySelector('.ac-shell');
  const pane = document.getElementById('ac-setup');
  const navEl = document.getElementById('ac-nav');
  if (!root) return;

  buildChatCard(root);
  if (navEl) buildNav(navEl, mode);

  function setNavActive(activeMode) {
    if (!navEl) return;
    navEl.querySelectorAll('.menu-nav-item[data-mode]').forEach((el) =>
      el.classList.toggle('is-active', el.dataset.mode === activeMode));
  }

  const messages = root.querySelector('#ac-messages');
  const welcome = root.querySelector('#ac-welcome');
  const input = root.querySelector('#ac-input');
  const sendBtn = root.querySelector('#ac-send');

  let flow = null; // { mode, questions, qi, answers }

  const scrollDown = () => { messages.scrollTop = messages.scrollHeight; };
  const hideWelcome = () => welcome && welcome.classList.add('sc-hidden');

  function disablePriorChips() {
    messages.querySelectorAll('.sc-reply-chips:not(.is-done)').forEach((el) => el.classList.add('is-done'));
  }

  function currentUserInitials() {
    const id = flow && (flow.answers.name || flow.answers.email);
    return initialsFrom(id) || 'ME';
  }

  function addUser(text, masked) {
    const body = masked ? `<span class="sc-mask">${esc(text)}</span>` : esc(text);
    messages.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-you"><span class="sc-avatar sc-avatar-you" role="img" aria-label="You">${esc(currentUserInitials())}</span><div class="sc-line-body">${body}<div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div></div></div>`);
    scrollDown();
  }

  /* Reply chips render as their own row after the scout line (never inside the
     bubble), exactly like ai-chat-3's .sc-reply-chips rows. */
  function chipsHtml(options) {
    if (!options || !options.length) return '';
    const btns = options.map((o) =>
      `<button type="button" class="chip${o.primary ? ' chip-primary' : ''}" data-ac="${esc(o.action || 'answer')}" data-value="${esc(o.value != null ? o.value : o.label)}" data-label="${esc(o.label)}">${o.icon ? `<span class="material-icons">${esc(o.icon)}</span>` : ''}${esc(o.label)}</button>`
    ).join('');
    return `<div class="sc-reply-chips">${btns}</div>`;
  }

  function addScout(html, options) {
    messages.insertAdjacentHTML('beforeend',
      `<div class="sc-line sc-line-scout"><span class="sc-avatar sc-avatar-scout" role="img" aria-label="WISE Assistant">${OWL_BUG}</span><div class="sc-line-body">${html}<div class="sc-line-meta"><span class="sc-line-time">${esc(nowLabel())}</span></div></div></div>`);
    const chips = chipsHtml(options);
    if (chips) messages.insertAdjacentHTML('beforeend', chips);
    scrollDown();
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'sc-line sc-line-scout sc-line-typing';
    el.innerHTML = `<span class="sc-avatar sc-avatar-scout" role="img" aria-label="WISE Assistant">${OWL_BUG}</span><div class="sc-line-body"><span class="sc-typing-status"><span class="sc-typing" aria-hidden="true"><span></span><span></span><span></span></span><span class="sc-typing-label">Working on it…</span></span></div>`;
    messages.appendChild(el);
    scrollDown();
    return el;
  }

  /* Scout "says" something after a brief typing beat. */
  function scoutSay(html, options, cb, delay) {
    const typing = showTyping();
    setTimeout(() => {
      typing.remove();
      addScout(html, options);
      if (cb) cb();
    }, delay || 550);
  }

  function setInputEnabled(on, placeholder) {
    input.disabled = !on;
    sendBtn.disabled = !on;
    if (placeholder != null) input.placeholder = placeholder;
    if (on) setTimeout(() => input.focus(), 60);
  }

  /* ── Flow helpers ── */

  function currentQuestion() { return flow ? flow.questions[flow.qi] : null; }

  function promptFor(q) {
    return typeof q.prompt === 'function' ? q.prompt(flow.answers) : q.prompt;
  }

  function optionChips(q) {
    if (q.type === 'choice') return q.options.map((o) => (typeof o === 'string' ? { label: o } : o));
    return q.options || null;
  }

  function askCurrent(prefix) {
    const q = currentQuestion();
    if (!q) return;
    const intro = prefix || '';
    scoutSay(intro + promptFor(q), optionChips(q), () => setInputEnabled(true, q.placeholder || 'Type your answer'));
    renderPane();
  }

  function beginFlow(newMode) {
    flow = { mode: newMode, qi: 0, answers: {}, done: false };
    setNavActive(newMode);
    resetMessages();
    if (newMode === 'signup') {
      flow.questions = SIGNUP_QUESTIONS;
      showPane(true);
      renderPane();
      scoutSay(
        "Let's create your WISEcode account. I'll walk you through <strong>3 quick steps</strong> — you can track your progress on the right.",
        [{ label: 'Sign in instead', value: '__signin', action: 'flow:signin', icon: 'login' }],
        () => askCurrent(),
      );
    } else if (newMode === 'signin') {
      flow.questions = SIGNIN_QUESTIONS;
      showPane(false);
      const q = flow.questions[0];
      scoutSay(promptFor(q), [
        { label: 'Use demo account', value: '__demo', action: 'demo', icon: 'bolt', primary: true },
        { label: 'Create account', value: '__signup', action: 'flow:signup', icon: 'person_add' },
        { label: 'Forgot password', value: '__forgot', action: 'flow:forgot', icon: 'lock_reset' },
      ], () => setInputEnabled(true, q.placeholder));
    } else if (newMode === 'forgot') {
      flow.questions = FORGOT_QUESTIONS;
      showPane(false);
      const q = flow.questions[0];
      scoutSay(promptFor(q), [
        { label: 'Back to sign in', value: '__signin', action: 'flow:signin', icon: 'login' },
      ], () => setInputEnabled(true, q.placeholder));
    }
  }

  function resetMessages() { messages.innerHTML = ''; }

  /* Handle an answer (from typed input or a chip). */
  function submitAnswer(rawValue, fromChip, chipLabel) {
    const q = currentQuestion();
    if (!q || flow.done) return;
    const value = String(rawValue == null ? '' : rawValue).trim();
    if (!fromChip && !value) return;

    disablePriorChips();
    const masked = q.type === 'password';
    addUser(fromChip ? (chipLabel || value) : (masked ? '••••••••' : value), masked && !fromChip);
    setInputEnabled(false);
    input.value = '';

    const err = q.validate ? q.validate(value, flow.answers) : null;
    if (err) {
      scoutSay(err + '<br>' + promptFor(q), optionChips(q), () => setInputEnabled(true, q.placeholder || 'Type your answer'));
      return;
    }

    flow.answers[q.key] = q.transform ? q.transform(value, flow.answers) : value;

    const wasStep = q.step;
    flow.qi++;
    renderPane();

    if (flow.qi >= flow.questions.length) { finishFlow(); return; }

    const nextQ = currentQuestion();
    let prefix = '';
    if (flow.mode === 'signup' && nextQ.step !== wasStep) prefix = STEP_INTROS[nextQ.step] || '';
    askCurrent(prefix);
  }

  function finishFlow() {
    flow.done = true;
    setInputEnabled(false, flow.mode === 'forgot' ? 'Reset link sent' : 'Redirecting…');
    if (flow.mode === 'signin') {
      scoutSay('Signing you in…', null, () => {
        auth.login({ email: flow.answers.email });
        scoutSay(`<span class="ac-success"><span class="material-icons">check_circle</span>You're in! Taking you to WISEai…</span>`, null,
          () => setTimeout(() => { location.href = auth.landingUrl(); }, 700));
      });
    } else if (flow.mode === 'forgot') {
      addScout(`<span class="ac-success"><span class="material-icons">mark_email_read</span>Done.</span> If an account exists for <strong>${esc(flow.answers.email)}</strong>, reset instructions are on the way. Check your inbox (and spam folder).`,
        [{ label: 'Back to sign in', value: '__signin', action: 'flow:signin', icon: 'login' }]);
    } else if (flow.mode === 'signup') {
      renderPane(true);
      scoutSay('Verifying and creating your account…', null, () => {
        const a = flow.answers;
        const reg = {
          name: a.name, title: a.title, email: a.email, phone: a.phone,
          brands: String(a.brand || '').split(',').map((s) => ({ name: s.trim() })).filter((b) => b.name),
          attestSig: a.sig, attestedAt: new Date().toISOString(),
          orgname: a.orgname, website: a.website, addr1: a.addr1, city: a.city, state: a.state, zip: a.zip,
          entitytype: a.entitytype, ein: a.ein, sidType: 'duns', sidValue: a.sid,
        };
        auth.signup(reg);
        scoutSay(`<span class="ac-success"><span class="material-icons">celebration</span>Welcome to WISEcode, ${esc((a.name || '').split(' ')[0] || 'there')}!</span> Your account is ready — taking you to WISEai…`, null,
          () => setTimeout(() => { location.href = auth.landingUrl(); }, 1000));
      });
    }
  }

  /* ── Progress pane ── */

  function showPane(on) {
    if (!pane) return;
    pane.hidden = !on;
    if (shell) shell.classList.toggle('has-pane', on);
  }

  function fieldValueDisplay(key) {
    const v = flow.answers[key];
    if (v == null) return '';
    if (key === 'attest') return 'Agreed';
    if (key === 'otp') return 'Verified';
    if (key === 'brand') return String(v).split(',')[0].trim() + (String(v).split(',').length > 1 ? '…' : '');
    return String(v);
  }

  function renderPane(allDone) {
    if (!pane || flow == null || flow.mode !== 'signup') return;
    const a = flow.answers;
    const total = SIGNUP_QUESTIONS.length;
    const answered = allDone ? total : SIGNUP_QUESTIONS.filter((q) => a[q.key] != null).length;
    const pct = Math.round((answered / total) * 100);
    const curKey = allDone ? null : (currentQuestion() && currentQuestion().key);
    const curMacro = allDone ? MACROS.length : (currentQuestion() ? currentQuestion().step : 0);

    const stepsHtml = MACROS.map((m, i) => {
      const done = allDone || m.keys.every((k) => a[k] != null);
      const active = !done && i === curMacro;
      const cls = done ? 'vs-step--done' : (active ? 'vs-step--active' : '');
      const numHtml = done ? '<span class="material-icons">check</span>' : String(i + 1);
      let sub = 'Up next';
      if (done) sub = 'Completed';
      else if (active) sub = `Step ${i + 1} of ${MACROS.length} · in progress`;

      let fieldsHtml = '';
      if (done || active) {
        const rows = SIGNUP_QUESTIONS.filter((q) => q.step === i).map((q) => {
          const isDone = a[q.key] != null;
          const isActive = q.key === curKey;
          if (!isDone && !isActive) return '';
          const icon = isDone ? 'check_circle' : 'radio_button_unchecked';
          const stateCls = isDone ? 'sp-field--done' : 'sp-field--active';
          const val = isDone ? `<span class="sp-field-val">${esc(fieldValueDisplay(q.key))}</span>` : '<span class="sp-field-val">Collecting…</span>';
          return `<div class="sp-field ${stateCls}"><span class="material-icons">${icon}</span><span class="sp-field-label">${esc(q.label)}</span>${val}</div>`;
        }).join('');
        if (rows) fieldsHtml = `<div class="sp-fields">${rows}</div>`;
      }

      return `<div class="vs-step ${cls}">
        <div class="vs-step-track"><div class="vs-step-num">${numHtml}</div><div class="vs-step-line"></div></div>
        <div class="vs-step-body"><div class="vs-step-title">${esc(m.title)}</div><div class="vs-step-sub">${esc(sub)}</div>${fieldsHtml}</div>
      </div>`;
    }).join('');

    pane.innerHTML = `
      <div class="sp-inner">
        <div class="sp-header">
          <div class="sp-header-icon"><span class="material-icons">badge</span></div>
          <div class="sp-header-text">
            <div class="sp-title">Account setup</div>
            <div class="sp-subtitle">${allDone ? 'All steps complete' : 'Complete these steps to finish'}</div>
          </div>
        </div>
        <div class="sp-progress">
          <div class="sp-progress-head"><span>${answered} of ${total} fields</span><span class="sp-progress-pct">${pct}%</span></div>
          <div class="sp-progress-track"><div class="sp-progress-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="sp-steps">${stepsHtml}</div>
      </div>`;
  }

  /* ── Wiring ── */

  function handleSend() {
    const q = currentQuestion();
    if (!q || flow.done || input.disabled) return;
    submitAnswer(input.value, false);
  }

  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } });

  /* Delegated clicks for the left nav, welcome screen, and inline reply chips. */
  (shell || root).addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ac]');
    if (!btn || !(shell || root).contains(btn)) return;
    const action = btn.dataset.ac;

    if (action === 'answer') {
      submitAnswer(btn.dataset.value, true, btn.dataset.label);
      return;
    }
    if (action === 'demo') {
      disablePriorChips();
      hideWelcome();
      addUser('Use demo account');
      setInputEnabled(false);
      scoutSay('Signing you in with the demo account…', null, () => {
        auth.login({ email: auth.DEMO_EMAIL || 'demo@wisealliance.com', name: 'Demo User' });
        scoutSay(`<span class="ac-success"><span class="material-icons">check_circle</span>You're in! Taking you to WISEai…</span>`, null,
          () => setTimeout(() => { location.href = auth.landingUrl(); }, 700));
      });
      return;
    }
    if (action === 'resend') {
      disablePriorChips();
      addUser('Resend code');
      scoutSay('Sent — a fresh 6-digit code is on its way. Enter it whenever you have it.', null, () => setInputEnabled(true, '6-digit code'));
      return;
    }
    if (action.indexOf('flow:') === 0) {
      const next = action.slice(5);
      disablePriorChips();
      hideWelcome();
      beginFlow(next);
      return;
    }
  });

  /* Kick things off. */
  hideWelcome();
  if (mode === 'menu') { welcome && welcome.classList.remove('sc-hidden'); setInputEnabled(false, 'Choose an option above to begin'); }
  else beginFlow(mode);
}

/* Build the chat card DOM (topbar + body + welcome + input rail) using the
   shared scout-chat.css classes so it matches the app's chat module exactly. */
function buildChatCard(root) {
  root.classList.add('sc-card');
  root.innerHTML = `
    <div class="sc-body">
      <div class="chat-messages-area" id="ac-messages" aria-live="polite" aria-atomic="false"></div>
      <div class="sc-welcome" id="ac-welcome">
        <div class="ws-logo-wrap">
          <span class="ws-pulse-ring" aria-hidden="true"></span>
          <span class="ws-pulse-ring" aria-hidden="true"></span>
          <span class="ws-pulse-ring" aria-hidden="true"></span>
          <div class="ws-logo" style="color:#fff">${OWL_BUG}</div>
        </div>
        <h1 class="ws-heading">Welcome to WISEcode</h1>
        <p class="ws-sub">Sign in, create an account, or recover access — right here in the chat.</p>
        <div class="ws-chips">
          <button type="button" class="chip ws-intent-chip" data-ac="flow:signin"><span class="material-icons">login</span>Sign In</button>
          <button type="button" class="chip ws-intent-chip" data-ac="flow:signup"><span class="material-icons">person_add</span>Create Account</button>
          <button type="button" class="chip ws-intent-chip" data-ac="flow:forgot"><span class="material-icons">lock_reset</span>Forgot Password</button>
        </div>
      </div>
    </div>
    <div class="chat-input-rail">
      <div class="sc-input-row">
        <div class="fl-input-wrap">
          <input type="text" class="fl-input" id="ac-input" placeholder="Type your answer" autocomplete="off" />
        </div>
        <button type="button" class="sc-send" id="ac-send" title="Send"><span class="material-icons">send</span></button>
      </div>
    </div>`;
}

/* Build the left navigation module — a scaled-down version of the app menu
   panel that only carries the routes available while signed out. */
function buildNav(navEl, activeMode) {
  navEl.classList.add('ac-nav-panel');
  const items = NAV_ITEMS.map((it) =>
    `<button type="button" class="menu-nav-item${it.mode === activeMode ? ' is-active' : ''}" data-ac="flow:${it.mode}" data-mode="${esc(it.mode)}">
      <span class="menu-nav-icon"><span class="material-icons">${esc(it.icon)}</span></span>
      <span class="menu-nav-label">${esc(it.label)}</span>
    </button>`).join('');
  navEl.innerHTML = `
    <div class="menu-inner">
      <div class="menu-brand-bar">
        <span class="ac-brand-mark">${OWL_BUG}</span>
        <span class="ac-brand-text"><span class="ac-brand-word">WISE<b>code</b></span><span class="ac-brand-tag">Intelligence</span></span>
      </div>
      <div class="menu-panel-body">
        <div class="ac-nav-lead">Account access</div>
        <nav class="menu-nav" aria-label="Account navigation">${items}</nav>
      </div>
      <div class="menu-footer">
        <div class="ac-nav-trust"><span class="material-icons">lock</span>Secure, encrypted sign-in</div>
        <a class="menu-nav-item" href="mailto:support@wisealliance.com">
          <span class="menu-nav-icon"><span class="material-icons">help_outline</span></span>
          <span class="menu-nav-label">Help &amp; support</span>
        </a>
      </div>
    </div>`;
}
