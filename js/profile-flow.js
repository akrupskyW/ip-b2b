/**
 * Organization Profile module.
 *
 * A self-contained account surface rendered into #agent-main-scroll on
 * profile.html (an app-nav shell page). It presents the signed-in
 * organization as an editable form — org details, contact info, mailing
 * address, website / EIN, associated brand, plus brand logo + banner uploads.
 *
 * It is built to work HAND-IN-HAND with the persistent WISEcodeAI chat dock that
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

/* Shared user-avatar store — the avatar picture set here is what the primary
   navigation chips and the chat "you" bubbles read app-wide. */
import { getUserAvatar, setUserAvatar, clearUserAvatar } from './user-avatar.js';

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
  /* The member's personal avatar picture. Persisted in the shared user-avatar
     store (localStorage) so it shows in the nav + chat everywhere; null falls
     back to initials. Seeded from the store so a reload keeps what you set. */
  avatar: getUserAvatar(),      // image src (data URL or remote URL) | null
  avatarName: '',               // display name for a device upload
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
let avatarTab = 'file'; // which tab the avatar uploader shows ('file' | 'url')

/* ---- Live chat bridge ---------------------------------------------- */
let chatApi = null;
export function setProfileChat(api) { chatApi = api; }

/* Push an assistant note into the conversation (used for form → chat). */
function pushChat(html) {
  if (!chatApi || !html) return;
  chatApi.hideWelcome?.();
  /* respond() streams the shared reasoning trace before the reply lands, so a
     mirrored action reads like any other WISEcodeAI turn — never an instant paste. */
  (chatApi.respond || chatApi.addWISEcodeAI)(html);
}

