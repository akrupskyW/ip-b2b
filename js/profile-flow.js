/**
 * Organization Profile module.
 *
 * A self-contained account surface rendered into #agent-main-scroll on
 * profile.html (an app-nav shell page). It presents the signed-in
 * organization as an editable form — org details, contact info, mailing
 * address, website / EIN, associated brand, plus brand logo + banner uploads.
 *
 * It is built to work HAND-IN-HAND with the persistent WISEai chat dock that
 * sits to its LEFT (profile.html pins `data-default-dock="left"`):
 *
 *   • chat → form  Every intent chip (and typed request like "change the email
 *                  to x@y.com") jumps to, highlights and writes the matching
 *                  field. Tapping a field chip arms that field so the next thing
 *                  you type in chat becomes its value.
 *   • form → chat  Every on-form edit — a field change, an org-type pick, a logo
 *                  or banner upload, a Save — narrates itself back into the
 *                  conversation via the live chat handle (setProfileChat).
 *
 * All classes are token-driven (var(--surface) / var(--border) / var(--text) …)
 * so the module tracks light/dark exactly like the rest of the app.
 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ---- Organization types (the <select> options) --------------------- */
const ORG_TYPES = [
  'Independent Food/Beverage Brand',
  'Enterprise CPG Manufacturer',
  'Private Label / Co-Manufacturer',
  'Retailer / Grocery Chain',
  'Ingredient Supplier',
  'Restaurant / Foodservice',
  'Certification / Standards Body',
];

/* ---- Live state — seeded to match the Flax4Life sample org ---------- */
const state = {
  orgName: 'Flax4Life',
  orgType: 'Independent Food/Beverage Brand',
  contactPerson: 'Kasondra Shippen',
  email: 'kasondra@flax4life.net',
  phone: '360-820-0235',
  address1: '468 W. Horton Rd.',
  address2: '',
  city: 'Bellingham',
  state: 'WA',
  zip: '98226',
  website: '',
  ein: '',
  brand: 'Flax4Life',
  logo: null,   // { kind: 'file' | 'url', value }
  banner: null, // { kind: 'file' | 'url', value }
};

/* Per-field metadata: label, input attrs, and the chat synonyms used to parse
   free-text requests ("set the zip to 98226"). Order-independent; layout below
   controls placement. */
const FIELD = {
  orgName:       { label: 'Organization Name', required: true, syn: ['organization name', 'org name', 'company name', 'organization', 'org'] },
  orgType:       { label: 'Organization Type', required: true, select: true, syn: ['organization type', 'org type', 'type'] },
  contactPerson: { label: 'Contact Person', syn: ['contact person', 'contact name', 'contact'] },
  email:         { label: 'Email', required: true, type: 'email', ph: 'name@company.com', syn: ['email address', 'contact email', 'e-mail', 'email'] },
  phone:         { label: 'Phone Number', type: 'tel', ph: '(000) 000-0000', syn: ['phone number', 'telephone', 'phone'] },
  address1:      { label: 'Street Address 1', syn: ['street address 1', 'street address', 'mailing address', 'address 1', 'address'] },
  address2:      { label: 'Street Address 2', ph: 'Apt, suite, unit, etc. (optional)', syn: ['street address 2', 'address 2', 'suite', 'apartment', 'apt', 'unit'] },
  city:          { label: 'City', syn: ['city', 'town'] },
  state:         { label: 'State', syn: ['state', 'province'] },
  zip:           { label: 'Zip', type: 'text', syn: ['zip code', 'postal code', 'zip'] },
  website:       { label: 'Website URL', type: 'url', ph: 'https://example.com', syn: ['website url', 'web address', 'website', 'url', 'site'] },
  ein:           { label: 'EIN (Employer ID Number)', ph: 'XX–XXXXXXX', syn: ['ein', 'employer id number', 'employer id', 'tax id'] },
};

/* The visual layout — order + column span in the 6-col grid (mirrors the
   screenshot: name/type · contact/email/phone · addr1/addr2 · city/state/zip ·
   website/ein). */
