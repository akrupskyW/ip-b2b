/* =============================================================
   WISE — conversational account creation

   Runs the "create account" flow as a conversation inside the shared
   WISEai chat surface (wiseai-chat.css), collecting every field the form
   version gathered — grouped into 3 macro steps — while a right-hand
   "Account setup" progress pane mirrors the verification-sidebar stepper.

   Only account creation is conversational; sign in / forgot password
   remain standard forms. Left navigation is the shared auth nav module
   (WiseAuthForms.mountNav).

   Depends on: window.WiseAuth (js/auth.js), WiseAuthForms.mountNav
   (js/auth-forms.js), wiseai-chat.css + auth.css.
   Usage:  WiseAuthChat.initSignup();
============================================================= */
(function () {
  'use strict';

  /* WISE-owl bug — same mark used in the app topbar / chat avatars. */
  var OWL_BUG = '<svg viewBox="0 0 193 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.9834 35.6522C10.9834 35.6522 3.30615 47.7494 3.30615 58.0481C3.30615 81.1921 20.324 99.6409 43.3405 99.9915C51.5363 100.052 60.4175 99.9915 67.533 92.6894C41.5052 92.6894 25.589 73.777 25.589 58.0481C25.589 58.0481 25.2144 45.6894 30.832 35.9526L10.9834 35.6522Z"/><path d="M83.8241 14.7368C90.9396 14.7368 94.8008 22.7337 96.3699 29.2111H96.5571C98.1262 22.7337 101.987 14.7368 109.103 14.7368H170.521C175.169 14.7368 175.169 12.8643 175.169 7.32269C175.169 2.80876 178.108 0 182.131 0H189.384V14.7368C189.384 27.7131 182.131 28.5339 174.794 28.5339L160.347 28.583H118.091C113.597 28.583 113.335 29.2111 111.537 33.7051C110.051 37.4206 96.5571 73.0277 96.5571 73.0277H96.3699C96.3699 73.0277 82.8761 37.4206 81.3899 33.7051C79.5923 29.2111 79.3301 28.583 74.8361 28.583H32.5803L18.133 28.5339C10.7965 28.5339 3.54341 27.7131 3.54341 14.7368V0H10.7965C14.5415 0 17.7585 3.37051 17.7585 7.32269C17.7585 12.8643 17.7585 14.7368 22.406 14.7368H83.8241Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M71.8001 35.9523C74.4284 35.9523 74.6161 37.2826 75.1793 38.6953L87.9434 71.5913C82.9358 80.6013 74.4289 85.7609 63.9558 85.7609C48.1132 85.7608 33.2662 72.7999 33.2663 54.6695C33.2664 48.2288 34.5088 40.1469 39.2583 35.9523H71.8001ZM63.486 44.5345C58.3905 44.5345 54.2598 48.6005 54.2598 54.0781C54.2598 59.5557 58.3905 63.6217 63.486 63.6217C68.5814 63.6216 72.7122 59.5556 72.7122 54.0781C72.7122 48.6005 68.5814 44.5346 63.486 44.5345Z"/><path d="M181.756 35.6522C181.756 35.6522 189.433 47.7494 189.433 58.0481C189.433 81.1921 172.416 99.6409 149.399 99.9915C141.203 100.052 132.322 99.9915 125.206 92.6894C151.234 92.6894 167.151 73.777 167.151 58.0481C167.151 58.0481 167.525 45.6894 161.908 35.9526L181.756 35.6522Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M120.94 35.9523C118.311 35.9523 118.124 37.2826 117.56 38.6953L104.796 71.5913C109.804 80.6013 118.311 85.7609 128.784 85.7609C144.626 85.7608 159.473 72.7999 159.473 54.6695C159.473 48.2288 158.231 40.1469 153.481 35.9523H120.94ZM129.254 44.5345C134.349 44.5345 138.48 48.6005 138.48 54.0781C138.48 59.5557 134.349 63.6217 129.254 63.6217C124.158 63.6216 120.027 59.5556 120.027 54.0781C120.027 48.6005 124.158 44.5346 129.254 44.5345Z"/></svg>';

  function initialsFrom(str) {
    var s = String(str == null ? '' : str).trim();
    if (!s) return '';
    if (s.indexOf('@') !== -1) {
      var local = s.split('@')[0].replace(/[^a-z]/gi, '');
      return (local.slice(0, 2) || s[0]).toUpperCase();
    }
    var parts = s.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return s.slice(0, 2).toUpperCase();
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function nowLabel() {
    try { return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
    catch (_) { return ''; }
  }
  var validEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()); };
  var digits = function (v) { return String(v).replace(/\D/g, ''); };

  function maskPhone(v) {
    var d = digits(v).slice(0, 10);
    if (d.length > 6) return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
    if (d.length > 3) return '(' + d.slice(0, 3) + ') ' + d.slice(3);
    if (d.length > 0) return '(' + d;
    return v;
  }
  function maskEin(v) { var d = digits(v).slice(0, 9); return d.length > 2 ? d.slice(0, 2) + '-' + d.slice(2) : d; }

  /* ── Free-text combo parsers ──
     These let the user answer several typed questions in one message; each pulls
     the recognizable pieces out and leaves the rest for a targeted follow-up. */
  function parseContact(text) {
    var s = ' ' + String(text || '') + ' ';
    var res = {};
    var em = s.match(/[^\s,;]+@[^\s,;]+\.[^\s,;]+/);
    if (em) { res.email = em[0]; s = s.replace(em[0], ' '); }
    var ph = s.match(/\+?\(?\d[\d\-.\s()]{7,}\d/);
    if (ph && digits(ph[0]).length >= 10) { res.phone = ph[0].trim(); s = s.replace(ph[0], ' '); }
    var tokens = s.split(/[\s,;]+/).filter(Boolean).filter(function (t) {
      return t.indexOf('@') === -1 && digits(t).length < 5 && /[^\W\d_]/.test(t) &&
        !/^(name|full\-?name|email|e\-?mail|phone|tel|mobile|number|cell)[:\-]?$/i.test(t);
    });
    var name = tokens.join(' ').replace(/[,;:]+$/, '').trim();
    if (name) res.name = name;
    return res;
  }
  function parseAddress(text) {
    var s = String(text || '');
    var res = {};
    var zm = s.match(/\b\d{5}(?:-\d{4})?\b/);
    if (zm) { res.zip = zm[0]; s = s.replace(zm[0], ' '); }
    var parts = s.split(',').map(function (p) { return p.trim(); }).filter(Boolean);
    if (parts[0]) res.addr1 = parts[0];
    if (parts[1]) res.city = parts[1];
    if (parts[2]) res.state = parts[2].replace(/\s{2,}/g, ' ');
    return res;
  }
  function parseOrg(text) {
    var s = ' ' + String(text || '') + ' ';
    var res = {};
    var um = s.match(/\b((https?:\/\/)?(www\.)?[a-z0-9][a-z0-9\-]*\.[a-z]{2,}(\/[^\s,;]*)?)/i);
    if (um) { res.website = um[0].trim(); s = s.replace(um[0], ' '); }
    var name = s.replace(/[,;]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (name) res.orgname = name;
    return res;
  }
  /* Priority product + a teammate to loop in, answered together. The segment
     that carries an email is the teammate; whatever's left is the product. */
  function parseProdTeam(text) {
    var s = String(text || '').trim();
    var res = {};
    if (!s) return res;
    var parts = s.split(/\s+[–—|]\s+|\n|;/).map(function (p) { return p.trim(); }).filter(Boolean);
    if (parts.length >= 2) {
      var teamIdx = parts.findIndex(function (p) { return p.indexOf('@') !== -1; });
      if (teamIdx !== -1) {
        res.team = parts[teamIdx];
        var rest = parts.filter(function (_p, i) { return i !== teamIdx; }).join(' ').trim();
        if (rest) res.priorityProduct = rest;
      } else {
        res.priorityProduct = parts[0];
        res.team = parts.slice(1).join(' ').trim();
      }
    } else if (s.indexOf('@') !== -1) {
      res.team = s;
    } else {
      res.priorityProduct = s;
    }
    return res;
  }

  /* ── Flow definition — grouped into 4 macro steps ── */
  var TITLE_OPTIONS = ['CEO', 'Brand Manager', 'Product Manager', 'Owner / Founder', 'Regulatory Affairs Manager', 'Other'];
  var ENTITY_OPTIONS = ['Independent Brand', 'CPG / Manufacturer', 'Retailer', 'Foodservice', 'Distributor', 'R&D / Lab', 'Regulatory / Compliance'];

  var SIGNUP_QUESTIONS = [
    // Macro 0 — About you (contact fields combined so they can be typed together)
    { step: 0, key: 'brand', label: 'Brand(s)', prompt: 'Which brand(s) do you represent? <span style="opacity:.7">(separate multiple with commas)</span>', placeholder: 'e.g. Nature Valley, Clif Bar' },
    { step: 0, key: 'contact', combo: true, parse: parseContact,
      prompt: 'Now the essentials — what\u2019s your <strong>name</strong>, <strong>business email</strong>, and <strong>phone</strong>? <span style="opacity:.7">You can type them all on one line.</span>',
      placeholder: 'e.g. Jane Doe, jane@company.com, (555) 123-4567',
      parts: [
        { key: 'name', label: 'Full name', prompt: 'What is your full name?', placeholder: 'Jane Doe' },
        { key: 'email', label: 'Business email', kind: 'email', prompt: 'What is your business email?', placeholder: 'jane@company.com',
          validate: function (v) { return validEmail(v) ? null : "That doesn't look like a valid email — mind trying again?"; } },
        { key: 'phone', label: 'Phone', kind: 'phone', prompt: 'Best phone number to reach you?', placeholder: '(555) 123-4567',
          validate: function (v) { return digits(v).length >= 10 ? null : 'I need a 10-digit phone number.'; }, transform: maskPhone }
      ] },
    { step: 0, key: 'title', label: 'Title', optional: true, prompt: 'And your professional title?', placeholder: 'Type or pick a title', type: 'choice', options: TITLE_OPTIONS },

    // Macro 1 — Your business (chip-assisted; all skippable)
    { step: 1, key: 'category', label: 'Category', type: 'multiselect', optional: true,
      prompt: 'What category are your products in? <span style="opacity:.7">(pick any that apply, or add your own)</span>', placeholder: 'Type to add a category…',
      options: ['Snacks', 'Bars', 'Beverages', 'Pantry & Grocery', 'Frozen', 'Dairy & Alternatives', 'Bakery', 'Condiments & Sauces', 'Confectionery', 'Breakfast & Cereal', 'Baby & Kids', 'Supplements', 'Pet'] },
    { step: 1, key: 'competitors', label: 'Top competitors', type: 'multiselect', optional: true, max: 5,
      prompt: 'Who are your top competitors? <span style="opacity:.7">(up to 5 — we\u2019ve suggested a few; add or remove any)</span>', placeholder: 'Type a competitor and press Enter…',
      options: ['Clif Bar', 'KIND', 'RXBAR', 'GoMacro', 'Larabar'] },
    { step: 1, key: 'diststage', label: 'Distribution stage', type: 'choice', optional: true,
      prompt: 'Where are you in distribution today?', options: ['Direct / Local', 'Local Retail', 'Regional Chain', 'National', 'Multi-National'] },
    { step: 1, key: 'retailersIn', label: 'Current retailers', type: 'multiselect', optional: true,
      prompt: 'Which retailers are you already in?', placeholder: 'Type a retailer and press Enter…',
      options: ['Sprouts', 'Erewhon', 'Whole Foods', "Mother's", 'Thrive Market', 'Central Market', 'Wegmans', 'None yet'] },
    { step: 1, key: 'retailersTarget', label: 'Target retailers', type: 'multiselect', optional: true,
      prompt: 'Which retailers are you targeting?', placeholder: 'Type a retailer and press Enter…',
      options: ['Whole Foods', 'Sprouts', 'Target', 'Kroger', 'Costco', 'Wegmans', 'Erewhon'] },
    { step: 1, key: 'revenue', label: 'Annual revenue', type: 'choice', optional: true,
      prompt: "What is your brand / holding co\u2019s approximate annual revenue? <span style=\"opacity:.7\">(optional)</span>",
      options: ['<$1M', '$1–2.5M', '$2.5–5M', '$5–10M', '$10–25M', '$25–50M', '$50M+'] },
    { step: 1, key: 'goals', label: 'Goals', type: 'multiselect', optional: true,
      prompt: 'What are you hoping to get out of WISEcode?', placeholder: 'Type your own…',
      options: ['Claim data', 'Win shelf space', 'Accelerate existing sales', 'Non-UPF verification', 'Reformulation', 'Competitive insight', 'Consumer-app brand control'] },
    { step: 1, key: 'prodteam', combo: true, optional: true, parse: parseProdTeam,
      prompt: 'Which of your products is the priority right now — and is there a teammate we should loop in? <span style="opacity:.7">(add their name + email; both optional — type them on one line)</span>',
      placeholder: 'e.g. Trail Mix Bar — Sam Lee, sam@company.com',
      parts: [
        { key: 'priorityProduct', label: 'Priority product', prompt: 'Which of your products is your business prioritizing right now?', placeholder: 'Name the product' },
        { key: 'team', label: 'Team contacts', prompt: 'Who on your team should we loop in? <span style="opacity:.7">(name + email)</span>', placeholder: 'e.g. Sam Lee, sam@company.com' }
      ] },
    { step: 1, key: 'distributors', label: 'Distributors', type: 'multiselect', optional: true,
      prompt: 'Which distributors carry your products today, if any?', placeholder: 'Type a distributor…',
      options: ['None yet', 'UNFI', 'KeHE', 'DPI', 'Rainforest', 'Regional / specialty', 'DSD / self-distribute'] },
    { step: 1, key: 'mfgmodel', label: 'Manufacturing', type: 'choice', optional: true,
      prompt: 'Who makes your products?', options: ['Self-manufacture', 'Co-manufacturer', 'Both'] },
    { step: 1, key: 'certs', label: 'Facility certifications', type: 'multiselect', optional: true,
      prompt: 'What food-safety certifications does that facility hold?', placeholder: 'Type a certification…',
      options: ['SQF', 'BRCGS', 'FSSC 22000', 'Other GFSI', 'Organic', 'None yet', 'Not sure'] },
    { step: 1, key: 'scalespeed', label: 'Scale readiness', type: 'choice', optional: true,
      prompt: 'If a major retailer said yes tomorrow, how quickly could you scale production?',
      options: ['Ready now — 3x in 90 days', 'Could scale with 3–6 months lead', 'Would need new capacity or co-man', 'Not sure'] },

    // Macro 2 — Organization (name+site and the address block are each combined)
    { step: 2, key: 'org', combo: true, parse: parseOrg,
      prompt: 'Now your organization — what\u2019s its <strong>legal name</strong> and <strong>website</strong>? <span style="opacity:.7">Type both on one line.</span>',
      placeholder: 'e.g. Acme Foods, Inc., https://acmefoods.com',
      parts: [
        { key: 'orgname', label: 'Organization', prompt: "What's your organization's legal name?", placeholder: 'Acme Foods, Inc.' },
        { key: 'website', label: 'Website', prompt: 'Your primary website URL?', placeholder: 'https://acmefoods.com',
          validate: function (v) { return v && v.trim().length > 2 ? null : 'Please enter your website URL.'; } }
      ] },
    { step: 2, key: 'address', combo: true, parse: parseAddress,
      prompt: 'What\u2019s your headquarters <strong>address</strong>? <span style="opacity:.7">Street, city, state, and ZIP — separate with commas.</span>',
      placeholder: 'e.g. 123 Market St, San Francisco, CA, 94103',
      parts: [
        { key: 'addr1', label: 'Street', prompt: "What's your headquarters street address?", placeholder: '123 Market Street' },
        { key: 'city', label: 'City', prompt: 'City?', placeholder: 'San Francisco' },
        { key: 'state', label: 'State', prompt: 'State?', placeholder: 'California' },
        { key: 'zip', label: 'ZIP', kind: 'zip', prompt: 'ZIP code?', placeholder: '94103',
          validate: function (v) { return digits(v).length === 5 ? null : 'ZIP should be 5 digits.'; },
          transform: function (v) { return digits(v).slice(0, 5); } }
      ] },
    { step: 2, key: 'entitytype', label: 'Entity type', prompt: 'What type of entity is this?', type: 'choice', options: ENTITY_OPTIONS },
    { step: 2, key: 'sid', label: 'Secondary ID', prompt: 'Provide a secondary business identifier — your D-U-N-S number (or a W-9 / TIN).', placeholder: '9-digit D-U-N-S or TIN',
      validate: function (v) { return v && v.trim() ? null : 'Please provide a D-U-N-S number or W-9 / TIN.'; } },
    { step: 2, key: 'ein', label: 'EIN', prompt: 'Your EIN <span style="opacity:.7">(format XX-XXXXXXX)</span>?', placeholder: '12-3456789', type: 'ein',
      validate: function (v) { return /^\d{2}-?\d{7}$/.test(String(v).replace(/\s/g, '')) ? null : 'EIN should look like 12-3456789.'; }, transform: maskEin },
    { step: 2, key: 'attest', label: 'Attestation', prompt: 'Do you certify that the information is accurate and that you are authorized to represent this organization on the WISEcode platform?', type: 'consent',
      options: [{ label: 'I Agree', value: 'Agreed', icon: 'verified', primary: true }],
      validate: function (v) { return /^(y|yes|agree|i agree|ok|okay|confirm|agreed)/i.test(String(v).trim()) ? null : 'Please confirm to continue (or tap “I Agree”).'; },
      transform: function () { return 'Agreed'; } },
    { step: 2, key: 'sig', label: 'Signature', prompt: 'Please type your full name to sign this attestation.', placeholder: 'Type your full name',
      validate: function (v) { return v && v.trim() ? null : 'Please type your full name to sign.'; } },

    // Macro 3 — Verify
    { step: 3, key: 'otp', label: 'Verification', prompt: function (a) { return "I've sent a 6-digit code to <strong>" + esc(a.phone || 'your phone') + '</strong>. What is it?'; }, placeholder: '6-digit code', type: 'otp',
      options: [{ label: 'Resend code', value: '__resend', icon: 'refresh', action: 'resend' }],
      validate: function (v) { return /^\d{6}$/.test(digits(v)) ? null : 'The verification code is 6 digits.'; }, transform: function (v) { return digits(v).slice(0, 6); } }
  ];

  var MACROS = [
    { title: 'About you', keys: ['brand', 'name', 'email', 'phone', 'title'] },
    { title: 'Your business', keys: ['category', 'competitors', 'diststage', 'retailersIn', 'retailersTarget', 'revenue', 'goals', 'priorityProduct', 'team', 'distributors', 'mfgmodel', 'certs', 'scalespeed'] },
    { title: 'Organization', keys: ['orgname', 'website', 'addr1', 'city', 'state', 'zip', 'entitytype', 'sid', 'ein', 'attest', 'sig'] },
    { title: 'Verify', keys: ['otp'] }
  ];

  /* Per-field metadata (label + macro step), expanded from combos so the progress
     pane can render each underlying field even when several are asked together. */
  var FIELD_META = {};
  SIGNUP_QUESTIONS.forEach(function (q) {
    if (q.combo) { q.parts.forEach(function (p) { FIELD_META[p.key] = { label: p.label, step: q.step }; }); }
    else { FIELD_META[q.key] = { label: q.label, step: q.step }; }
  });
  var TOTAL_FIELDS = Object.keys(FIELD_META).length;

  var STEP_INTROS = {
    0: '',
    1: "Great — that's the basics. Now a bit about your business so WISEcode can tailor everything to you. Tap the chips that fit, add your own, or skip any question. ",
    2: "Thanks! Let's get your organization details for verification. ",
    3: 'Almost done. One last step to secure your account. '
  };

  function initSignup() {
    var auth = window.WiseAuth;
    if (auth && auth.isAuthed()) { location.replace(auth.landingUrl()); return; }

    if (window.WiseAuthForms && window.WiseAuthForms.mountNav) window.WiseAuthForms.mountNav('signup');

    var root = document.getElementById('ac-chat');
    var pane = document.getElementById('ac-setup');
    if (!root) return;

    buildChatCard(root);

    var messages = root.querySelector('#ac-messages');
    var welcome = root.querySelector('#ac-welcome');
    var input = root.querySelector('#ac-input');
    var sendBtn = root.querySelector('#ac-send');

    var flow = { qi: 0, answers: {}, done: false, questions: SIGNUP_QUESTIONS };

    var scrollDown = function () { messages.scrollTop = messages.scrollHeight; };
    var hideWelcome = function () { if (welcome) welcome.classList.add('sc-hidden'); };

    function disablePriorChips() {
      messages.querySelectorAll('.sc-reply-chips:not(.is-done)').forEach(function (el) { el.classList.add('is-done'); });
    }
    function currentUserInitials() {
      return initialsFrom(flow.answers.name || flow.answers.email) || 'ME';
    }
    function addUser(text, masked) {
      var body = masked ? '<span class="sc-mask">' + esc(text) + '</span>' : esc(text);
      messages.insertAdjacentHTML('beforeend',
        '<div class="sc-line sc-line-you"><span class="sc-avatar sc-avatar-you" role="img" aria-label="You">' + esc(currentUserInitials()) + '</span><div class="sc-line-body">' + body + '<div class="sc-line-meta"><span class="sc-line-time">' + esc(nowLabel()) + '</span></div></div></div>');
      scrollDown();
    }
    function chipsHtml(options) {
      if (!options || !options.length) return '';
      var btns = options.map(function (o) {
        return '<button type="button" class="chip' + (o.primary ? ' chip-primary' : '') + '" data-ac="' + esc(o.action || 'answer') + '" data-value="' + esc(o.value != null ? o.value : o.label) + '" data-label="' + esc(o.label) + '">' + (o.icon ? '<span class="material-icons">' + esc(o.icon) + '</span>' : '') + esc(o.label) + '</button>';
      }).join('');
      return '<div class="sc-reply-chips">' + btns + '</div>';
    }
    function addWISEai(html, options) {
      messages.insertAdjacentHTML('beforeend',
        '<div class="sc-line sc-line-wiseai"><span class="sc-avatar sc-avatar-wiseai" role="img" aria-label="WISE Assistant">' + OWL_BUG + '</span><div class="sc-line-body">' + html + '<div class="sc-line-meta"><span class="sc-line-time">' + esc(nowLabel()) + '</span></div></div></div>');
      var chips = chipsHtml(options);
      if (chips) messages.insertAdjacentHTML('beforeend', chips);
      scrollDown();
    }
    function showTyping() {
      var el = document.createElement('div');
      el.className = 'sc-line sc-line-wiseai sc-line-typing';
      el.innerHTML = '<span class="sc-avatar sc-avatar-wiseai" role="img" aria-label="WISE Assistant">' + OWL_BUG + '</span><div class="sc-line-body"><span class="sc-typing-status"><span class="sc-typing" aria-hidden="true"><span></span><span></span><span></span></span><span class="sc-typing-label">Working on it…</span></span></div>';
      messages.appendChild(el);
      scrollDown();
      return el;
    }
    function wiseaiSay(html, options, cb, delay) {
      var typing = showTyping();
      setTimeout(function () {
        typing.remove();
        addWISEai(html, options);
        if (cb) cb();
      }, delay || 550);
    }
    function setInputEnabled(on, placeholder) {
      input.disabled = !on;
      sendBtn.disabled = !on;
      if (placeholder != null) input.placeholder = placeholder;
      if (on) setTimeout(function () { input.focus(); }, 60);
    }

    function currentQuestion() { return flow.questions[flow.qi]; }
    function promptFor(q) { return typeof q.prompt === 'function' ? q.prompt(flow.answers) : q.prompt; }

    /* The essentials we need before offering the "dive right in" shortcut:
       the user's name, their business (brand), and a phone number. */
    function hasValue(v) { return v != null && String(v).trim() !== ''; }
    function bareMinimumMet() {
      var a = flow.answers;
      return hasValue(a.name) && hasValue(a.brand) && hasValue(a.phone);
    }
    var DIVE_CHIP = { label: 'Dive right into the product', action: 'diveIn', icon: 'rocket_launch', primary: true };

    /* Single-select / consent / otp chips, with a Skip appended for optional Qs.
       Once the essentials are in, optional questions also offer a shortcut that
       creates the account and drops the user straight onto the overview. */
    function optionChips(q) {
      var opts = null;
      if (q.type === 'choice') opts = q.options.map(function (o) { return (typeof o === 'string' ? { label: o } : o); });
      else if (q.options) opts = q.options.slice();
      var skippable = q.optional && q.type !== 'multiselect' && q.type !== 'consent' && q.type !== 'otp';
      if (skippable) {
        opts = (opts || []).concat([{ label: 'Skip', action: 'skip', icon: 'skip_next' }]);
        if (bareMinimumMet()) opts = opts.concat([DIVE_CHIP]);
      }
      return opts;
    }
    function askCurrent(prefix) {
      var q = currentQuestion();
      if (!q) return;
      if (q.type === 'multiselect') { askMultiselect(prefix, q); return; }
      wiseaiSay((prefix || '') + promptFor(q), optionChips(q), function () { setInputEnabled(true, q.placeholder || 'Type your answer'); });
      renderPane();
    }

    /* Multi-select — toggle chips + free-text tokens + Continue / Skip. */
    function askMultiselect(prefix, q) {
      flow.multi = { set: [], q: q };
      wiseaiSay((prefix || '') + promptFor(q), null, function () {
        var suggest = (q.options || []).map(function (o) {
          return '<button type="button" class="chip ms-chip" data-ac="toggle" data-value="' + esc(o) + '">' + esc(o) + '</button>';
        }).join('');
        var controls = '<button type="button" class="chip chip-primary" data-ac="msdone"><span class="material-icons">check</span>Continue</button>' +
          (q.optional ? '<button type="button" class="chip" data-ac="skip"><span class="material-icons">skip_next</span>Skip</button>' : '') +
          (q.optional && bareMinimumMet() ? '<button type="button" class="chip chip-primary" data-ac="diveIn"><span class="material-icons">rocket_launch</span>Dive right into the product</button>' : '');
        messages.insertAdjacentHTML('beforeend',
          (suggest ? '<div class="sc-reply-chips ms-suggest">' + suggest + '</div>' : '<div class="sc-reply-chips ms-suggest"></div>') +
          '<div class="sc-reply-chips ms-controls">' + controls + '</div>');
        scrollDown();
        setInputEnabled(true, q.placeholder || 'Type to add your own…');
      });
      renderPane();
    }
    function addMultiToken(raw) {
      if (!flow.multi) return;
      var val = String(raw == null ? '' : raw).trim();
      if (!val) return;
      var q = flow.multi.q;
      if (q.max && flow.multi.set.length >= q.max) { input.value = ''; return; }
      if (flow.multi.set.indexOf(val) === -1) {
        flow.multi.set.push(val);
        var rows = messages.querySelectorAll('.sc-reply-chips.ms-suggest');
        var row = rows[rows.length - 1];
        if (row) row.insertAdjacentHTML('beforeend', '<button type="button" class="chip ms-chip is-selected" data-ac="toggle" data-value="' + esc(val) + '">' + esc(val) + '</button>');
      }
      input.value = '';
      input.focus();
    }
    function finalizeMultiselect() {
      if (!flow.multi) return;
      var q = flow.multi.q;
      var arr = flow.multi.set.slice();
      if (!q.optional && arr.length === 0) {
        wiseaiSay('Pick at least one option (or type your own), then tap Continue.', null, null);
        return;
      }
      disablePriorChips();
      addUser(arr.length ? arr.join(', ') : 'Skipped');
      flow.answers[q.key] = arr;
      var wasStep = q.step;
      flow.multi = null;
      setInputEnabled(false);
      input.value = '';
      advanceAfterAnswer(wasStep);
    }

    function advanceAfterAnswer(wasStep, prefixOverride) {
      flow.qi++;
      renderPane();
      if (flow.qi >= flow.questions.length) { finishFlow(); return; }
      var nextQ = currentQuestion();
      var prefix = prefixOverride != null ? prefixOverride
        : ((nextQ.step !== wasStep) ? (STEP_INTROS[nextQ.step] || '') : '');
      askCurrent(prefix);
    }

    /* Build a standalone follow-up question from a combo part (used when the
       combined answer didn't include or validate one of the pieces). */
    function partQuestion(part, step) {
      return {
        step: step, key: part.key, label: part.label,
        prompt: part.prompt || ('Please provide your ' + part.label.toLowerCase() + '.'),
        placeholder: part.placeholder, type: part.kind || 'text',
        validate: part.validate, transform: part.transform
      };
    }

    /* Combined free-text answer — parse out each field, apply what's valid, and
       queue targeted follow-ups for anything missing or invalid. */
    function submitCombo(rawValue) {
      var q = currentQuestion();
      if (!q || flow.done) return;
      var value = String(rawValue == null ? '' : rawValue).trim();
      if (!value) return;

      disablePriorChips();
      addUser(value);
      setInputEnabled(false);
      input.value = '';

      var parsed = q.parse ? q.parse(value) : {};
      var missing = [];
      q.parts.forEach(function (p) {
        var v = parsed[p.key];
        var has = v != null && String(v).trim() !== '';
        var err = has ? (p.validate ? p.validate(v) : null) : 'missing';
        if (err) { missing.push(p); }
        else { flow.answers[p.key] = p.transform ? p.transform(v) : v; }
      });
      renderPane();

      if (missing.length) {
        /* Optional group (e.g. priority product + teammate): keep whatever we
           could parse and quietly mark the rest as skipped — no follow-ups. */
        if (q.optional) {
          missing.forEach(function (p) { if (flow.answers[p.key] == null) flow.answers[p.key] = ''; });
          renderPane();
          advanceAfterAnswer(q.step);
          return;
        }
        var followups = missing.map(function (p) { return partQuestion(p, q.step); });
        Array.prototype.splice.apply(flow.questions, [flow.qi + 1, 0].concat(followups));
        var got = q.parts.length - missing.length;
        var labels = missing.map(function (p) { return p.label.toLowerCase(); }).join(' and ');
        var prefix = got > 0
          ? ('Got most of that — I just need your ' + labels + '. ')
          : ('Let\u2019s take these one at a time. ');
        advanceAfterAnswer(q.step, prefix);
        return;
      }
      advanceAfterAnswer(q.step);
    }

    function submitAnswer(rawValue, fromChip, chipLabel) {
      var q = currentQuestion();
      if (!q || flow.done) return;
      var value = String(rawValue == null ? '' : rawValue).trim();
      if (!fromChip && !value) return;

      disablePriorChips();
      var masked = q.type === 'password';
      addUser(fromChip ? (chipLabel || value) : (masked ? '••••••••' : value), masked && !fromChip);
      setInputEnabled(false);
      input.value = '';

      var err = q.validate ? q.validate(value, flow.answers) : null;
      if (err) {
        wiseaiSay(err + '<br>' + promptFor(q), optionChips(q), function () { setInputEnabled(true, q.placeholder || 'Type your answer'); });
        return;
      }

      flow.answers[q.key] = q.transform ? q.transform(value, flow.answers) : value;
      advanceAfterAnswer(q.step);
    }

    function skipCurrent() {
      var q = currentQuestion();
      if (!q || flow.done) return;
      disablePriorChips();
      addUser('Skipped');
      if (q.combo && q.parts) { q.parts.forEach(function (p) { flow.answers[p.key] = ''; }); }
      else { flow.answers[q.key] = (q.type === 'multiselect') ? [] : ''; }
      flow.multi = null;
      setInputEnabled(false);
      input.value = '';
      advanceAfterAnswer(q.step);
    }

    /* opts.dest === 'overview' skips the remaining/optional questions, creates the
       account, and drops the user straight onto the workspace overview. Otherwise
       the flow finishes normally and lands on the default (WISEai) surface. */
    function finishFlow(opts) {
      opts = opts || {};
      var toOverview = opts.dest === 'overview';
      var destUrl = toOverview ? auth.overviewUrl() : auth.landingUrl();
      flow.done = true;
      flow.multi = null;
      setInputEnabled(false, 'Creating your account…');
      renderPane(true);
      var lead = opts.quick ? 'Perfect — setting up your account so you can dive right in…' : 'Verifying and creating your account…';
      wiseaiSay(lead, null, function () {
        var a = flow.answers;
        var reg = {
          name: a.name, title: a.title, email: a.email, phone: a.phone,
          brands: String(a.brand || '').split(',').map(function (s) { return { name: s.trim() }; }).filter(function (b) { return b.name; }),
          category: a.category, competitors: a.competitors, distributionStage: a.diststage,
          retailersCurrent: a.retailersIn, retailersTarget: a.retailersTarget, revenueRange: a.revenue,
          goals: a.goals, priorityProduct: a.priorityProduct, teamContacts: a.team,
          distributors: a.distributors, manufacturingModel: a.mfgmodel, facilityCerts: a.certs, scaleReadiness: a.scalespeed,
          attestSig: a.sig, attestedAt: new Date().toISOString(),
          orgname: a.orgname, website: a.website, addr1: a.addr1, city: a.city, state: a.state, zip: a.zip,
          entitytype: a.entitytype, ein: a.ein, sidType: 'duns', sidValue: a.sid
        };
        auth.signup(reg);
        var tail = toOverview ? 'taking you to your overview…' : 'taking you to WISEai…';
        wiseaiSay('<span class="ac-success"><span class="material-icons">celebration</span>Welcome to WISEcode, ' + esc((a.name || '').split(' ')[0] || 'there') + '!</span> Your account is ready — ' + tail, null,
          function () { setTimeout(function () { location.href = destUrl; }, 1000); });
      });
    }

    /* Shortcut offered once the essentials are in: create the account now and
       skip the rest of the optional questions, landing on the overview page. */
    function diveInNow() {
      if (flow.done) return;
      disablePriorChips();
      addUser('Dive right into the product');
      flow.multi = null;
      setInputEnabled(false);
      input.value = '';
      finishFlow({ dest: 'overview', quick: true });
    }

    /* ── Progress pane ── */
    function fieldValueDisplay(key) {
      var v = flow.answers[key];
      if (v == null) return '';
      if (Array.isArray(v)) return v.length ? (v[0] + (v.length > 1 ? ' +' + (v.length - 1) : '')) : 'Skipped';
      if (v === '') return 'Skipped';
      if (key === 'attest') return 'Agreed';
      if (key === 'otp') return 'Verified';
      if (key === 'brand') return String(v).split(',')[0].trim() + (String(v).split(',').length > 1 ? '…' : '');
      return String(v);
    }
    function renderPane(allDone) {
      if (!pane) return;
      if (flow.paneHidden) { pane.hidden = true; return; }
      pane.hidden = false;
      var a = flow.answers;
      var total = TOTAL_FIELDS;
      var answered = allDone ? total : Object.keys(FIELD_META).filter(function (k) { return a[k] != null; }).length;
      var pct = Math.round((answered / total) * 100);
      var cq = allDone ? null : currentQuestion();
      var activeKeys = (!allDone && cq) ? (cq.combo ? cq.parts.map(function (p) { return p.key; }) : [cq.key]) : [];
      var curMacro = allDone ? MACROS.length : (cq ? cq.step : 0);

      var stepsHtml = MACROS.map(function (m, i) {
        var done = allDone || m.keys.every(function (k) { return a[k] != null; });
        var active = !done && i === curMacro;
        var cls = done ? 'vs-step--done' : (active ? 'vs-step--active' : '');
        var numHtml = done ? '<span class="material-icons">check</span>' : String(i + 1);
        var sub = 'Up next';
        if (done) sub = 'Completed';
        else if (active) sub = 'Step ' + (i + 1) + ' of ' + MACROS.length + ' · in progress';

        var fieldsHtml = '';
        if (done || active) {
          var rows = m.keys.map(function (k) {
            var isDone = a[k] != null;
            var isActive = activeKeys.indexOf(k) >= 0;
            if (!isDone && !isActive) return '';
            var meta = FIELD_META[k] || { label: k };
            var icon = isDone ? 'check_circle' : 'radio_button_unchecked';
            var stateCls = isDone ? 'sp-field--done' : 'sp-field--active';
            var val = isDone ? '<span class="sp-field-val">' + esc(fieldValueDisplay(k)) + '</span>' : '<span class="sp-field-val">Collecting…</span>';
            return '<div class="sp-field ' + stateCls + '"><span class="material-icons">' + icon + '</span><span class="sp-field-label">' + esc(meta.label) + '</span>' + val + '</div>';
          }).join('');
          if (rows) fieldsHtml = '<div class="sp-fields">' + rows + '</div>';
        }

        return '<div class="vs-step ' + cls + '">' +
          '<div class="vs-step-track"><div class="vs-step-num">' + numHtml + '</div><div class="vs-step-line"></div></div>' +
          '<div class="vs-step-body"><div class="vs-step-title">' + esc(m.title) + '</div><div class="vs-step-sub">' + esc(sub) + '</div>' + fieldsHtml + '</div>' +
          '</div>';
      }).join('');

      pane.innerHTML =
        '<div class="sp-inner">' +
          '<div class="sp-header">' +
            '<div class="sp-header-icon"><span class="material-icons">badge</span></div>' +
            '<div class="sp-header-text">' +
              '<div class="sp-title">Account setup</div>' +
              '<div class="sp-subtitle">' + (allDone ? 'All steps complete' : 'Complete these steps to finish') + '</div>' +
            '</div>' +
            '<div class="sp-header-menu">' +
              '<button type="button" class="panel-more-btn" id="sp-more-btn" title="More options" aria-expanded="false" aria-haspopup="menu" aria-controls="sp-menu" aria-label="More options"><span class="material-icons">more_vert</span></button>' +
              '<div id="sp-menu" class="sp-menu hidden" role="menu">' +
                '<button type="button" class="sp-menu-item" data-ac="removepane"><span class="material-icons">close</span><span>Remove panel</span></button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="sp-progress">' +
            '<div class="sp-progress-head"><span>' + answered + ' of ' + total + ' fields</span><span class="sp-progress-pct">' + pct + '%</span></div>' +
            '<div class="sp-progress-track"><div class="sp-progress-fill" style="width:' + pct + '%"></div></div>' +
          '</div>' +
          '<div class="sp-steps">' + stepsHtml + '</div>' +
        '</div>';
    }

    /* ── Wiring ── */
    var RESTART_RE = /^(start over|start again|restart|reset)$/i;
    function handleSend() {
      if (input.disabled) return;
      if (RESTART_RE.test((input.value || '').trim())) { restartFlow(); return; }
      if (flow.multi) { addMultiToken(input.value); return; }
      var q = currentQuestion();
      if (!q || flow.done) return;
      if (q.combo) { submitCombo(input.value); return; }
      submitAnswer(input.value, false);
    }
    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } });

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-ac]');
      if (!btn || !root.contains(btn)) return;
      var action = btn.dataset.ac;
      if (action === 'answer') { submitAnswer(btn.dataset.value, true, btn.dataset.label); return; }
      if (action === 'toggle') {
        if (!flow.multi) return;
        var val = btn.dataset.value;
        var idx = flow.multi.set.indexOf(val);
        if (idx >= 0) { flow.multi.set.splice(idx, 1); btn.classList.remove('is-selected'); }
        else {
          if (flow.multi.q.max && flow.multi.set.length >= flow.multi.q.max) return;
          flow.multi.set.push(val); btn.classList.add('is-selected');
        }
        return;
      }
      if (action === 'msdone') { finalizeMultiselect(); return; }
      if (action === 'diveIn') { diveInNow(); return; }
      if (action === 'skip') { skipCurrent(); return; }
      if (action === 'resend') {
        disablePriorChips();
        addUser('Resend code');
        wiseaiSay('Sent — a fresh 6-digit code is on its way. Enter it whenever you have it.', null, function () { setInputEnabled(true, '6-digit code'); });
        return;
      }
    });

    /* Account-setup pane "More" menu — open/close + remove the whole module. */
    if (pane) {
      pane.addEventListener('click', function (e) {
        var moreBtn = e.target.closest('#sp-more-btn');
        if (moreBtn) {
          e.stopPropagation();
          var menu = pane.querySelector('#sp-menu');
          if (menu) {
            var open = menu.classList.toggle('hidden') === false;
            moreBtn.classList.toggle('is-open', open);
            moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
          }
          return;
        }
        var rm = e.target.closest('[data-ac="removepane"]');
        if (rm) { flow.paneHidden = true; pane.hidden = true; return; }
      });
      document.addEventListener('click', function (e) {
        if (!pane.contains(e.target)) {
          var menu = pane.querySelector('#sp-menu');
          if (menu && !menu.classList.contains('hidden')) {
            menu.classList.add('hidden');
            var b = pane.querySelector('#sp-more-btn');
            if (b) { b.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false'); }
          }
        }
      });
    }

    function kickoff() {
      hideWelcome();
      renderPane();
      wiseaiSay(
        "<strong>Let's create your WISEcode account.</strong> Tap the suggested chips, add your own, or skip anything optional — and when I ask for a few details at once, feel free to type them together. Made a mistake? Just type <strong>“start over”</strong> anytime to begin again.",
        null,
        function () { askCurrent(); }
      );
    }
    function restartFlow() {
      flow = { qi: 0, answers: {}, done: false, questions: SIGNUP_QUESTIONS };
      if (messages) messages.innerHTML = '';
      setInputEnabled(false);
      input.value = '';
      kickoff();
    }

    /* Kick off the conversation immediately. */
    kickoff();
  }

  /* Chat card DOM (body + welcome + input rail) using wiseai-chat.css classes so
     it matches the app's chat module. No topbar — the module is headerless. */
  function buildChatCard(root) {
    root.classList.add('sc-card');
    root.innerHTML =
      '<div class="sc-body">' +
        '<div class="chat-messages-area" id="ac-messages" aria-live="polite" aria-atomic="false"></div>' +
        '<div class="sc-welcome sc-hidden" id="ac-welcome">' +
          '<div class="ws-logo-wrap">' +
            '<span class="ws-pulse-ring" aria-hidden="true"></span>' +
            '<span class="ws-pulse-ring" aria-hidden="true"></span>' +
            '<span class="ws-pulse-ring" aria-hidden="true"></span>' +
            '<div class="ws-logo" style="color:#fff">' + OWL_BUG + '</div>' +
          '</div>' +
          '<h1 class="ws-heading">Create your WISEcode account</h1>' +
          '<p class="ws-sub">Answer a few quick questions and we\u2019ll set you up.</p>' +
        '</div>' +
      '</div>' +
      '<div class="chat-input-rail">' +
        '<div class="sc-input-row">' +
          '<div class="fl-input-wrap">' +
            '<input type="text" class="fl-input" id="ac-input" placeholder="Type your answer" autocomplete="off" />' +
          '</div>' +
          '<button type="button" class="sc-send" id="ac-send" title="Send"><span class="material-icons">send</span></button>' +
        '</div>' +
      '</div>';
  }

  window.WiseAuthChat = { initSignup: initSignup };
})();