/* ---- Toast --------------------------------------------------------- */
function toast(msg, icon = 'check') {
  let wrap = document.getElementById('pf-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'pf-toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'pf-toast';
  t.innerHTML = `<span class="material-symbols-outlined">${esc(icon)}</span><span>${esc(msg)}</span>`;
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
         <button type="button" class="pf-file-btn" data-pf-import="${kind}"><span class="material-symbols-outlined">download</span>Import</button>
       </div>`
    : `<div class="pf-uprow">
         <label class="pf-file-btn"><span class="material-symbols-outlined">upload_file</span>Choose File
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
        <button type="button" class="pf-uptab${tab === 'file' ? ' is-active' : ''}" data-pf-uptab="${kind}:file" role="tab"><span class="material-symbols-outlined">description</span>Browse File</button>
        <button type="button" class="pf-uptab${tab === 'url' ? ' is-active' : ''}" data-pf-uptab="${kind}:url" role="tab"><span class="material-symbols-outlined">link</span>Import from URL</button>
      </div>
      ${body}
      <div class="pf-hint">${esc(hint)}</div>
    </div>`;
}

/* Built-in avatar starters — five SVG art patterns plus two professional
   portraits — so a member can pre-fill an avatar in one tap. SVG presets
   store as data URLs; photo presets use a local asset path. Picking one
   flows through setUserAvatar() so it shows in the nav + chat. */
const AVATAR_PRESETS = [
  {
    id: 'aurora', label: 'Aurora',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><defs><radialGradient id='a' cx='28%' cy='30%' r='75%'><stop offset='0' stop-color='#5eead4'/><stop offset='1' stop-color='#5eead4' stop-opacity='0'/></radialGradient><radialGradient id='b' cx='78%' cy='38%' r='75%'><stop offset='0' stop-color='#a78bfa'/><stop offset='1' stop-color='#a78bfa' stop-opacity='0'/></radialGradient><radialGradient id='c' cx='52%' cy='82%' r='80%'><stop offset='0' stop-color='#f472b6'/><stop offset='1' stop-color='#f472b6' stop-opacity='0'/></radialGradient></defs><rect width='96' height='96' fill='#0b1220'/><rect width='96' height='96' fill='url(#a)'/><rect width='96' height='96' fill='url(#b)'/><rect width='96' height='96' fill='url(#c)'/></svg>`,
  },
  {
    id: 'prism', label: 'Prism',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#f59e0b'/><stop offset='1' stop-color='#ef4444'/></linearGradient></defs><rect width='96' height='96' fill='url(#g)'/><path d='M0 0 L48 0 L0 48 Z' fill='#fff' fill-opacity='0.20'/><path d='M96 0 L96 48 L48 0 Z' fill='#000' fill-opacity='0.12'/><path d='M0 96 L48 96 L0 48 Z' fill='#000' fill-opacity='0.16'/><path d='M96 96 L96 48 L48 96 Z' fill='#fff' fill-opacity='0.16'/><path d='M48 0 L96 48 L48 96 L0 48 Z' fill='#fff' fill-opacity='0.07'/></svg>`,
  },
  {
    id: 'orbit', label: 'Orbit',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#6366f1'/><stop offset='1' stop-color='#0ea5e9'/></linearGradient></defs><rect width='96' height='96' fill='url(#g)'/><g fill='none' stroke='#fff'><circle cx='48' cy='48' r='10' stroke-width='3' stroke-opacity='0.55'/><circle cx='48' cy='48' r='20' stroke-width='2.5' stroke-opacity='0.38'/><circle cx='48' cy='48' r='30' stroke-width='2' stroke-opacity='0.26'/><circle cx='48' cy='48' r='40' stroke-width='1.5' stroke-opacity='0.18'/></g><circle cx='48' cy='48' r='4' fill='#fff'/></svg>`,
  },
  {
    id: 'tide', label: 'Tide',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#22d3ee'/><stop offset='1' stop-color='#3b82f6'/></linearGradient></defs><rect width='96' height='96' fill='url(#g)'/><path d='M0 40 Q24 24 48 40 T96 40 V96 H0 Z' fill='#fff' fill-opacity='0.16'/><path d='M0 56 Q24 40 48 56 T96 56 V96 H0 Z' fill='#fff' fill-opacity='0.16'/><path d='M0 72 Q24 56 48 72 T96 72 V96 H0 Z' fill='#0b1220' fill-opacity='0.18'/></svg>`,
  },
  {
    id: 'bloom', label: 'Bloom',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><defs><radialGradient id='g' cx='50%' cy='28%' r='85%'><stop offset='0' stop-color='#34d399'/><stop offset='1' stop-color='#059669'/></radialGradient></defs><rect width='96' height='96' fill='url(#g)'/><g fill='#fff'><circle cx='26' cy='30' r='7' fill-opacity='0.9'/><circle cx='62' cy='22' r='5' fill-opacity='0.7'/><circle cx='72' cy='52' r='9' fill-opacity='0.85'/><circle cx='40' cy='58' r='6' fill-opacity='0.75'/><circle cx='22' cy='70' r='5' fill-opacity='0.65'/><circle cx='58' cy='74' r='7' fill-opacity='0.9'/></g></svg>`,
  },
  { id: 'portrait-m', label: 'Professional man', src: '../assets/avatars/avatar-portrait-male.jpg' },
  { id: 'portrait-f', label: 'Professional woman', src: '../assets/avatars/avatar-portrait-female.jpg' },
];

/* Encode a preset's SVG as a data URL (used as the avatar src + swatch img). */
function presetDataUrl(svg) {
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function presetSrc(preset) {
  return preset.src || presetDataUrl(preset.svg);
}

/* The member's avatar uploader — a live circular preview beside the same
   file / URL tab control the brand assets use, a one-tap pattern picker, plus
   a Remove action once a picture is set. Writing here updates the nav + chat
   avatars immediately. */
function avatarUploadHtml() {
  const src = state.avatar;
  const preview = src
    ? `<img src="${esc(src)}" alt="Your avatar" />`
    : `<span class="material-symbols-outlined">person</span>`;
  const body = avatarTab === 'url'
    ? `<div class="pf-uprow">
         <input class="pf-url-input" type="url" data-pf-avatar-url value="${src && /^https?:/i.test(src) ? esc(src) : ''}" placeholder="https://example.com/me.jpg" />
         <button type="button" class="pf-file-btn" data-pf-avatar-import><span class="material-symbols-outlined">download</span>Import</button>
       </div>`
    : `<div class="pf-uprow">
         <label class="pf-file-btn"><span class="material-symbols-outlined">upload_file</span>Choose File
           <input type="file" accept="image/*" data-pf-avatar-file hidden />
         </label>
         <span class="pf-file-name${state.avatarName ? ' is-set' : ''}" data-pf-avatar-filename>${state.avatarName ? esc(state.avatarName) : 'No file chosen'}</span>
       </div>`;
  const remove = src
    ? `<button type="button" class="pf-file-btn pf-avatar-remove" data-pf-avatar-remove><span class="material-symbols-outlined">delete</span>Remove picture</button>`
    : '';
  return `
    <div class="pf-upload pf-avatar-upload" data-pf-avatar>
      <div class="pf-upload-head">
        <div class="pf-upload-title">Avatar picture</div>
        <div class="pf-upload-sub">Your personal photo. Once set it appears in the primary navigation and on your messages in the chat. Until you add one, your initials are used.</div>
      </div>
      <div class="pf-avatar-row">
        <div class="pf-avatar-preview${src ? ' is-set' : ''}" data-pf-avatar-preview>${preview}</div>
        <div class="pf-avatar-controls">
          <div class="pf-uptabs" role="tablist">
            <button type="button" class="pf-uptab${avatarTab === 'file' ? ' is-active' : ''}" data-pf-avatar-uptab="file" role="tab"><span class="material-symbols-outlined">description</span>Browse File</button>
            <button type="button" class="pf-uptab${avatarTab === 'url' ? ' is-active' : ''}" data-pf-avatar-uptab="url" role="tab"><span class="material-symbols-outlined">link</span>Import from URL</button>
          </div>
          ${body}
          ${remove}
        </div>
      </div>
      <div class="pf-avatar-presets">
        <span class="pf-avatar-presets-label">Or start from a pattern or photo</span>
        <div class="pf-avatar-presets-row" role="group" aria-label="Avatar starting images">
          ${AVATAR_PRESETS.map((p) => {
            const url = presetSrc(p);
            const active = src === url ? ' is-active' : '';
            const kind = p.src ? 'portrait' : 'pattern';
            return `<button type="button" class="pf-avatar-preset${active}" data-pf-avatar-preset="${p.id}" title="${esc(p.label)}" aria-label="${esc(p.label)} ${kind}" aria-pressed="${src === url ? 'true' : 'false'}"><img src="${url}" alt="" /></button>`;
          }).join('')}
        </div>
      </div>
      <div class="pf-hint">JPEG, PNG, WebP, HEIC and more. Square images look best.</div>
    </div>`;
}

function paint() {
  if (!hostEl) return;
  hostEl.innerHTML = `
    <div class="pf-wrap">
      <div class="pf-head">
        <div class="pf-head-copy">
          <div class="pf-title-row">
            <h1 class="pf-title">Organization Profile</h1>
            <div class="pf-head-actions">
              <button type="button" class="pf-btn pf-btn--primary" data-pf-save disabled aria-disabled="true"><span class="material-symbols-outlined">save</span>Save Changes</button>
            </div>
          </div>
          <p class="pf-lede">Edit organization details, contact information, and brands.</p>
        </div>
      </div>

      <form class="pf-card" data-pf-form novalidate>
        <div class="pf-section">
          <h2 class="pf-section-title">Organization &amp; contact</h2>
          <div class="pf-grid">
            ${LAYOUT.map(([key, span]) => fieldHtml(key, span)).join('')}
          </div>
        </div>

        <div class="pf-section">
          <h2 class="pf-section-title">Associated brand</h2>
          <div class="pf-brandchips">
            <span class="pf-brandchip"><span class="material-symbols-outlined">verified</span>${esc(state.brand)}</span>
          </div>
        </div>

        <div class="pf-section">
          <h2 class="pf-section-title">Brand assets</h2>
          ${uploadHtml('logo')}
          ${uploadHtml('banner')}
        </div>

        <div class="pf-section">
          <h2 class="pf-section-title">Avatar picture</h2>
          ${avatarUploadHtml()}
        </div>

        <div class="pf-footer">
          <button type="submit" class="pf-btn pf-btn--primary"><span class="material-symbols-outlined">save</span>Save Changes</button>
        </div>
      </form>
    </div>`;
}

/* Repaint just one uploader block in place (keeps the rest of the form). */
function repaintUpload(kind) {
  const el = hostEl?.querySelector(`[data-pf-upload="${kind}"]`);
  if (el) el.outerHTML = uploadHtml(kind);
}

/* Repaint just the avatar uploader block in place. */
function repaintAvatar() {
  const el = hostEl?.querySelector('[data-pf-avatar]');
  if (el) el.outerHTML = avatarUploadHtml();
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

function focusAvatar() {
  const el = hostEl?.querySelector('[data-pf-avatar]');
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  flash(el);
}

/* ==================================================================== */
/* Writes                                                               */
/* ==================================================================== */

/**
 * Apply a value to a field and return the WISEcodeAI confirmation HTML.
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
  syncHeadSave();
  const shown = value ? `<strong>${esc(value)}</strong>` : '<em>(cleared)</em>';
  const verb = prev ? 'Updated' : 'Set';
  return `${verb} <strong>${esc(f.label)}</strong> to ${shown}. Don\u2019t forget to <strong>Save Changes</strong> when you\u2019re done.`;
}

function setUpload(kind, entry, source) {
  state[kind] = entry;
  dirty.add(kind);
  pendingUpload = null;
  repaintUpload(kind);
  syncHeadSave();
  const label = kind === 'logo' ? 'Brand logo' : 'Brand banner';
  const via = entry.kind === 'url' ? 'from the URL' : 'from your device';
  toast(`${label} set`, 'image');
  const html = `Set the <strong>${label.toLowerCase()}</strong> ${via}: <strong>${esc(entry.value)}</strong>.`;
  if (source === 'form') pushChat(html); else return html;
  return html;
}

/* Set the member's avatar picture from a URL or a device upload (data URL).
   Persists to the shared store, which live-updates the nav + chat avatars. */
function setAvatar(src, name, source) {
  state.avatar = src;
  state.avatarName = name || '';
  pendingUpload = null;
  dirty.add('avatar');
  setUserAvatar(src);
  repaintAvatar();
  syncHeadSave();
  const via = name ? 'from your device' : 'from the URL';
  toast('Avatar picture set', 'account_circle');
  const html = `Set your <strong>avatar picture</strong> ${via}. It now shows in the primary navigation and on your chat messages.`;
  if (source === 'form') pushChat(html); else return html;
  return html;
}

/* Pre-fill the avatar from one of the built-in art or portrait presets. */
function setAvatarPreset(preset, source) {
  if (!preset) return '';
  const kind = preset.src ? 'portrait' : 'pattern';
  state.avatar = presetSrc(preset);
  state.avatarName = '';
  pendingUpload = null;
  dirty.add('avatar');
  setUserAvatar(state.avatar);
  repaintAvatar();
  syncHeadSave();
  toast(preset.src ? 'Avatar picture set' : 'Avatar pattern set', 'account_circle');
  const html = `Set your <strong>avatar picture</strong> to the <strong>${esc(preset.label)}</strong> ${kind}. It now shows in the primary navigation and on your chat messages.`;
  if (source === 'form') pushChat(html); else return html;
  return html;
}

/* Remove the avatar picture — the nav + chat fall back to initials again. */
function removeAvatar(source) {
  state.avatar = null;
  state.avatarName = '';
  pendingUpload = null;
  dirty.add('avatar');
  clearUserAvatar();
  repaintAvatar();
  syncHeadSave();
  toast('Avatar picture removed', 'account_circle');
  const html = 'Removed your <strong>avatar picture</strong>. Your initials are back in the primary navigation and on your chat messages.';
  if (source === 'form') pushChat(html); else return html;
  return html;
}

const DIRTY_LABEL = { logo: 'Brand logo', banner: 'Brand banner', avatar: 'Avatar picture' };
let savedSnap = '';

function formSnap() {
  const snap = {};
  for (const key of Object.keys(FIELD)) {
    const el = hostEl?.querySelector(`[data-pf-field="${key}"]`);
    snap[key] = el ? String(el.value ?? '') : String(state[key] ?? '');
  }
  snap.logo = JSON.stringify(state.logo);
  snap.banner = JSON.stringify(state.banner);
  snap.avatar = String(state.avatar ?? '');
  return JSON.stringify(snap);
}

/* Pull in-progress field values into state so Save (especially the
   headline button, which is type=button and does not blur the field)
   writes what is on screen, not only what has already committed. */
function commitPendingFields() {
  if (!hostEl) return;
  for (const el of hostEl.querySelectorAll('[data-pf-field]')) {
    const key = el.dataset.pfField;
    if (!FIELD[key]) continue;
    let value = String(el.value ?? '').trim();
    if (key === 'orgType') {
      const match = ORG_TYPES.find((o) => o.toLowerCase() === value.toLowerCase());
      if (match) value = match;
    }
    if (value !== String(state[key] ?? '')) {
      state[key] = value;
      dirty.add(key);
    }
  }
}

function doSave(source) {
  commitPendingFields();
  const changed = [...dirty].map((k) => FIELD[k]?.label || DIRTY_LABEL[k] || k);
  dirty.clear();
  savedSnap = formSnap();
  toast('Profile saved', 'cloud_done');
  syncHeadSave();
  const html = changed.length
    ? `Saved your organization profile. Updated: ${changed.map((c) => `<strong>${esc(c)}</strong>`).join(', ')}.`
    : 'Saved your organization profile \u2014 everything is up to date.';
  if (source === 'form') pushChat(html); else return html;
  return html;
}

/* The headline Save stays disabled until something on the form actually
   differs from the last save — in-progress typing counts, and so do
   committed field / upload / avatar edits. The footer Save is unchanged. */
function hasUnsavedEdits() {
  if (!hostEl || !savedSnap) return dirty.size > 0;
  return formSnap() !== savedSnap;
}

function syncHeadSave() {
  const btn = hostEl?.querySelector('[data-pf-save]');
  if (!btn) return;
  const on = hasUnsavedEdits();
  btn.disabled = !on;
  btn.setAttribute('aria-disabled', on ? 'false' : 'true');
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
  avatarTab = 'file';
  /* Re-seed from the shared store so the uploader reflects a picture set on an
     earlier visit (or cleared elsewhere). */
  state.avatar = getUserAvatar();
  if (!state.avatar) state.avatarName = '';
  paint();
  savedSnap = formSnap();
  syncHeadSave();

  /* In-progress typing enables the headline Save before the field commits. */
  mainEl.addEventListener('input', (e) => {
    if (e.target.closest('[data-pf-field]')) syncHeadSave();
  });

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
      return;
    }
    /* Avatar device upload — read the image as a data URL so it persists and can
       be shown directly in the nav + chat. */
    const avFile = e.target.closest('[data-pf-avatar-file]');
    if (avFile && avFile.files && avFile.files[0]) {
      const f = avFile.files[0];
      const reader = new FileReader();
      reader.onload = () => setAvatar(String(reader.result || ''), f.name, 'form');
      reader.onerror = () => toast('Couldn\u2019t read that image', 'error');
      reader.readAsDataURL(f);
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
    /* avatar uploader tab switch */
    const avTab = e.target.closest('[data-pf-avatar-uptab]');
    if (avTab) {
      avatarTab = avTab.dataset.pfAvatarUptab;
      repaintAvatar();
      return;
    }
    /* avatar import-from-URL */
    const avImp = e.target.closest('[data-pf-avatar-import]');
    if (avImp) {
      const inp = mainEl.querySelector('[data-pf-avatar-url]');
      const url = (inp?.value || '').trim();
      if (!url) { toast('Enter an image URL first', 'link'); return; }
      setAvatar(url, '', 'form');
      return;
    }
    /* avatar preset pattern */
    const avPreset = e.target.closest('[data-pf-avatar-preset]');
    if (avPreset) {
      const preset = AVATAR_PRESETS.find((p) => p.id === avPreset.dataset.pfAvatarPreset);
      if (preset) setAvatarPreset(preset, 'form');
      return;
    }
    /* avatar remove */
    if (e.target.closest('[data-pf-avatar-remove]')) {
      removeAvatar('form');
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
/* WISEcodeAI bridge (chat → form)                                          */
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
    case 'avatar':         pendingUpload = 'avatar'; focusAvatar(); break;
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
  if (!t) return 'Tell me what to update \u2014 name, email, address, website, EIN, your brand logo &amp; banner, or your avatar picture.';

  /* Remove-avatar requests, in plain language. */
  if (/\b(remove|delete|clear)\b.*\b(avatar|profile\s*(?:picture|photo|pic)|my\s*(?:picture|photo))\b/i.test(t)) {
    return removeAvatar('chat');
  }

  /* 1) explicit "set X to Y" command wins, even over an armed field. */
  const m = t.match(VERB_RE);
  if (m) {
    if (/avatar|profile\s*(?:picture|photo|pic)|my\s*(?:picture|photo)/i.test(m[1]) && URL_RE.test(m[2])) {
      return setAvatar(m[2].match(URL_RE)[0], '', 'chat');
    }
    const key = matchFieldPhrase(m[1]);
    if (key) return applyField(key, m[2], 'chat');
    if (/logo|banner/i.test(m[1]) && URL_RE.test(m[2])) {
      return setUpload(/banner/i.test(m[1]) ? 'banner' : 'logo', { kind: 'url', value: m[2].trim() }, 'chat');
    }
  }

  /* 2) an armed upload waiting for a URL. */
  if (pendingUpload && URL_RE.test(t)) {
    const kind = pendingUpload;
    if (kind === 'avatar') return setAvatar(t.match(URL_RE)[0], '', 'chat');
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
  sub: 'Edit your organization profile \u2014 names, contact, address, brand logo &amp; banner, avatar picture. Tap a chip or just tell me.',
  chipsFlow: 'wrap',
  sourceLabel: '',
  reply,
  /* Large "at a glance" cards shown alongside the small chips on the welcome
     screen — each reuses an existing intent so a click drives the same flow. */
  scorecards: {
    label: 'Your profile at a glance',
    cards: [
      { intent: 'logo', icon: 'image', iconTone: 'brand', pill: { tone: 'up', icon: 'auto_awesome', text: 'Do next' }, title: 'Upload your brand logo', desc: 'Add or replace your logo — paste an image URL here and I\u2019ll import it.', action: 'Upload brand logo', ask: 'Upload brand logo' },
      { intent: 'avatar', icon: 'account_circle', iconTone: 'brand', pill: { tone: 'up', icon: 'person', text: 'You' }, title: 'Set your avatar picture', desc: 'Add a personal photo — it shows in the navigation and on your chat messages.', action: 'Set avatar picture', ask: 'Set avatar picture' },
      { intent: 'address', icon: 'home', iconTone: 'brand', pill: { tone: 'up', icon: 'edit', text: 'Edit' }, title: 'Edit mailing address', desc: 'Update street, city, state and zip — just tell me the new details.', action: 'Edit address', ask: 'Edit mailing address' },
      { intent: 'rename_org', icon: 'badge', iconTone: 'brand', pill: { tone: 'up', icon: 'edit', text: 'Edit' }, title: 'Rename organization', desc: 'Update your org\u2019s display name — just tell me the new one.', action: 'Rename organization', ask: 'Rename organization' },
      { intent: 'banner', icon: 'panorama', iconTone: 'brand', pill: { tone: 'up', icon: 'panorama', text: 'Brand' }, title: 'Set brand banner', desc: 'Add or replace your profile banner image.', action: 'Set brand banner', ask: 'Set brand banner' },
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
    { intent: 'avatar', label: 'Set avatar picture', icon: 'account_circle' },
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
    avatar: () => state.avatar
      ? 'Opened the <strong>Avatar picture</strong> control. Pick a new file or paste an image URL to replace it \u2014 or say \u201cremove my avatar\u201d to go back to your initials.'
      : 'Opened the <strong>Avatar picture</strong> control. Choose a file on the form, or paste an image URL right here and I\u2019ll set it \u2014 it\u2019ll show in the primary navigation and on your chat messages.',
    save: () => doSave('chat'),
  },
  onIntent: (intent) => {
    if (intent === 'save') return false; // intentReplies.save() performs + narrates
    runIntent(intent);
    return false; // let the matching guidance reply post
  },
};