const LAYOUT = [
  ['orgName', 3], ['orgType', 3],
  ['contactPerson', 2], ['email', 2], ['phone', 2],
  ['address1', 3], ['address2', 3],
  ['city', 2], ['state', 2], ['zip', 2],
  ['website', 3], ['ein', 3],
];

let hostEl = null;
let pendingKey = null;   // a field armed by chat, awaiting the user's next message
let pendingUpload = null; // 'logo' | 'banner' armed by chat, awaiting a URL
const dirty = new Set(); // field keys changed since the last Save
const uploadTab = { logo: 'file', banner: 'file' }; // which tab each uploader shows

/* ---- Live chat bridge ---------------------------------------------- */
let chatApi = null;
export function setProfileChat(api) { chatApi = api; }

/* Push an assistant note into the conversation (used for form → chat). */
function pushChat(html) {
  if (!chatApi || !html) return;
  chatApi.hideWelcome?.();
  chatApi.addWISEai(html);
}

/* ---- Toast --------------------------------------------------------- */
function toast(msg, icon = 'check_circle') {
  let wrap = document.getElementById('pf-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'pf-toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'pf-toast';
  t.innerHTML = `<span class="material-icons">${esc(icon)}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 260); }, 2600);
}

/* ==================================================================== */
/* Rendering                                                            */
/* ==================================================================== */

function fieldHtml(key, span) {
  const f = FIELD[key];
  const req = f.required ? '<span class="pf-req" aria-hidden="true">*</span>' : '';
  const control = f.select
    ? `<select class="pf-select" id="pf-${key}" data-pf-field="${key}">
         ${ORG_TYPES.map((o) => `<option${o === state.orgType ? ' selected' : ''}>${esc(o)}</option>`).join('')}
       </select>`
    : `<input class="pf-input" id="pf-${key}" data-pf-field="${key}" type="${f.type || 'text'}"
         value="${esc(state[key])}" placeholder="${esc(f.ph || '')}"${f.type === 'email' ? ' autocomplete="email"' : ''} />`;
  return `
    <div class="pf-field pf-col-${span}" data-pf-fieldwrap="${key}">
      <label class="pf-label" for="pf-${key}">${esc(f.label)}${req}</label>
      ${control}
    </div>`;
}

function uploadHtml(kind) {
  const isLogo = kind === 'logo';
  const title = isLogo ? 'Brand Logo' : 'Brand Banner';
  const sub = isLogo
    ? `Logo for ${esc(state.brand)}`
    : `Dashboard banner for ${esc(state.brand)}, shown on the Brand Intelligence page. A default placeholder is used until you set one.`;
  const hint = isLogo
    ? 'JPEG, PNG, WebP, HEIC and more. Resized to max 512 × 512 px'
    : 'JPEG, PNG, WebP, HEIC and more. Wide images look best, resized to max 1600 px wide';
  const cur = state[kind];
  const tab = uploadTab[kind];
  const fileLabel = cur && cur.kind === 'file' ? esc(cur.value) : 'No file chosen';
  const urlVal = cur && cur.kind === 'url' ? esc(cur.value) : '';
  const body = tab === 'url'
    ? `<div class="pf-uprow">
         <input class="pf-url-input" type="url" data-pf-url="${kind}" value="${urlVal}" placeholder="https://example.com/${kind}.png" />
         <button type="button" class="pf-file-btn" data-pf-import="${kind}"><span class="material-icons">download</span>Import</button>
       </div>`
    : `<div class="pf-uprow">
         <label class="pf-file-btn"><span class="material-icons">upload_file</span>Choose File
           <input type="file" accept="image/*" data-pf-file="${kind}" hidden />
         </label>
         <span class="pf-file-name${cur && cur.kind === 'file' ? ' is-set' : ''}" data-pf-filename="${kind}">${fileLabel}</span>
       </div>`;
  return `
    <div class="pf-upload" data-pf-upload="${kind}">
      <div class="pf-upload-head">
        <div class="pf-upload-title">${esc(title)}</div>
        <div class="pf-upload-sub">${sub}</div>
      </div>
      <div class="pf-uptabs" role="tablist">
        <button type="button" class="pf-uptab${tab === 'file' ? ' is-active' : ''}" data-pf-uptab="${kind}:file" role="tab"><span class="material-icons">description</span>Browse File</button>
        <button type="button" class="pf-uptab${tab === 'url' ? ' is-active' : ''}" data-pf-uptab="${kind}:url" role="tab"><span class="material-icons">link</span>Import from URL</button>
      </div>
      ${body}
      <div class="pf-hint">${esc(hint)}</div>
    </div>`;
}

function paint() {
  if (!hostEl) return;
  hostEl.innerHTML = `
    <div class="pf-wrap">
      <div class="pf-head">
        <div class="pf-head-copy">
          <h1 class="pf-title">Organization Profile</h1>
          <p class="pf-lede">Edit organization details, contact information, and brands.</p>
        </div>
        <div class="pf-head-actions">
          <button type="button" class="pf-btn pf-btn--primary" data-pf-save><span class="material-icons">save</span>Save Changes</button>
        </div>
      </div>

      <form class="pf-card" data-pf-form novalidate>
        <div class="pf-section">
          <h2 class="pf-section-title"><span class="material-icons">apartment</span>Organization &amp; contact</h2>
          <div class="pf-grid">
            ${LAYOUT.map(([key, span]) => fieldHtml(key, span)).join('')}
          </div>
        </div>

        <div class="pf-section">
          <h2 class="pf-section-title"><span class="material-icons">sell</span>Associated brand</h2>
          <div class="pf-brandchips">
            <span class="pf-brandchip"><span class="material-icons">verified</span>${esc(state.brand)}</span>
          </div>
        </div>

        <div class="pf-section">
          <h2 class="pf-section-title"><span class="material-icons">image</span>Brand assets</h2>
          ${uploadHtml('logo')}
          ${uploadHtml('banner')}
        </div>

        <div class="pf-footer">
          <button type="submit" class="pf-btn pf-btn--primary"><span class="material-icons">save</span>Save Changes</button>
        </div>
      </form>
    </div>`;
}

/* Repaint just one uploader block in place (keeps the rest of the form). */
function repaintUpload(kind) {
  const el = hostEl?.querySelector(`[data-pf-upload="${kind}"]`);
  if (el) el.outerHTML = uploadHtml(kind);
}

/* ---- Highlight helpers --------------------------------------------- */
function flash(el) {
  if (!el) return;
  el.classList.remove('is-flash');
  void el.offsetWidth; // restart the animation
  el.classList.add('is-flash');
  setTimeout(() => el.classList.remove('is-flash'), 1200);
}

function focusField(key) {
  const wrap = hostEl?.querySelector(`[data-pf-fieldwrap="${key}"]`);
  const input = hostEl?.querySelector(`[data-pf-field="${key}"]`);
  wrap?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  flash(wrap);
  setTimeout(() => { input?.focus(); if (input && input.select) input.select(); }, 220);
}

function focusUpload(kind) {
  const el = hostEl?.querySelector(`[data-pf-upload="${kind}"]`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  flash(el);
}

/* ==================================================================== */
/* Writes                                                               */
/* ==================================================================== */

/**
 * Apply a value to a field and return the WISEai confirmation HTML.
 *   source 'chat' → set the DOM control too (the chat drove it)
 *   source 'form' → the DOM already holds the value (the user typed it)
 */
function applyField(key, rawValue, source) {
  const f = FIELD[key];
  if (!f) return '';
  let value = String(rawValue == null ? '' : rawValue).trim();

  /* org type snaps to the closest known option so the <select> stays valid. */
  if (key === 'orgType') {
    const match = ORG_TYPES.find((o) => o.toLowerCase() === value.toLowerCase())
      || ORG_TYPES.find((o) => o.toLowerCase().includes(value.toLowerCase()) && value.length >= 3);
    if (!match) {
      return `I couldn\u2019t match \u201c${esc(value)}\u201d to an organization type. Pick one of: ${ORG_TYPES.map((o) => `<strong>${esc(o)}</strong>`).join(', ')}.`;
    }
    value = match;
  }

  const prev = state[key];
  state[key] = value;
  dirty.add(key);
  pendingKey = null;

  if (source === 'chat') {
    const ctrl = hostEl?.querySelector(`[data-pf-field="${key}"]`);
    if (ctrl) ctrl.value = value;
    const wrap = hostEl?.querySelector(`[data-pf-fieldwrap="${key}"]`);
    wrap?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    flash(wrap);
  }

  toast(`${f.label} updated`);
  const shown = value ? `<strong>${esc(value)}</strong>` : '<em>(cleared)</em>';
  const verb = prev ? 'Updated' : 'Set';
  return `${verb} <strong>${esc(f.label)}</strong> to ${shown}. Don\u2019t forget to <strong>Save Changes</strong> when you\u2019re done.`;
}

function setUpload(kind, entry, source) {
  state[kind] = entry;
  dirty.add(kind);
  pendingUpload = null;
  repaintUpload(kind);
  const label = kind === 'logo' ? 'Brand logo' : 'Brand banner';
  const via = entry.kind === 'url' ? 'from the URL' : 'from your device';
  toast(`${label} set`, 'image');
  const html = `Set the <strong>${label.toLowerCase()}</strong> ${via}: <strong>${esc(entry.value)}</strong>.`;
  if (source === 'form') pushChat(html); else return html;
  return html;
}

function doSave(source) {
  const changed = [...dirty].map((k) => FIELD[k]?.label || (k === 'logo' ? 'Brand logo' : k === 'banner' ? 'Brand banner' : k));
  dirty.clear();
  toast('Profile saved', 'cloud_done');
  const html = changed.length
    ? `Saved your organization profile. Updated: ${changed.map((c) => `<strong>${esc(c)}</strong>`).join(', ')}.`
    : 'Saved your organization profile \u2014 everything is up to date.';
  if (source === 'form') pushChat(html); else return html;
  return html;
}

/* ==================================================================== */
/* DOM events (form → chat)                                             */
/* ==================================================================== */

export function renderProfile(mainEl) {
  hostEl = mainEl;
  pendingKey = null;
  pendingUpload = null;
  dirty.clear();
  uploadTab.logo = 'file';
  uploadTab.banner = 'file';
  paint();

  /* Field commits — a real change narrates into the chat. */
  mainEl.addEventListener('change', (e) => {
    const field = e.target.closest('[data-pf-field]');
    if (field) {
      const key = field.dataset.pfField;
      const value = field.value;
      if (String(value) === String(state[key])) return;
      const html = applyField(key, value, 'form');
      pushChat(html);
      return;
    }
    const file = e.target.closest('[data-pf-file]');
    if (file && file.files && file.files[0]) {
      setUpload(file.dataset.pfFile, { kind: 'file', value: file.files[0].name }, 'form');
    }
  });

  mainEl.addEventListener('click', (e) => {
    /* top Save CTA — mirrors the footer submit so the action is reachable at
       both ends of the form. */
    if (e.target.closest('[data-pf-save]')) {
      e.preventDefault();
      doSave('form');
      return;
    }
    /* uploader tab switch */
    const tab = e.target.closest('[data-pf-uptab]');
    if (tab) {
      const [kind, which] = tab.dataset.pfUptab.split(':');
      uploadTab[kind] = which;
      repaintUpload(kind);
      return;
    }
    /* import-from-URL */
    const imp = e.target.closest('[data-pf-import]');
    if (imp) {
      const kind = imp.dataset.pfImport;
      const inp = mainEl.querySelector(`[data-pf-url="${kind}"]`);
      const url = (inp?.value || '').trim();
      if (!url) { toast('Enter an image URL first', 'link'); return; }
      setUpload(kind, { kind: 'url', value: url }, 'form');
      return;
    }
  });

  mainEl.addEventListener('submit', (e) => {
    if (!e.target.closest('[data-pf-form]')) return;
    e.preventDefault();
    doSave('form');
  });
}

/* ==================================================================== */
/* WISEai bridge (chat → form)                                          */
/* ==================================================================== */

/* Route a bare intent id to the right on-form action + arm the field so the
   next typed line becomes its value. Returns nothing; the reply is narrated by
   PROFILE_WISEAI.intentReplies. */
function runIntent(intent) {
  switch (intent) {
    case 'rename_org':     pendingKey = 'orgName'; focusField('orgName'); break;
    case 'org_type':       pendingKey = 'orgType'; focusField('orgType'); break;
    case 'contact_person': pendingKey = 'contactPerson'; focusField('contactPerson'); break;
    case 'email':          pendingKey = 'email'; focusField('email'); break;
    case 'phone':          pendingKey = 'phone'; focusField('phone'); break;
    case 'address':        pendingKey = 'address1'; focusField('address1'); break;
    case 'website':        pendingKey = 'website'; focusField('website'); break;
    case 'ein':            pendingKey = 'ein'; focusField('ein'); break;
    case 'logo':           pendingUpload = 'logo'; focusUpload('logo'); break;
    case 'banner':         pendingUpload = 'banner'; focusUpload('banner'); break;
    default: break;
  }
}

/* Parse "<verb> [the] <field> to <value>" from a typed message. */
const VERB_RE = /^(?:set|change|update|make|rename|edit|put)\s+(?:the\s+|my\s+|our\s+)?(.+?)\s+(?:to|as|=|:|->)\s+(.+)$/i;
const URL_RE = /https?:\/\/\S+|\S+\.(?:png|jpe?g|webp|gif|svg|heic)\b/i;

function matchFieldPhrase(phrase) {
  const p = phrase.trim().toLowerCase();
  let best = null;
  let bestLen = 0;
  for (const [key, f] of Object.entries(FIELD)) {
    for (const s of f.syn) {
      if ((p === s || p.includes(s)) && s.length > bestLen) { best = key; bestLen = s.length; }
    }
  }
  return best;
}

/* Typed-message handler wired as `reply` on the dock config. */
function reply(text) {
  const t = String(text || '').trim();
  if (!t) return 'Tell me what to update \u2014 name, email, address, website, EIN, or your brand logo &amp; banner.';

  /* 1) explicit "set X to Y" command wins, even over an armed field. */
  const m = t.match(VERB_RE);
  if (m) {
    const key = matchFieldPhrase(m[1]);
    if (key) return applyField(key, m[2], 'chat');
    if (/logo|banner/i.test(m[1]) && URL_RE.test(m[2])) {
      return setUpload(/banner/i.test(m[1]) ? 'banner' : 'logo', { kind: 'url', value: m[2].trim() }, 'chat');
    }
  }

  /* 2) an armed upload waiting for a URL. */
  if (pendingUpload && URL_RE.test(t)) {
    const kind = pendingUpload;
    return setUpload(kind, { kind: 'url', value: t.match(URL_RE)[0] }, 'chat');
  }

  /* 3) an armed field waiting for a value — treat the whole line as the value. */
  if (pendingKey) return applyField(pendingKey, t, 'chat');

  /* 4) save. */
  if (/^(?:save|save changes|save it|done)\b/i.test(t)) return doSave('chat');

  /* 5) fall back: help the user find the right field. */
  const key = matchFieldPhrase(t);
  if (key) {
    pendingKey = key; focusField(key);
    return `Sure \u2014 what should I set <strong>${esc(FIELD[key].label)}</strong> to?`;
  }
  return 'I can edit any part of your organization profile \u2014 try \u201cchange the email to name@brand.com\u201d, \u201cset the website to https://\u2026\u201d, or tap a chip to pick a field.';
}

export const PROFILE_WISEAI = {
  sub: 'Edit your organization profile \u2014 names, contact, address, brand logo &amp; banner. Tap a chip or just tell me.',
  chipsFlow: 'wrap',
  sourceLabel: '',
  reply,
  /* Large "at a glance" cards shown alongside the small chips on the welcome
     screen — each reuses an existing intent so a click drives the same flow. */
  scorecards: {
    label: 'Your profile at a glance',
    cards: [
      { intent: 'logo', icon: 'image', iconTone: 'brand', pill: { tone: 'up', icon: 'auto_awesome', text: 'Do next' }, title: 'Upload your brand logo', desc: 'Add or replace your logo — paste an image URL here and I\u2019ll import it.', action: 'Upload brand logo', ask: 'Upload brand logo' },
      { intent: 'address', icon: 'home', iconTone: 'brand', pill: { tone: 'up', icon: 'edit', text: 'Edit' }, title: 'Edit mailing address', desc: 'Update street, city, state and zip — just tell me the new details.', action: 'Edit address', ask: 'Edit mailing address' },
      { intent: 'save', icon: 'save', iconTone: 'brand', pill: { tone: 'up', icon: 'save', text: 'Save' }, title: 'Save changes', desc: 'Write your profile edits — I\u2019ll confirm exactly what changed.', action: 'Save changes', ask: 'Save changes' },
    ],
  },
  intents: [
    { intent: 'rename_org', label: 'Rename organization', icon: 'badge' },
    { intent: 'org_type', label: 'Change organization type', icon: 'category' },
    { intent: 'contact_person', label: 'Update contact person', icon: 'person' },
    { intent: 'email', label: 'Change contact email', icon: 'mail' },
    { intent: 'phone', label: 'Update phone number', icon: 'call' },
    { intent: 'address', label: 'Edit mailing address', icon: 'home' },
    { intent: 'website', label: 'Set website URL', icon: 'language' },
    { intent: 'ein', label: 'Add EIN', icon: 'tag' },
    { intent: 'logo', label: 'Upload brand logo', icon: 'image' },
    { intent: 'banner', label: 'Set brand banner', icon: 'panorama' },
    { intent: 'save', label: 'Save changes', icon: 'save' },
  ],
  intentReplies: {
    rename_org: () => `Your organization is currently <strong>${esc(state.orgName)}</strong>. What should I rename it to?`,
    org_type: () => `It\u2019s set to <strong>${esc(state.orgType)}</strong>. Which type fits best? Options: ${ORG_TYPES.map((o) => `<strong>${esc(o)}</strong>`).join(', ')}.`,
    contact_person: () => `The contact is <strong>${esc(state.contactPerson)}</strong>. Who should I put down instead?`,
    email: () => `The contact email is <strong>${esc(state.email)}</strong>. What\u2019s the new email address?`,
    phone: () => `The phone number is <strong>${esc(state.phone || 'empty')}</strong>. What should it be?`,
    address: () => 'I\u2019ve jumped to the mailing address. Tell me the new street address (I can set city, state and zip too \u2014 just say e.g. \u201cset the city to Seattle\u201d).',
    website: () => `The website is <strong>${esc(state.website || 'not set yet')}</strong>. What URL should I use?`,
    ein: () => 'Send me the EIN (format XX\u2013XXXXXXX) and I\u2019ll add it to the profile.',
    logo: () => 'Opened the <strong>Brand Logo</strong> uploader. Choose a file on the form, or paste an image URL right here and I\u2019ll import it.',
    banner: () => 'Opened the <strong>Brand Banner</strong> uploader. Pick a file, or drop an image URL in chat and I\u2019ll import it.',
    save: () => doSave('chat'),
  },
  onIntent: (intent) => {
    if (intent === 'save') return false; // intentReplies.save() performs + narrates
    runIntent(intent);
    return false; // let the matching guidance reply post
  },
};
